import { useState, useRef, useEffect, useMemo } from 'react';
import { generatePyTorchCode } from '../graph/codegen';
import { generateYoloYaml } from '../yaml/generator';
import { BlockInstance } from '../types';

interface UseCodePanelDeps {
  blocks: BlockInstance[];
  activeTab: 'shapes' | 'network' | 'yolo';
}

export function useCodePanel({ blocks, activeTab }: UseCodePanelDeps) {
  const [codeContent, setCodeContent] = useState("print('Hello, World!')");
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  const codeContentRef = useRef(codeContent);
  codeContentRef.current = codeContent;

  // 定期获取代码文件内容
  useEffect(() => {
    if (activeTab === 'yolo') return;

    const fetchCode = () => {
      const fileParam = activeTab === 'network' ? 'network.py' : 'sample.py';
      fetch(`http://localhost:8080/read-file?file=${fileParam}`)
        .then(res => res.json())
        .then(data => {
          if (data.content !== undefined && data.content !== codeContentRef.current) {
            setCodeContent(data.content);
          }
        })
        .catch(err => console.error('[BlockBuilder]', err));
    };

    fetchCode();
    const interval = setInterval(fetchCode, 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // YOLO 模式：积木变化时生成 YAML
  const yoloYaml = useMemo(() => {
    if (activeTab !== 'yolo') return '';
    return generateYoloYaml(blocks);
  }, [activeTab, blocks]);

  useEffect(() => {
    if (activeTab === 'yolo' && yoloYaml) {
      setCodeContent(yoloYaml);
    }
  }, [activeTab, yoloYaml]);

  const exportCode = () => {
    const code = generatePyTorchCode(blocks);
    fetch('http://localhost:8080/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    }).catch(err => console.error('[BlockBuilder]', err));
  };

  const runCode = () => {
    const fileParam = activeTab === 'network' ? 'network.py' : 'sample.py';
    fetch(`http://localhost:8080/run?file=${fileParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run' })
    }).catch(err => console.error('[BlockBuilder]', err));
  };

  const copyCode = () => {
    navigator.clipboard.writeText(codeContent);
  };

  return {
    codeContent, setCodeContent,
    rightSidebarOpen, setRightSidebarOpen,
    rightSidebarWidth, setRightSidebarWidth,
    isResizing, setIsResizing,
    exportCode, runCode, copyCode,
  };
}
