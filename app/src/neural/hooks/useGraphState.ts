import { useCallback } from 'react';
import {
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
  Node,
  Edge,
} from '@xyflow/react';
import { MODULE_REGISTRY } from '../graph/registry';
import { GraphNode, GraphEdge, GraphIR, ParamValue } from '../graph/types';

export type RFNode = Node<{ type: string; params: Record<string, ParamValue> }>;
export type RFEdge = Edge;

export function useGraphState() {
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);

  const addNode = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const def = MODULE_REGISTRY.get(type);
      if (!def) return;

      const defaultParams: Record<string, ParamValue> = {};
      for (const [key, paramDef] of Object.entries(def.params)) {
        defaultParams[key] = paramDef.default;
      }

      const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newNode: RFNode = {
        id,
        type: 'neural',
        position,
        data: { type, params: defaultParams },
      };

      setNodes((prev) => [...prev, newNode]);
      return id;
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges]
  );

  const updateNodeParams = useCallback(
    (id: string, params: Record<string, ParamValue>) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, params: { ...n.data.params, ...params } } } : n
        )
      );
    },
    [setNodes]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges]
  );

  const clearGraph = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  const getGraphIR = useCallback((): GraphIR => {
    const graphNodes: GraphNode[] = nodes.map((n) => ({
      id: n.id,
      type: n.data.type,
      position: n.position,
      params: n.data.params,
    }));

    const graphEdges: GraphEdge[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || 'out',
      targetHandle: e.targetHandle || 'in',
    }));

    return { nodes: graphNodes, edges: graphEdges };
  }, [nodes, edges]);

  const loadGraphIR = useCallback(
    (graph: GraphIR, selectedIds?: string[]) => {
      const rfNodes: RFNode[] = graph.nodes.map((n) => ({
        id: n.id,
        type: 'neural',
        position: n.position,
        data: { type: n.type, params: n.params },
        ...(selectedIds?.includes(n.id) ? { selected: true } : {}),
      }));

      const rfEdges: RFEdge[] = graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        animated: true,
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
    },
    [setNodes, setEdges]
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    deleteNode,
    updateNodeParams,
    onConnect,
    clearGraph,
    getGraphIR,
    loadGraphIR,
  };
}
