import { describe, it, expect } from 'vitest';
import { topologicalSort, inferAllShapes } from '../shapeInference';
import { GraphIR, GraphNode, GraphEdge } from '../types';

/** Helper: build a minimal GraphIR */
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

const convNode2: GraphNode = {
  id: 'conv_1',
  type: 'Conv',
  position: { x: 0, y: 240 },
  params: { out_channels: 128, kernel_size: 3, stride: 2 },
};

describe('topologicalSort', () => {
  it('线性图 A→B→C 应返回 [A, B, C]', () => {
    const graph = makeGraph(
      [inputNode, convNode, convNode2],
      [
        { id: 'e1', source: 'input_0', target: 'conv_0', sourceHandle: 'out', targetHandle: 'in' },
        { id: 'e2', source: 'conv_0', target: 'conv_1', sourceHandle: 'out', targetHandle: 'in' },
      ],
    );
    const result = topologicalSort(graph);
    expect(result).toEqual(['input_0', 'conv_0', 'conv_1']);
  });

  it('分支图 A→B, A→C 应返回合法拓扑序', () => {
    const nodeC: GraphNode = {
      id: 'c2f_0',
      type: 'C2f',
      position: { x: 100, y: 120 },
      params: { out_channels: 128, n: 3 },
    };
    const graph = makeGraph(
      [inputNode, convNode, nodeC],
      [
        { id: 'e1', source: 'input_0', target: 'conv_0', sourceHandle: 'out', targetHandle: 'in' },
        { id: 'e2', source: 'input_0', target: 'c2f_0', sourceHandle: 'out', targetHandle: 'in' },
      ],
    );
    const result = topologicalSort(graph);
    expect(result[0]).toBe('input_0');
    expect(result).toHaveLength(3);
    // conv_0 and c2f_0 can be in any order but both must appear after input_0
    expect(result.slice(1)).toEqual(expect.arrayContaining(['conv_0', 'c2f_0']));
  });

  it('有环的图应返回缺少循环节点的结果（不崩溃）', () => {
    const graph = makeGraph(
      [convNode, convNode2],
      [
        { id: 'e1', source: 'conv_0', target: 'conv_1', sourceHandle: 'out', targetHandle: 'in' },
        { id: 'e2', source: 'conv_1', target: 'conv_0', sourceHandle: 'out', targetHandle: 'in' },
      ],
    );
    const result = topologicalSort(graph);
    // Should not include cyclic nodes
    expect(result.length).toBeLessThan(graph.nodes.length);
  });
});

describe('inferAllShapes', () => {
  it('单个 Input 节点应输出正确形状 [3, 640, 640]', () => {
    const graph = makeGraph([inputNode], []);
    const shapes = inferAllShapes(graph);
    const result = shapes.get('input_0');
    expect(result).toBeDefined();
    expect(result!.outputShapes).toEqual([[3, 640, 640]]);
    expect(result!.hasError).toBe(false);
  });

  it('Input→Conv 应正确计算卷积输出形状', () => {
    const graph = makeGraph(
      [inputNode, convNode],
      [{ id: 'e1', source: 'input_0', target: 'conv_0', sourceHandle: 'out', targetHandle: 'in' }],
    );
    const shapes = inferAllShapes(graph);
    const convShape = shapes.get('conv_0');
    expect(convShape).toBeDefined();
    // Conv: k=3, s=1, p=1 => h_out = (640 + 2*1 - 3) / 1 + 1 = 640, same for w
    expect(convShape!.outputShapes).toEqual([[64, 640, 640]]);
    expect(convShape!.hasError).toBe(false);
  });

  it('Input→Conv→Conv 链式传播应正确', () => {
    const graph = makeGraph(
      [inputNode, convNode, convNode2],
      [
        { id: 'e1', source: 'input_0', target: 'conv_0', sourceHandle: 'out', targetHandle: 'in' },
        { id: 'e2', source: 'conv_0', target: 'conv_1', sourceHandle: 'out', targetHandle: 'in' },
      ],
    );
    const shapes = inferAllShapes(graph);
    const conv2Shape = shapes.get('conv_1');
    expect(conv2Shape).toBeDefined();
    // conv_0 outputs [64, 640, 640], conv_1: k=3, s=2, p=1 => (640+2-3)/2+1 = 320
    expect(conv2Shape!.outputShapes).toEqual([[128, 320, 320]]);
    expect(conv2Shape!.hasError).toBe(false);
  });

  it('Concat 两输入空间维度不匹配应标记 hasError=true', () => {
    const concatNode: GraphNode = {
      id: 'concat_0',
      type: 'Concat',
      position: { x: 0, y: 360 },
      params: { axis: 0 },
    };
    // conv_0: [64, 640, 640], conv_1 with stride=2: [128, 320, 320] — spatial mismatch
    const graph = makeGraph(
      [inputNode, convNode, convNode2, concatNode],
      [
        { id: 'e1', source: 'input_0', target: 'conv_0', sourceHandle: 'out', targetHandle: 'in' },
        { id: 'e2', source: 'input_0', target: 'conv_1', sourceHandle: 'out', targetHandle: 'in' },
        { id: 'e3', source: 'conv_0', target: 'concat_0', sourceHandle: 'out', targetHandle: 'in_0' },
        { id: 'e4', source: 'conv_1', target: 'concat_0', sourceHandle: 'out', targetHandle: 'in_1' },
      ],
    );
    const shapes = inferAllShapes(graph);
    const concatShape = shapes.get('concat_0');
    expect(concatShape).toBeDefined();
    expect(concatShape!.hasError).toBe(true);
  });

  it('断连节点（无输入边）的输出形状应包含零维度', () => {
    const graph = makeGraph([inputNode, convNode], []);
    // Conv has no incoming edge, inputShapes will be [[0,0,0]]
    const shapes = inferAllShapes(graph);
    const convShape = shapes.get('conv_0');
    expect(convShape).toBeDefined();
    // With zero input h=0, w=0: Conv outputs [64, 0, 0] — spatial dims are 0
    const output = convShape!.outputShapes[0];
    expect(output[1]).toBe(0);
    expect(output[2]).toBe(0);
  });
});
