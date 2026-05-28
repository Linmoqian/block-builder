import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { MODULE_REGISTRY } from '../../graph/registry';
import { ParamValue, TensorShape } from '../../graph/types';

interface BaseNodeProps {
  type: string;
  params: Record<string, ParamValue>;
  selected?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  inferredShape?: TensorShape | null;
}

export function BaseNode({ type, params, selected, hasError, errorMessage, inferredShape }: BaseNodeProps) {
  const def = MODULE_REGISTRY.get(type);
  if (!def) return null;

  const borderColor = hasError
    ? 'border-red-300/80 ring-2 ring-red-500/10'
    : selected
      ? 'border-zinc-300 ring-2 ring-blue-500/15'
      : 'border-zinc-200/60 hover:border-zinc-300/80';

  return (
    <div
      className={`bg-white rounded-lg shadow-elevation-1 border ${borderColor} min-w-[160px] transition-all duration-200 hover:shadow-elevation-2`}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 rounded-t-lg flex items-center gap-2"
        style={{ backgroundColor: def.color + '0A' }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: def.color }} />
        <span className="text-xs font-semibold text-zinc-700 tracking-tight">{def.label}</span>
        {hasError && (
          <span className="ml-auto text-red-400 text-[11px] font-medium">错误</span>
        )}
      </div>

      {/* Body: shape info */}
      <div className="px-3 py-2 text-[11px] text-zinc-400 font-mono tracking-tight">
        {inferredShape && inferredShape[0] !== 0 ? (
          <span className={hasError ? 'text-red-400' : 'text-zinc-500'}>
            [{(inferredShape as number[]).join(', ')}]
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
            width: 7,
            height: 7,
          }}
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
            width: 7,
            height: 7,
          }}
        />
      ))}
    </div>
  );
}
