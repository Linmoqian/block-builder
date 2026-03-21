import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  RotateCw,
  Layers,
  Download,
  Undo2,
  Grid3X3,
  MousePointer2,
  Palette,
  Copy,
  Trash,
  Link2,
  X,
  ChevronLeft,
  ChevronRight,
  Code2,
  Play
} from 'lucide-react';
import { useDragControls } from 'motion/react';
import { BlockInstance, BLOCK_TEMPLATES, COLORS, ShapeType } from './types';
import { BlockShape } from './components/BlockShape';
import { CodeHighlighter } from './components/CodeHighlighter';

export default function App() {
  const [blocks, setBlocks] = useState<BlockInstance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [isDraggingExisting, setIsDraggingExisting] = useState(false);
  const [isDraggingTemplate, setIsDraggingTemplate] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isAnyItemDragging, setIsAnyItemDragging] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [codeContent, setCodeContent] = useState("print('Hello, World!')");
  const isOverCanvasRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [nextZIndex, setNextZIndex] = useState(1);

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    blockId: string;
  } | null>(null);

  // 连接模式
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  // 拖动时的实时位置 (用于连接线跟踪)
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({});

  // 点击外部关闭右键菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleResize = () => setContextMenu(null);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setConnectingFrom(null);
      }
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // 定期获取代码文件内容
  useEffect(() => {
    if (!rightSidebarOpen) return;

    const fetchCode = () => {
      fetch('http://localhost:8080/read-file')
        .then(res => res.json())
        .then(data => {
          if (data.content) {
            setCodeContent(data.content);
          }
        })
        .catch(() => {});
    };

    fetchCode();
    const interval = setInterval(fetchCode, 1000);
    return () => clearInterval(interval);
  }, [rightSidebarOpen]);

  const findSnapPosition = (id: string | null, x: number, y: number, currentBlocks: BlockInstance[]) => {
    const SNAP_THRESHOLD = 24;
    const BLOCK_SIZE = 64;
    let snappedX = x;
    let snappedY = y;
    let isSnappedX = false;
    let isSnappedY = false;

    for (const other of currentBlocks) {
      if (other.id === id) continue;

      // X轴吸附逻辑
      // 1. 拖拽块右边缘吸附到目标块左边缘
      if (Math.abs((x + BLOCK_SIZE) - other.x) < SNAP_THRESHOLD) {
        snappedX = other.x - BLOCK_SIZE;
        isSnappedX = true;
      }
      // 2. 拖拽块左边缘吸附到目标块右边缘
      else if (Math.abs(x - (other.x + BLOCK_SIZE)) < SNAP_THRESHOLD) {
        snappedX = other.x + BLOCK_SIZE;
        isSnappedX = true;
      }
      // 3. 左边缘对齐
      else if (Math.abs(x - other.x) < SNAP_THRESHOLD) {
        snappedX = other.x;
        isSnappedX = true;
      }

      // Y轴吸附逻辑
      // 1. 拖拽块下边缘吸附到目标块上边缘
      if (Math.abs((y + BLOCK_SIZE) - other.y) < SNAP_THRESHOLD) {
        snappedY = other.y - BLOCK_SIZE;
        isSnappedY = true;
      }
      // 2. 拖拽块上边缘吸附到目标块下边缘
      else if (Math.abs(y - (other.y + BLOCK_SIZE)) < SNAP_THRESHOLD) {
        snappedY = other.y + BLOCK_SIZE;
        isSnappedY = true;
      }
      // 3. 上边缘对齐
      else if (Math.abs(y - other.y) < SNAP_THRESHOLD) {
        snappedY = other.y;
        isSnappedY = true;
      }
      
      if (isSnappedX && isSnappedY) break;
    }

    return { x: snappedX, y: snappedY };
  };

  const addBlockAt = (type: ShapeType, color: string, x: number, y: number) => {
    // Apply snapping for new blocks
    const { x: finalX, y: finalY } = findSnapPosition(null, x, y, blocks);
    
    const newBlock: BlockInstance = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: finalX,
      y: finalY,
      color,
      rotation: 0,
      zIndex: nextZIndex,
    };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedId(newBlock.id);
    setNextZIndex(prev => prev + 1);
  };

  const updateBlock = (id: string, updates: Partial<BlockInstance>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const bringToFront = (id: string) => {
    updateBlock(id, { zIndex: nextZIndex });
    setNextZIndex(prev => prev + 1);
  };

  const rotateBlock = (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      updateBlock(id, { rotation: (block.rotation + 45) % 360 });
    }
  };

  const duplicateBlock = (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (block) {
      const newBlock: BlockInstance = {
        ...block,
        id: Math.random().toString(36).substr(2, 9),
        x: block.x + 24,
        y: block.y + 24,
        zIndex: nextZIndex,
        connectedTo: [], // 复制时不保留连接
      };
      setBlocks(prev => [...prev, newBlock]);
      setSelectedId(newBlock.id);
      setNextZIndex(prev => prev + 1);
    }
  };

  // 连接两个积木
  const connectBlocks = (fromId: string, toId: string) => {
    if (fromId === toId) return;

    setBlocks(prev => prev.map(block => {
      if (block.id === fromId) {
        const connectedTo = block.connectedTo || [];
        if (!connectedTo.includes(toId)) {
          return { ...block, connectedTo: [...connectedTo, toId] };
        }
      }
      if (block.id === toId) {
        const connectedTo = block.connectedTo || [];
        if (!connectedTo.includes(fromId)) {
          return { ...block, connectedTo: [...connectedTo, fromId] };
        }
      }
      return block;
    }));

    // 通知后端
    const fromBlock = blocks.find(b => b.id === fromId);
    const toBlock = blocks.find(b => b.id === toId);
    if (fromBlock && toBlock) {
      const fromTemplate = BLOCK_TEMPLATES.find(t => t.type === fromBlock.type);
      const toTemplate = BLOCK_TEMPLATES.find(t => t.type === toBlock.type);
      fetch('http://localhost:8080/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: { type: fromBlock.type, name: fromTemplate?.label },
          to: { type: toBlock.type, name: toTemplate?.label }
        })
      }).catch(() => {});
    }
  };

  const handleTemplateDrag = (e: any, info: any) => {
    const sidebarWidth = sidebarRef.current?.offsetWidth || 320;
    const isOverCanvas = info.point.x > sidebarWidth;
    
    if (isOverCanvas !== isOverCanvasRef.current) {
      isOverCanvasRef.current = isOverCanvas;
      setIsDraggingTemplate(isOverCanvas);
    }
  };

  const handleTemplateDragEnd = (e: any, info: any, template: any) => {
    setIsDraggingTemplate(false);
    isOverCanvasRef.current = false;
    const sidebarWidth = sidebarRef.current?.offsetWidth || 320;
    
    // Ignore tiny movements (clicks)
    const dragDistance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
    if (dragDistance < 10) return;

    if (info.point.x > sidebarWidth) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        let x = info.point.x - canvasRect.left - 30;
        let y = info.point.y - canvasRect.top - 30;
        
        if (showGrid) {
          x = Math.round(x / 24) * 24;
          y = Math.round(y / 24) * 24;
        } else {
          // If grid is off, still try to snap to other blocks
          const snapped = findSnapPosition(null, x, y, blocks);
          x = snapped.x;
          y = snapped.y;
        }
        
        addBlockAt(template.type, template.defaultColor, x, y);
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
      if (canvasRect) {
        let newX = info.point.x - canvasRect.left - 30;
        let newY = info.point.y - canvasRect.top - 30;
        
        if (showGrid) {
          newX = Math.round(newX / 24) * 24;
          newY = Math.round(newY / 24) * 24;
        } else {
          // Block-to-block snapping
          const snapped = findSnapPosition(id, newX, newY, blocks);
          newX = snapped.x;
          newY = snapped.y;
        }
        
        updateBlock(id, { x: newX, y: newY });
      }
    }
  };

  const clearCanvas = () => {
    setBlocks([]);
    setSelectedId(null);
    setShowClearConfirm(false);
  };

  const selectedBlock = blocks.find(b => b.id === selectedId);

  return (
    <div className="flex h-screen w-full bg-zinc-50 overflow-hidden font-sans text-zinc-900">
      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className="w-80 bg-white border-r border-zinc-200 flex flex-col shadow-sm z-20 relative"
      >
        <div className="px-6 py-5 border-b border-zinc-100">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <Plus size={22} />
            </div>
            神经网络工坊
          </h1>
          <p className="text-xs text-zinc-500 mt-2 uppercase tracking-wider font-semibold">Block Builder Pro</p>
        </div>

        <div className={`flex-1 px-5 py-4 space-y-6 ${isAnyItemDragging ? 'overflow-visible' : 'overflow-y-auto'}`}>
          <section>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">形状库 (拖拽添加)</h2>
            <div className="grid grid-cols-2 gap-4">
              {BLOCK_TEMPLATES.map((template) => (
                <div
                  key={template.type}
                  className="relative h-32 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors group"
                >
                  <motion.div
                    drag
                    dragSnapToOrigin
                    dragMomentum={false}
                    dragElastic={0.1}
                    whileDrag={{ 
                      scale: 1.2, 
                      zIndex: 1000,
                      filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.3))",
                      cursor: "grabbing"
                    }}
                    onDragStart={() => {
                      setIsAnyItemDragging(true);
                      // 通知后端
                      fetch('http://localhost:8080/drag', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: template.type, name: template.label })
                      }).catch(() => {});
                    }}
                    onDrag={handleTemplateDrag}
                    onDragEnd={(e, info) => {
                      setIsAnyItemDragging(false);
                      handleTemplateDragEnd(e, info, template);
                    }}
                    className="z-30 cursor-grab active:z-50 touch-none"
                  >
                    <div className="pointer-events-none">
                      <BlockShape type={template.type} color={template.defaultColor} size={52} />
                    </div>
                  </motion.div>
                  
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-2 pointer-events-none group-hover:text-blue-500 transition-colors select-none">
                    {template.label}
                  </span>

                  {/* Ghost placeholder when dragging */}
                  {isAnyItemDragging && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                      <BlockShape type={template.type} color="#000" size={40} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {selectedBlock && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 rounded-2xl p-6 text-white space-y-5 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">编辑积木</h2>
                <button onClick={() => setSelectedId(null)} className="text-zinc-500 hover:text-white">
                  <Plus className="rotate-45" size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">颜色选择</label>
                <div className="grid grid-cols-5 gap-3">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => updateBlock(selectedId, { color })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${selectedBlock.color === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => rotateBlock(selectedId)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-medium transition-colors"
                >
                  <RotateCw size={14} /> 旋转
                </button>
                <button
                  onClick={() => bringToFront(selectedId)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-medium transition-colors"
                >
                  <Layers size={14} /> 置顶
                </button>
                <button
                  onClick={() => duplicateBlock(selectedId)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-medium transition-colors"
                >
                  <Copy size={14} /> 复制
                </button>
                <button
                  onClick={() => deleteBlock(selectedId)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded-xl text-xs font-medium transition-colors border border-red-900/50"
                >
                  <Trash2 size={14} /> 删除
                </button>
              </div>
            </motion.section>
          )}
        </div>

        {/* Trash Overlay when dragging */}
        <AnimatePresence>
          {(isDraggingExisting || isDraggingTemplate) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 z-50 bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center"
              >
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <Trash size={40} className={isDraggingExisting ? "text-red-400" : "text-blue-400"} />
              </div>
              <h3 className="text-lg font-bold">
                {isDraggingExisting ? "拖拽到此处删除" : "取消拖拽"}
              </h3>
              <p className="text-sm opacity-80">
                {isDraggingExisting ? "释放鼠标即可移除积木" : "释放鼠标返回库"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-5 py-4 border-t border-zinc-100 bg-zinc-50/50 relative">
          {showClearConfirm ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 bg-white px-5 flex items-center justify-between z-10"
            >
              <span className="text-xs font-bold text-zinc-500">确定清空？</span>
              <div className="flex gap-2">
                <button
                  onClick={clearCanvas}
                  className="px-4 py-2 bg-red-600 text-white text-[10px] font-bold rounded-xl hover:bg-red-700"
                >
                  确定
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-xl hover:bg-zinc-200"
                >
                  取消
                </button>
              </div>
            </motion.div>
          ) : (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 text-zinc-500 hover:text-zinc-800 text-xs font-semibold transition-colors"
            >
              <Undo2 size={14} /> 重置画布
            </button>
          )}
        </div>
      </aside>

      {/* Main Canvas Area */}
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
          <div className="px-4 text-xs font-medium text-zinc-400 flex items-center gap-2">
            <MousePointer2 size={14} /> 拖拽积木进行组合
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className={`flex-1 relative transition-colors ${showGrid ? 'bg-grid-pattern' : 'bg-zinc-50'}`}
          onClick={() => {
            setSelectedId(null);
            setContextMenu(null);
            setConnectingFrom(null);
          }}
          style={{
            backgroundImage: showGrid ? 'radial-gradient(#e5e7eb 1px, transparent 1px)' : 'none',
            backgroundSize: '24px 24px'
          }}
        >
          <AnimatePresence>
            {blocks.map((block) => (
              <motion.div
                key={block.id}
                drag
                dragMomentum={false}
                onDragStart={() => {
                  setSelectedId(block.id);
                  setIsDraggingExisting(true);
                  setIsAnyItemDragging(true);
                  // 通知后端
                  const template = BLOCK_TEMPLATES.find(t => t.type === block.type);
                  fetch('http://localhost:8080/drag', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: block.type, name: template?.label || block.type })
                  }).catch(() => {});
                }}
                onDrag={(e, info) => {
                  // 更新实时位置用于连接线跟踪 (使用 offset 而不是 delta)
                  setDragPositions(prev => ({
                    ...prev,
                    [block.id]: { x: block.x + info.offset.x, y: block.y + info.offset.y }
                  }));
                }}
                onDragEnd={(e, info) => {
                  setIsAnyItemDragging(false);
                  // 清除实时位置
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
                  x: block.x,
                  y: block.y,
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
                  // 处理连接模式
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
                className={`absolute cursor-grab active:cursor-grabbing ${isAnyItemDragging ? 'transition-none' : ''} ${selectedId === block.id ? 'z-50' : ''} ${connectingFrom === block.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                style={{ left: 0, top: 0 }}
              >
                <BlockShape type={block.type} color={block.color} size={64} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* 连接线 */}
          <svg className="absolute inset-0 pointer-events-none" style={{ width: '100%', height: '100%' }}>
            {blocks.map(block => {
              const connectedTo = block.connectedTo || [];
              return connectedTo.map(targetId => {
                const targetBlock = blocks.find(b => b.id === targetId);
                if (!targetBlock || block.id > targetId) return null; // 避免重复绘制

                // 使用实时位置（拖动中）或静态位置
                const x1 = (dragPositions[block.id]?.x ?? block.x) + 32;
                const y1 = (dragPositions[block.id]?.y ?? block.y) + 32;
                const x2 = (dragPositions[targetId]?.x ?? targetBlock.x) + 32;
                const y2 = (dragPositions[targetId]?.y ?? targetBlock.y) + 32;

                return (
                  <line
                    key={`${block.id}-${targetId}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    className="transition-all duration-75"
                  />
                );
              });
            })}
          </svg>

          {blocks.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-300 pointer-events-none">
              <div className="w-28 h-28 border-4 border-dashed border-zinc-200 rounded-3xl mb-5 flex items-center justify-center">
                <Plus size={44} />
              </div>
              <p className="text-sm font-medium">从左侧拖拽形状开始搭建</p>
            </div>
          )}

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

      {/* 右侧边栏 */}
      <AnimatePresence>
        {rightSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: rightSidebarWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white border-l border-zinc-200 flex flex-col shadow-lg z-20 overflow-hidden relative"
            style={{ width: rightSidebarWidth }}
          >
            {/* 拖拽调整宽度的手柄 */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors z-10"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
                const startX = e.clientX;
                const startWidth = rightSidebarWidth;

                const handleMouseMove = (e: MouseEvent) => {
                  const newWidth = startWidth - (e.clientX - startX);
                  if (newWidth >= 280 && newWidth <= 600) {
                    setRightSidebarWidth(newWidth);
                  }
                };

                const handleMouseUp = () => {
                  setIsResizing(false);
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <Code2 size={16} className="text-blue-500" />
                代码阅读器
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // 通知后端运行代码
                    fetch('http://localhost:8080/run', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'run' })
                    }).catch(() => {});
                  }}
                  className="p-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
                  title="运行代码"
                >
                  <Play size={14} className="text-white" />
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`print('Hello, World!')`);
                  }}
                  className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
                  title="复制代码"
                >
                  <Copy size={14} className="text-zinc-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* 文件标签 */}
              <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100 flex items-center gap-2">
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-mono">main.py</span>
                <span className="text-xs text-zinc-400">Python</span>
              </div>
              {/* 代码区域 */}
              <div className="flex-1 overflow-auto bg-zinc-900 p-4 font-mono text-sm">
                <CodeHighlighter code={codeContent} />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .bg-grid-pattern {
          background-color: #f8fafc;
        }
      `}} />
    </div>
  );
}
