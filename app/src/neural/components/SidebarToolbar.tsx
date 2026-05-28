import { Button } from '@/components/ui/button';
import { ModulePalette } from './ModulePalette';
import { PRESETS } from '../graph/presets';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SidebarToolbarProps {
  width: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSaveJson: () => void;
  onLoadJson: () => void;
  onImportYaml: () => void;
  onExportYaml: () => void;
  onExportPyTorch: () => void;
  onAutoLayout: () => void;
  onClearGraph: () => void;
  onLoadPreset: (key: string) => void;
}

export function SidebarToolbar({
  width,
  collapsed,
  onToggleCollapse,
  onSaveJson,
  onLoadJson,
  onImportYaml,
  onExportYaml,
  onExportPyTorch,
  onAutoLayout,
  onClearGraph,
  onLoadPreset,
}: SidebarToolbarProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 w-10 bg-zinc-50/50 border-r border-zinc-200/40 shrink-0">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
          title="展开侧栏"
        >
          <PanelLeftOpen size={16} />
        </button>
      </div>
    );
  }

  return (
    <aside className="bg-zinc-50/50 border-r border-zinc-200/40 flex flex-col shrink-0 overflow-hidden" style={{ width }}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-zinc-800 tracking-tight">模块</h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">拖拽到画布</p>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
          title="收起侧栏"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>
      <ModulePalette />
      <div className="px-5 py-4 border-t border-zinc-200/40 space-y-2.5">
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onSaveJson} className="flex-1 text-xs font-medium">保存</Button>
          <Button variant="secondary" size="sm" onClick={onLoadJson} className="flex-1 text-xs font-medium">加载</Button>
        </div>
        <Button variant="secondary" size="sm" onClick={onImportYaml} className="w-full text-xs font-medium">导入 YAML</Button>
        <select onChange={(e) => e.target.value && onLoadPreset(e.target.value)} defaultValue="" className="w-full py-1.5 px-2.5 text-xs font-medium text-zinc-600 bg-white hover:bg-zinc-50 rounded-lg transition-colors border border-zinc-200/60 cursor-pointer">
          <option value="" disabled>加载预设...</option>
          {Object.entries(PRESETS).map(([key, preset]) => (<option key={key} value={key}>{preset.label}</option>))}
        </select>
        <Button variant="secondary" size="sm" onClick={onAutoLayout} className="w-full text-xs font-medium">重新布局</Button>
        <div className="flex gap-2 pt-1">
          <Button variant="default" size="sm" onClick={onExportYaml} className="flex-1 bg-zinc-800 hover:bg-zinc-900 text-xs font-medium">YAML</Button>
          <Button variant="default" size="sm" onClick={onExportPyTorch} className="flex-1 bg-zinc-800 hover:bg-zinc-900 text-xs font-medium">PyTorch</Button>
        </div>
        <Button variant="ghost" size="sm" onClick={onClearGraph} className="w-full text-zinc-400 hover:text-red-500 hover:bg-red-50/50 text-xs font-medium">清空画布</Button>
      </div>
    </aside>
  );
}
