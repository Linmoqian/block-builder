import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, RotateCw, Layers, Download, Upload, FileJson,
  Undo2, Grid3X3, MousePointer2, Palette, Copy, Trash, Link2, X,
  ChevronLeft, ChevronRight, Code2, Play, ZoomIn, ZoomOut } from 'lucide-react';
import { BlockInstance, BLOCK_TEMPLATES, COLORS, AllBlockType, ShapeType, BLOCK_PORTS } from './types';
import { BlockShape } from './components/BlockShape';
import { CodeHighlighter } from './components/CodeHighlighter';
import { NETWORK_TEMPLATES } from './config/networkBlocks';
import { YOLO_TEMPLATES } from './config/yoloBlocks';
import { NetworkBlockCard } from './components/NetworkBlockCard';
import { YoloBlock } from './components/YoloBlock';
import { ParameterPanel } from './components/ParameterPanel';
import { generatePyTorchCode } from './graph/codegen';
import { parseYoloYaml } from './yaml/parser';
import { generateYoloYaml } from './yaml/generator';
import { YOLO_PRESETS, SCALES, loadPreset } from './config/yoloPresets';

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
  const [activeTab, setActiveTab] = useState<'shapes' | 'network' | 'yolo'>('shapes');
  const isOverCanvasRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [nextZIndex, setNextZIndex] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(4); // 4 = 100%, 步进1, 范围1-12
  const zoom = zoomLevel / 4;

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    blockId: string;
  } | null>(null);

  // 连接模式
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  // 提示信息
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // YAML 导入/导出
  const [showYamlImport, setShowYamlImport] = useState(false);
  const [showYamlExport, setShowYamlExport] = useState(false);
  const [yamlText, setYamlText] = useState('');

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000);
  };

  // 拖动时的实时位置 (用于连接线跟踪)
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({});
  const dragRafRef = useRef<number | null>(null);

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
  const codeContentRef = useRef(codeContent);
  codeContentRef.current = codeContent;

  useEffect(() => {
    if (activeTab === 'yolo') return;

    const fetchCode = () => {
      const fileParam = activeTab === 'network' ? 'network.py' : 'sample.py';
      fetch(`http://localhost:8080/read-file?file=${fileParam}`)
        .then(res => res.json())
        .then(data => {
          if (data.content !== undefined && data.content !== codeContentRef.current) {
            setCodeContent(data.content);
          }
        })
        .catch(err => console.error('[BlockBuilder]', err));
    };

    fetchCode();
    const interval = setInterval(fetchCode, 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // YOLO 模式：积木变化时生成 YAML
  const yoloYaml = useMemo(() => {
    if (activeTab !== 'yolo') return '';
    return generateYoloYaml(blocks);
  }, [activeTab, blocks]);

  useEffect(() => {
    if (activeTab === 'yolo' && yoloYaml) {
      setCodeContent(yoloYaml);
    }
  }, [activeTab, yoloYaml]);

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

  // 根据积木位置计算画布内容高度
  const canvasHeight = useMemo(() => {
    if (blocks.length === 0) return 672;
    const maxY = Math.max(...blocks.map(b => (b.y || 0) + 100));
    return Math.max(672, maxY);
  }, [blocks]);

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

  const addBlockAt = (type: AllBlockType, color: string, x: number, y: number) => {
    const template = [...BLOCK_TEMPLATES, ...NETWORK_TEMPLATES, ...YOLO_TEMPLATES].find(t => t.type === type);
    const isYoloBlock = YOLO_TEMPLATES.some(t => t.type === type);

    const yoloTemplate = isYoloBlock ? YOLO_TEMPLATES.find(t => t.type === type) : undefined;
    const yoloParams = yoloTemplate
      ? Object.fromEntries(yoloTemplate.params.map(p => [p.name, p.default]))
      : undefined;

    const newBlock: BlockInstance = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x,
      y,
      color,
      rotation: 0,
      zIndex: nextZIndex,
      ...(yoloParams && { yoloParams }),
      ...(yoloTemplate && { repeats: yoloTemplate.defaultRepeats }),
    };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedId(newBlock.id);
    setNextZIndex(prev => prev + 1);

    if (!template?.isNetwork && !isYoloBlock) {
      fetch('http://localhost:8080/drag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newBlock.id, type, name: template?.label || type })
      }).catch(err => console.error('[BlockBuilder]', err));
    }
  };

  const updateBlock = (id: string, updates: Partial<BlockInstance>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBlock = (id: string) => {
    const block = blocks.find(b => b.id === id);

    // 通知后端删除积木（非 YOLO 积木才通知）
    if (block) {
      const isYoloBlock = YOLO_TEMPLATES.some(t => t.type === block.type);
      if (!isYoloBlock) {
        const template = [...BLOCK_TEMPLATES, ...NETWORK_TEMPLATES].find(t => t.type === block.type);
        if (!template?.isNetwork) {
          fetch('http://localhost:8080/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, name: template?.label || block.type })
          }).catch(err => console.error('[BlockBuilder]', err));
        }
      }
    }

    setBlocks(prev => {
      // 移除连接到此积木的其他积木里面的id
      const newBlocks = prev.filter(b => b.id !== id);
      return newBlocks.map(b => ({
        ...b,
        connectedTo: b.connectedTo ? b.connectedTo.filter(cid => cid !== id) : undefined
      }));
    });
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

    const fromBlock = blocks.find(b => b.id === fromId);
    const toBlock = blocks.find(b => b.id === toId);

    if (!fromBlock || !toBlock) return;

    // 连接约束逻辑：获取这两种组件的端口限制（如果没有默认当作1:1处理）
    const fromLimits = BLOCK_PORTS[fromBlock.type] || { maxInputs: 1, maxOutputs: 1 };
    const toLimits = BLOCK_PORTS[toBlock.type] || { maxInputs: 1, maxOutputs: 1 };

    // 计算当前已经有的连接数量 (基于 connectedTo 数据结构)
    const fromOutputCount = fromBlock.connectedTo ? fromBlock.connectedTo.length : 0;
    const toInputCount = blocks.filter(b => b.connectedTo && b.connectedTo.includes(toId)).length;

    if (fromOutputCount >= fromLimits.maxOutputs) {
      const fromLabel = [...BLOCK_TEMPLATES, ...NETWORK_TEMPLATES, ...YOLO_TEMPLATES].find(t => t.type === fromBlock.type)?.label || fromBlock.type;
      showToast(`${fromLabel} 无法添加更多输出连接！(最大: ${fromLimits.maxOutputs})`);
      return;
    }

    if (toInputCount >= toLimits.maxInputs) {
      const toLabel = [...BLOCK_TEMPLATES, ...NETWORK_TEMPLATES, ...YOLO_TEMPLATES].find(t => t.type === toBlock.type)?.label || toBlock.type;
      showToast(`${toLabel} 无法接受更多输入连接！(最大: ${toLimits.maxInputs})`);
      return;
    }

    // 检查是否已经存在反向或重复连接
    const outputList = fromBlock.connectedTo || [];
    const isAlreadyConnected = outputList.includes(toId);
    const isReverseConnected = (toBlock.connectedTo || []).includes(fromId);

    if (isAlreadyConnected || isReverseConnected) {
      showToast('这两个积木已存在连接！');
      return;
    }

    // 循环检测：DFS 从 toId 沿 connectedTo 图搜索，看是否能回到 fromId
    const wouldCreateCycle = (sourceId: string, targetId: string): boolean => {
      const visited = new Set<string>();
      const stack = [sourceId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current === targetId) return true;
        if (visited.has(current)) continue;
        visited.add(current);
        const block = blocks.find(b => b.id === current);
        if (block?.connectedTo) {
          stack.push(...block.connectedTo);
        }
      }
      return false;
    };

    if (wouldCreateCycle(toId, fromId)) {
      showToast('连接会形成环路，已阻止！');
      return;
    }

    setBlocks(prev => prev.map(block => {
      // 只有从发送方连接到接收方，变成有向图的边，不需要反向
      if (block.id === fromId) {
        const connectedTo = block.connectedTo || [];
        if (!connectedTo.includes(toId)) {
          return { ...block, connectedTo: [...connectedTo, toId] };
        }
      }
      return block;
    }));

    showToast('连接成功！');

    // 通知后端（跳过 YOLO 积木）
    if (fromBlock && toBlock) {
      const isYoloConnect = YOLO_TEMPLATES.some(t => t.type === fromBlock.type || t.type === toBlock.type);
      if (!isYoloConnect) {
        const fromTemplate = [...BLOCK_TEMPLATES, ...NETWORK_TEMPLATES].find(t => t.type === fromBlock.type);
        const toTemplate = [...BLOCK_TEMPLATES, ...NETWORK_TEMPLATES].find(t => t.type === toBlock.type);
        fetch('http://localhost:8080/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: { type: fromBlock.type, name: fromTemplate?.label },
            to: { type: toBlock.type, name: toTemplate?.label }
          })
        }).catch(err => console.error('[BlockBuilder]', err));
      }
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
      const scrollTop = (scrollContainerRef.current?.scrollTop ?? 0) / zoom;
      if (canvasRect) {
        let x = (info.point.x - canvasRect.left) / zoom - 30;
        let y = (info.point.y - canvasRect.top) / zoom - 30 + scrollTop;
        
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
      const scrollTop = (scrollContainerRef.current?.scrollTop ?? 0) / zoom;
      if (canvasRect) {
        let newX = (info.point.x - canvasRect.left) / zoom - 30;
        let newY = (info.point.y - canvasRect.top) / zoom - 30 + scrollTop;
        
        updateBlock(id, { x: newX, y: newY });
      }
    }
  };

  const clearCanvas = () => {
    setBlocks([]);
    setSelectedId(null);
    setShowClearConfirm(false);
  };

  // 加载预置 YOLO 模型
  const handleLoadPreset = (family: string, scale: string) => {
    const preset = YOLO_PRESETS.find(p => p.family === family);
    if (!preset) return;

    // 清除现有 YOLO 积木，保留其他类型积木
    const nonYoloBlocks = blocks.filter(b => !YOLO_TEMPLATES.some(t => t.type === b.type));
    const newBlocks = loadPreset(family, scale, 60, nextZIndex);
    const allBlocks = [...nonYoloBlocks, ...newBlocks];
    setBlocks(allBlocks);
    setNextZIndex(prev => prev + newBlocks.length + 1);
    // 立即在代码面板显示生成的 YAML
    setCodeContent(generateYoloYaml(allBlocks));
    showToast(`已加载 ${preset.family}${scale} (${newBlocks.length} 层)`);
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

        <div className="flex gap-1 px-5 py-3 border-b border-zinc-100 bg-zinc-50/50">
          <button
            onClick={() => setActiveTab('shapes')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'shapes'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            🔷 形状库
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'network'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            🧠 网络层
          </button>
          <button
            onClick={() => setActiveTab('yolo')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'yolo'
                ? 'bg-rose-600 text-white'
                : 'bg-white text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            🎯 YOLO
          </button>
        </div>

        <div className={`flex-1 px-5 py-4 space-y-6 ${isAnyItemDragging ? 'overflow-visible' : 'overflow-y-auto'}`}>
          <section>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">
              {activeTab === 'shapes' ? '基础形状 (拖拽添加)' : activeTab === 'network' ? '网络库 (拖拽添加)' : 'YOLO 模型 (拖拽添加)'}
            </h2>
            {activeTab !== 'yolo' ? (
            <div className="grid grid-cols-2 gap-4">
              {(activeTab === 'shapes' ? BLOCK_TEMPLATES : NETWORK_TEMPLATES).map((template) => (
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
                    }}
                    onDrag={handleTemplateDrag}
                    onDragEnd={(e, info) => {
                      setIsAnyItemDragging(false);
                      handleTemplateDragEnd(e, info, template);
                    }}
                    className="z-30 cursor-grab active:z-50 touch-none flex items-center justify-center"
                  >
                    <div className="pointer-events-none">
                      {template.isNetwork ? (
                        <NetworkBlockCard type={template.type} color={template.defaultColor} size={52} label={template.label} />
                      ) : (
                        <BlockShape type={template.type as ShapeType} color={template.defaultColor} size={52} />
                      )}
                    </div>
                  </motion.div>
                  
                  <span className="text-[10px] font-bold text-zinc-400 hover:text-blue-500 uppercase tracking-wider mt-2 pointer-events-none group-hover:text-blue-500 transition-colors select-none text-center">
                    {template.label}
                  </span>

                  {/* Ghost placeholder when dragging */}
                  {isAnyItemDragging && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                      {template.isNetwork ? (
                        <NetworkBlockCard type={template.type} color="#000" size={40} label={template.label} />
                      ) : (
                        <BlockShape type={template.type as ShapeType} color="#000" size={40} />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* ── YOLO Tab ── */
            <div className="space-y-5">
              {/* Preset models */}
              {YOLO_PRESETS.map(preset => (
                <div key={preset.family}>
                  <h3 className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                    预置模型 · {preset.label}
                  </h3>
                  <div className="flex gap-1.5 mb-4">
                    {preset.scales.map(scaleKey => {
                      const sc = SCALES[scaleKey];
                      return (
                        <button
                          key={scaleKey}
                          onClick={() => handleLoadPreset(preset.family, scaleKey)}
                          className="flex-1 py-2 px-1.5 bg-rose-50 hover:bg-rose-100 active:bg-rose-200
                                     border border-rose-200 rounded-lg text-center transition-colors group"
                          title={`depth=${sc.depth}, width=${sc.width}`}
                        >
                          <span className="block text-xs font-bold text-rose-700 group-hover:text-rose-900">
                            {preset.family.replace('YOLO', '')}{scaleKey}
                          </span>
                          <span className="block text-[8px] text-rose-400 mt-0.5">
                            {scaleKey === 'n' ? 'nano' : scaleKey === 's' ? 'small' : scaleKey === 'm' ? 'medium' : scaleKey === 'l' ? 'large' : 'xlarge'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Import / Export buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setYamlText(''); setShowYamlImport(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-xs font-bold text-zinc-600 transition-colors"
                >
                  <Upload size={14} /> 导入 YAML
                </button>
                <button
                  onClick={() => {
                    const yaml = generateYoloYaml(blocks);
                    setYamlText(yaml);
                    setShowYamlExport(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-500 hover:bg-rose-600 rounded-xl text-xs font-bold text-white transition-colors"
                >
                  <Download size={14} /> 导出 YAML
                </button>
              </div>

              {/* Category sections */}
              {(['conv', 'block', 'neck', 'head'] as const).map(cat => {
                const catTemplates = YOLO_TEMPLATES.filter(t => t.category === cat);
                if (catTemplates.length === 0) return null;
                const catLabels: Record<string, string> = { conv: '卷积模块', block: '特征块', neck: '颈部/融合', head: '检测头' };
                const catColors: Record<string, string> = { conv: '#3b82f6', block: '#10b981', neck: '#06b6d4', head: '#ef4444' };
                return (
                  <div key={cat}>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: catColors[cat] }}>
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: catColors[cat] }} />
                      {catLabels[cat]}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {catTemplates.map(template => (
                        <div
                          key={template.type}
                          className="relative h-28 bg-zinc-50 rounded-2xl border border-zinc-100 flex flex-col items-center justify-center p-3 hover:border-rose-300 hover:bg-rose-50 transition-colors group"
                        >
                          <motion.div
                            drag
                            dragSnapToOrigin
                            dragMomentum={false}
                            dragElastic={0.1}
                            whileDrag={{ scale: 1.2, zIndex: 1000, filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.3))", cursor: "grabbing" }}
                            onDragStart={() => setIsAnyItemDragging(true)}
                            onDrag={handleTemplateDrag}
                            onDragEnd={(e, info) => {
                              setIsAnyItemDragging(false);
                              handleTemplateDragEnd(e, info, template);
                            }}
                            className="z-30 cursor-grab active:z-50 touch-none flex items-center justify-center"
                          >
                            <div className="pointer-events-none">
                              <YoloBlock
                                type={template.type}
                                color={template.defaultColor}
                                size={44}
                                params={template.params.reduce((acc, p) => ({ ...acc, [p.name]: p.default }), {})}
                                repeats={template.defaultRepeats}
                              />
                            </div>
                          </motion.div>

                          <span className="text-[9px] font-bold text-zinc-400 group-hover:text-rose-500 uppercase tracking-wider mt-1.5 pointer-events-none transition-colors select-none text-center">
                            {template.label}
                          </span>

                          {isAnyItemDragging && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                              <YoloBlock type={template.type} color="#000" size={36} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </section>

          {selectedBlock && YOLO_TEMPLATES.some(t => t.type === selectedBlock.type) && (
            <ParameterPanel block={selectedBlock} onUpdate={updateBlock} />
          )}

          {selectedBlock && !YOLO_TEMPLATES.some(t => t.type === selectedBlock.type) && (
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
                  // 移动已有积木时不通知后端添加代码
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
                {/* 连线原点吸附点指示器 */}
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
                          // Position blocks below existing content
                          const maxY = blocks.length > 0
                            ? Math.max(...blocks.map(b => b.y + 90))
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
                  cleanup();
                };

                const cleanup = () => {
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
                代码阅读器 ({activeTab === 'network' ? 'network.py' : 'sample.py'})
              </h2>
              <div className="flex items-center gap-2">
                {activeTab === 'network' && (
                  <button
                    onClick={() => {
                      const code = generatePyTorchCode(blocks);
                      fetch('http://localhost:8080/export', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code })
                      }).catch(err => console.error('[BlockBuilder]', err));
                    }}
                    className="flex items-center gap-1 p-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-white text-xs font-bold"
                    title="导出 PyTorch 代码"
                  >
                    <Download size={14} />
                    导出代码
                  </button>
                )}
                <button
                  onClick={() => {
                    // 通知后端运行代码
                    const fileParam = activeTab === 'network' ? 'network.py' : 'sample.py';
                    fetch(`http://localhost:8080/run?file=${fileParam}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'run' })
                    }).catch(err => console.error('[BlockBuilder]', err));
                  }}
                  className="p-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
                  title="运行代码"
                >
                  <Play size={14} className="text-white" />
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(codeContent);
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
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-mono">
                  {activeTab === 'network' ? 'network.py' : activeTab === 'yolo' ? 'model.yaml' : 'sample.py'}
                </span>
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
    </div>
  );
}
