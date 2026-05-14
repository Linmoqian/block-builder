import React, { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Code2, Download, Play, Copy, ChevronLeft } from 'lucide-react';
import { CodeHighlighter } from './CodeHighlighter';

interface CodePanelProps {
  isOpen: boolean;
  width: number;
  setWidth: (w: number) => void;
  activeTab: 'shapes' | 'network' | 'yolo';
  codeContent: string;
  onExport: () => void;
  onRun: () => void;
  onCopy: () => void;
  onClose: () => void;
}

const CodePanel = React.memo(function CodePanel({
  isOpen,
  width,
  setWidth,
  activeTab,
  codeContent,
  onExport,
  onRun,
  onCopy,
  onClose,
}: CodePanelProps) {
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      const startX = e.clientX;
      const startWidth = width;

      const handleMouseMove = (e: MouseEvent) => {
        const newWidth = startWidth - (e.clientX - startX);
        if (newWidth >= 280 && newWidth <= 600) {
          setWidth(newWidth);
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
    },
    [width, setWidth],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white border-l border-zinc-200 flex flex-col shadow-lg z-20 overflow-hidden relative"
          style={{ width }}
        >
          {/* 拖拽调整宽度的手柄 */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors z-10"
            onMouseDown={handleResizeStart}
          />
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-700 flex items-center gap-2">
              <Code2 size={16} className="text-blue-500" />
              代码阅读器 ({activeTab === 'network' ? 'network.py' : 'sample.py'})
            </h2>
            <div className="flex items-center gap-2">
              {activeTab === 'network' && (
                <button
                  onClick={onExport}
                  className="flex items-center gap-1 p-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors text-white text-xs font-bold"
                  title="导出 PyTorch 代码"
                >
                  <Download size={14} />
                  导出代码
                </button>
              )}
              <button
                onClick={onRun}
                className="p-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
                title="运行代码"
              >
                <Play size={14} className="text-white" />
              </button>
              <button
                onClick={onCopy}
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
  );
});

export { CodePanel };
export type { CodePanelProps };
