import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RFNode, RightTab } from '../store/graphStore';
import { ParamValue } from '../graph/types';
import { PropertiesPanel } from './PropertiesPanel';
import { YamlPreview } from './YamlPreview';
import { TrainingPanel } from './TrainingPanel';

interface RightPanelProps {
  rightTab: RightTab;
  setRightTab: (tab: RightTab) => void;
  selectedNode: RFNode | null;
  onParamChange: (key: string, value: ParamValue) => void;
  yamlContent: string;
}

export function RightPanel({
  rightTab,
  setRightTab,
  selectedNode,
  onParamChange,
  yamlContent,
}: RightPanelProps) {
  return (
    <aside className="w-80 bg-white border-l border-zinc-200 flex flex-col shrink-0 overflow-hidden">
      <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as RightTab)} className="flex flex-col flex-1">
        <TabsList className="w-full rounded-none border-b border-zinc-200 bg-transparent p-0 h-auto">
          <TabsTrigger value="properties" className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50/50 data-[state=active]:shadow-none rounded-none">属性</TabsTrigger>
          <TabsTrigger value="yaml" className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider data-[state=active]:text-emerald-600 data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:bg-emerald-50/50 data-[state=active]:shadow-none rounded-none">YAML</TabsTrigger>
          <TabsTrigger value="training" className="flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider data-[state=active]:text-amber-600 data-[state=active]:border-b-2 data-[state=active]:border-amber-600 data-[state=active]:bg-amber-50/50 data-[state=active]:shadow-none rounded-none">训练</TabsTrigger>
        </TabsList>
        {rightTab === 'properties' ? (
          selectedNode ? (
            <div className="flex-1 overflow-y-auto">
              <PropertiesPanel nodeType={selectedNode.data.type} params={selectedNode.data.params} onParamChange={onParamChange} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-xs text-zinc-400 text-center">点击节点编辑参数</p>
            </div>
          )
        ) : rightTab === 'yaml' ? (
          <div className="flex-1 overflow-hidden">
            <YamlPreview yaml={yamlContent} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <TrainingPanel />
          </div>
        )}
      </Tabs>
    </aside>
  );
}
