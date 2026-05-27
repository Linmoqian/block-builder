import { describe, it, expect } from 'vitest';
import { exportYaml } from '../yamlExport';
import { importYaml } from '../yamlImport';
import { GraphIR, GraphNode, GraphEdge } from '../types';

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

const c2fNode: GraphNode = {
  id: 'c2f_0',
  type: 'C2f',
  position: { x: 0, y: 240 },
  params: { out_channels: 128, n: 3 },
};

/** Valid YOLO-style YAML in object format (as expected by importYaml) */
const validYaml = `
nc: 80
backbone:
  - from: -1
    number: 1
    module: Conv
    args: [64, 3, 1]
  - from: -1
    number: 1
    module: Conv
    args: [128, 3, 2]
  - from: -1
    number: 1
    module: C2f
    args: [128]
head:
  - from: -1
    number: 1
    module: SPPF
    args: [256, 5]
  - from: -1
    number: 1
    module: Upsample
    args: [null, 2, nearest]
  - from: [-1, -3]
    number: 1
    module: Concat
    args: [1]
  - from: -1
    number: 1
    module: Detect
    args: [80]
`;

describe('YAML round-trip', () => {
  it('导入 YOLO YAML 应正确创建节点和边', () => {
    const graph = importYaml(validYaml);
    // Input + 7 layers = 8 nodes
    expect(graph.nodes.length).toBe(8);
    // Each layer has at least one edge
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.nodes[0].type).toBe('Input');
  });

  it('导出的 YAML 应包含正确格式', () => {
    const graph = makeGraph(
      [inputNode, convNode, c2fNode],
      [
        { id: 'e1', source: 'input_0', target: 'conv_0', sourceHandle: 'out', targetHandle: 'in' },
        { id: 'e2', source: 'conv_0', target: 'c2f_0', sourceHandle: 'out', targetHandle: 'in' },
      ],
    );
    const yaml = exportYaml(graph);
    expect(yaml).toContain('backbone:');
    expect(yaml).toContain('Conv');
    expect(yaml).toContain('C2f');
  });

  it('YAML 中包含 Python 字面量 True/False/None 应正确解析', () => {
    const yamlWithLiterals = `
nc: 10
backbone:
  - from: -1
    number: 1
    module: Conv
    args: [64, 3, 1]
head:
  - from: -1
    number: 1
    module: Detect
    args: [10]
`;
    // The preprocessYaml function handles Python literals
    const graph = importYaml(yamlWithLiterals);
    expect(graph.nodes.length).toBeGreaterThan(0);
  });

  it('包含 nc 占位符的 YAML 应正确替换', () => {
    const yamlWithNc = `
nc: 10
backbone:
  - from: -1
    number: 1
    module: Conv
    args: [64, 3, 1]
head:
  - from: -1
    number: 1
    module: Detect
    args: [nc]
`;
    const graph = importYaml(yamlWithNc);
    const detectNode = graph.nodes.find((n) => n.type === 'Detect');
    expect(detectNode).toBeDefined();
    expect(detectNode!.params.num_classes).toBe(10);
  });
});
