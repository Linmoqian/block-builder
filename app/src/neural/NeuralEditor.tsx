import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
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
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { save as tauriSave, open as tauriOpen } from '@tauri-apps/plugin-dialog';
import { useGraphStore, RFNode, RightTab } from './store/graphStore';
import { SidebarToolbar } from './components/SidebarToolbar';
import { RightPanel } from './components/RightPanel';
import { ErrorPanel } from './components/ErrorPanel';
import { BaseNode } from './components/nodes/BaseNode';
import { MODULE_REGISTRY } from './graph/registry';
import { downloadJson, uploadJson, exportGraphIR } from './graph/jsonIO';
import { exportYaml } from './graph/yamlExport';
import { exportPyTorch } from './graph/pytorchExport';
import { importYaml } from './graph/yamlImport';
import { autoLayout } from './graph/autoLayout';
import { PRESETS } from './graph/presets';
import { ParamValue } from './graph/types';
import { computeModelStats, formatParams, formatFLOPs } from './graph/modelStats';

const isTauri = '__TAURI_INTERNALS__' in window;

function NeuralNode({ id, data, selected }: { id: string; data: { type: string; params: Record<string, ParamValue> }; selected?: boolean }) {
  const shapeMap = useGraphStore((s) => s.shapeMap);
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

function NeuralEditorInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Store selectors
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const addNode = useGraphStore((s) => s.addNode);
  const deleteNode = useGraphStore((s) => s.deleteNode);
  const updateNodeParams = useGraphStore((s) => s.updateNodeParams);
  const onConnect = useGraphStore((s) => s.onConnect);
  const clearGraph = useGraphStore((s) => s.clearGraph);
  const getGraphIR = useGraphStore((s) => s.getGraphIR);
  const loadGraphIR = useGraphStore((s) => s.loadGraphIR);
  const pushSnapshot = useGraphStore((s) => s.pushSnapshot);
  const undo = useGraphStore((s) => s.undo);
  const redo = useGraphStore((s) => s.redo);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId);
  const rightTab = useGraphStore((s) => s.rightTab);
  const setRightTab = useGraphStore((s) => s.setRightTab);
  const consumeFitView = useGraphStore((s) => s.consumeFitView);
  const requestFitView = useGraphStore((s) => s.requestFitView);
  const shapeMap = useGraphStore((s) => s.shapeMap);
  const validationErrors = useGraphStore((s) => s.validationErrors);

  // Derive selectedNode from store
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  // Push snapshot on graph changes
  useEffect(() => {
    pushSnapshot(nodes, edges);
  }, [nodes, edges, pushSnapshot]);

  // Track selected node from React Flow selection
  useEffect(() => {
    const selected = nodes.find((n) => n.selected);
    if (selected) setSelectedNodeId(selected.id);
  }, [nodes, setSelectedNodeId]);

  // Fit view after loading graph
  useEffect(() => {
    if (consumeFitView() && nodes.length > 0) {
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 300 });
      });
    }
  }, [nodes, fitView, consumeFitView, requestFitView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      const isUndo = isMod && e.key === 'z' && !e.shiftKey;
      const isRedo = (isMod && e.key === 'z' && e.shiftKey) || (isMod && e.key === 'y');
      if (isUndo || isRedo) {
        e.preventDefault();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        const snapshot = isUndo ? undo() : redo();
        if (snapshot) {
          const selectedIds = snapshot.nodes.filter((n) => n.selected).map((n) => n.id);
          loadGraphIR({ nodes: snapshot.nodes.map((n) => ({ id: n.id, type: (n.data as { type: string }).type, position: n.position, params: (n.data as { params: Record<string, ParamValue> }).params })), edges: snapshot.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || 'out', targetHandle: e.targetHandle || 'in' })) }, selectedIds);
        }
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if (isMod && e.key === 's') {
        e.preventDefault();
        downloadJson(getGraphIR());
      }

      if (isMod && e.key === 'e') {
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
      setSelectedNodeId(node.id);
      setRightTab('properties');
    },
    [setSelectedNodeId, setRightTab]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const handleParamChange = useCallback(
    (key: string, value: ParamValue) => {
      if (selectedNodeId) {
        updateNodeParams(selectedNodeId, { [key]: value });
      }
    },
    [selectedNodeId, updateNodeParams]
  );

  const handleSaveJson = useCallback(async () => {
    const json = exportGraphIR(getGraphIR());
    if (isTauri) {
      const path = await tauriSave({ defaultPath: 'network-graph.json', filters: [{ name: 'JSON', extensions: ['json'] }] });
      if (path) {
        await invoke('write_text_file', { path, content: json });
      }
    } else {
      downloadJson(getGraphIR());
    }
  }, [getGraphIR]);

  const handleLoadJson = useCallback(async () => {
    try {
      if (isTauri) {
        const result = await tauriOpen({ filters: [{ name: 'JSON', extensions: ['json'] }], multiple: false });
        if (result) {
          const path = typeof result === 'string' ? result : (result as unknown as string);
          const json = await invoke('read_text_file', { path }) as string;
          const { importGraphIR } = await import('./graph/jsonIO');
          loadGraphIR(importGraphIR(json));
          requestFitView();
        }
      } else {
        const graph = await uploadJson();
        loadGraphIR(graph);
        requestFitView();
      }
    } catch (e) {
      console.error('Failed to load graph:', e);
    }
  }, [loadGraphIR, requestFitView]);

  const handleExportYaml = useCallback(async () => {
    const yaml = exportYaml(getGraphIR());
    if (isTauri) {
      const path = await tauriSave({ defaultPath: 'model.yaml', filters: [{ name: 'YAML', extensions: ['yaml', 'yml'] }] });
      if (path) {
        await invoke('write_text_file', { path, content: yaml });
      }
    } else {
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
    }
  }, [getGraphIR]);

  const handleExportPyTorch = useCallback(async () => {
    const code = exportPyTorch(getGraphIR());
    if (isTauri) {
      const path = await tauriSave({ defaultPath: 'network.py', filters: [{ name: 'Python', extensions: ['py'] }] });
      if (path) {
        await invoke('write_text_file', { path, content: code });
      }
    } else {
      fetch('http://localhost:8080/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }).catch(() => {});
    }
  }, [getGraphIR]);

  const handleImportYaml = useCallback(async () => {
    try {
      if (isTauri) {
        const result = await tauriOpen({ filters: [{ name: 'YAML', extensions: ['yaml', 'yml'] }], multiple: false });
        if (result) {
          const path = typeof result === 'string' ? result : (result as unknown as string);
          const text = await invoke('read_text_file', { path }) as string;
          const graph = importYaml(text);
          const laid = autoLayout(graph);
          loadGraphIR(laid);
          requestFitView();
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.yaml,.yml';
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) return;
          const text = await file.text();
          const graph = importYaml(text);
          const laid = autoLayout(graph);
          loadGraphIR(laid);
          requestFitView();
        };
        input.click();
      }
    } catch (e) {
      console.error('Failed to import YAML:', e);
    }
  }, [loadGraphIR, requestFitView]);

  const handleLoadPreset = useCallback((presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      const laid = autoLayout(preset.graph);
      loadGraphIR(laid);
      requestFitView();
    }
  }, [loadGraphIR, requestFitView]);

  const handleAutoLayout = useCallback(() => {
    const graph = getGraphIR();
    const laid = autoLayout(graph);
    loadGraphIR(laid);
    requestFitView();
  }, [getGraphIR, loadGraphIR, requestFitView]);

  const handleClearGraph = useCallback(() => {
    if (window.confirm('确定清空画布？此操作不可撤销。')) clearGraph();
  }, [clearGraph]);

  // Tauri 原生菜单事件
  useEffect(() => {
    if (!isTauri) return;
    const appWindow = getCurrentWindow();
    const done = appWindow.listen<string>('tauri://menu', async (event) => {
      const menuId = event.payload;
      switch (menuId) {
        case 'new_canvas':
          handleClearGraph();
          break;
        case 'open_json':
          await handleLoadJson();
          break;
        case 'save_json':
          await handleSaveJson();
          break;
        case 'import_yaml':
          await handleImportYaml();
          break;
        case 'export_yaml':
          await handleExportYaml();
          break;
        case 'export_pytorch':
          await handleExportPyTorch();
          break;
        case 'undo': {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          const snapshot = undo();
          if (snapshot) {
            const selectedIds = snapshot.nodes.filter((n) => n.selected).map((n) => n.id);
            loadGraphIR({ nodes: snapshot.nodes.map((n) => ({ id: n.id, type: (n.data as { type: string }).type, position: n.position, params: (n.data as { params: Record<string, ParamValue> }).params })), edges: snapshot.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || 'out', targetHandle: e.targetHandle || 'in' })) }, selectedIds);
          }
          break;
        }
        case 'redo': {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          const snapshot = redo();
          if (snapshot) {
            const selectedIds = snapshot.nodes.filter((n) => n.selected).map((n) => n.id);
            loadGraphIR({ nodes: snapshot.nodes.map((n) => ({ id: n.id, type: (n.data as { type: string }).type, position: n.position, params: (n.data as { params: Record<string, ParamValue> }).params })), edges: snapshot.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle || 'out', targetHandle: e.targetHandle || 'in' })) }, selectedIds);
          }
          break;
        }
        case 'fit_view':
          fitView({ padding: 0.2, duration: 300 });
          break;
      }
    });
    return () => { done.then((fn) => fn()); };
  }, [handleClearGraph, handleLoadJson, handleSaveJson, handleImportYaml, handleExportYaml, handleExportPyTorch, undo, redo, loadGraphIR, fitView]);

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
    <div className="flex flex-1 min-h-0">
      {/* Left sidebar */}
      <SidebarToolbar
        onSaveJson={handleSaveJson}
        onLoadJson={handleLoadJson}
        onImportYaml={handleImportYaml}
        onExportYaml={handleExportYaml}
        onExportPyTorch={handleExportPyTorch}
        onAutoLayout={handleAutoLayout}
        onClearGraph={handleClearGraph}
        onLoadPreset={handleLoadPreset}
      />

      {/* Canvas */}
      <div ref={reactFlowWrapper} className="flex-1 min-w-0" onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={styledEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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
            <div className="bg-white/70 backdrop-blur-xl border border-zinc-200/50 px-4 py-2 rounded-full shadow-lg text-xs text-zinc-500 font-medium">
              拖拽模块 · 连接端口 · Ctrl+Z 撤销 · Ctrl+S 保存
            </div>
          </Panel>
          <Panel position="bottom-left">
            <ErrorPanel errors={validationErrors} nodes={nodes} onNavigate={handleNavigate} />
          </Panel>
          <Panel position="bottom-right">
            <div className="bg-white/70 backdrop-blur-xl border border-zinc-200/50 px-3 py-1.5 rounded-full shadow-lg text-[11px] text-zinc-400 font-medium">
              {formatParams(modelStats.totalParams)} 参数 · {formatFLOPs(modelStats.totalFLOPs)} FLOPs
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Right sidebar */}
      <RightPanel
        rightTab={rightTab}
        setRightTab={setRightTab}
        selectedNode={selectedNode}
        onParamChange={handleParamChange}
        yamlContent={yamlContent}
      />
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
