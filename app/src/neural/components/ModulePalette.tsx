import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MODULE_REGISTRY, getModulesByCategory, CATEGORY_LABELS } from '../graph/registry';

export function ModulePalette() {
  const groups = getModulesByCategory();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const onDragStart = (event: React.DragEvent, type: string) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <ScrollArea className="flex-1 px-4 py-3">
      <div className="space-y-5">
        {Object.entries(groups).map(([category, modules]) => (
          <section key={category}>
            <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              {CATEGORY_LABELS[category] || category}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {modules.map((mod) => (
                <div
                  key={mod.type}
                  draggable
                  onDragStart={(e) => { onDragStart(e, mod.type); setDraggedId(mod.type); }}
                  onDragEnd={() => setDraggedId(null)}
                  className={`flex items-center gap-2 px-3 py-3 bg-zinc-50 rounded-lg border border-zinc-100 cursor-grab hover:border-zinc-300 hover:bg-zinc-100 transition-all duration-150 active:cursor-grabbing ${draggedId === mod.type ? 'opacity-50 scale-[0.98]' : ''}`}
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: mod.color }} />
                  <span className="text-xs font-medium text-zinc-600 truncate">{mod.label}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </ScrollArea>
  );
}
