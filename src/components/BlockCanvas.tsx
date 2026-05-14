import React, { useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Grid3X3, MousePointer2, ZoomIn, ZoomOut,
  Copy, Link2, X, FileJson, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { BlockInstance, BLOCK_TEMPLATES, ShapeType, BLOCK_PORTS } from '../types';
import { NETWORK_TEMPLATES } from '../config/networkBlocks';
import { YOLO_TEMPLATES } from '../config/yoloBlocks';
import { BlockShape } from './BlockShape';
import { NetworkBlockCard } from './NetworkBlockCard';
import { YoloBlock } from './YoloBlock';
import { parseYoloYaml } from '../yaml/parser';
import { generateYoloYaml } from '../yaml/generator';

interface BlockCanvasProps {
  blocks: BlockInstance[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  zoomLevel: number;
  zoom: number;
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  isAnyItemDragging: boolean;
  setIsAnyItemDragging: (v: boolean) => void;
  setIsDraggingExisting: (v: boolean) => void;
  connectingFrom: string | null;
  setConnectingFrom: (v: string | null) => void;
  connectBlocks: (fromId: string, toId: string) => void;
  duplicateBlock: (id: string) => void;
  contextMenu: { x: number; y: number; blockId: string } | null;
  setContextMenu: (v: { x: number; y: number; blockId: string } | null) => void;
  toastMessage: string | null;
  dragPositions: Record<string, { x: number; y: number }>;
  setDragPositions: React.Dispatch<React.SetStateAction<Record<string, { x: number; y: number }>>>;
  canvasRef: React.RefObject<HTMLDivElement>;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  canvasHeight: number;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: (v: boolean) => void;
  handleBlockDragEnd: (id: string, info: any) => void;
  showYamlImport: boolean;
  setShowYamlImport: (v: boolean) => void;
  showYamlExport: boolean;
  setShowYamlExport: (v: boolean) => void;
  yamlText: string;
  setYamlText: (v: string) => void;
  importYaml: () => void;
  showToast: (msg: string) => void;
  blocks_state: BlockInstance[];
  setBlocks: React.Dispatch<React.SetStateAction<BlockInstance[]>>;
  nextZIndex: number;
  setNextZIndex: React.Dispatch<React.SetStateAction<number>>;
}

const BlockCanvas: React.FC<BlockCanvasProps> = React.memo(function BlockCanvas({
  blocks,
  selectedId,
  setSelectedId,
  zoomLevel,
  zoom,
  showGrid,
  setShowGrid,
  setZoomLevel,
  isAnyItemDragging,
  setIsAnyItemDragging,
  setIsDraggingExisting,
  connectingFrom,
  setConnectingFrom,
  connectBlocks,
  duplicateBlock,
  contextMenu,
  setContextMenu,
  toastMessage,
  dragPositions,
  setDragPositions,
  canvasRef,
  scrollContainerRef,
  canvasHeight,
  rightSidebarOpen,
  setRightSidebarOpen,
  handleBlockDragEnd,
  showYamlImport,
  setShowYamlImport,
  showYamlExport,
  setShowYamlExport,
  yamlText,
  setYamlText,
  importYaml,
  showToast,
  blocks_state,
  setBlocks,
  nextZIndex,
  setNextZIndex,
}) {
  const dragRafRef = useRef<number | null>(null);

  // 连接线数据（useMemo 缓存）
  const connectionLines = useMemo(() => {
    const drawn = new Set<string>();
    const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    const blockMap = new Map<string, BlockInstance>(blocks.map(b => [b.id, b]));
    blocks.forEach(block => {
      const connectedTo = block.connectedTo || [];
      connectedTo.forEach(targetId => {
        const key = block.id < targetId ? `${block.id}|${targetId}` : `${targetId}|${block.id}`;
        if (drawn.has(key)) return;
        drawn.add(key);
        const targetBlock = blockMap.get(targetId);
        if (!targetBlock) return;
        const bx = dragPositions[block.id]?.x ?? block.x;
        const by = dragPositions[block.id]?.y ?? block.y;
        const tx = dragPositions[targetId]?.x ?? targetBlock.x;
        const ty = dragPositions[targetId]?.y ?? targetBlock.y;
        const isBelow = ty > by;
        lines.push({
          key,
          x1: bx,
          y1: isBelow ? by + 32 : by - 32,
          x2: tx,
          y2: isBelow ? ty - 32 : ty + 32,
        });
      });
    });
    return lines;
  }, [blocks, dragPositions]);

  return (
    <main className="flex-1 relative flex flex-col z-10">
      {/* Toolbar */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-white/80 backdrop-blur-md border border-zinc-200 px-2 py-2 rounded-full shadow-lg">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2.5 rounded-full transition-colors ${showGrid ? 'bg-blue-100 text-blue-600' : 'hover:bg-zinc-100 text-zinc-500'}`}
          title="切换网格"
        >
          <Grid3X3 size={18} />
        </button>
        <div className="w-px h-6 bg-zinc-200 mx-1" />
        <button
          onClick={() => setZoomLevel(z => Math.max(1, z - 1))}
          className={`p-2.5 rounded-full transition-colors ${zoomLevel <= 1 ? 'text-zinc-300 cursor-not-allowed' : 'hover:bg-zinc-100 text-zinc-500'}`}
          disabled={zoomLevel <= 1}
          title="缩小"
        >
          <ZoomOut size={18} />
        </button>
        <span className="text-xs font-semibold text-zinc-500 min-w-[3rem] text-center select-none">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoomLevel(z => Math.min(12, z + 1))}
          className={`p-2.5 rounded-full transition-colors ${zoomLevel >= 12 ? 'text-zinc-300 cursor-not-allowed' : 'hover:bg-zinc-100 text-zinc-500'}`}
          disabled={zoomLevel >= 12}
          title="放大"
        >
          <ZoomIn size={18} />
        </button>
        <div className="w-px h-6 bg-zinc-200 mx-1" />
        <div className="px-4 text-xs font-medium text-zinc-400 flex items-center gap-2">
          <MousePointer2 size={14} /> 拖拽积木进行组合
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative"
        onClick={() => {
          setSelectedId(null);
          setContextMenu(null);
          setConnectingFrom(null);
        }}
      >
        <div
          ref={scrollContainerRef}
          className={`absolute inset-0 ${isAnyItemDragging ? 'overflow-hidden' : 'overflow-y-auto'}`}
          style={{
            backgroundImage: showGrid ? 'radial-gradient(#e5e7eb 1px, transparent 1px)' : 'none',
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0',
          }}
        >
          <div style={{
            height: Math.max(canvasHeight, 672) * zoom,
            position: 'relative',
          }}>
            <div style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              height: Math.max(canvasHeight, 672),
              position: 'relative',
            }}>
            <AnimatePresence>
              {blocks.map((block) => {
            const isNetwork = NETWORK_TEMPLATES.some(t => t.type === block.type);
            const isYolo = YOLO_TEMPLATES.some(t => t.type === block.type);
            const template = isNetwork
              ? NETWORK_TEMPLATES.find(t => t.type === block.type)
              : isYolo
              ? YOLO_TEMPLATES.find(t => t.type === block.type)
              : BLOCK_TEMPLATES.find(t => t.type === block.type);

            return (
            <motion.div
              key={block.id}
              drag
              dragMomentum={false}
              onDragStart={() => {
                setSelectedId(block.id);
                setIsDraggingExisting(true);
                setIsAnyItemDragging(true);
              }}
              onDrag={(e, info) => {
                if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
                dragRafRef.current = requestAnimationFrame(() => {
                  setDragPositions(prev => ({
                    ...prev,
                    [block.id]: { x: block.x + info.offset.x, y: block.y + info.offset.y }
                  }));
                });
              }}
              onDragEnd={(e, info) => {
                setIsAnyItemDragging(false);
                setDragPositions(prev => {
                  const newPositions = { ...prev };
                  delete newPositions[block.id];
                  return newPositions;
                });
                handleBlockDragEnd(block.id, info);
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                rotate: block.rotation,
                zIndex: block.zIndex
              }}
              whileDrag={{
                scale: 1.1,
                zIndex: 2000,
                boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.4)"
              }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                if (connectingFrom && connectingFrom !== block.id) {
                  connectBlocks(connectingFrom, block.id);
                  setConnectingFrom(null);
                  return;
                }
                setSelectedId(block.id);
                setContextMenu(null);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY, blockId: block.id });
              }}
              className={`absolute cursor-grab active:cursor-grabbing outline-none ${isAnyItemDragging ? 'transition-none' : ''} ${selectedId === block.id ? 'z-50 ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-50' : ''} ${connectingFrom === block.id ? 'ring-2 ring-blue-400 ring-offset-2 animate-pulse' : ''}`}
              style={{ left: block.x - 32, top: block.y - 32 }}
            >
              {isYolo ? (
                <YoloBlock type={block.type} color={block.color} size={64}
                  params={block.yoloParams} repeats={block.repeats} />
              ) : isNetwork ? (
                <NetworkBlockCard type={block.type} color={block.color} size={64} label={template?.label} />
              ) : (
                <BlockShape type={block.type as ShapeType} color={block.color} size={64} />
              )}
              {connectingFrom === block.id && (
                <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-blue-500 rounded-full -translate-x-1/2 -translate-y-1/2 animate-ping pointer-events-none" />
              )}
            </motion.div>
          )})}
        </AnimatePresence>

        {/* 连接线 */}
        {connectionLines.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%', overflow: 'visible', zIndex: 9999 }}>
            {connectionLines.map(p => (
              <line key={p.key} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
                stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
            ))}
          </svg>
        )}

        {blocks.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300 pointer-events-none">
            <div className="w-28 h-28 border-4 border-dashed border-zinc-200 rounded-3xl mb-5 flex items-center justify-center">
              <Plus size={44} />
            </div>
            <p className="text-sm font-medium">从左侧拖拽形状开始搭建</p>
          </div>
        )}
        </div>{/* /content-height */}
        </div>{/* /zoom-wrapper */}
        </div>{/* /scroll-container */}

        {/* 右键菜单 */}
        <AnimatePresence>
          {contextMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed bg-white rounded-xl shadow-2xl border border-zinc-200 py-2 min-w-[140px] z-[9999]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  duplicateBlock(contextMenu.blockId);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-zinc-100 flex items-center gap-3 text-zinc-700"
              >
                <Copy size={16} />
                复制
              </button>
              <button
                onClick={() => {
                  setConnectingFrom(contextMenu.blockId);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-3 text-blue-600"
              >
                <Link2 size={16} />
                连接
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 连接模式提示 */}
        <AnimatePresence>
          {connectingFrom && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 z-50"
            >
              <Link2 size={18} />
              <span className="text-sm font-medium">点击另一个积木建立连接</span>
              <button
                onClick={() => setConnectingFrom(null)}
                className="ml-2 hover:bg-blue-700 rounded-full p-1"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="absolute top-20 left-1/2 z-50 px-4 py-2 bg-slate-800 text-white rounded-lg shadow-lg"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* YAML Import Modal */}
        <AnimatePresence>
          {showYamlImport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-8"
              onClick={() => setShowYamlImport(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <FileJson size={16} className="text-rose-500" />
                    导入 YOLO YAML
                  </h2>
                  <button onClick={() => setShowYamlImport(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-6">
                  <textarea
                    value={yamlText}
                    onChange={e => setYamlText(e.target.value)}
                    placeholder="在此粘贴 YOLO YAML 配置..."
                    className="w-full h-64 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono
                               focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200">
                  <button
                    onClick={() => setShowYamlImport(false)}
                    className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      try {
                        const { blocks: newBlocks } = parseYoloYaml(yamlText);
                        const maxY = blocks_state.length > 0
                          ? Math.max(...blocks_state.map(b => b.y + 90))
                          : 0;
                        const positioned = newBlocks.map((b, i) => ({
                          ...b,
                          y: maxY + i * 90,
                          zIndex: nextZIndex + i,
                        }));
                        setBlocks(prev => [...prev, ...positioned]);
                        setNextZIndex(prev => prev + newBlocks.length);
                        setShowYamlImport(false);
                        showToast(`导入成功: ${newBlocks.length} 个模块`);
                      } catch (err) {
                        showToast('YAML 解析失败，请检查格式');
                      }
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
                  >
                    导入
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* YAML Export Modal */}
        <AnimatePresence>
          {showYamlExport && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-8"
              onClick={() => setShowYamlExport(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <FileJson size={16} className="text-rose-500" />
                    导出的 YOLO YAML
                  </h2>
                  <button onClick={() => setShowYamlExport(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-6">
                  <pre className="w-full h-64 overflow-auto px-4 py-3 bg-zinc-900 text-green-400 rounded-xl text-xs font-mono whitespace-pre">
                    {yamlText}
                  </pre>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200">
                  <button
                    onClick={() => setShowYamlExport(false)}
                    className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    关闭
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(yamlText);
                      showToast('YAML 已复制到剪贴板');
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
                  >
                    复制 YAML
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 右侧中央按钮 - 展开/收起右侧边栏 */}
        <button
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-full shadow-md flex items-center justify-center transition-colors z-20"
          title={rightSidebarOpen ? "收起面板" : "展开面板"}
        >
          {rightSidebarOpen ? (
            <ChevronRight size={20} className="text-zinc-600" />
          ) : (
            <ChevronLeft size={20} className="text-zinc-600" />
          )}
        </button>
      </div>

      {/* Footer Stats */}
      <div className="bg-white border-t border-zinc-200 px-8 py-4 flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
        <div className="flex gap-8">
          <span>积木总数: {blocks.length}</span>
          <span>当前层级: {nextZIndex - 1}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          实时保存中
        </div>
      </div>
    </main>
  );
});

export { BlockCanvas };
export type { BlockCanvasProps };
