import React, { useState, useRef, useMemo } from 'react';
import { BlockInstance, BLOCK_TEMPLATES, AllBlockType, ShapeType } from './types';
import { NETWORK_TEMPLATES } from './config/networkBlocks';
import { YOLO_TEMPLATES } from './config/yoloBlocks';
import { YOLO_PRESETS, SCALES, loadPreset } from './config/yoloPresets';
import { generateYoloYaml } from './yaml/generator';
import { Sidebar } from './components/Sidebar';
import { BlockCanvas } from './components/BlockCanvas';
import { CodePanel } from './components/CodePanel';
import { useToast } from './hooks/useToast';
import { useBlocks } from './hooks/useBlocks';
import { useConnections } from './hooks/useConnections';
import { useCanvas } from './hooks/useCanvas';
import { useCodePanel } from './hooks/useCodePanel';
import { useContextMenu } from './hooks/useContextMenu';
import { useYamlModals } from './hooks/useYamlModals';

export default function App() {
  const [activeTab, setActiveTab] = useState<'shapes' | 'network' | 'yolo'>('shapes');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const { toastMessage, showToast } = useToast();
  const {
    blocks, setBlocks, selectedId, setSelectedId, nextZIndex, setNextZIndex,
    addBlockAt, updateBlock, deleteBlock, bringToFront, rotateBlock, duplicateBlock, clearCanvas: clearBlocks,
  } = useBlocks({ showToast });
  const { connectingFrom, setConnectingFrom, connectBlocks } = useConnections({ blocks, setBlocks, showToast });
  const {
    zoom, zoomLevel, setZoomLevel, showGrid, setShowGrid,
    dragPositions, setDragPositions,
    isDraggingExisting, setIsDraggingExisting,
    isDraggingTemplate, setIsDraggingTemplate,
    isAnyItemDragging, setIsAnyItemDragging,
    canvasRef, scrollContainerRef, isOverCanvasRef,
  } = useCanvas();
  const {
    codeContent, setCodeContent,
    rightSidebarOpen, setRightSidebarOpen,
    rightSidebarWidth, setRightSidebarWidth,
    isResizing, setIsResizing,
    exportCode, runCode, copyCode,
  } = useCodePanel({ blocks, activeTab });
  const { contextMenu, setContextMenu } = useContextMenu(setConnectingFrom);
  const {
    showYamlImport, setShowYamlImport,
    showYamlExport, setShowYamlExport,
    yamlText, setYamlText,
    importYaml, exportYaml,
  } = useYamlModals({ blocks, setBlocks, nextZIndex, setNextZIndex, setCodeContent, showToast });

  const selectedBlock = blocks.find(b => b.id === selectedId);

  // 画布内容高度
  const canvasHeight = useMemo(() => {
    if (blocks.length === 0) return 672;
    return Math.max(672, Math.max(...blocks.map(b => (b.y || 0) + 100)));
  }, [blocks]);

  // 模板拖拽处理
  const handleTemplateDrag = (e: any, info: any) => {
    const sidebarWidth = sidebarRef.current?.offsetWidth || 320;
    const isOver = info.point.x > sidebarWidth;
    if (isOver !== isOverCanvasRef.current) {
      isOverCanvasRef.current = isOver;
      setIsDraggingTemplate(isOver);
    }
  };

  const handleTemplateDragEnd = (e: any, info: any, template: any) => {
    setIsDraggingTemplate(false);
    isOverCanvasRef.current = false;
    const sidebarWidth = sidebarRef.current?.offsetWidth || 320;
    const dragDistance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
    if (dragDistance < 10) return;

    if (info.point.x > sidebarWidth) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const scrollTop = (scrollContainerRef.current?.scrollTop ?? 0) / zoom;
      if (canvasRect) {
        addBlockAt(template.type, template.defaultColor,
          (info.point.x - canvasRect.left) / zoom - 30,
          (info.point.y - canvasRect.top) / zoom - 30 + scrollTop);
      }
    }
  };

  const handleBlockDragEnd = (id: string, info: any) => {
    setIsDraggingExisting(false);
    const sidebarWidth = sidebarRef.current?.offsetWidth || 320;
    if (info.point.x < sidebarWidth) {
      deleteBlock(id);
      return;
    }
    const block = blocks.find(b => b.id === id);
    if (block) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const scrollTop = (scrollContainerRef.current?.scrollTop ?? 0) / zoom;
      if (canvasRect) {
        updateBlock(id, {
          x: (info.point.x - canvasRect.left) / zoom - 30,
          y: (info.point.y - canvasRect.top) / zoom - 30 + scrollTop,
        });
      }
    }
  };

  const clearCanvas = () => {
    clearBlocks();
    setShowClearConfirm(false);
  };

  const handleLoadPreset = (family: string, scale: string) => {
    const preset = YOLO_PRESETS.find(p => p.family === family);
    if (!preset) return;
    const nonYoloBlocks = blocks.filter(b => !YOLO_TEMPLATES.some(t => t.type === b.type));
    const newBlocks = loadPreset(family, scale, 60, nextZIndex);
    const allBlocks = [...nonYoloBlocks, ...newBlocks];
    setBlocks(allBlocks);
    setNextZIndex(prev => prev + newBlocks.length + 1);
    setCodeContent(generateYoloYaml(allBlocks));
    showToast(`已加载 ${preset.family}${scale} (${newBlocks.length} 层)`);
  };

  return (
    <div className="flex h-screen w-full bg-zinc-50 overflow-hidden font-sans text-zinc-900">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        blocks={blocks}
        selectedId={selectedId}
        selectedBlock={selectedBlock}
        isAnyItemDragging={isAnyItemDragging}
        isDraggingExisting={isDraggingExisting}
        isDraggingTemplate={isDraggingTemplate}
        updateBlock={updateBlock}
        rotateBlock={rotateBlock}
        bringToFront={bringToFront}
        duplicateBlock={duplicateBlock}
        deleteBlock={deleteBlock}
        clearCanvas={clearCanvas}
        setSelectedId={setSelectedId}
        onTemplateDrag={handleTemplateDrag}
        onTemplateDragEnd={handleTemplateDragEnd}
        setIsAnyItemDragging={setIsAnyItemDragging}
        onImportYaml={() => { setYamlText(''); setShowYamlImport(true); }}
        onExportYaml={exportYaml}
        onLoadPreset={handleLoadPreset}
        sidebarRef={sidebarRef}
      />

      <BlockCanvas
        blocks={blocks}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        zoomLevel={zoomLevel}
        zoom={zoom}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        setZoomLevel={setZoomLevel}
        isAnyItemDragging={isAnyItemDragging}
        setIsAnyItemDragging={setIsAnyItemDragging}
        setIsDraggingExisting={setIsDraggingExisting}
        connectingFrom={connectingFrom}
        setConnectingFrom={setConnectingFrom}
        connectBlocks={connectBlocks}
        duplicateBlock={duplicateBlock}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        toastMessage={toastMessage}
        dragPositions={dragPositions}
        setDragPositions={setDragPositions}
        canvasRef={canvasRef}
        scrollContainerRef={scrollContainerRef}
        canvasHeight={canvasHeight}
        rightSidebarOpen={rightSidebarOpen}
        setRightSidebarOpen={setRightSidebarOpen}
        handleBlockDragEnd={handleBlockDragEnd}
        showYamlImport={showYamlImport}
        setShowYamlImport={setShowYamlImport}
        showYamlExport={showYamlExport}
        setShowYamlExport={setShowYamlExport}
        yamlText={yamlText}
        setYamlText={setYamlText}
        importYaml={importYaml}
        showToast={showToast}
        blocks_state={blocks}
        setBlocks={setBlocks}
        nextZIndex={nextZIndex}
        setNextZIndex={setNextZIndex}
      />

      <CodePanel
        isOpen={rightSidebarOpen}
        width={rightSidebarWidth}
        setWidth={setRightSidebarWidth}
        activeTab={activeTab}
        codeContent={codeContent}
        onExport={exportCode}
        onRun={runCode}
        onCopy={copyCode}
        onClose={() => setRightSidebarOpen(false)}
      />
    </div>
  );
}
