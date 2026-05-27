import { GraphIR, GraphNode, ParamValue } from './types';
import { MODULE_REGISTRY } from './registry';
import { topologicalSort } from './shapeInference';

function indent(code: string, level: number): string {
  const spaces = '    '.repeat(level);
  return code.split('\n').map((line) => spaces + line).join('\n');
}

function getVarName(nodeId: string): string {
  return nodeId.replace(/[^a-zA-Z0-9_]/g, '_');
}

/** Generate the helper class for C2f */
function genC2fClass(): string {
  return `class C2f(nn.Module):
    def __init__(self, c1, c2, n=1):
        super().__init__()
        self.cv1 = nn.Conv2d(c1, c2, 1)
        self.cv2 = nn.Conv2d(c2 * (n + 2), c2, 1)
        self.bottlenecks = nn.ModuleList([
            nn.Sequential(nn.Conv2d(c2 // 2, c2 // 2, 3, padding=1), nn.BatchNorm2d(c2 // 2), nn.SiLU())
            for _ in range(n)
        ])

    def forward(self, x):
        y = list(self.cv1(x).chunk(2, 1))
        for b in self.bottlenecks:
            y.append(b(y[-1]))
        return self.cv2(torch.cat(y, 1))`;
}

/** Generate the helper class for SPPF */
function genSPPFClass(): string {
  return `class SPPF(nn.Module):
    def __init__(self, c1, c2, k=5):
        super().__init__()
        c_ = c1 // 2
        self.cv1 = nn.Conv2d(c1, c_, 1)
        self.cv2 = nn.Conv2d(c_ * 4, c2, 1)
        self.pool = nn.MaxPool2d(k, 1, k // 2)

    def forward(self, x):
        y = [self.cv1(x)]
        y.extend(self.pool(y[-1]) for _ in range(3))
        return self.cv2(torch.cat(y, 1))`;
}

/** Generate the helper class for CBAM */
function genCBAMClass(): string {
  return `class CBAM(nn.Module):
    def __init__(self, c, reduction=16):
        super().__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.max_pool = nn.AdaptiveMaxPool2d(1)
        self.fc = nn.Sequential(nn.Linear(c, c // reduction), nn.ReLU(), nn.Linear(c // reduction, c))
        self.conv = nn.Conv2d(2, 1, 7, padding=3)

    def forward(self, x):
        b, c, _, _ = x.size()
        avg_out = self.fc(self.avg_pool(x).view(b, c))
        max_out = self.fc(self.max_pool(x).view(b, c))
        att = torch.sigmoid(avg_out + max_out).view(b, c, 1, 1)
        x = x * att
        avg_out = torch.mean(x, 1, keepdim=True)
        max_out, _ = torch.max(x, 1, keepdim=True)
        spatial = torch.sigmoid(self.conv(torch.cat([avg_out, max_out], 1)))
        return x * spatial`;
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

  const lines: string[] = [];

  // Imports
  lines.push('import torch');
  lines.push('import torch.nn as nn');
  if (usedTypes.has('Upsample')) {
    lines.push('import torch.nn.functional as F');
  }
  lines.push('');

  // Helper classes
  if (needC2f) { lines.push(genC2fClass()); lines.push(''); }
  if (needSPPF) { lines.push(genSPPFClass()); lines.push(''); }
  if (needCBAM) { lines.push(genCBAMClass()); lines.push(''); }

  // Main model class
  lines.push('class CustomModel(nn.Module):');
  lines.push('    def __init__(self):');
  lines.push('        super().__init__()');

  for (const node of nodes) {
    const varName = getVarName(node.id);
    const p = node.params;

    switch (node.type) {
      case 'Input':
        lines.push(`        # Input: [${p.channels}, ${p.height}, ${p.width}]`);
        break;
      case 'Conv': {
        const k = p.kernel_size as number;
        lines.push(`        self.${varName} = nn.Sequential(nn.Conv2d(${getInputChannels(graph, node)}, ${p.out_channels}, ${k}, stride=${p.stride}, padding=${Math.floor(k / 2)}), nn.BatchNorm2d(${p.out_channels}), nn.SiLU())`);
        break;
      }
      case 'C2f':
        lines.push(`        self.${varName} = C2f(${getInputChannels(graph, node)}, ${p.out_channels}, n=${p.n})`);
        break;
      case 'SPPF':
        lines.push(`        self.${varName} = SPPF(${getInputChannels(graph, node)}, ${p.out_channels}, k=${p.kernel_size})`);
        break;
      case 'CBAM':
        lines.push(`        self.${varName} = CBAM(${getInputChannels(graph, node)}, reduction=${p.reduction})`);
        break;
      case 'Upsample':
        lines.push(`        # Upsample: scale_factor=${p.scale_factor}, mode=${p.mode}`);
        break;
      case 'Concat':
        lines.push(`        # Concat: axis=${p.axis}`);
        break;
      case 'Detect':
        lines.push(`        # Detect: num_classes=${p.num_classes}`);
        break;
      case 'BatchNorm2d':
        lines.push(`        self.${varName} = nn.BatchNorm2d(${getInputChannels(graph, node)})`);
        break;
      case 'SiLU':
        lines.push(`        self.${varName} = nn.SiLU()`);
        break;
      case 'MaxPool2d':
        lines.push(`        self.${varName} = nn.MaxPool2d(kernel_size=${p.kernel_size}, stride=${p.stride}, padding=${p.padding})`);
        break;
      case 'Flatten':
        lines.push(`        self.${varName} = nn.Flatten(start_dim=${p.start_dim}, end_dim=${p.end_dim})`);
        break;
      case 'Linear':
        lines.push(`        self.${varName} = nn.Linear(${getInputChannels(graph, node)}, ${p.out_features}, bias=${p.bias})`);
        break;
      case 'CA':
        lines.push(`        # TODO: Coordinate Attention`);
        break;
      case 'SimAM':
        lines.push(`        # TODO: SimAM`);
        break;
    }
  }

  lines.push('');

  // Forward method
  lines.push('    def forward(self, x):');
  const inputNode = nodes.find((n) => n.type === 'Input');
  if (inputNode) {
    lines.push(`        # Input shape: [${inputNode.params.channels}, ${inputNode.params.height}, ${inputNode.params.width}]`);
  }

  for (const node of nodes) {
    if (node.type === 'Input') continue;

    const varName = getVarName(node.id);
    const incomingEdges = graph.edges.filter((e) => e.target === node.id);

    if (node.type === 'Concat' && incomingEdges.length >= 2) {
      const srcVars = incomingEdges.map((e) => getVarName(e.source));
      lines.push(`        ${varName} = torch.cat([${srcVars.join(', ')}], dim=${node.params.axis})`);
    } else if (node.type === 'Upsample') {
      const srcVar = incomingEdges.length > 0 ? getVarName(incomingEdges[0].source) : 'x';
      lines.push(`        ${varName} = F.interpolate(${srcVar}, scale_factor=${node.params.scale_factor}, mode='${node.params.mode}')`);
    } else if (node.type === 'Detect') {
      lines.push(`        # Detect head (placeholder)`);
      lines.push(`        ${varName} = x`);
    } else if (node.type === 'CA') {
      const srcVar = incomingEdges.length > 0 ? getVarName(incomingEdges[0].source) : 'x';
      lines.push(`        ${varName} = ${srcVar}  # CA placeholder`);
    } else if (node.type === 'SimAM') {
      const srcVar = incomingEdges.length > 0 ? getVarName(incomingEdges[0].source) : 'x';
      lines.push(`        ${varName} = ${srcVar}  # SimAM placeholder`);
    } else {
      const srcVar = incomingEdges.length > 0 ? getVarName(incomingEdges[0].source) : 'x';
      lines.push(`        ${varName} = self.${varName}(${srcVar})`);
    }

    // Update x reference for sequential nodes
    if (node.type !== 'Input') {
      lines.push(`        x = ${varName}`);
    }
  }

  lines.push('        return x');
  lines.push('');

  // Test block
  lines.push('');
  lines.push('if __name__ == "__main__":');
  if (inputNode) {
    lines.push(`    model = CustomModel()`);
    lines.push(`    x = torch.randn(1, ${inputNode.params.channels}, ${inputNode.params.height}, ${inputNode.params.width})`);
    lines.push(`    y = model(x)`);
    lines.push(`    print(f"Output shape: {y.shape}")`);
  } else {
    lines.push(`    model = CustomModel()`);
    lines.push(`    print(model)`);
  }

  return lines.join('\n');
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
