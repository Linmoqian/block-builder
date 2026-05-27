import { GraphIR, InferredShape } from './types';
import { topologicalSort } from './shapeInference';
import { MODULE_REGISTRY } from './registry';

export interface ModelStats {
  totalParams: number;
  totalFLOPs: number;
}

export function computeModelStats(
  graph: GraphIR,
  shapeMap: Map<string, InferredShape>,
): ModelStats {
  let totalParams = 0;
  let totalFLOPs = 0;

  const sorted = topologicalSort(graph);

  for (const nodeId of sorted) {
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const def = MODULE_REGISTRY.get(node.type);
    if (!def) continue;

    // Gather input shapes from upstream edges (match shapeInference logic)
    const inputShapes = def.inputs.map((inputPort) => {
      const edge = graph.edges.find(
        (e) => e.target === nodeId && e.targetHandle === inputPort.id,
      );
      if (!edge) return null;
      const upstream = shapeMap.get(edge.source);
      if (!upstream || upstream.outputShapes.length === 0) return null;
      const sourceNode = graph.nodes.find((n) => n.id === edge.source);
      const sourceDef = sourceNode ? MODULE_REGISTRY.get(sourceNode.type) ?? null : null;
      const portIndex = sourceDef
        ? sourceDef.outputs.findIndex((p) => p.id === edge.sourceHandle)
        : 0;
      return upstream.outputShapes[portIndex] || null;
    });

    if (def.estimateParams) {
      totalParams += def.estimateParams(inputShapes as never, node.params);
    }
    if (def.estimateFLOPs) {
      totalFLOPs += def.estimateFLOPs(inputShapes as never, node.params);
    }
  }

  return { totalParams, totalFLOPs };
}

/** 格式化参数量 */
export function formatParams(count: number): string {
  if (count >= 1e6) return `${(count / 1e6).toFixed(1)}M`;
  if (count >= 1e3) return `${(count / 1e3).toFixed(1)}K`;
  return `${count}`;
}

/** 格式化 FLOPs */
export function formatFLOPs(count: number): string {
  if (count >= 1e9) return `${(count / 1e9).toFixed(1)}G`;
  if (count >= 1e6) return `${(count / 1e6).toFixed(1)}M`;
  if (count >= 1e3) return `${(count / 1e3).toFixed(1)}K`;
  return `${count}`;
}
