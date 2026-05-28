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
    ? 'border-red-500'
    : selected
      ? 'border-blue-500'
      : 'border-zinc-200';

  return (
    <div
      className={`bg-white rounded-xl shadow-md border-2 ${borderColor} min-w-[140px] transition-colors`}
    >
      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-[10px] flex items-center gap-2"
        style={{ backgroundColor: def.color + '18' }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: def.color }} />
        <span className="text-xs font-bold text-zinc-700">{def.label}</span>
        {hasError && (
          <span className="ml-auto text-red-500 text-[10px] font-bold">错误</span>
        )}
      </div>

      {/* Body: shape info */}
      <div className="px-3 py-1.5 text-[10px] text-zinc-500 font-mono">
        {inferredShape && inferredShape[0] !== 0 ? (
          <span className={hasError ? 'text-red-500' : 'text-zinc-600'}>
            [{(inferredShape as number[]).join(', ')}]
          </span>
        ) : (
          <span className="text-zinc-300">--</span>
        )}
      </div>

      {/* Error message */}
      {hasError && errorMessage && (
        <div className="px-3 py-1 text-[9px] text-red-500 bg-red-50 border-t border-red-100 rounded-b-[10px]">
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
            border: `2px solid ${def.color}`,
            width: 10,
            height: 10,
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
            border: `2px solid ${def.color}`,
            width: 10,
            height: 10,
          }}
        />
      ))}
    </div>
  );
}
