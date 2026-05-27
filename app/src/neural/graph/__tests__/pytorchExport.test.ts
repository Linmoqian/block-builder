import { describe, it, expect } from 'vitest';
import { exportPyTorch } from '../pytorchExport';
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

describe('exportPyTorch', () => {
  it('简单 Input→Conv 图应生成包含 nn.Conv2d 的代码', () => {
    const graph = makeGraph(
      [inputNode, convNode],
      [{ id: 'e1', source: 'input_0', target: 'conv_0', sourceHandle: 'out', targetHandle: 'in' }],
    );
    const code = exportPyTorch(graph);
    expect(code).toContain('nn.Conv2d');
    expect(code).toContain('64');
  });

  it('包含 C2f 的图应生成 C2f 辅助类', () => {
    const c2fNode: GraphNode = {
      id: 'c2f_0',
      type: 'C2f',
      position: { x: 0, y: 240 },
      params: { out_channels: 128, n: 3 },
    };
    const graph = makeGraph(
      [inputNode, convNode, c2fNode],
      [
        { id: 'e1', source: 'input_0', target: 'conv_0', sourceHandle: 'out', targetHandle: 'in' },
        { id: 'e2', source: 'conv_0', target: 'c2f_0', sourceHandle: 'out', targetHandle: 'in' },
      ],
    );
    const code = exportPyTorch(graph);
    expect(code).toContain('class C2f(nn.Module)');
  });

  it('生成的代码应包含 class CustomModel', () => {
    const graph = makeGraph(
      [inputNode, convNode],
      [{ id: 'e1', source: 'input_0', target: 'conv_0', sourceHandle: 'out', targetHandle: 'in' }],
    );
    const code = exportPyTorch(graph);
    expect(code).toContain('class CustomModel(nn.Module)');
    expect(code).toContain('def forward(self, x)');
    expect(code).toContain('import torch');
    expect(code).toContain('import torch.nn as nn');
  });
});
