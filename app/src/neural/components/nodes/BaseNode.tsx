import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { MODULE_REGISTRY } from '../../graph/registry';
import { InferredShape, ParamValue, TensorShape } from '../../graph/types';

interface BaseNodeProps {
  type: string;
  params: Record<string, ParamValue>;
  selected?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  inferredShape?: TensorShape | null;
  inferredData?: InferredShape | null;
}

/** Category accent color mapping */
const CATEGORY_ACCENT: Record<string, string> = {
  input: '#22c55e',
  basic: '#3b82f6',
  composite: '#a855f7',
  attention: '#f97316',
  head: '#ef4444',
  connector: '#ec4899',
};

function formatShape(shape: TensorShape): string {
  return `[${(shape as number[]).join(', ')}]`;
}

export function BaseNode({ type, params, selected, hasError, errorMessage, inferredData }: BaseNodeProps) {
  const def = MODULE_REGISTRY.get(type);
  if (!def) return null;

  const accent = CATEGORY_ACCENT[def.category] || def.color;

  const borderColor = hasError
    ? 'border-red-300/80 ring-2 ring-red-500/10'
    : selected
      ? 'border-zinc-300 ring-2 ring-blue-500/15'
      : 'border-zinc-200/60 hover:border-zinc-300/80';

  // Parameter summary
  const paramText = def.paramSummary ? def.paramSummary(params) : null;

  // Shape flow: input → output
  const inputShapes = inferredData?.inputShapes ?? [];
  const outputShapes = inferredData?.outputShapes ?? [];
  const hasInputShape = inputShapes.length > 0 && inputShapes.some(s => (s as number[])[0] !== 0);
  const hasOutputShape = outputShapes.length > 0 && outputShapes.some(s => (s as number[])[0] !== 0);

  const handleSize = 9;

  return (
    <div
      className={`bg-white rounded-lg shadow-elevation-1 border-l-[3px] border ${borderColor} min-w-[180px] transition-all duration-200 hover:shadow-elevation-2`}
      style={{ borderLeftColor: accent }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-lg flex items-center gap-2"
        style={{ backgroundColor: def.color + '0A' }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: def.color }} />
        <span className="text-xs font-semibold text-zinc-700 tracking-tight">{def.label}</span>
        {hasError && (
          <span className="ml-auto text-red-400 text-[11px] font-medium">错误</span>
        )}
      </div>

      {/* Parameter summary */}
      {paramText && (
        <div className="px-3 pt-1.5 text-[11px] text-zinc-400 font-mono tracking-tight">
          {paramText}
        </div>
      )}

      {/* Shape flow */}
      <div className="px-3 py-1.5 text-[11px] font-mono tracking-tight">
        {hasInputShape || hasOutputShape ? (
          <span className={hasError ? 'text-red-400' : 'text-zinc-500'}>
            {hasInputShape && inputShapes.length === 1 ? formatShape(inputShapes[0]) : ''}
            {hasInputShape && hasOutputShape ? ' → ' : ''}
            {hasOutputShape && outputShapes.length === 1 ? formatShape(outputShapes[0]) : hasOutputShape ? `${outputShapes.length} outputs` : ''}
          </span>
        ) : (
          <span className="text-zinc-200">--</span>
        )}
      </div>

      {/* Error message */}
      {hasError && errorMessage && (
        <div className="px-3 py-1.5 text-[11px] text-red-400 bg-red-50/50 border-t border-red-100/60 rounded-b-lg">
          {errorMessage}
        </div>
      )}

      {/* Input handles */}
      {def.inputs.map((port, i) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          style={{
            top: def.inputs.length === 1 ? '50%' : `${((i + 1) / (def.inputs.length + 1)) * 100}%`,
            background: '#fff',
            border: `1.5px solid ${def.color}80`,
            width: handleSize,
            height: handleSize,
            transition: 'width 0.15s, height 0.15s',
          }}
          className="react-flow-handle-target"
        />
      ))}

      {/* Output handles */}
      {def.outputs.map((port, i) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          style={{
            top: def.outputs.length === 1 ? '50%' : `${((i + 1) / (def.outputs.length + 1)) * 100}%`,
            background: def.color,
            border: `1.5px solid ${def.color}`,
            width: handleSize,
            height: handleSize,
            transition: 'width 0.15s, height 0.15s',
          }}
          className="react-flow-handle-source"
        />
      ))}
    </div>
  );
}
