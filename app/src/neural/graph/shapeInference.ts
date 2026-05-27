import { GraphIR, GraphNode, TensorShape, InferredShape } from './types';
import { MODULE_REGISTRY } from './registry';

export function topologicalSort(graph: GraphIR): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of graph.nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    result.push(nodeId);
    for (const neighbor of adjacency.get(nodeId) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // Detect cycles: nodes not in result are part of a cycle
  if (result.length < graph.nodes.length) {
    const cyclic = graph.nodes.filter((n) => !result.includes(n.id)).map((n) => n.id);
    console.warn(`Cycle detected involving nodes: ${cyclic.join(', ')}`);
  }

  return result;
}

export function inferAllShapes(graph: GraphIR): Map<string, InferredShape> {
  const sorted = topologicalSort(graph);
  const shapeMap = new Map<string, InferredShape>();

  for (const nodeId of sorted) {
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const def = MODULE_REGISTRY.get(node.type);
    if (!def) {
      shapeMap.set(nodeId, {
        nodeId,
        outputShapes: [[0, 0, 0]],
        hasError: true,
        errorMessage: `Unknown module type: ${node.type}`,
      });
      continue;
    }

    // Gather input shapes from upstream edges (always push one entry per port)
    const inputShapes: TensorShape[] = [];
    for (const inputPort of def.inputs) {
      const edge = graph.edges.find(
        (e) => e.target === nodeId && e.targetHandle === inputPort.id
      );
      if (edge) {
        const upstream = shapeMap.get(edge.source);
        if (upstream && upstream.outputShapes.length > 0) {
          const sourceNode = graph.nodes.find((n) => n.id === edge.source);
          const sourceDef = sourceNode ? MODULE_REGISTRY.get(sourceNode.type) ?? null : null;
          const portIndex = sourceDef
            ? sourceDef.outputs.findIndex((p) => p.id === edge.sourceHandle)
            : 0;
          inputShapes.push(upstream.outputShapes[portIndex] || [0, 0, 0]);
        } else {
          inputShapes.push([0, 0, 0]);
        }
      } else {
        inputShapes.push([0, 0, 0]);
      }
    }

    const outputShapes = def.inferShape(inputShapes, node.params);

    // Detect errors
    let hasError = false;
    let errorMessage: string | undefined;

    // Check for missing inputs
    const missingInputs = def.inputs.filter(
      (port, i) => port.required && !inputShapes[i]
    );
    if (missingInputs.length > 0) {
      hasError = true;
      errorMessage = `缺少输入: ${missingInputs.map((p) => p.label).join(', ')}`;
    }

    // Check for zero-dimension outputs (upstream disconnected)
    if (!hasError && outputShapes.some((s) => s[0] === 0 && def.inputs.length > 0)) {
      hasError = true;
      errorMessage = '输入未连接';
    }

    // Check for mismatch sentinel (from Concat spatial dimension mismatch)
    if (!hasError && outputShapes.some((s) => s[0] === -1)) {
      hasError = true;
      if (node.type === 'Concat' && inputShapes[0] && inputShapes[1]) {
        const shapeA = inputShapes[0];
        const shapeB = inputShapes[1];
        errorMessage = `Concat 空间维度不匹配：输入 A [${shapeA[1]},${shapeA[2]}]，输入 B [${shapeB[1]},${shapeB[2]}]。建议在空间维度较小的输入前添加 Upsample 节点。`;
      } else {
        errorMessage = '维度不匹配';
      }
    }

    shapeMap.set(nodeId, {
      nodeId,
      outputShapes,
      hasError,
      errorMessage,
    });
  }

  return shapeMap;
}
