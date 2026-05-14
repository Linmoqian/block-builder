import React, { useState } from 'react';
import { BlockInstance } from '../types';
import { YOLO_TEMPLATES } from '../config/yoloBlocks';

interface ParameterPanelProps {
  block: BlockInstance;
  onUpdate: (id: string, updates: Partial<BlockInstance>) => void;
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({ block, onUpdate }) => {
  const template = YOLO_TEMPLATES.find(t => t.type === block.type);
  const [expanded, setExpanded] = useState(false);

  if (!template) {
    return (
      <div className="p-4 bg-zinc-900 rounded-2xl text-white">
        <p className="text-xs text-zinc-400">此积木没有可配置参数</p>
      </div>
    );
  }

  const params = block.yoloParams || {};

  const updateParam = (name: string, value: any) => {
    onUpdate(block.id, {
      yoloParams: { ...params, [name]: value },
    });
  };

  const updateRepeats = (value: number) => {
    onUpdate(block.id, { repeats: Math.max(1, value) });
  };

  const totalParams = template.params.length;
  const showParams = expanded ? template.params : template.params.slice(0, 4);

  return (
    <div className="bg-zinc-900 rounded-2xl p-5 text-white space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: block.color }}
          />
          <h3 className="text-sm font-bold">{template.label} 参数</h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
          {template.category}
        </span>
      </div>

      {/* Repeats */}
      <div>
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
          重复次数
          <span className="text-[9px] text-zinc-500 font-mono lowercase">(repeats)</span>
        </label>
        <input
          type="number"
          min={1}
          max={20}
          value={block.repeats ?? template.defaultRepeats}
          onChange={e => updateRepeats(parseInt(e.target.value, 10) || 1)}
          className="w-full mt-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-mono
                     focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Params */}
      <div className="space-y-3">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          模块参数
        </label>
        {showParams.map(param => (
          <div key={param.name}>
            <label className="text-xs text-zinc-300 flex items-center gap-1.5">
              <span className="font-mono text-blue-400">{param.name}</span>
              <span className="text-[10px] text-zinc-500">{param.description}</span>
            </label>
            {renderInput(param.name, param.type, params[param.name] ?? param.default, updateParam)}
          </div>
        ))}
        {totalParams > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {expanded ? '收起' : `展开全部 (${totalParams} 个参数)`}
          </button>
        )}
      </div>
    </div>
  );
};

function renderInput(
  name: string,
  type: string,
  value: any,
  onChange: (name: string, value: any) => void,
) {
  switch (type) {
    case 'number':
      return (
        <input
          type="number"
          step={value % 1 === 0 ? '1' : '0.01'}
          value={value}
          onChange={e => onChange(name, parseFloat(e.target.value) || 0)}
          className="w-full mt-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-mono
                     focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      );
    case 'boolean':
      return (
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => onChange(name, true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              value === true
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            True
          </button>
          <button
            onClick={() => onChange(name, false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              value === false
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            False
          </button>
        </div>
      );
    case 'string':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(name, e.target.value)}
          className="w-full mt-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm font-mono
                     focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      );
    default:
      return null;
  }
}
