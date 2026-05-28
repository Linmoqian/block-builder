/**
 * Blockly 工具箱配置
 *
 * 按模块类别分组，与 registry.ts 中的 6 个类别对应。
 */

interface ToolboxItem {
  kind: string;
  type?: string;
  name?: string;
  colour?: string;
  contents?: ToolboxItem[];
}

export interface ToolboxConfig {
  kind: string;
  contents: ToolboxItem[];
}

export const toolboxConfig: ToolboxConfig = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: '输入',
      colour: '#10b981',
      contents: [{ kind: 'block', type: 'Input' }],
    },
    {
      kind: 'category',
      name: '基础',
      colour: '#3b82f6',
      contents: [
        { kind: 'block', type: 'Conv' },
        { kind: 'block', type: 'BatchNorm2d' },
        { kind: 'block', type: 'SiLU' },
        { kind: 'block', type: 'MaxPool2d' },
        { kind: 'block', type: 'Upsample' },
        { kind: 'block', type: 'Flatten' },
        { kind: 'block', type: 'Linear' },
      ],
    },
    {
      kind: 'category',
      name: '复合',
      colour: '#8b5cf6',
      contents: [
        { kind: 'block', type: 'C2f' },
        { kind: 'block', type: 'SPPF' },
      ],
    },
    {
      kind: 'category',
      name: '注意力',
      colour: '#f97316',
      contents: [
        { kind: 'block', type: 'CBAM' },
        { kind: 'block', type: 'CA' },
        { kind: 'block', type: 'SimAM' },
      ],
    },
    {
      kind: 'category',
      name: '连接',
      colour: '#ec4899',
      contents: [{ kind: 'block', type: 'Concat' }],
    },
    {
      kind: 'category',
      name: '检测头',
      colour: '#ef4444',
      contents: [{ kind: 'block', type: 'Detect' }],
    },
    {
      kind: 'category',
      name: '训练',
      colour: '#f59e0b',
      contents: [
        { kind: 'block', type: 'dataset_load' },
        { kind: 'block', type: 'data_transform' },
        { kind: 'block', type: 'loss_function' },
        { kind: 'block', type: 'optimizer' },
        { kind: 'block', type: 'lr_scheduler' },
        { kind: 'block', type: 'train_loop' },
        { kind: 'block', type: 'forward_pass' },
        { kind: 'block', type: 'backward_pass' },
        { kind: 'block', type: 'evaluate' },
        { kind: 'block', type: 'save_model' },
      ],
    },
    {
      kind: 'category',
      name: '逻辑',
      colour: '#5b80a5',
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'controls_repeat_ext' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'variables_set' },
        { kind: 'block', type: 'variables_get' },
      ],
    },
  ],
};
