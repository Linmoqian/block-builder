import { ModuleDefinition, ModuleCategory, TensorShape } from './types';

class ModuleRegistry {
  private modules = new Map<string, ModuleDefinition>();

  register(def: ModuleDefinition): void {
    this.modules.set(def.type, def);
  }

  get(type: string): ModuleDefinition | undefined {
    return this.modules.get(type);
  }

  getAll(): Record<string, ModuleDefinition> {
    return Object.fromEntries(this.modules);
  }

  getByCategory(category: ModuleCategory): ModuleDefinition[] {
    return [...this.modules.values()].filter(m => m.category === category);
  }

  getGroupedByCategory(): Record<string, ModuleDefinition[]> {
    const groups: Record<string, ModuleDefinition[]> = {};
    for (const mod of this.modules.values()) {
      if (!groups[mod.category]) groups[mod.category] = [];
      groups[mod.category].push(mod);
    }
    return groups;
  }

  has(type: string): boolean {
    return this.modules.has(type);
  }
}

export const MODULE_REGISTRY = new ModuleRegistry();

// 注册所有模块
MODULE_REGISTRY.register({
  type: 'Input',
  label: 'Input',
  category: 'input',
  color: '#10b981',
  params: {
    channels: { type: 'int', default: 3, min: 1, max: 256, label: 'Channels' },
    height: { type: 'int', default: 640, min: 32, max: 4096, label: 'Height' },
    width: { type: 'int', default: 640, min: 32, max: 4096, label: 'Width' },
  },
  inputs: [],
  outputs: [{ id: 'out', label: 'Output', required: true }],
  inferShape: (_inputs, params) => {
    return [[params.channels as number, params.height as number, params.width as number]];
  },
});

MODULE_REGISTRY.register({
  type: 'Conv',
  label: 'Conv',
  category: 'basic',
  color: '#3b82f6',
  params: {
    out_channels: { type: 'int', default: 64, min: 1, max: 2048, label: 'Out Channels' },
    kernel_size: { type: 'int', default: 3, min: 1, max: 11, label: 'Kernel Size' },
    stride: { type: 'int', default: 1, min: 1, max: 4, label: 'Stride' },
  },
  inputs: [{ id: 'in', label: 'Input', required: true }],
  outputs: [{ id: 'out', label: 'Output', required: true }],
  inferShape: (inputs, params) => {
    if (!inputs[0]) return [[0, 0, 0]];
    const [, h, w] = inputs[0];
    const k = params.kernel_size as number;
    const s = params.stride as number;
    const p = Math.floor(k / 2);
    const hOut = Math.floor((h + 2 * p - k) / s) + 1;
    const wOut = Math.floor((w + 2 * p - k) / s) + 1;
    return [[params.out_channels as number, hOut, wOut]];
  },
  estimateParams: (inputs, params) => {
    const inCh = inputs[0]?.[0] || 0;
    const outCh = params.out_channels as number;
    const k = params.kernel_size as number;
    return inCh * outCh * k * k + outCh * 2; // conv weights + BN (weight + bias)
  },
  estimateFLOPs: (inputs, params) => {
    const inCh = inputs[0]?.[0] || 0;
    const outCh = params.out_channels as number;
    const k = params.kernel_size as number;
    const s = params.stride as number;
    const p = Math.floor(k / 2);
    const h = inputs[0]?.[1] || 0;
    const w = inputs[0]?.[2] || 0;
    const hOut = Math.floor((h + 2 * p - k) / s) + 1;
    const wOut = Math.floor((w + 2 * p - k) / s) + 1;
    return inCh * outCh * k * k * hOut * wOut;
  },
});

MODULE_REGISTRY.register({
  type: 'C2f',
  label: 'C2f',
  category: 'composite',
  color: '#8b5cf6',
  params: {
    out_channels: { type: 'int', default: 128, min: 1, max: 2048, label: 'Out Channels' },
    n: { type: 'int', default: 3, min: 1, max: 8, label: 'Bottleneck Count' },
  },
  inputs: [{ id: 'in', label: 'Input', required: true }],
  outputs: [{ id: 'out', label: 'Output', required: true }],
  inferShape: (inputs, params) => {
    if (!inputs[0]) return [[0, 0, 0]];
    const [, h, w] = inputs[0];
    return [[params.out_channels as number, h, w]];
  },
  estimateParams: (inputs, params) => {
    const inCh = inputs[0]?.[0] || 0;
    const outCh = params.out_channels as number;
    const n = params.n as number;
    // Approximate: split conv + n bottlenecks (each with 2 convs)
    return Math.round(0.5 * inCh * outCh * 3 * 3 * n);
  },
  estimateFLOPs: (inputs, params) => {
    const inCh = inputs[0]?.[0] || 0;
    const outCh = params.out_channels as number;
    const n = params.n as number;
    const h = inputs[0]?.[1] || 0;
    const w = inputs[0]?.[2] || 0;
    return Math.round(0.5 * inCh * outCh * 3 * 3 * n * h * w);
  },
});

MODULE_REGISTRY.register({
  type: 'SPPF',
  label: 'SPPF',
  category: 'composite',
  color: '#f59e0b',
  params: {
    out_channels: { type: 'int', default: 256, min: 1, max: 2048, label: 'Out Channels' },
    kernel_size: { type: 'int', default: 5, min: 3, max: 11, label: 'Pool Kernel' },
  },
  inputs: [{ id: 'in', label: 'Input', required: true }],
  outputs: [{ id: 'out', label: 'Output', required: true }],
  inferShape: (inputs, params) => {
    if (!inputs[0]) return [[0, 0, 0]];
    const [, h, w] = inputs[0];
    return [[params.out_channels as number, h, w]];
  },
  estimateParams: (inputs, params) => {
    const inCh = inputs[0]?.[0] || 0;
    const outCh = params.out_channels as number;
    const k = params.kernel_size as number;
    // 1x1 conv + 3 maxpool branches (simplified)
    return inCh * outCh * 1 * 1 + outCh * (k * k + k * k + k * k);
  },
  estimateFLOPs: (inputs, params) => {
    const inCh = inputs[0]?.[0] || 0;
    const outCh = params.out_channels as number;
    const k = params.kernel_size as number;
    const h = inputs[0]?.[1] || 0;
    const w = inputs[0]?.[2] || 0;
    return (inCh * outCh * 1 * 1 + outCh * (k * k + k * k + k * k)) * h * w;
  },
});

MODULE_REGISTRY.register({
  type: 'Upsample',
  label: 'Upsample',
  category: 'basic',
  color: '#06b6d4',
  params: {
    scale_factor: { type: 'float', default: 2.0, min: 0.5, max: 8.0, label: 'Scale Factor' },
    mode: { type: 'select', default: 'nearest', options: ['nearest', 'bilinear'], label: 'Mode' },
  },
  inputs: [{ id: 'in', label: 'Input', required: true }],
  outputs: [{ id: 'out', label: 'Output', required: true }],
  inferShape: (inputs, params) => {
    if (!inputs[0]) return [[0, 0, 0]];
    const [c, h, w] = inputs[0];
    const s = params.scale_factor as number;
    return [[c, Math.round(h * s), Math.round(w * s)]];
  },
});

MODULE_REGISTRY.register({
  type: 'Concat',
  label: 'Concat',
  category: 'connector',
  color: '#ec4899',
  params: {
    axis: { type: 'int', default: 0, min: 0, max: 2, label: 'Axis' },
  },
  inputs: [
    { id: 'in_0', label: 'Input A', required: true },
    { id: 'in_1', label: 'Input B', required: true },
  ],
  outputs: [{ id: 'out', label: 'Output', required: true }],
  inferShape: (inputs, params) => {
    if (!inputs[0] || !inputs[1]) return [[0, 0, 0]];
    const axis = params.axis as number;
    const result = [...inputs[0]] as number[];
    // In [C, H, W] notation: axis=0 is channels, axis=1 is H, axis=2 is W
    if (axis >= 0 && axis <= 2) {
      result[axis] = (inputs[0][axis] as number) + (inputs[1][axis] as number);
    }
    // Spatial dimensions must match for channel concatenation
    if (axis === 0 && (inputs[0][1] !== inputs[1][1] || inputs[0][2] !== inputs[1][2])) {
      return [[-1, -1, -1]];
    }
    return [result as TensorShape];
  },
});

MODULE_REGISTRY.register({
  type: 'CBAM',
  label: 'CBAM',
  category: 'attention',
  color: '#f97316',
  params: {
    reduction: { type: 'int', default: 16, min: 1, max: 64, label: 'Reduction' },
  },
  inputs: [{ id: 'in', label: 'Input', required: true }],
  outputs: [{ id: 'out', label: 'Output', required: true }],
  inferShape: (inputs) => (inputs[0] ? [inputs[0]] : [[0, 0, 0]]),
});

MODULE_REGISTRY.register({
  type: 'Detect',
  label: 'Detect',
  category: 'head',
  color: '#ef4444',
  params: {
    num_classes: { type: 'int', default: 80, min: 1, max: 1000, label: 'Num Classes' },
  },
  inputs: [
    { id: 'p3', label: 'P3 (80x80)', required: true },
    { id: 'p4', label: 'P4 (40x40)', required: true },
    { id: 'p5', label: 'P5 (20x20)', required: true },
  ],
  outputs: [],
  inferShape: () => [],
});

MODULE_REGISTRY.register({
  type: 'BatchNorm2d',
  label: 'BatchNorm2d',
  category: 'basic',
  color: '#14b8a6',
  params: {
    eps: { type: 'float', default: 1e-5, min: 1e-10, max: 1, label: 'Epsilon' },
    momentum: { type: 'float', default: 0.1, min: 0, max: 1, label: 'Momentum' },
  },
  inputs: [{ id: 'in', label: 'Input', required: true }],
  outputs: [{ id: 'out', label: 'Output', required: true }],
  inferShape: (inputs) => (inputs[0] ? [inputs[0]] : [[0, 0, 0]]),
  estimateParams: (inputs) => {
    const c = inputs[0]?.[0] || 0;
    return 2 * c; // weight + bias
  },
  estimateFLOPs: (inputs) => {
    const c = inputs[0]?.[0] || 0;
    const h = inputs[0]?.[1] || 0;
    const w = inputs[0]?.[2] || 0;
    return 2 * c * h * w;
  },
});

MODULE_REGISTRY.register({
  type: 'SiLU',
  label: 'SiLU',
  category: 'basic',
  color: '#a78bfa',
  params: {},
  inputs: [{ id: 'in', label: 'Input', required: true }],
  outputs: [{ id: 'out', label: 'Output', required: true }],
  inferShape: (inputs) => (inputs[0] ? [inputs[0]] : [[0, 0, 0]]),
});

MODULE_REGISTRY.register({
  type: 'MaxPool2d',
  label: 'MaxPool2d',
  category: 'basic',
  color: '#f472b6',
  params: {
    kernel_size: { type: 'int', default: 2, min: 1, max: 16, label: 'Kernel Size' },
    stride: { type: 'int', default: 2, min: 1, max: 16, label: 'Stride' },
    padding: { type: 'int', default: 0, min: 0, max: 8, label: 'Padding' },
  },
  inputs: [{ id: 'in', label: 'Input', required: true }],
  outputs: [{ id: 'out', label: 'Output', required: true }],
  inferShape: (inputs, params) => {
    if (!inputs[0]) return [[0, 0, 0]];
    const [c, h, w] = inputs[0];
    const k = params.kernel_size as number;
    const s = params.stride as number;
    const p = params.padding as number;
    return [[c, Math.floor((h + 2 * p - k) / s) + 1, Math.floor((w + 2 * p - k) / s) + 1]];
  },
  estimateFLOPs: (inputs, params) => {
    const c = inputs[0]?.[0] || 0;
    const h = inputs[0]?.[1] || 0;
    const w = inputs[0]?.[2] || 0;
    const k = params.kernel_size as number;
    const s = params.stride as number;
    const p = params.padding as number;
    const hOut = Math.floor((h + 2 * p - k) / s) + 1;
    const wOut = Math.floor((w + 2 * p - k) / s) + 1;
    return c * hOut * wOut * k * k;
  },
});

MODULE_REGISTRY.register({
  type: 'Flatten',
  label: 'Flatten',
  category: 'basic',
  color: '#fbbf24',
  params: {
    start_dim: { type: 'int', default: 1, min: 0, max: 4, label: 'Start Dim' },
    end_dim: { type: 'int', default: -1, min: -4, max: 4, label: 'End Dim' },
  },
  inputs: [{ id: 'in', label: 'Input', required: true }],
  outputs: [{ id: 'out', label: 'Output', required: true }],
  inferShape: (inputs) => {
    if (!inputs[0]) return [[0]];
    const shape = inputs[0];
    if (shape.length === 3) return [[shape[0] * shape[1] * shape[2]]];
    if (shape.length === 2) return [[shape[0] * shape[1]]];
    return [shape];
  },
});

MODULE_REGISTRY.register({
  type: 'Linear',
  label: 'Linear',
  category: 'basic',
  color: '#6366f1',
  params: {
    out_features: { type: 'int', default: 1000, min: 1, max: 100000, label: 'Out Features' },
    bias: { type: 'bool', default: true, label: 'Bias' },
  },
  inputs: [{ id: 'in', label: 'Input', required: true }],
  outputs: [{ id: 'out', label: 'Output', required: true }],
  inferShape: (inputs, params) => {
    if (!inputs[0]) return [[0]];
    return [[params.out_features as number]];
  },
  estimateParams: (inputs, params) => {
    const inF = inputs[0]?.[0] || 0;
    const outF = params.out_features as number;
    const bias = params.bias as boolean;
    return inF * outF + (bias ? outF : 0);
  },
  estimateFLOPs: (inputs, params) => {
    const inF = inputs[0]?.[0] || 0;
    const outF = params.out_features as number;
    return inF * outF;
  },
});

MODULE_REGISTRY.register({
  type: 'CA',
  label: 'Coordinate Attention',
  category: 'attention',
  color: '#fb923c',
  params: {
    reduction: { type: 'int', default: 32, min: 1, max: 128, label: 'Reduction' },
  },
  inputs: [{ id: 'in', label: 'Input', required: true }],
  outputs: [{ id: 'out', label: 'Output', required: true }],
  inferShape: (inputs) => (inputs[0] ? [inputs[0]] : [[0, 0, 0]]),
});

MODULE_REGISTRY.register({
  type: 'SimAM',
  label: 'SimAM',
  category: 'attention',
  color: '#e879f9',
  params: {
    lambda_val: { type: 'float', default: 0.0001, min: 0, max: 1, label: 'Lambda' },
  },
  inputs: [{ id: 'in', label: 'Input', required: true }],
  outputs: [{ id: 'out', label: 'Output', required: true }],
  inferShape: (inputs) => (inputs[0] ? [inputs[0]] : [[0, 0, 0]]),
});

/** Get modules grouped by category */
export function getModulesByCategory(): Record<string, ModuleDefinition[]> {
  return MODULE_REGISTRY.getGroupedByCategory();
}

/** Category display names */
export const CATEGORY_LABELS: Record<string, string> = {
  input: 'Input',
  basic: 'Basic',
  composite: 'Composite',
  attention: 'Attention',
  head: 'Head',
  connector: 'Connector',
};
