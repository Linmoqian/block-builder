import React, { useCallback, useRef, useState, useEffect, createContext, useContext, useMemo } from 'react';
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
import { useShapeInference } from './hooks/useShapeInference';
import { useGraphHistory } from './hooks/useGraphHistory';
import { ModulePalette } from './components/ModulePalette';
import { PropertiesPanel } from './components/PropertiesPanel';
import { YamlPreview } from './components/YamlPreview';
import { ErrorPanel } from './components/ErrorPanel';
import { BaseNode } from './components/nodes/BaseNode';
import { MODULE_REGISTRY } from './graph/registry';
import { downloadJson, uploadJson } from './graph/jsonIO';
import { exportYaml } from './graph/yamlExport';
import { exportPyTorch } from './graph/pytorchExport';
import { importYaml } from './graph/yamlImport';
import { autoLayout } from './graph/autoLayout';
import { PRESETS } from './graph/presets';
import { TensorShape, ParamValue, InferredShape } from './graph/types';
import { computeModelStats, formatParams, formatFLOPs } from './graph/modelStats';

const ShapeContext = createContext<Map<string, InferredShape>>(new Map());

function NeuralNode({ id, data, selected }: { id: string; data: { type: string; params: Record<string, ParamValue> }; selected?: boolean }) {
  const shapeMap = useContext(ShapeContext);
  const inferred = shapeMap.get(id);

  return (
    <BaseNode
      type={data.type}
      params={data.params}
      selected={selected}
      hasError={inferred?.hasError ?? false}
      errorMessage={inferred?.errorMessage}
      inferredShape={inferred?.outputShapes?.[0] ?? null}
    />
  );
}

const nodeTypes = { neural: NeuralNode };

type RightTab = 'properties' | 'yaml';

function NeuralEditorInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [selectedNode, setSelectedNode] = useState<RFNode | null>(null);
  const [rightTab, setRightTab] = useState<RightTab>('properties');
  const pendingFitView = useRef(false);

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
  const { shapeMap, validationErrors } = useShapeInference(nodes, edges);
  const { pushSnapshot, undo, redo, canUndo, canRedo } = useGraphHistory();

  // Push snapshot on graph changes
  useEffect(() => {
    pushSnapshot(nodes, edges);
  }, [nodes, edges, pushSnapshot]);

  // Track selected node
  useEffect(() => {
    const selected = nodes.find((n) => n.selected) || null;
    setSelectedNode(selected);
  }, [nodes]);

  // Fit view after loading graph (preset/import/layout)
  useEffect(() => {
    if (pendingFitView.current && nodes.length > 0) {
      pendingFitView.current = false;
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 300 });
      });
    }
  }, [nodes, fitView]);

  // Auto-save on graph changes
  useEffect(() => {
    save();
  }, [nodes, edges, save]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      // Ctrl+Z / Cmd+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const snapshot = undo();
        if (snapshot) loadGraphIR({ nodes: snapshot.nodes.map((n) => ({ id: n.id, type: (n.data as { type: string }).type, position: n.position, params: (n.data as { params: Record<string, ParamValue> }).params })), edges: snapshot.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || 'out', targetHandle: e.targetHandle || 'in' })) });
      }

      // Ctrl+Shift+Z / Cmd+Shift+Z = Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        const snapshot = redo();
        if (snapshot) loadGraphIR({ nodes: snapshot.nodes.map((n) => ({ id: n.id, type: (n.data as { type: string }).type, position: n.position, params: (n.data as { params: Record<string, ParamValue> }).params })), edges: snapshot.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || 'out', targetHandle: e.targetHandle || 'in' })) });
      }

      // Ctrl+Y / Cmd+Y = Redo (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        const snapshot = redo();
        if (snapshot) loadGraphIR({ nodes: snapshot.nodes.map((n) => ({ id: n.id, type: (n.data as { type: string }).type, position: n.position, params: (n.data as { params: Record<string, ParamValue> }).params })), edges: snapshot.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || 'out', targetHandle: e.targetHandle || 'in' })) });
      }

      // Ctrl+S / Cmd+S = Save JSON
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        downloadJson(getGraphIR());
      }

      // Ctrl+E / Cmd+E = Export YAML
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleExportYaml();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, loadGraphIR, getGraphIR]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !MODULE_REGISTRY.has(type)) return;

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
      setRightTab('properties');
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
      pendingFitView.current = true;
    } catch (e) {
      console.error('Failed to load graph:', e);
    }
  }, [loadGraphIR]);

  const handleExportYaml = useCallback(() => {
    const yaml = exportYaml(getGraphIR());
    fetch('http://localhost:8080/export-yaml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yaml }),
    }).catch(() => {});
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.yaml';
    a.click();
    URL.revokeObjectURL(url);
  }, [getGraphIR]);

  const handleExportPyTorch = useCallback(() => {
    const code = exportPyTorch(getGraphIR());
    fetch('http://localhost:8080/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }).catch(() => {});
  }, [getGraphIR]);

  const handleImportYaml = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.yaml,.yml';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const graph = importYaml(text);
        const laid = autoLayout(graph);
        loadGraphIR(laid);
        pendingFitView.current = true;
      } catch (e) {
        console.error('Failed to import YAML:', e);
      }
    };
    input.click();
  }, [loadGraphIR]);

  const handleLoadPreset = useCallback((presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      const laid = autoLayout(preset.graph);
      loadGraphIR(laid);
      pendingFitView.current = true;
    }
  }, [loadGraphIR]);

  const handleAutoLayout = useCallback(() => {
    const graph = getGraphIR();
    const laid = autoLayout(graph);
    loadGraphIR(laid);
    pendingFitView.current = true;
  }, [getGraphIR, loadGraphIR]);

  const yamlContent = useMemo(() => {
    if (nodes.length === 0) return '';
    return exportYaml(getGraphIR());
  }, [nodes, edges, getGraphIR]);

  const errorEdgeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const err of validationErrors) {
      if (err.edgeId) ids.add(err.edgeId);
    }
    return ids;
  }, [validationErrors]);

  const styledEdges = useMemo(() => {
    if (errorEdgeIds.size === 0) return edges;
    return edges.map((e) =>
      errorEdgeIds.has(e.id)
        ? { ...e, style: { stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5 5' }, animated: false }
        : e
    );
  }, [edges, errorEdgeIds]);

  const errorCount = useMemo(() => {
    const shapeErrorNodeIds = new Set(
      Array.from(shapeMap.values()).filter((s) => s.hasError).map((s) => s.nodeId),
    );
    const validationErrorNodeIds = new Set(validationErrors.filter((e) => e.nodeId).map((e) => e.nodeId));
    const allNodeIds = new Set([...shapeErrorNodeIds, ...validationErrorNodeIds]);
    return allNodeIds.size + validationErrors.filter((e) => !e.nodeId).length;
  }, [shapeMap, validationErrors]);

  const modelStats = useMemo(() => {
    if (nodes.length === 0) return { totalParams: 0, totalFLOPs: 0 };
    return computeModelStats(getGraphIR(), shapeMap);
  }, [nodes, edges, getGraphIR, shapeMap]);

  const handleNavigate = useCallback(
    (nodeId: string) => {
      fitView({ nodes: [{ id: nodeId }], padding: 0.5, duration: 300 });
    },
    [fitView]
  );

  return (
    <ShapeContext.Provider value={shapeMap}>
      <div className="flex h-full w-full">
        {/* Left sidebar */}
        <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-bold text-zinc-700">Modules</h2>
            <p className="text-[10px] text-zinc-400 mt-0.5">Drag to canvas</p>
          </div>
          <ModulePalette />
          <div className="px-4 py-3 border-t border-zinc-100 space-y-2">
            <div className="flex gap-2">
              <button onClick={handleSaveJson} className="flex-1 py-1.5 text-[10px] font-semibold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200">Save</button>
              <button onClick={handleLoadJson} className="flex-1 py-1.5 text-[10px] font-semibold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200">Load</button>
            </div>
            <button onClick={handleImportYaml} className="w-full py-1.5 text-[10px] font-semibold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200">Import YAML</button>
            <select onChange={(e) => e.target.value && handleLoadPreset(e.target.value)} defaultValue="" className="w-full py-1.5 px-2 text-[10px] font-semibold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200 cursor-pointer">
              <option value="" disabled>Load Preset...</option>
              {Object.entries(PRESETS).map(([key, preset]) => (<option key={key} value={key}>{preset.label}</option>))}
            </select>
            <button onClick={handleAutoLayout} className="w-full py-1.5 text-[10px] font-semibold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200">Re-layout</button>
            <div className="flex gap-2">
              <button onClick={handleExportYaml} className="flex-1 py-1.5 text-[10px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">Export YAML</button>
              <button onClick={handleExportPyTorch} className="flex-1 py-1.5 text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">PyTorch</button>
            </div>
            <button onClick={() => { if (window.confirm('确定清空画布？此操作不可撤销。')) clearGraph(); }} className="w-full py-1.5 text-[10px] font-semibold text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">Clear Canvas</button>
          </div>
        </aside>

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1 min-w-0">
          <ReactFlow
            nodes={nodes}
            edges={styledEdges}
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
            <MiniMap nodeColor={(node) => MODULE_REGISTRY.get((node.data as { type: string }).type)?.color || '#94a3b8'} maskColor="rgba(0,0,0,0.1)" />
            <Panel position="top-center">
              <div className="bg-white/80 backdrop-blur-md border border-zinc-200 px-4 py-2 rounded-full shadow-lg text-xs text-zinc-500 font-medium">
                Drag modules · Connect handles · Ctrl+Z Undo · Ctrl+S Save
              </div>
            </Panel>
            <Panel position="bottom-left">
              <ErrorPanel errors={validationErrors} nodes={nodes} onNavigate={handleNavigate} />
            </Panel>
            <Panel position="bottom-right">
              <div className="bg-white/80 backdrop-blur-md border border-zinc-200 px-3 py-1.5 rounded-full shadow-lg text-[10px] text-zinc-400 font-medium">
                {formatParams(modelStats.totalParams)} params · {formatFLOPs(modelStats.totalFLOPs)} FLOPs
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Right sidebar */}
        <aside className="w-80 bg-white border-l border-zinc-200 flex flex-col shrink-0 overflow-hidden">
          <div className="flex border-b border-zinc-200">
            <button onClick={() => setRightTab('properties')} className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${rightTab === 'properties' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-zinc-400 hover:text-zinc-600'}`}>Properties</button>
            <button onClick={() => setRightTab('yaml')} className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${rightTab === 'yaml' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50' : 'text-zinc-400 hover:text-zinc-600'}`}>YAML</button>
          </div>
          {rightTab === 'properties' ? (
            selectedNode ? (
              <div className="flex-1 overflow-y-auto">
                <PropertiesPanel nodeType={selectedNode.data.type} params={selectedNode.data.params} onParamChange={handleParamChange} />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-xs text-zinc-400 text-center">Click a node to edit parameters</p>
              </div>
            )
          ) : (
            <div className="flex-1 overflow-hidden">
              <YamlPreview yaml={yamlContent} />
            </div>
          )}
        </aside>
      </div>
    </ShapeContext.Provider>
  );
}

export default function NeuralEditor() {
  return (
    <ReactFlowProvider>
      <NeuralEditorInner />
    </ReactFlowProvider>
  );
}
