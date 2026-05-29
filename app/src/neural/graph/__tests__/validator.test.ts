import { describe, it, expect } from 'vitest';
import { validateGraph } from '../validator';
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

describe('validateGraph', () => {
  it('空图应无错误', () => {
    const errors = validateGraph(makeGraph([], []));
    expect(errors).toHaveLength(0);
  });

  it('有环图应返回 cycle 错误', () => {
    const graph = makeGraph(
      [convNode, { ...convNode, id: 'conv_1' }],
      [
        { id: 'e1', source: 'conv_0', target: 'conv_1', sourceHandle: 'out', targetHandle: 'in' },
        { id: 'e2', source: 'conv_1', target: 'conv_0', sourceHandle: 'out', targetHandle: 'in' },
      ],
    );
    const errors = validateGraph(graph);
    expect(errors.some((e) => e.type === 'cycle')).toBe(true);
  });

  it('Detect 节点缺少必需输入应返回 missing_input 错误', () => {
    const detectNode: GraphNode = {
      id: 'detect_0',
      type: 'Detect',
      position: { x: 0, y: 240 },
      params: { num_classes: 80 },
    };
    const graph = makeGraph([detectNode], []);
    const errors = validateGraph(graph);
    const missingErrors = errors.filter((e) => e.type === 'missing_input');
    // Detect requires 3 inputs (p3, p4, p5)
    expect(missingErrors.length).toBeGreaterThanOrEqual(3);
  });

  it('无边连接的孤立节点应返回 disconnected 错误', () => {
    const graph = makeGraph([convNode], []);
    const errors = validateGraph(graph);
    expect(errors.some((e) => e.type === 'disconnected')).toBe(true);
  });

  it('Concat 两输入空间维度不匹配应返回 dimension_mismatch 错误', () => {
    const conv1: GraphNode = {
      id: 'conv_a',
      type: 'Conv',
      position: { x: 0, y: 120 },
      params: { out_channels: 64, kernel_size: 3, stride: 1 },
    };
    const conv2: GraphNode = {
      id: 'conv_b',
      type: 'Conv',
      position: { x: 200, y: 120 },
      params: { out_channels: 128, kernel_size: 3, stride: 2 },
    };
    const concatNode: GraphNode = {
      id: 'concat_0',
      type: 'Concat',
      position: { x: 100, y: 240 },
      params: { axis: 0 },
    };
    const graph = makeGraph(
      [inputNode, conv1, conv2, concatNode],
      [
        { id: 'e1', source: 'input_0', target: 'conv_a', sourceHandle: 'out', targetHandle: 'in' },
        { id: 'e2', source: 'input_0', target: 'conv_b', sourceHandle: 'out', targetHandle: 'in' },
        { id: 'e3', source: 'conv_a', target: 'concat_0', sourceHandle: 'out', targetHandle: 'in_0' },
        { id: 'e4', source: 'conv_b', target: 'concat_0', sourceHandle: 'out', targetHandle: 'in_1' },
      ],
    );

    // Build a shapeMap that triggers dimension mismatch
    const shapeMap = new Map<string, InferredShape>();
    shapeMap.set('input_0', { nodeId: 'input_0', inputShapes: [], outputShapes: [[3, 640, 640]], hasError: false });
    shapeMap.set('conv_a', { nodeId: 'conv_a', inputShapes: [[3, 640, 640]], outputShapes: [[64, 640, 640]], hasError: false });
    shapeMap.set('conv_b', { nodeId: 'conv_b', inputShapes: [[64, 640, 640]], outputShapes: [[128, 320, 320]], hasError: false });
    shapeMap.set('concat_0', {
      nodeId: 'concat_0',
      inputShapes: [[64, 640, 640], [128, 320, 320]],
      outputShapes: [[-1, -1, -1]],
      hasError: true,
      errorMessage: 'Concat 空间维度不匹配',
    });

    const errors = validateGraph(graph, shapeMap);
    expect(errors.some((e) => e.type === 'dimension_mismatch')).toBe(true);
  });
});
