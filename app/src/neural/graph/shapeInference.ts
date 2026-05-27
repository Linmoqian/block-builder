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

  return result;
}

export function inferAllShapes(graph: GraphIR): Map<string, InferredShape> {
  const sorted = topologicalSort(graph);
  const shapeMap = new Map<string, InferredShape>();

  for (const nodeId of sorted) {
    const node = graph.nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    const def = MODULE_REGISTRY[node.type];
    if (!def) {
      shapeMap.set(nodeId, {
        nodeId,
        outputShapes: [[0, 0, 0]],
        hasError: true,
        errorMessage: `Unknown module type: ${node.type}`,
      });
      continue;
    }

    // Gather input shapes from upstream edges
    const inputShapes: TensorShape[] = [];
    for (const inputPort of def.inputs) {
      const edge = graph.edges.find(
        (e) => e.target === nodeId && e.targetHandle === inputPort.id
      );
      if (edge) {
        const upstream = shapeMap.get(edge.source);
        if (upstream && upstream.outputShapes.length > 0) {
          const sourceNode = graph.nodes.find((n) => n.id === edge.source);
          const sourceDef = sourceNode ? MODULE_REGISTRY[sourceNode.type] : null;
          const portIndex = sourceDef
            ? sourceDef.outputs.findIndex((p) => p.id === edge.sourceHandle)
            : 0;
          inputShapes.push(upstream.outputShapes[portIndex] || [0, 0, 0]);
        } else {
          inputShapes.push([0, 0, 0]);
        }
      } else if (inputPort.required) {
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
      errorMessage = `Missing input: ${missingInputs.map((p) => p.label).join(', ')}`;
    }

    // Check for zero-dimension outputs (upstream disconnected)
    if (!hasError && outputShapes.some((s) => s[0] === 0 && def.inputs.length > 0)) {
      hasError = true;
      errorMessage = 'Disconnected input';
    }

    // Check for mismatch sentinel
    if (!hasError && outputShapes.some((s) => s[0] === -1)) {
      hasError = true;
      errorMessage = 'Dimension mismatch';
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
