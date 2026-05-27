import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Panel,
  useReactFlow,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraphState, RFNode } from './hooks/useGraphState';
import { useGraphPersistence } from './hooks/useGraphPersistence';
import { ModulePalette } from './components/ModulePalette';
import { PropertiesPanel } from './components/PropertiesPanel';
import { BaseNode } from './components/nodes/BaseNode';
import { MODULE_REGISTRY } from './graph/registry';
import { downloadJson, uploadJson } from './graph/jsonIO';
import { TensorShape, ParamValue } from './graph/types';

function NeuralNode({ data, selected }: { data: { type: string; params: Record<string, ParamValue> }; selected?: boolean }) {
  const inferredShape: TensorShape | null = null;

  return (
    <BaseNode
      type={data.type}
      params={data.params}
      selected={selected}
      hasError={false}
      inferredShape={inferredShape}
    />
  );
}

const nodeTypes = { neural: NeuralNode };

function NeuralEditorInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [selectedNode, setSelectedNode] = useState<RFNode | null>(null);

  const {
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
  } = useGraphState();

  const { save } = useGraphPersistence(getGraphIR, loadGraphIR);

  // Track selected node
  useEffect(() => {
    const selected = nodes.find((n) => n.selected) || null;
    setSelectedNode(selected);
  }, [nodes]);

  // Auto-save on graph changes
  useEffect(() => {
    save();
  }, [nodes, edges, save]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !MODULE_REGISTRY[type]) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [addNode, screenToFlowPosition]
  );

  const onDelete = useCallback(
    ({ nodes: deletedNodes }: { nodes: RFNode[] }) => {
      for (const node of deletedNodes) {
        deleteNode(node.id);
      }
    },
    [deleteNode]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node as RFNode);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleParamChange = useCallback(
    (key: string, value: ParamValue) => {
      if (selectedNode) {
        updateNodeParams(selectedNode.id, { [key]: value });
      }
    },
    [selectedNode, updateNodeParams]
  );

  const handleSaveJson = useCallback(() => {
    downloadJson(getGraphIR());
  }, [getGraphIR]);

  const handleLoadJson = useCallback(async () => {
    try {
      const graph = await uploadJson();
      loadGraphIR(graph);
    } catch (e) {
      console.error('Failed to load graph:', e);
    }
  }, [loadGraphIR]);

  return (
    <div className="flex h-full w-full">
      {/* Left sidebar: module palette */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col shrink-0">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-700">Modules</h2>
          <p className="text-[10px] text-zinc-400 mt-0.5">Drag to canvas</p>
        </div>
        <ModulePalette />
        <div className="px-4 py-3 border-t border-zinc-100 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleSaveJson}
              className="flex-1 py-1.5 text-[10px] font-semibold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200"
            >
              Save JSON
            </button>
            <button
              onClick={handleLoadJson}
              className="flex-1 py-1.5 text-[10px] font-semibold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200"
            >
              Load JSON
            </button>
          </div>
          <button
            onClick={clearGraph}
            className="w-full py-1.5 text-[10px] font-semibold text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Clear Canvas
          </button>
        </div>
      </aside>

      {/* Canvas */}
      <div ref={reactFlowWrapper} className="flex-1 min-w-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDelete={onDelete}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          defaultEdgeOptions={{ animated: true }}
        >
          <Background gap={16} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const def = MODULE_REGISTRY[(node.data as { type: string }).type];
              return def?.color || '#94a3b8';
            }}
            maskColor="rgba(0,0,0,0.1)"
          />
          <Panel position="top-center">
            <div className="bg-white/80 backdrop-blur-md border border-zinc-200 px-4 py-2 rounded-full shadow-lg text-xs text-zinc-500 font-medium">
              Drag modules from left panel · Connect by dragging between handles
            </div>
          </Panel>
          <Panel position="bottom-left">
            <div className="bg-white/80 backdrop-blur-md border border-zinc-200 px-3 py-1.5 rounded-lg shadow-sm text-[10px] text-zinc-400">
              {nodes.length} nodes · {edges.length} edges
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right sidebar: properties */}
      <aside className="w-72 bg-white border-l border-zinc-200 flex flex-col shrink-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-700">Properties</h2>
        </div>
        {selectedNode ? (
          <div className="flex-1 overflow-y-auto">
            <PropertiesPanel
              nodeType={selectedNode.data.type}
              params={selectedNode.data.params}
              onParamChange={handleParamChange}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-zinc-400 text-center">
              Click a node to edit its parameters
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function NeuralEditor() {
  return (
    <ReactFlowProvider>
      <NeuralEditorInner />
    </ReactFlowProvider>
  );
}
