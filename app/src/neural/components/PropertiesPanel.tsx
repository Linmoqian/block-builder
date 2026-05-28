import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MODULE_REGISTRY } from '../graph/registry';
import { ParamValue } from '../graph/types';

interface PropertiesPanelProps {
  nodeType: string;
  params: Record<string, ParamValue>;
  onParamChange: (key: string, value: ParamValue) => void;
}

export function PropertiesPanel({ nodeType, params, onParamChange }: PropertiesPanelProps) {
  const def = MODULE_REGISTRY.get(nodeType);
  if (!def) return null;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: def.color }} />
        <h3 className="text-sm font-bold text-zinc-700">{def.label}</h3>
        <Badge variant="secondary" className="text-[9px]">{def.category}</Badge>
      </div>

      {/* Parameters */}
      <div className="space-y-3">
        {Object.entries(def.params).map(([key, paramDef]) => {
          const value = params[key] ?? paramDef.default;

          return (
            <div key={key} className="space-y-1">
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                {paramDef.label}
              </Label>

              {paramDef.type === 'int' && (
                <Input
                  type="number"
                  step={1}
                  min={paramDef.min}
                  max={paramDef.max}
                  value={value as number}
                  onChange={(e) => {
                    let v = parseInt(e.target.value, 10) || 0;
                    if (paramDef.min !== undefined) v = Math.max(v, paramDef.min);
                    if (paramDef.max !== undefined) v = Math.min(v, paramDef.max);
                    onParamChange(key, v);
                  }}
                />
              )}

              {paramDef.type === 'float' && (
                <Input
                  type="number"
                  step={0.1}
                  min={paramDef.min}
                  max={paramDef.max}
                  value={value as number}
                  onChange={(e) => {
                    let v = parseFloat(e.target.value) || 0;
                    if (paramDef.min !== undefined) v = Math.max(v, paramDef.min);
                    if (paramDef.max !== undefined) v = Math.min(v, paramDef.max);
                    onParamChange(key, v);
                  }}
                />
              )}

              {paramDef.type === 'string' && (
                <Input
                  type="text"
                  value={value as string}
                  onChange={(e) => onParamChange(key, e.target.value)}
                />
              )}

              {paramDef.type === 'select' && (
                <select
                  value={value as string}
                  onChange={(e) => onParamChange(key, e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {paramDef.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {paramDef.type === 'bool' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value as boolean}
                    onChange={(e) => onParamChange(key, e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-zinc-600">{(value as boolean) ? '是' : '否'}</span>
                </label>
              )}

              {(paramDef.min !== undefined || paramDef.max !== undefined) && (
                <p className="text-[9px] text-zinc-400">
                  {paramDef.min !== undefined && `最小: ${paramDef.min}`}
                  {paramDef.min !== undefined && paramDef.max !== undefined && ' · '}
                  {paramDef.max !== undefined && `最大: ${paramDef.max}`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Port info */}
      <div className="pt-3 border-t border-zinc-100 space-y-2">
        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">端口</h4>
        {def.inputs.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-semibold">输入:</span>
            {def.inputs.map((port) => (
              <div key={port.id} className="flex items-center gap-1.5 ml-2">
                <div className="w-2 h-2 rounded-full border-2" style={{ borderColor: def.color, background: '#fff' }} />
                <span className="text-[10px] text-zinc-600">{port.label}</span>
                {port.required && <span className="text-[9px] text-red-400">*</span>}
              </div>
            ))}
          </div>
        )}
        {def.outputs.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-semibold">输出:</span>
            {def.outputs.map((port) => (
              <div key={port.id} className="flex items-center gap-1.5 ml-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: def.color }} />
                <span className="text-[10px] text-zinc-600">{port.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
