import { GraphIR, GraphNode } from './types';
import { topologicalSort } from './shapeInference';
import { CodeBuilder } from './codeBuilder';
import { C2F_CLASS, SPPF_CLASS, CBAM_CLASS } from './templates';

function getVarName(nodeId: string): string {
  return nodeId.replace(/[^a-zA-Z0-9_]/g, '_');
}

function addHelperClass(builder: CodeBuilder, code: string): void {
  code.split('\n').forEach((line) => builder.addLine(line));
}

export function exportPyTorch(graph: GraphIR): string {
  const sorted = topologicalSort(graph);
  const nodes = sorted
    .map((id) => graph.nodes.find((n) => n.id === id)!)
    .filter(Boolean);

  // Detect which helper classes are needed
  const usedTypes = new Set(nodes.map((n) => n.type));
  const needC2f = usedTypes.has('C2f');
  const needSPPF = usedTypes.has('SPPF');
  const needCBAM = usedTypes.has('CBAM');

  const b = new CodeBuilder();

  // Imports
  b.addLine('import torch');
  b.addLine('import torch.nn as nn');
  if (usedTypes.has('Upsample')) {
    b.addLine('import torch.nn.functional as F');
  }
  b.blank();

  // Helper classes
  if (needC2f) { addHelperClass(b, C2F_CLASS); b.blank(); }
  if (needSPPF) { addHelperClass(b, SPPF_CLASS); b.blank(); }
  if (needCBAM) { addHelperClass(b, CBAM_CLASS); b.blank(); }

  // Main model class
  b.addLine('class CustomModel(nn.Module):');
  b.indent();
  b.addLine('def __init__(self):');
  b.indent();
  b.addLine('super().__init__()');

  for (const node of nodes) {
    const varName = getVarName(node.id);
    const p = node.params;

    switch (node.type) {
      case 'Input':
        b.addLine(`# Input: [${p.channels}, ${p.height}, ${p.width}]`);
        break;
      case 'Conv': {
        const k = p.kernel_size as number;
        b.addLine(`self.${varName} = nn.Sequential(nn.Conv2d(${getInputChannels(graph, node)}, ${p.out_channels}, ${k}, stride=${p.stride}, padding=${Math.floor(k / 2)}), nn.BatchNorm2d(${p.out_channels}), nn.SiLU())`);
        break;
      }
      case 'C2f':
        b.addLine(`self.${varName} = C2f(${getInputChannels(graph, node)}, ${p.out_channels}, n=${p.n})`);
        break;
      case 'SPPF':
        b.addLine(`self.${varName} = SPPF(${getInputChannels(graph, node)}, ${p.out_channels}, k=${p.kernel_size})`);
        break;
      case 'CBAM':
        b.addLine(`self.${varName} = CBAM(${getInputChannels(graph, node)}, reduction=${p.reduction})`);
        break;
      case 'Upsample':
        b.addLine(`# Upsample: scale_factor=${p.scale_factor}, mode=${p.mode}`);
        break;
      case 'Concat':
        b.addLine(`# Concat: axis=${p.axis}`);
        break;
      case 'Detect':
        b.addLine(`# Detect: num_classes=${p.num_classes}`);
        break;
      case 'BatchNorm2d':
        b.addLine(`self.${varName} = nn.BatchNorm2d(${getInputChannels(graph, node)})`);
        break;
      case 'SiLU':
        b.addLine(`self.${varName} = nn.SiLU()`);
        break;
      case 'MaxPool2d':
        b.addLine(`self.${varName} = nn.MaxPool2d(kernel_size=${p.kernel_size}, stride=${p.stride}, padding=${p.padding})`);
        break;
      case 'Flatten':
        b.addLine(`self.${varName} = nn.Flatten(start_dim=${p.start_dim}, end_dim=${p.end_dim})`);
        break;
      case 'Linear':
        b.addLine(`self.${varName} = nn.Linear(${getInputChannels(graph, node)}, ${p.out_features}, bias=${p.bias})`);
        break;
      case 'CA':
        b.addLine(`# TODO: Coordinate Attention`);
        break;
      case 'SimAM':
        b.addLine(`# TODO: SimAM`);
        break;
    }
  }

  b.blank();
  b.dedent(); // back to class level for forward method

  // Forward method
  b.addLine('def forward(self, x):');
  b.indent();
  const inputNode = nodes.find((n) => n.type === 'Input');
  if (inputNode) {
    b.addLine(`# Input shape: [${inputNode.params.channels}, ${inputNode.params.height}, ${inputNode.params.width}]`);
  }

  for (const node of nodes) {
    if (node.type === 'Input') continue;

    const varName = getVarName(node.id);
    const incomingEdges = graph.edges.filter((e) => e.target === node.id);

    if (node.type === 'Concat' && incomingEdges.length >= 2) {
      const srcVars = incomingEdges.map((e) => getVarName(e.source));
      b.addLine(`${varName} = torch.cat([${srcVars.join(', ')}], dim=${node.params.axis})`);
    } else if (node.type === 'Upsample') {
      const srcVar = incomingEdges.length > 0 ? getVarName(incomingEdges[0].source) : 'x';
      b.addLine(`${varName} = F.interpolate(${srcVar}, scale_factor=${node.params.scale_factor}, mode='${node.params.mode}')`);
    } else if (node.type === 'Detect') {
      b.addLine(`# Detect head (placeholder)`);
      b.addLine(`${varName} = x`);
    } else if (node.type === 'CA') {
      const srcVar = incomingEdges.length > 0 ? getVarName(incomingEdges[0].source) : 'x';
      b.addLine(`${varName} = ${srcVar}  # CA placeholder`);
    } else if (node.type === 'SimAM') {
      const srcVar = incomingEdges.length > 0 ? getVarName(incomingEdges[0].source) : 'x';
      b.addLine(`${varName} = ${srcVar}  # SimAM placeholder`);
    } else {
      const srcVar = incomingEdges.length > 0 ? getVarName(incomingEdges[0].source) : 'x';
      b.addLine(`${varName} = self.${varName}(${srcVar})`);
    }

    // Update x reference for sequential nodes
    if (node.type !== 'Input') {
      b.addLine(`x = ${varName}`);
    }
  }

  b.addLine('return x');
  b.dedent(); // forward method
  b.dedent(); // class
  b.blank();
  b.blank();

  // Test block
  b.addLine('if __name__ == "__main__":');
  b.indent();
  if (inputNode) {
    b.addLine(`model = CustomModel()`);
    b.addLine(`x = torch.randn(1, ${inputNode.params.channels}, ${inputNode.params.height}, ${inputNode.params.width})`);
    b.addLine(`y = model(x)`);
    b.addLine(`print(f"Output shape: {y.shape}")`);
  } else {
    b.addLine(`model = CustomModel()`);
    b.addLine(`print(model)`);
  }

  return b.toString();
}

/** Get input channels for a node by looking at its upstream node's output */
function getInputChannels(graph: GraphIR, node: GraphNode): number {
  const incomingEdge = graph.edges.find((e) => e.target === node.id);
  if (!incomingEdge) return 3;

  const srcNode = graph.nodes.find((n) => n.id === incomingEdge.source);
  if (!srcNode) return 3;

  switch (srcNode.type) {
    case 'Input': return srcNode.params.channels as number;
    case 'Conv': return srcNode.params.out_channels as number;
    case 'C2f': return srcNode.params.out_channels as number;
    case 'SPPF': return srcNode.params.out_channels as number;
    case 'CBAM': return getInputChannels(graph, srcNode);
    case 'BatchNorm2d': return getInputChannels(graph, srcNode);
    case 'SiLU': return getInputChannels(graph, srcNode);
    case 'CA': return getInputChannels(graph, srcNode);
    case 'SimAM': return getInputChannels(graph, srcNode);
    case 'Concat': return getInputChannels(graph, srcNode);
    default: return 64;
  }
}
