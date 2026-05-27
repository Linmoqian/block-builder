import React from 'react';
import { MODULE_REGISTRY } from '../graph/registry';
import { ParamValue } from '../graph/types';

interface PropertiesPanelProps {
  nodeType: string;
  params: Record<string, ParamValue>;
  onParamChange: (key: string, value: ParamValue) => void;
}

export function PropertiesPanel({ nodeType, params, onParamChange }: PropertiesPanelProps) {
  const def = MODULE_REGISTRY[nodeType];
  if (!def) return null;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: def.color }} />
        <h3 className="text-sm font-bold text-zinc-700">{def.label}</h3>
        <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{def.category}</span>
      </div>

      {/* Parameters */}
      <div className="space-y-3">
        {Object.entries(def.params).map(([key, paramDef]) => {
          const value = params[key] ?? paramDef.default;

          return (
            <div key={key} className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                {paramDef.label}
              </label>

              {paramDef.type === 'int' && (
                <input
                  type="number"
                  step={1}
                  min={paramDef.min}
                  max={paramDef.max}
                  value={value as number}
                  onChange={(e) => onParamChange(key, parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                />
              )}

              {paramDef.type === 'float' && (
                <input
                  type="number"
                  step={0.1}
                  min={paramDef.min}
                  max={paramDef.max}
                  value={value as number}
                  onChange={(e) => onParamChange(key, parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                />
              )}

              {paramDef.type === 'select' && (
                <select
                  value={value as string}
                  onChange={(e) => onParamChange(key, e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
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
                  <span className="text-xs text-zinc-600">{(value as boolean) ? 'True' : 'False'}</span>
                </label>
              )}

              {(paramDef.min !== undefined || paramDef.max !== undefined) && (
                <p className="text-[9px] text-zinc-400">
                  {paramDef.min !== undefined && `min: ${paramDef.min}`}
                  {paramDef.min !== undefined && paramDef.max !== undefined && ' · '}
                  {paramDef.max !== undefined && `max: ${paramDef.max}`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Port info */}
      <div className="pt-3 border-t border-zinc-100 space-y-2">
        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Ports</h4>
        {def.inputs.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 font-semibold">Inputs:</span>
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
            <span className="text-[10px] text-zinc-500 font-semibold">Outputs:</span>
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
