import { useState, useCallback } from 'react';
import { BlockInstance } from '../types';
import { parseYoloYaml } from '../yaml/parser';
import { generateYoloYaml } from '../yaml/generator';

interface UseYamlModalsDeps {
  blocks: BlockInstance[];
  setBlocks: React.Dispatch<React.SetStateAction<BlockInstance[]>>;
  nextZIndex: number;
  setNextZIndex: React.Dispatch<React.SetStateAction<number>>;
  setCodeContent: (code: string) => void;
  showToast: (msg: string) => void;
}

export function useYamlModals({ blocks, setBlocks, nextZIndex, setNextZIndex, setCodeContent, showToast }: UseYamlModalsDeps) {
  const [showYamlImport, setShowYamlImport] = useState(false);
  const [showYamlExport, setShowYamlExport] = useState(false);
  const [yamlText, setYamlText] = useState('');

  const importYaml = useCallback(() => {
    try {
      const { blocks: newBlocks } = parseYoloYaml(yamlText);
      const maxY = blocks.length > 0
        ? Math.max(...blocks.map(b => b.y + 90))
        : 0;
      const positioned = newBlocks.map((b, i) => ({
        ...b,
        y: maxY + i * 90,
        zIndex: nextZIndex + i,
      }));
      setBlocks(prev => [...prev, ...positioned]);
      setNextZIndex(prev => prev + newBlocks.length);
      setShowYamlImport(false);
      showToast(`导入成功: ${newBlocks.length} 个模块`);
    } catch {
      showToast('YAML 解析失败，请检查格式');
    }
  }, [yamlText, blocks, nextZIndex, setBlocks, setNextZIndex, setCodeContent, showToast]);

  const exportYaml = useCallback(() => {
    const yaml = generateYoloYaml(blocks);
    setYamlText(yaml);
    setShowYamlExport(true);
  }, [blocks, setYamlText]);

  return {
    showYamlImport, setShowYamlImport,
    showYamlExport, setShowYamlExport,
    yamlText, setYamlText,
    importYaml, exportYaml,
  };
}
