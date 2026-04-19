import { BlockInstance } from '../types';
import { NETWORK_TEMPLATES } from '../config/networkBlocks';

interface Node {
  id: string;
  type: string;
  label: string;
  children: string[];
  inDegree: number;
}

export function generatePyTorchCode(blocks: BlockInstance[]): string {
  const networkBlocks = blocks.filter(b => 
    NETWORK_TEMPLATES.some(t => t.type === b.type)
  );

  if (networkBlocks.length === 0) {
    return '# 当前画布中没有神经网络层积木\n';
  }

  // 1. Build adjacency list and calculate inDegrees
  const adjList = new Map<string, Node>();
  const inDegrees = new Map<string, number>();

  networkBlocks.forEach(b => {
    const template = NETWORK_TEMPLATES.find(t => t.type === b.type);
    adjList.set(b.id, {
      id: b.id,
      type: b.type,
      label: template?.label || b.type,
      children: [],
      inDegree: 0,
    });
    inDegrees.set(b.id, 0);
  });

  networkBlocks.forEach(b => {
    if (b.connectedTo) {
      b.connectedTo.forEach(targetId => {
        if (adjList.has(targetId)) {
          adjList.get(b.id)!.children.push(targetId);
          inDegrees.set(targetId, inDegrees.get(targetId)! + 1);
        }
      });
    }
  });

  // 2. Topological sort
  const queue: string[] = [];
  const sorted: Node[] = [];
  
  for (const [id, count] of inDegrees.entries()) {
    if (count === 0) queue.push(id);
  }

  while (queue.length > 0) {
    const currId = queue.shift()!;
    const node = adjList.get(currId)!;
    sorted.push(node);

    node.children.forEach(childId => {
      inDegrees.set(childId, inDegrees.get(childId)! - 1);
      if (inDegrees.get(childId) === 0) {
        queue.push(childId);
      }
    });
  }

  if (sorted.length !== networkBlocks.length) {
    return '# 警告: 计算图中存在环，无法生成合法的 PyTorch 代码\n';
  }

  // 3. Generate Code
  const layers = sorted.filter(n => ['Linear', 'Conv2d', 'ReLU', 'Dropout'].includes(n.type));
  const hasLoss = sorted.some(n => n.type === 'CrossEntropy');
  const hasOpt = sorted.some(n => n.type === 'Adam');

  let code = `import torch
import torch.nn as nn
import torch.optim as optim

class BlockNet(nn.Module):
    def __init__(self):
        super(BlockNet, self).__init__()
`;

  layers.forEach((layer, i) => {
    let fn = 'nn.Identity()';
    if (layer.type === 'Linear') fn = 'nn.Linear(128, 64)';
    if (layer.type === 'Conv2d') fn = 'nn.Conv2d(3, 16, kernel_size=3)';
    if (layer.type === 'ReLU') fn = 'nn.ReLU()';
    if (layer.type === 'Dropout') fn = 'nn.Dropout(p=0.5)';
    
    code += `        self.layer_${i} = ${fn}\n`;
  });

  code += `
    def forward(self, x):
`;
  if (layers.length === 0) {
    code += `        return x\n`;
  } else {
    layers.forEach((layer, i) => {
      code += `        x = self.layer_${i}(x)\n`;
    });
    code += `        return x\n`;
  }

  code += `
# 初始化模型
model = BlockNet()
print(model)
`;

  if (hasLoss) {
    code += `criterion = nn.CrossEntropyLoss()\n`;
  }
  if (hasOpt) {
    code += `optimizer = optim.Adam(model.parameters(), lr=0.001)\n`;
  }

  if (hasLoss && hasOpt) {
    code += `\n# 模拟伪数据前向传播测试
if len(list(model.parameters())) > 0:
    x_dummy = torch.randn(1, 128)
    y_dummy = torch.randint(0, 64, (1,))
    out = model(x_dummy)
    loss = criterion(out, y_dummy)
    loss.backward()
    optimizer.step()
    print(f"成功完成一次前向+反向传播！Loss: {loss.item():.4f}")
`;
  }

  return code;
}
