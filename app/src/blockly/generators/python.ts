/**
 * 神经网络积木块 → Python/PyTorch 代码生成器
 *
 * 为所有 15 个自定义积木块注册 Python 代码生成函数，
 * 并提供 generateModelCode 将整个工作区转为完整 PyTorch 模型代码。
 */
import * as Blockly from 'blockly';
import { pythonGenerator, Order } from 'blockly/python';

// ---------------------------------------------------------------------------
// 辅助：确保 import 只生成一次
// ---------------------------------------------------------------------------

const IMPORTS = `import torch
import torch.nn as nn
`;

// ---------------------------------------------------------------------------
// 各积木块的代码生成函数
// ---------------------------------------------------------------------------

pythonGenerator.forBlock['Input'] = function (block: Blockly.Block): [string, number] {
  const channels = block.getFieldValue('channels');
  const height = block.getFieldValue('height');
  const width = block.getFieldValue('width');
  const code = `torch.randn(1, ${channels}, ${height}, ${width})`;
  return [code, Order.ATOMIC];
};

pythonGenerator.forBlock['Conv'] = function (block: Blockly.Block): string {
  const outCh = block.getFieldValue('out_channels');
  const ks = block.getFieldValue('kernel_size');
  const stride = block.getFieldValue('stride');
  const padding = Math.floor(Number(ks) / 2);
  return `nn.Conv2d(in_channels, ${outCh}, ${ks}, stride=${stride}, padding=${padding})`;
};

pythonGenerator.forBlock['BatchNorm2d'] = function (block: Blockly.Block): string {
  const eps = block.getFieldValue('eps');
  const momentum = block.getFieldValue('momentum');
  return `nn.BatchNorm2d(in_channels, eps=${eps}, momentum=${momentum})`;
};

pythonGenerator.forBlock['SiLU'] = function (): string {
  return 'nn.SiLU()';
};

pythonGenerator.forBlock['MaxPool2d'] = function (block: Blockly.Block): string {
  const ks = block.getFieldValue('kernel_size');
  const stride = block.getFieldValue('stride');
  const padding = block.getFieldValue('padding');
  return `nn.MaxPool2d(${ks}, stride=${stride}, padding=${padding})`;
};

pythonGenerator.forBlock['Upsample'] = function (block: Blockly.Block): string {
  const scale = block.getFieldValue('scale_factor');
  const mode = block.getFieldValue('mode');
  return `nn.Upsample(scale_factor=${scale}, mode='${mode}')`;
};

pythonGenerator.forBlock['Flatten'] = function (block: Blockly.Block): string {
  const startDim = block.getFieldValue('start_dim');
  const endDim = block.getFieldValue('end_dim');
  return `nn.Flatten(start_dim=${startDim}, end_dim=${endDim})`;
};

pythonGenerator.forBlock['Linear'] = function (block: Blockly.Block): string {
  const outFeatures = block.getFieldValue('out_features');
  const bias = block.getFieldValue('bias') === 'True';
  return `nn.Linear(in_features, ${outFeatures}, bias=${bias})`;
};

pythonGenerator.forBlock['C2f'] = function (block: Blockly.Block): string {
  const outCh = block.getFieldValue('out_channels');
  const n = block.getFieldValue('n');
  return `C2f(in_channels, ${outCh}, n=${n})`;
};

pythonGenerator.forBlock['SPPF'] = function (block: Blockly.Block): string {
  const outCh = block.getFieldValue('out_channels');
  const ks = block.getFieldValue('kernel_size');
  return `SPPF(in_channels, ${outCh}, kernel_size=${ks})`;
};

pythonGenerator.forBlock['CBAM'] = function (block: Blockly.Block): string {
  const reduction = block.getFieldValue('reduction');
  return `CBAM(in_channels, reduction=${reduction})`;
};

pythonGenerator.forBlock['CA'] = function (block: Blockly.Block): string {
  const reduction = block.getFieldValue('reduction');
  return `CoordinateAttention(in_channels, reduction=${reduction})`;
};

pythonGenerator.forBlock['SimAM'] = function (block: Blockly.Block): string {
  const lambdaVal = block.getFieldValue('lambda_val');
  return `SimAM(lambda_val=${lambdaVal})`;
};

pythonGenerator.forBlock['Concat'] = function (block: Blockly.Block): string {
  return 'Concat()';
};

pythonGenerator.forBlock['Detect'] = function (block: Blockly.Block): string {
  const nc = block.getFieldValue('num_classes');
  return `Detect(nc=${nc})`;
};

// ---------------------------------------------------------------------------
// generateModelCode：将整个工作区转为完整的 PyTorch 模型代码
// ---------------------------------------------------------------------------

export function generateModelCode(workspace: Blockly.Workspace): string {
  // 获取原始生成代码
  const raw = pythonGenerator.workspaceToCode(workspace);

  if (!raw || raw.trim().length === 0) {
    return '# 拖拽积木块生成代码\n';
  }

  // 将生成出的每行代码视为 sequential 中的一层
  const lines = raw
    .split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);

  const layerLines = lines
    .map((line: string) => `            ${line}`)
    .join(',\n');

  return `${IMPORTS}

class CustomModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.model = nn.Sequential(
${layerLines}
        )

    def forward(self, x):
        return self.model(x)


if __name__ == '__main__':
    model = CustomModel()
    print(model)
    x = torch.randn(1, 3, 640, 640)
    y = model(x)
    print(f'Output shape: {y.shape}')
`;
}

export function generateFullCode(workspace: Blockly.Workspace): string {
  const raw = pythonGenerator.workspaceToCode(workspace);
  if (!raw || raw.trim().length === 0) return '# 拖拽积木块生成代码\n';
  return raw;
}
