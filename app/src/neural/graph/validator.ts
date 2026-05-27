import { GraphIR, ValidationError } from './types';
import { MODULE_REGISTRY } from './registry';

export function validateGraph(graph: GraphIR): ValidationError[] {
  const errors: ValidationError[] = [];

  // Cycle detection via DFS
  if (hasCycle(graph)) {
    errors.push({ type: 'cycle', message: 'Graph contains a cycle' });
  }

  // Missing required inputs
  for (const node of graph.nodes) {
    const def = MODULE_REGISTRY[node.type];
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
            message: `${def.label}: missing required input "${inputPort.label}"`,
          });
        }
      }
    }
  }

  return errors;
}

function hasCycle(graph: GraphIR): boolean {
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.push(edge.target);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const node of graph.nodes) {
    color.set(node.id, WHITE);
  }

  function dfs(nodeId: string): boolean {
    color.set(nodeId, GRAY);
    for (const neighbor of adjacency.get(nodeId) || []) {
      if (color.get(neighbor) === GRAY) return true;
      if (color.get(neighbor) === WHITE && dfs(neighbor)) return true;
    }
    color.set(nodeId, BLACK);
    return false;
  }

  for (const node of graph.nodes) {
    if (color.get(node.id) === WHITE && dfs(node.id)) return true;
  }
  return false;
}
