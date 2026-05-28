/**
 * 神经网络模块 Blockly 自定义积木块定义
 *
 * 基于 registry.ts 中 15 个模块定义，将每个模块映射为 Blockly 积木块。
 */
import * as Blockly from 'blockly';

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/** 将 hex 颜色（如 #3b82f6）转换为 Blockly 使用的 HSV 色调值（0-360） */
function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  if (d === 0) return 0;

  let h: number;
  if (max === r) {
    h = ((g - b) / d) % 6;
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }

  return Math.round(h * 60 + (h < 0 ? 360 : 0));
}

// ---------------------------------------------------------------------------
// 所有积木块定义
// ---------------------------------------------------------------------------

Blockly.common.defineBlocksWithJsonArray([
  // =========================================================================
  // 输入模块
  // =========================================================================
  {
    type: 'Input',
    message0: '输入  通道 %1 高 %2 宽 %3',
    args0: [
      { type: 'field_number', name: 'channels', value: 3, min: 1, max: 256 },
      { type: 'field_number', name: 'height', value: 640, min: 32, max: 4096 },
      { type: 'field_number', name: 'width', value: 640, min: 32, max: 4096 },
    ],
    output: 'Tensor',
    colour: hexToHue('#10b981'),
    tooltip: '输入张量定义',
  },

  // =========================================================================
  // 基础层
  // =========================================================================
  {
    type: 'Conv',
    message0: '卷积  out_channels %1 kernel %2 stride %3',
    args0: [
      { type: 'field_number', name: 'out_channels', value: 64, min: 1, max: 2048 },
      { type: 'field_number', name: 'kernel_size', value: 3, min: 1, max: 11 },
      { type: 'field_number', name: 'stride', value: 1, min: 1, max: 4 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: hexToHue('#3b82f6'),
    tooltip: '二维卷积层',
  },
  {
    type: 'BatchNorm2d',
    message0: '批量归一化  eps %1 momentum %2',
    args0: [
      { type: 'field_number', name: 'eps', value: 1e-5, min: 1e-10, max: 1, precision: 1e-10 },
      { type: 'field_number', name: 'momentum', value: 0.1, min: 0, max: 1, precision: 0.001 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: hexToHue('#14b8a6'),
    tooltip: '批量归一化层',
  },
  {
    type: 'SiLU',
    message0: 'SiLU 激活',
    args0: [],
    previousStatement: null,
    nextStatement: null,
    colour: hexToHue('#a78bfa'),
    tooltip: 'SiLU 激活函数',
  },
  {
    type: 'MaxPool2d',
    message0: '最大池化  kernel %1 stride %2 padding %3',
    args0: [
      { type: 'field_number', name: 'kernel_size', value: 2, min: 1, max: 16 },
      { type: 'field_number', name: 'stride', value: 2, min: 1, max: 16 },
      { type: 'field_number', name: 'padding', value: 0, min: 0, max: 8 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: hexToHue('#f472b6'),
    tooltip: '二维最大池化',
  },
  {
    type: 'Upsample',
    message0: '上采样  scale_factor %1 mode %2',
    args0: [
      { type: 'field_number', name: 'scale_factor', value: 2.0, min: 0.5, max: 8.0, precision: 0.1 },
      {
        type: 'field_dropdown',
        name: 'mode',
        options: [
          ['nearest', 'nearest'],
          ['bilinear', 'bilinear'],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: hexToHue('#06b6d4'),
    tooltip: '上采样层',
  },
  {
    type: 'Flatten',
    message0: '展平  start_dim %1 end_dim %2',
    args0: [
      { type: 'field_number', name: 'start_dim', value: 1, min: 0, max: 4 },
      { type: 'field_number', name: 'end_dim', value: -1, min: -4, max: 4 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: hexToHue('#fbbf24'),
    tooltip: '展平层',
  },
  {
    type: 'Linear',
    message0: '全连接  out_features %1 bias %2',
    args0: [
      { type: 'field_number', name: 'out_features', value: 1000, min: 1, max: 100000 },
      {
        type: 'field_dropdown',
        name: 'bias',
        options: [
          ['True', 'True'],
          ['False', 'False'],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: hexToHue('#6366f1'),
    tooltip: '全连接层',
  },

  // =========================================================================
  // 复合模块
  // =========================================================================
  {
    type: 'C2f',
    message0: 'C2f  out_channels %1 n %2',
    args0: [
      { type: 'field_number', name: 'out_channels', value: 128, min: 1, max: 2048 },
      { type: 'field_number', name: 'n', value: 3, min: 1, max: 8 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: hexToHue('#8b5cf6'),
    tooltip: 'C2f 跨阶段局部网络',
  },
  {
    type: 'SPPF',
    message0: 'SPPF  out_channels %1 kernel %2',
    args0: [
      { type: 'field_number', name: 'out_channels', value: 256, min: 1, max: 2048 },
      { type: 'field_number', name: 'kernel_size', value: 5, min: 3, max: 11 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: hexToHue('#f59e0b'),
    tooltip: '空间金字塔池化 - 快速版',
  },

  // =========================================================================
  // 注意力模块
  // =========================================================================
  {
    type: 'CBAM',
    message0: 'CBAM  reduction %1',
    args0: [
      { type: 'field_number', name: 'reduction', value: 16, min: 1, max: 64 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: hexToHue('#f97316'),
    tooltip: 'CBAM 通道 + 空间注意力',
  },
  {
    type: 'CA',
    message0: '坐标注意力  reduction %1',
    args0: [
      { type: 'field_number', name: 'reduction', value: 32, min: 1, max: 128 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: hexToHue('#fb923c'),
    tooltip: '坐标注意力模块',
  },
  {
    type: 'SimAM',
    message0: 'SimAM  lambda %1',
    args0: [
      { type: 'field_number', name: 'lambda_val', value: 0.0001, min: 0, max: 1, precision: 0.00001 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: hexToHue('#e879f9'),
    tooltip: 'SimAM 无参数注意力',
  },

  // =========================================================================
  // 连接模块
  // =========================================================================
  {
    type: 'Concat',
    message0: '拼接  axis %1  输入 A %2 输入 B %3',
    args0: [
      { type: 'field_number', name: 'axis', value: 0, min: 0, max: 2 },
      { type: 'input_value', name: 'INPUT_A', check: 'Tensor' },
      { type: 'input_value', name: 'INPUT_B', check: 'Tensor' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: hexToHue('#ec4899'),
    tooltip: '沿指定轴拼接两个张量',
  },

  // =========================================================================
  // 检测头（终端块，无 nextStatement）
  // =========================================================================
  {
    type: 'Detect',
    message0: 'Detect  num_classes %1  P3 %2 P4 %3 P5 %4',
    args0: [
      { type: 'field_number', name: 'num_classes', value: 80, min: 1, max: 1000 },
      { type: 'input_value', name: 'P3', check: 'Tensor' },
      { type: 'input_value', name: 'P4', check: 'Tensor' },
      { type: 'input_value', name: 'P5', check: 'Tensor' },
    ],
    previousStatement: null,
    colour: hexToHue('#ef4444'),
    tooltip: 'YOLO 检测头',
  },
]);
