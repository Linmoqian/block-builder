import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'motion/react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { RFNode, RightTab } from '../store/graphStore';
import { ParamValue } from '../graph/types';
import { PropertiesPanel } from './PropertiesPanel';
import { YamlPreview } from './YamlPreview';
import { TrainingPanel } from './TrainingPanel';

interface RightPanelProps {
  width: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  rightTab: RightTab;
  setRightTab: (tab: RightTab) => void;
  selectedNode: RFNode | null;
  onParamChange: (key: string, value: ParamValue) => void;
  yamlContent: string;
}

export function RightPanel({
  width,
  collapsed,
  onToggleCollapse,
  rightTab,
  setRightTab,
  selectedNode,
  onParamChange,
  yamlContent,
}: RightPanelProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 w-10 bg-white/80 backdrop-blur-sm border-l border-zinc-200/30 shrink-0">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
          title="展开面板"
        >
          <PanelRightOpen size={16} />
        </button>
      </div>
    );
  }

  return (
    <aside className="bg-white/80 backdrop-blur-sm border-l border-zinc-200/30 flex flex-col shrink-0 overflow-hidden" style={{ width }}>
      <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as RightTab)} className="flex flex-col flex-1">
        <div className="flex items-center border-b border-zinc-100">
          <TabsList className="flex-1 rounded-none bg-transparent p-0 h-auto">
            <TabsTrigger value="properties" className="flex-1 py-3 text-xs font-semibold tracking-wider text-zinc-400 data-[state=active]:text-zinc-800 data-[state=active]:border-b-2 data-[state=active]:border-zinc-800 data-[state=active]:shadow-none rounded-none transition-all duration-200">属性</TabsTrigger>
            <TabsTrigger value="yaml" className="flex-1 py-3 text-xs font-semibold tracking-wider text-zinc-400 data-[state=active]:text-zinc-800 data-[state=active]:border-b-2 data-[state=active]:border-zinc-800 data-[state=active]:shadow-none rounded-none transition-all duration-200">YAML</TabsTrigger>
            <TabsTrigger value="training" className="flex-1 py-3 text-xs font-semibold tracking-wider text-zinc-400 data-[state=active]:text-zinc-800 data-[state=active]:border-b-2 data-[state=active]:border-zinc-800 data-[state=active]:shadow-none rounded-none transition-all duration-200">训练</TabsTrigger>
          </TabsList>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 mr-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
            title="收起面板"
          >
            <PanelRightClose size={15} />
          </button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={rightTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex flex-col flex-1 min-h-0"
          >
          {rightTab === 'properties' ? (
            selectedNode ? (
              <div className="flex-1 overflow-y-auto">
                <PropertiesPanel nodeType={selectedNode.data.type} params={selectedNode.data.params} onParamChange={onParamChange} />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-label text-zinc-400 text-center">点击节点编辑参数</p>
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
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </aside>
  );
}
