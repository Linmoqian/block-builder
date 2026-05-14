import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, RotateCw, Layers, Download, Upload, Trash, Copy, Trash2, Undo2 } from 'lucide-react';
import { BlockInstance, BLOCK_TEMPLATES, COLORS, ShapeType } from '../types';
import { NETWORK_TEMPLATES } from '../config/networkBlocks';
import { YOLO_TEMPLATES } from '../config/yoloBlocks';
import { YOLO_PRESETS, SCALES } from '../config/yoloPresets';
import { BlockShape } from './BlockShape';
import { NetworkBlockCard } from './NetworkBlockCard';
import { YoloBlock } from './YoloBlock';
import { ParameterPanel } from './ParameterPanel';

interface SidebarProps {
  activeTab: 'shapes' | 'network' | 'yolo';
  setActiveTab: (tab: 'shapes' | 'network' | 'yolo') => void;
  blocks: BlockInstance[];
  selectedId: string | null;
  selectedBlock: BlockInstance | undefined;
  isAnyItemDragging: boolean;
  isDraggingExisting: boolean;
  isDraggingTemplate: boolean;
  updateBlock: (id: string, updates: Partial<BlockInstance>) => void;
  rotateBlock: (id: string) => void;
  bringToFront: (id: string) => void;
  duplicateBlock: (id: string) => void;
  deleteBlock: (id: string) => void;
  clearCanvas: () => void;
  setSelectedId: (id: string | null) => void;
  onTemplateDrag: (e: any, info: any) => void;
  onTemplateDragEnd: (e: any, info: any, template: any) => void;
  setIsAnyItemDragging: (v: boolean) => void;
  onImportYaml: () => void;
  onExportYaml: () => void;
  onLoadPreset: (family: string, scale: string) => void;
  sidebarRef: React.RefObject<HTMLDivElement>;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({
  activeTab,
  setActiveTab,
  selectedId,
  selectedBlock,
  isAnyItemDragging,
  isDraggingExisting,
  isDraggingTemplate,
  updateBlock,
  rotateBlock,
  bringToFront,
  duplicateBlock,
  deleteBlock,
  clearCanvas,
  setSelectedId,
  onTemplateDrag,
  onTemplateDragEnd,
  setIsAnyItemDragging,
  onImportYaml,
  onExportYaml,
  onLoadPreset,
  sidebarRef,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
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
                  onDrag={onTemplateDrag}
                  onDragEnd={(e, info) => {
                    setIsAnyItemDragging(false);
                    onTemplateDragEnd(e, info, template);
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
                        onClick={() => onLoadPreset(preset.family, scaleKey)}
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
                onClick={onImportYaml}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-xs font-bold text-zinc-600 transition-colors"
              >
                <Upload size={14} /> 导入 YAML
              </button>
              <button
                onClick={onExportYaml}
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
                          onDrag={onTemplateDrag}
                          onDragEnd={(e, info) => {
                            setIsAnyItemDragging(false);
                            onTemplateDragEnd(e, info, template);
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
                onClick={() => {
                  clearCanvas();
                  setShowClearConfirm(false);
                }}
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
  );
});

Sidebar.displayName = 'Sidebar';

export { Sidebar };
export type { SidebarProps };
