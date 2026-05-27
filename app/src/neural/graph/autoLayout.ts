import { GraphIR, GraphNode } from './types';
import { topologicalSort } from './shapeInference';
import { MODULE_REGISTRY } from './registry';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;
const H_GAP = 60;
const V_GAP = 100;

export function autoLayout(graph: GraphIR): GraphIR {
  if (graph.nodes.length === 0) return graph;

  const sorted = topologicalSort(graph);
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  // Assign layers via topological sort depth
  const layerOf = new Map<string, number>();
  for (const nodeId of sorted) {
    const incomingEdges = graph.edges.filter((e) => e.target === nodeId);
    if (incomingEdges.length === 0) {
      layerOf.set(nodeId, 0);
    } else {
      const maxParentLayer = Math.max(
        ...incomingEdges.map((e) => layerOf.get(e.source) ?? 0)
      );
      layerOf.set(nodeId, maxParentLayer + 1);
    }
  }

  // Group nodes by layer
  const layers = new Map<number, string[]>();
  for (const [nodeId, layer] of layerOf) {
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(nodeId);
  }

  // Sort layers
  const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);

  // Assign positions
  const newNodes: GraphNode[] = [];

  for (const layerIdx of sortedLayers) {
    const nodeIds = layers.get(layerIdx)!;

    // Sort nodes within layer by their order in the topological sort
    nodeIds.sort((a, b) => sorted.indexOf(a) - sorted.indexOf(b));

    const totalWidth = nodeIds.length * NODE_WIDTH + (nodeIds.length - 1) * H_GAP;
    const startX = -totalWidth / 2 + NODE_WIDTH / 2;

    for (let i = 0; i < nodeIds.length; i++) {
      const node = nodeMap.get(nodeIds[i]);
      if (!node) continue;

      newNodes.push({
        ...node,
        position: {
          x: startX + i * (NODE_WIDTH + H_GAP),
          y: layerIdx * (NODE_HEIGHT + V_GAP),
        },
      });
    }
  }

  return { ...graph, nodes: newNodes };
}
