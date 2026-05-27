import React from 'react';
import { MODULE_REGISTRY, getModulesByCategory, CATEGORY_LABELS } from '../graph/registry';

export function ModulePalette() {
  const groups = getModulesByCategory();

  const onDragStart = (event: React.DragEvent, type: string) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
      {Object.entries(groups).map(([category, modules]) => (
        <section key={category}>
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
            {CATEGORY_LABELS[category] || category}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {modules.map((mod) => (
              <div
                key={mod.type}
                draggable
                onDragStart={(e) => onDragStart(e, mod.type)}
                className="flex items-center gap-2 px-3 py-2.5 bg-zinc-50 rounded-lg border border-zinc-100 cursor-grab hover:border-blue-400 hover:bg-blue-50 transition-colors active:cursor-grabbing"
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: mod.color }} />
                <span className="text-[11px] font-semibold text-zinc-700 truncate">{mod.label}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
