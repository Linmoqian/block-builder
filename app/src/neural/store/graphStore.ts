import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  applyNodeChanges, applyEdgeChanges, addEdge,
  Connection, NodeChange, EdgeChange, Node, Edge,
} from '@xyflow/react';
import { MODULE_REGISTRY } from '../graph/registry';
import { GraphIR, ParamValue, InferredShape, ValidationError } from '../graph/types';
import { inferAllShapes } from '../graph/shapeInference';
import { validateGraph } from '../graph/validator';

type RFNodeData = { type: string; params: Record<string, ParamValue> };
export type RFNode = Node<RFNodeData>;
export type RFEdge = Edge;

export type RightTab = 'properties' | 'yaml' | 'training';

interface Snapshot {
  nodes: RFNode[];
  edges: RFEdge[];
}

const MAX_HISTORY = 50;

export interface GraphStore {
  // Graph state
  nodes: RFNode[];
  edges: RFEdge[];
  onNodesChange: (changes: NodeChange<RFNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<RFEdge>[]) => void;
  addNode: (type: string, position: { x: number; y: number }) => string | undefined;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => string | undefined;
  updateNodeParams: (id: string, params: Record<string, ParamValue>) => void;
  onConnect: (connection: Connection) => void;
  clearGraph: () => void;
  getGraphIR: () => GraphIR;
  loadGraphIR: (graph: GraphIR, selectedIds?: string[]) => void;

  // History
  pushSnapshot: (nodes: RFNode[], edges: RFEdge[]) => void;
  undo: () => Snapshot | null;
  redo: () => Snapshot | null;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // UI
  selectedNodeId: string | null;
  rightTab: RightTab;
  pendingFitView: boolean;
  setSelectedNodeId: (id: string | null) => void;
  setRightTab: (tab: RightTab) => void;
  requestFitView: () => void;
  consumeFitView: () => boolean;

  // Derived
  shapeMap: Map<string, InferredShape>;
  validationErrors: ValidationError[];
}

// History state (closed over, not in store)
const historySnapshots: Snapshot[] = [];
let historyPointer = -1;
let historySkipping = false;
let historySkipTimer: ReturnType<typeof setTimeout> | undefined;

export const useGraphStore = create<GraphStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Graph state
        nodes: [] as RFNode[],
        edges: [] as RFEdge[],

        onNodesChange: (changes) => {
          set({ nodes: applyNodeChanges(changes, get().nodes) });
        },

        onEdgesChange: (changes) => {
          set({ edges: applyEdgeChanges(changes, get().edges) });
        },

        addNode: (type, position) => {
          const def = MODULE_REGISTRY.get(type);
          if (!def) return undefined;
          const defaultParams: Record<string, ParamValue> = {};
          for (const [key, paramDef] of Object.entries(def.params)) {
            defaultParams[key] = paramDef.default;
          }
          const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const newNode: RFNode = { id, type: 'neural', position, data: { type, params: defaultParams } };
          set({ nodes: [...get().nodes, newNode] });
          return id;
        },

        deleteNode: (id) => {
          set({
            nodes: get().nodes.filter((n) => n.id !== id),
            edges: get().edges.filter((e) => e.source !== id && e.target !== id),
          });
        },

        duplicateNode: (id) => {
          const node = get().nodes.find((n) => n.id === id);
          if (!node) return undefined;
          const data = node.data as RFNodeData;
          const newId = `${data.type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const newNode: RFNode = {
            id: newId,
            type: 'neural',
            position: { x: node.position.x + 40, y: node.position.y + 40 },
            data: { type: data.type, params: { ...data.params } },
          };
          const updatedNodes = get().nodes.map((n) =>
            n.id === id ? { ...n, selected: false } : n
          );
          set({ nodes: [...updatedNodes, newNode] });
          get().setSelectedNodeId(newId);
          return newId;
        },

        updateNodeParams: (id, params) => {
          set({
            nodes: get().nodes.map((n) =>
              n.id === id ? { ...n, data: { ...(n.data as RFNodeData), params: { ...(n.data as RFNodeData).params, ...params } } } : n
            ),
          });
        },

        onConnect: (connection) => {
          set({ edges: addEdge({ ...connection, animated: true }, get().edges) });
        },

        clearGraph: () => set({ nodes: [], edges: [] }),

        getGraphIR: (): GraphIR => {
          const { nodes, edges } = get();
          return {
            nodes: nodes.map((n) => ({ id: n.id, type: (n.data as RFNodeData).type, position: n.position, params: (n.data as RFNodeData).params })),
            edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || 'out', targetHandle: e.targetHandle || 'in' })),
          };
        },

        loadGraphIR: (graph, selectedIds) => {
          set({
            nodes: graph.nodes.map((n) => ({
              id: n.id, type: 'neural', position: n.position,
              data: { type: n.type, params: n.params },
              ...(selectedIds?.includes(n.id) ? { selected: true } : {}),
            })),
            edges: graph.edges.map((e) => ({
              id: e.id, source: e.source, target: e.target,
              sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, animated: true,
            })),
          });
        },

        // History
        pushSnapshot: (nodes, edges) => {
          if (historySkipping) return;
          if (nodes.length === 0 && historySnapshots.length === 0) return;
          historySnapshots.splice(historyPointer + 1);
          historySnapshots.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) });
          if (historySnapshots.length > MAX_HISTORY) historySnapshots.shift();
          historyPointer = historySnapshots.length - 1;
        },

        undo: () => {
          if (historyPointer <= 0) return null;
          historyPointer--;
          historySkipping = true;
          clearTimeout(historySkipTimer);
          historySkipTimer = setTimeout(() => { historySkipping = false; }, 100);
          return historySnapshots[historyPointer];
        },

        redo: () => {
          if (historyPointer >= historySnapshots.length - 1) return null;
          historyPointer++;
          historySkipping = true;
          clearTimeout(historySkipTimer);
          historySkipTimer = setTimeout(() => { historySkipping = false; }, 100);
          return historySnapshots[historyPointer];
        },

        canUndo: () => historyPointer > 0,
        canRedo: () => historyPointer < historySnapshots.length - 1,

        // UI
        selectedNodeId: null as string | null,
        rightTab: 'properties' as RightTab,
        pendingFitView: false,

        setSelectedNodeId: (id) => set({ selectedNodeId: id }),
        setRightTab: (tab) => set({ rightTab: tab }),
        requestFitView: () => set({ pendingFitView: true }),
        consumeFitView: () => {
          const pending = get().pendingFitView;
          if (pending) set({ pendingFitView: false });
          return pending;
        },

        // Derived
        shapeMap: new Map<string, InferredShape>(),
        validationErrors: [] as ValidationError[],
      }),
      {
        name: 'neural-graph-autosave',
        partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
        merge: (persisted, current) => {
          const p = persisted as Partial<Pick<GraphStore, 'nodes' | 'edges'>>;
          return { ...current, ...(p.nodes ? { nodes: p.nodes } : {}), ...(p.edges ? { edges: p.edges } : {}) };
        },
      }
    )
  )
);

// Auto shape inference + validation
useGraphStore.subscribe(
  (state) => ({ nodes: state.nodes, edges: state.edges }),
  ({ nodes, edges }) => {
    if (nodes.length === 0) {
      useGraphStore.setState({ shapeMap: new Map(), validationErrors: [] });
      return;
    }
    const graph: GraphIR = {
      nodes: nodes.map((n: RFNode) => ({ id: n.id, type: (n.data as RFNodeData).type, position: n.position, params: (n.data as RFNodeData).params })),
      edges: edges.map((e: RFEdge) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || 'out', targetHandle: e.targetHandle || 'in' })),
    };
    const shapeMap = inferAllShapes(graph);
    useGraphStore.setState({
      shapeMap,
      validationErrors: validateGraph(graph, shapeMap),
    });
  },
  { equalityFn: (a, b) => a.nodes === b.nodes && a.edges === b.edges }
);
