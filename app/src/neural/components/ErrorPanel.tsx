import { useState, useCallback } from 'react';
import { ValidationError } from '../graph/types';
import { MODULE_REGISTRY } from '../graph/registry';

interface ErrorPanelProps {
  errors: ValidationError[];
  nodes: Array<{ id: string; data: { type: string } }>;
  onNavigate: (nodeId: string) => void;
}

const TYPE_COLORS: Record<ValidationError['type'], string> = {
  cycle: 'bg-red-100 text-red-700',
  dimension_mismatch: 'bg-orange-100 text-orange-700',
  missing_input: 'bg-yellow-100 text-yellow-700',
  disconnected: 'bg-zinc-100 text-zinc-600',
  shape_mismatch: 'bg-orange-100 text-orange-700',
};

const TYPE_LABELS: Record<ValidationError['type'], string> = {
  cycle: '循环',
  dimension_mismatch: '维度',
  missing_input: '缺输入',
  disconnected: '未连接',
  shape_mismatch: '形状',
};

export function ErrorPanel({ errors, nodes, onNavigate }: ErrorPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const getNodeLabel = useCallback(
    (nodeId?: string) => {
      if (!nodeId) return '';
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return nodeId.slice(0, 6);
      return MODULE_REGISTRY.get(node.data.type)?.label ?? node.data.type;
    },
    [nodes]
  );

  if (errors.length === 0) return null;

  return (
    <div className="flex flex-col items-start gap-0">
      {/* Error list (expanded) */}
      {expanded && (
        <div className="mb-1 bg-white/95 backdrop-blur-md border border-zinc-200 rounded-lg shadow-lg max-h-64 overflow-y-auto w-80">
          {errors.map((err, i) => (
            <button
              key={i}
              onClick={() => err.nodeId && onNavigate(err.nodeId)}
              disabled={!err.nodeId}
              className={`w-full text-left px-3 py-2 border-b border-zinc-100 last:border-b-0 transition-colors ${
                err.nodeId ? 'hover:bg-zinc-50 cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold leading-none ${TYPE_COLORS[err.type]}`}>
                  {TYPE_LABELS[err.type]}
                </span>
                {err.nodeId && (
                  <span className="text-[10px] font-semibold text-zinc-700">
                    {getNodeLabel(err.nodeId)}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
                {err.message}
              </p>
              {err.suggestion && (
                <p className="text-[10px] text-blue-500 mt-0.5 leading-relaxed">
                  → {err.suggestion}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Toggle badge */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="bg-white/80 backdrop-blur-md border border-zinc-200 px-3 py-1.5 rounded-lg shadow-sm text-[10px] text-zinc-400 flex items-center gap-3 hover:bg-white/90 transition-colors"
      >
        <span>{nodes.length} nodes</span>
        <span className="flex items-center gap-1 text-red-500 font-semibold">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold">
            !
          </span>
          {errors.length} 个错误
        </span>
      </button>
    </div>
  );
}
