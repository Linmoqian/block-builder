import { describe, it, expect } from 'vitest';
import { computeModelStats, formatParams, formatFLOPs } from '../modelStats';
import { GraphIR, GraphNode, GraphEdge, InferredShape } from '../types';

function makeGraph(nodes: GraphNode[], edges: GraphEdge[]): GraphIR {
  return { nodes, edges };
}

const inputNode: GraphNode = {
  id: 'input_0',
  type: 'Input',
  position: { x: 0, y: 0 },
  params: { channels: 3, height: 640, width: 640 },
};

const convNode: GraphNode = {
  id: 'conv_0',
  type: 'Conv',
  position: { x: 0, y: 120 },
  params: { out_channels: 64, kernel_size: 3, stride: 1 },
};

describe('computeModelStats', () => {
  it('空图应返回 0 params, 0 FLOPs', () => {
    const graph = makeGraph([], []);
    const shapeMap = new Map<string, InferredShape>();
    const stats = computeModelStats(graph, shapeMap);
    expect(stats.totalParams).toBe(0);
    expect(stats.totalFLOPs).toBe(0);
  });

  it('单个 Conv 应返回非零 params 和 FLOPs', () => {
    const graph = makeGraph(
      [inputNode, convNode],
      [{ id: 'e1', source: 'input_0', target: 'conv_0', sourceHandle: 'out', targetHandle: 'in' }],
    );
    const shapeMap = new Map<string, InferredShape>();
    shapeMap.set('input_0', { nodeId: 'input_0', outputShapes: [[3, 640, 640]], hasError: false });
    shapeMap.set('conv_0', { nodeId: 'conv_0', outputShapes: [[64, 640, 640]], hasError: false });

    const stats = computeModelStats(graph, shapeMap);
    // Conv params: 3 * 64 * 3 * 3 + 64 * 2 = 1728 + 128 = 1856
    expect(stats.totalParams).toBeGreaterThan(0);
    // Conv FLOPs: 3 * 64 * 3 * 3 * 640 * 640
    expect(stats.totalFLOPs).toBeGreaterThan(0);
  });
});

describe('formatParams', () => {
  it('小于 1K 直接显示数字', () => {
    expect(formatParams(500)).toBe('500');
  });

  it('1K-1M 显示 K', () => {
    expect(formatParams(1500)).toBe('1.5K');
    expect(formatParams(999999)).toBe('1000.0K');
  });

  it('大于等于 1M 显示 M', () => {
    expect(formatParams(1_500_000)).toBe('1.5M');
    expect(formatParams(25_000_000)).toBe('25.0M');
  });
});

describe('formatFLOPs', () => {
  it('小于 1K 直接显示', () => {
    expect(formatFLOPs(500)).toBe('500');
  });

  it('1K-1M 显示 K', () => {
    expect(formatFLOPs(5000)).toBe('5.0K');
  });

  it('1M-1G 显示 M', () => {
    expect(formatFLOPs(5_000_000)).toBe('5.0M');
  });

  it('大于等于 1G 显示 G', () => {
    expect(formatFLOPs(2_500_000_000)).toBe('2.5G');
  });
});
