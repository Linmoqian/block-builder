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
  ],
};
