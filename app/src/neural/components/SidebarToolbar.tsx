import { Button } from '@/components/ui/button';
import { ModulePalette } from './ModulePalette';
import { PRESETS } from '../graph/presets';

interface SidebarToolbarProps {
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
  onSaveJson,
  onLoadJson,
  onImportYaml,
  onExportYaml,
  onExportPyTorch,
  onAutoLayout,
  onClearGraph,
  onLoadPreset,
}: SidebarToolbarProps) {
  return (
    <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col shrink-0">
      <div className="px-4 py-3 border-b border-zinc-100">
        <h2 className="text-sm font-bold text-zinc-700">模块</h2>
        <p className="text-[10px] text-zinc-400 mt-0.5">拖拽到画布</p>
      </div>
      <ModulePalette />
      <div className="px-4 py-3 border-t border-zinc-100 space-y-2">
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onSaveJson} className="flex-1 text-[10px] font-semibold">保存</Button>
          <Button variant="secondary" size="sm" onClick={onLoadJson} className="flex-1 text-[10px] font-semibold">加载</Button>
        </div>
        <Button variant="secondary" size="sm" onClick={onImportYaml} className="w-full text-[10px] font-semibold">导入 YAML</Button>
        <select onChange={(e) => e.target.value && onLoadPreset(e.target.value)} defaultValue="" className="w-full py-1.5 px-2 text-[10px] font-semibold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200 cursor-pointer">
          <option value="" disabled>加载预设...</option>
          {Object.entries(PRESETS).map(([key, preset]) => (<option key={key} value={key}>{preset.label}</option>))}
        </select>
        <Button variant="secondary" size="sm" onClick={onAutoLayout} className="w-full text-[10px] font-semibold">重新布局</Button>
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={onExportYaml} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-[10px] font-semibold">导出 YAML</Button>
          <Button variant="default" size="sm" onClick={onExportPyTorch} className="flex-1 bg-blue-600 hover:bg-blue-700 text-[10px] font-semibold">PyTorch</Button>
        </div>
        <Button variant="ghost" size="sm" onClick={onClearGraph} className="w-full text-zinc-500 hover:text-red-600 hover:bg-red-50 text-[10px] font-semibold">清空画布</Button>
      </div>
    </aside>
  );
}
