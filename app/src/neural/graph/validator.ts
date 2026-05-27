import { GraphIR, InferredShape, ValidationError } from './types';
import { MODULE_REGISTRY } from './registry';

export function validateGraph(
  graph: GraphIR,
  shapeMap?: Map<string, InferredShape>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Cycle detection via DFS
  const cycleNodes = findCycleNodes(graph);
  if (cycleNodes.length > 0) {
    const labels = cycleNodes
      .map((id) => {
        const node = graph.nodes.find((n) => n.id === id);
        const def = node ? MODULE_REGISTRY.get(node.type) : null;
        return def ? `${def.label}(${id.slice(0, 6)})` : id.slice(0, 6);
      })
      .join(' → ');
    errors.push({
      type: 'cycle',
      message: `图中存在循环：${labels}`,
      suggestion: '删除形成循环的连线',
    });
  }

  // Missing required inputs
  for (const node of graph.nodes) {
    const def = MODULE_REGISTRY.get(node.type);
    if (!def) continue;

    for (const inputPort of def.inputs) {
      if (inputPort.required) {
        const hasEdge = graph.edges.some(
          (e) => e.target === node.id && e.targetHandle === inputPort.id
        );
        if (!hasEdge) {
          errors.push({
            type: 'missing_input',
            nodeId: node.id,
            message: `${def.label}: 缺少必需输入 "${inputPort.label}"`,
            suggestion: `将一个模块的输出连接到 ${def.label} 的 ${inputPort.label} 端口`,
          });
        }
      }
    }
  }

  // Disconnected (isolated) nodes — no incoming or outgoing edges
  for (const node of graph.nodes) {
    const def = MODULE_REGISTRY.get(node.type);
    // Skip Input nodes (they have no incoming edges by design)
    if (!def || def.category === 'input') continue;

    const hasAnyEdge = graph.edges.some(
      (e) => e.source === node.id || e.target === node.id
    );
    if (!hasAnyEdge) {
      errors.push({
        type: 'disconnected',
        nodeId: node.id,
        message: `${def.label}: 节点完全未连接`,
        suggestion: '连接此节点到图中或删除',
      });
    }
  }

  // Dimension mismatch detection (requires shapeMap)
  if (shapeMap) {
    for (const edge of graph.edges) {
      const sourceShape = shapeMap.get(edge.source);
      const targetNode = graph.nodes.find((n) => n.id === edge.target);
      if (!sourceShape || !targetNode) continue;

      const targetDef = MODULE_REGISTRY.get(targetNode.type);
      if (!targetDef) continue;

      // Only check Concat nodes for spatial dimension mismatch
      if (targetNode.type === 'Concat') {
        const targetShape = shapeMap.get(edge.target);
        if (!targetShape || !targetShape.hasError) continue;

        // Find the other input edge of the Concat node
        const otherEdges = graph.edges.filter(
          (e) => e.target === edge.target && e.id !== edge.id
        );
        if (otherEdges.length === 0) continue;

        const otherEdge = otherEdges[0];
        const otherSourceShape = shapeMap.get(otherEdge.source);
        if (!otherSourceShape) continue;

        // Get the actual shapes for each input port
        const sourceNode = graph.nodes.find((n) => n.id === edge.source);
        const otherSourceNode = graph.nodes.find((n) => n.id === otherEdge.source);
        const sourceDef = sourceNode ? MODULE_REGISTRY.get(sourceNode.type) : null;
        const otherSourceDef = otherSourceNode ? MODULE_REGISTRY.get(otherSourceNode.type) : null;

        const portIndex = sourceDef
          ? sourceDef.outputs.findIndex((p) => p.id === edge.sourceHandle)
          : 0;
        const otherPortIndex = otherSourceDef
          ? otherSourceDef.outputs.findIndex((p) => p.id === otherEdge.sourceHandle)
          : 0;

        const shapeA = sourceShape.outputShapes[portIndex];
        const shapeB = otherSourceShape.outputShapes[otherPortIndex];

        if (
          shapeA && shapeB &&
          shapeA.length >= 3 && shapeB.length >= 3 &&
          (shapeA[1] !== shapeB[1] || shapeA[2] !== shapeB[2])
        ) {
          errors.push({
            type: 'dimension_mismatch',
            nodeId: edge.target,
            edgeId: edge.id,
            message: `Concat 空间维度不匹配：输入 A [${shapeA[1]}, ${shapeA[2]}]，输入 B [${shapeB[1]}, ${shapeB[2]}]`,
            suggestion: '在空间维度较小的输入前添加 Upsample 节点',
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Finds all nodes involved in cycles using DFS.
 * Returns an array of node IDs that form the cycle.
 */
function findCycleNodes(graph: GraphIR): string[] {
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.push(edge.target);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string | null>();
  for (const node of graph.nodes) {
    color.set(node.id, WHITE);
    parent.set(node.id, null);
  }

  let cycleNode: string | null = null;

  function dfs(nodeId: string): boolean {
    color.set(nodeId, GRAY);
    for (const neighbor of adjacency.get(nodeId) || []) {
      if (color.get(neighbor) === GRAY) {
        // Found cycle, reconstruct path
        cycleNode = neighbor;
        parent.set(neighbor, nodeId);
        return true;
      }
      if (color.get(neighbor) === WHITE) {
        parent.set(neighbor, nodeId);
        if (dfs(neighbor)) return true;
      }
    }
    color.set(nodeId, BLACK);
    return false;
  }

  for (const node of graph.nodes) {
    if (color.get(node.id) === WHITE && dfs(node.id)) break;
  }

  if (cycleNode === null) return [];

  // Reconstruct cycle path
  const cyclePath: string[] = [cycleNode];
  let current: string | null = parent.get(cycleNode)!;
  while (current !== null && current !== cycleNode) {
    cyclePath.unshift(current);
    current = parent.get(current) ?? null;
  }
  cyclePath.push(cycleNode);

  return cyclePath;
}
