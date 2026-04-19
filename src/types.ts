export type ShapeType = 'square' | 'rect-h' | 'rect-v' | 'circle' | 'triangle' | 'l-shape' | 't-shape';
export type NetworkLayerType = 'Linear' | 'Conv2d' | 'ReLU' | 'Dropout' | 'CrossEntropy' | 'Adam' | 'RandomData';
export type AllBlockType = ShapeType | NetworkLayerType;

export interface BlockInstance {
  id: string;
  type: AllBlockType;
  x: number;
  y: number;
  color: string;
  rotation: number;
  zIndex: number;
  connectedTo?: string[]; // 连接的其他积木ID
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
