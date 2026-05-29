import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MODULE_REGISTRY, getModulesByCategory, CATEGORY_LABELS } from '../graph/registry';

/** Category accent color for section header */
const CATEGORY_ACCENT: Record<string, string> = {
  input: '#22c55e',
  basic: '#3b82f6',
  composite: '#a855f7',
  attention: '#f97316',
  head: '#ef4444',
  connector: '#ec4899',
};

export function ModulePalette() {
  const groups = getModulesByCategory();
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const onDragStart = (event: React.DragEvent, type: string, color: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';

    // Custom drag ghost: colored pill with module name
    const ghost = document.createElement('div');
    ghost.textContent = label;
    ghost.style.cssText = `
      position: absolute; top: -1000px; left: -1000px;
      padding: 4px 12px; border-radius: 999px;
      background: ${color}18; color: ${color};
      border: 1.5px solid ${color}40;
      font-size: 12px; font-weight: 600; white-space: nowrap;
      font-family: system-ui, sans-serif;
    `;
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
    // Clean up ghost after drag image is captured
    requestAnimationFrame(() => ghost.remove());
  };

  return (
    <ScrollArea className="flex-1 px-4 py-3">
      <div className="space-y-5">
        {Object.entries(groups).map(([category, modules]) => (
          <section key={category}>
            <h3
              className="text-caption font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2"
              style={{ borderLeft: `3px solid ${CATEGORY_ACCENT[category] || '#94a3b8'}`, paddingLeft: 8 }}
            >
              {CATEGORY_LABELS[category] || category}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {modules.map((mod) => (
                <div
                  key={mod.type}
                  draggable
                  onDragStart={(e) => { onDragStart(e, mod.type, mod.color, mod.label); setDraggedId(mod.type); }}
                  onDragEnd={() => setDraggedId(null)}
                  className={`flex items-center gap-2 px-3 py-3 bg-zinc-50/80 rounded-md border border-zinc-100/60 cursor-grab hover:border-zinc-300 hover:bg-zinc-100 hover:shadow-elevation-2 hover:scale-[1.02] transition-all duration-200 active:cursor-grabbing ${draggedId === mod.type ? 'opacity-50 scale-[0.98]' : ''}`}
                >
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: mod.color }} />
                  <span className="text-label font-medium text-zinc-600 truncate">{mod.label}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </ScrollArea>
  );
}
