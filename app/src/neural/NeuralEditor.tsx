import React, { useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraphState, RFNode } from './hooks/useGraphState';
import { ModulePalette } from './components/ModulePalette';
import { BaseNode } from './components/nodes/BaseNode';
import { MODULE_REGISTRY } from './graph/registry';
import { TensorShape } from './graph/types';

const nodeTypes = {
  neural: NeuralNode,
};

function NeuralNode({ data, selected }: { data: { type: string; params: Record<string, unknown> }; selected?: boolean }) {
  const def = MODULE_REGISTRY[data.type];
  const inferredShape: TensorShape | null = null;

  return (
    <BaseNode
      type={data.type}
      params={data.params as Record<string, number | string | boolean>}
      selected={selected}
      hasError={false}
      inferredShape={inferredShape}
    />
  );
}

function NeuralEditorInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    deleteNode,
    onConnect,
    clearGraph,
  } = useGraphState();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !MODULE_REGISTRY[type]) return;

      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;

      const bounds = wrapper.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 70,
        y: event.clientY - bounds.top - 20,
      };

      addNode(type, position);
    },
    [addNode]
  );

  const onDelete = useCallback(
    ({ nodes: deletedNodes }: { nodes: RFNode[] }) => {
      for (const node of deletedNodes) {
        deleteNode(node.id);
      }
    },
    [deleteNode]
  );

  return (
    <div className="flex h-full w-full">
      {/* Left sidebar: module palette */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-bold text-zinc-700">Modules</h2>
          <p className="text-[10px] text-zinc-400 mt-0.5">Drag to canvas</p>
        </div>
        <ModulePalette />
        <div className="px-4 py-3 border-t border-zinc-100">
          <button
            onClick={clearGraph}
            className="w-full py-2 text-xs font-semibold text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Clear Canvas
          </button>
        </div>
      </aside>

      {/* Canvas */}
      <div ref={reactFlowWrapper} className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDelete={onDelete}
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
              Drag modules from left panel, connect by dragging between handles
            </div>
          </Panel>
        </ReactFlow>
      </div>
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
