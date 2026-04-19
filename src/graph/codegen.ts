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

  // 3. Classify nodes
  const layers = sorted.filter(n => ['Linear', 'Conv2d', 'ReLU', 'Dropout'].includes(n.type));
  const hasLoss = sorted.some(n => n.type === 'CrossEntropy');
  const hasOpt = sorted.some(n => n.type === 'Adam');
  const hasData = sorted.some(n => n.type === 'RandomData');
  const hasConv = layers.some(n => n.type === 'Conv2d');
  const hasParams = layers.some(n => ['Linear', 'Conv2d'].includes(n.type));

  // 4. Determine data dimensions based on first and last layer
  const firstLayer = layers.find(n => ['Linear', 'Conv2d'].includes(n.type));
  const lastLayer = [...layers].reverse().find(n => ['Linear', 'Conv2d'].includes(n.type));
  const inDim = firstLayer?.type === 'Conv2d' ? '1, 3, 32, 32' : '1, 128';
  const outDim = lastLayer?.type === 'Conv2d' ? 16 : 64;

  // 5. Generate Code
  let code = `import torch
import torch.nn as nn
import torch.nn.functional as F
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
  if (hasOpt && hasParams) {
    code += `optimizer = optim.Adam(model.parameters(), lr=0.001)\n`;
  }

  if (hasData && hasLoss && hasOpt && hasParams) {
    code += `
# 生成随机训练数据
x_data = torch.randn(${inDim})
y_data = torch.randint(0, ${outDim}, (1,))

# 训练循环
epochs = 5
for epoch in range(epochs):
    optimizer.zero_grad()
    output = model(x_data)
`;

    if (hasConv) {
      code += `    output = F.adaptive_avg_pool2d(output, 1).view(output.size(0), -1)
`;
    }

    code += `    loss = criterion(output, y_data)
    loss.backward()
    optimizer.step()
    print(f"Epoch {epoch+1}/{epochs}  Loss: {loss.item():.4f}")

print("训练完成！")
`;
  } else if (hasData && hasLoss && hasOpt && !hasParams) {
    code += `\n# 提示: 请添加 Linear 或 Conv2d 网络层积木，模型需要可训练参数\n`;
  } else if (hasLoss && hasOpt) {
    code += `\n# 提示: 添加 RandomData 积木可生成完整训练代码\n`;
  }

  return code;
}
