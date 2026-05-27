import { useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import { inferAllShapes } from '../graph/shapeInference';
import { InferredShape, ParamValue } from '../graph/types';
import { GraphIR } from '../graph/types';

export function useShapeInference(
  nodes: Node<{ type: string; params: Record<string, ParamValue> }>[],
  edges: Edge[]
): Map<string, InferredShape> {
  return useMemo(() => {
    if (nodes.length === 0) return new Map();

    const graph: GraphIR = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.type,
        position: n.position,
        params: n.data.params,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || 'out',
        targetHandle: e.targetHandle || 'in',
      })),
    };

    return inferAllShapes(graph);
  }, [nodes, edges]);
}
