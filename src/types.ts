export type ShapeType = 'square' | 'rect-h' | 'rect-v' | 'circle' | 'triangle' | 'l-shape' | 't-shape';
export type NetworkLayerType = 'Linear' | 'Conv2d' | 'ReLU' | 'Dropout' | 'CrossEntropy' | 'Adam' | 'RandomData';
export type YoloModuleType =
  | 'Conv' | 'DWConv' | 'GhostConv' | 'RepConv'
  | 'Bottleneck' | 'C2f' | 'C3k2' | 'SPPF' | 'PSA' | 'C2PSA'
  | 'Concat' | 'nn.Upsample'
  | 'Detect' | 'Segment' | 'Classify';
export type AllBlockType = ShapeType | NetworkLayerType | YoloModuleType;

export interface ParamDef {
  name: string;
  type: 'number' | 'boolean' | 'string';
  default: any;
  description: string;
}

export interface BlockInstance {
  id: string;
  type: AllBlockType;
  x: number;
  y: number;
  color: string;
  rotation: number;
  zIndex: number;
  connectedTo?: string[];
  yoloParams?: Record<string, any>;  // YOLO 模块参数
  repeats?: number;                   // YOLO 模块重复次数
}

export interface YoloBlockTemplate {
  type: YoloModuleType;
  label: string;
  defaultColor: string;
  category: 'conv' | 'block' | 'neck' | 'head';
  params: ParamDef[];
  defaultRepeats: number;
  /** 从 YAML args 顺序映射到 param name */
  argNames: string[];
  isYolo: true;
  isNetwork?: false;
}

export interface Connection {
  from: string;
  to: string;
}

export interface BlockTemplate {
  type: AllBlockType;
  label: string;
  defaultColor: string;
  isNetwork?: boolean;
}

export const BLOCK_TEMPLATES: BlockTemplate[] = [
  { type: 'square', label: '正方形', defaultColor: '#3b82f6' },
  { type: 'rect-h', label: '长方形 (横)', defaultColor: '#ef4444' },
  { type: 'rect-v', label: '长方形 (纵)', defaultColor: '#10b981' },
  { type: 'circle', label: '圆形', defaultColor: '#f59e0b' },
  { type: 'triangle', label: '三角形', defaultColor: '#8b5cf6' },
  { type: 'l-shape', label: 'L型', defaultColor: '#ec4899' },
  { type: 't-shape', label: 'T型', defaultColor: '#06b6d4' },
];

export const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export const BLOCK_PORTS: Record<string, { maxInputs: number; maxOutputs: number }> = {
  // Shape defaults
  'square': { maxInputs: 1, maxOutputs: 1 },
  'rect-h': { maxInputs: 1, maxOutputs: 1 },
  'rect-v': { maxInputs: 1, maxOutputs: 1 },
  'circle': { maxInputs: 1, maxOutputs: 1 },
  'triangle': { maxInputs: 1, maxOutputs: 1 },
  'l-shape': { maxInputs: 1, maxOutputs: 1 },
  't-shape': { maxInputs: 1, maxOutputs: 1 },
  
  // Network defaults
  'RandomData': { maxInputs: 0, maxOutputs: 1 },
  'Linear': { maxInputs: 1, maxOutputs: 1 },
  'Conv2d': { maxInputs: 1, maxOutputs: 1 },
  'ReLU': { maxInputs: 1, maxOutputs: 1 },
  'Dropout': { maxInputs: 1, maxOutputs: 1 },
  'CrossEntropy': { maxInputs: 2, maxOutputs: 1 },
  'Adam': { maxInputs: 1, maxOutputs: 0 },

  // YOLO module ports
  'Conv': { maxInputs: 3, maxOutputs: 1 },
  'DWConv': { maxInputs: 3, maxOutputs: 1 },
  'GhostConv': { maxInputs: 3, maxOutputs: 1 },
  'RepConv': { maxInputs: 3, maxOutputs: 1 },
  'Bottleneck': { maxInputs: 3, maxOutputs: 1 },
  'C2f': { maxInputs: 3, maxOutputs: 1 },
  'C3k2': { maxInputs: 3, maxOutputs: 1 },
  'SPPF': { maxInputs: 3, maxOutputs: 1 },
  'PSA': { maxInputs: 3, maxOutputs: 1 },
  'C2PSA': { maxInputs: 3, maxOutputs: 1 },
  'Concat': { maxInputs: 4, maxOutputs: 1 },
  'nn.Upsample': { maxInputs: 1, maxOutputs: 1 },
  'Detect': { maxInputs: 5, maxOutputs: 0 },
  'Segment': { maxInputs: 5, maxOutputs: 0 },
  'Classify': { maxInputs: 1, maxOutputs: 0 },
};
