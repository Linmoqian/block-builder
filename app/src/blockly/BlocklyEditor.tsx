/**
 * Blockly 可视化编辑器主组件
 *
 * 左侧为 Blockly 积木画布（含 YOLO 预设选择），右侧为 Monaco Editor 实时代码预览。
 */
import React, { useState, useCallback, useRef } from 'react';
import { BlocklyWorkspace } from 'react-blockly';
import * as Blockly from 'blockly';
import type { Workspace } from 'blockly/core';
import Editor from '@monaco-editor/react';
import 'blockly/blocks';
import { Code2, Play, Download, Box } from 'lucide-react';
import { motion } from 'motion/react';

import { toolboxConfig } from './toolbox';
import { YOLO_PRESETS } from './presets';
import { generateFullCode } from './generators/python';
// side-effect：注册所有自定义积木块
import './blocks/network';
import './blocks/training';
import './blocks/yolo';
// side-effect：注册所有 Python 代码生成器
import './generators/python';
import './generators/training';
import './generators/yolo';

export default function BlocklyEditor(): React.ReactElement {
  const [code, setCode] = useState('');
  const [xml, setXml] = useState('');
  const workspaceRef = useRef<Workspace | null>(null);

  const handleWorkspaceChange = useCallback((workspace: Workspace) => {
    workspaceRef.current = workspace;
    const generated = generateFullCode(workspace);
    setCode(generated);
  }, []);

  const handleLoadPreset = useCallback((presetKey: string) => {
    const preset = YOLO_PRESETS[presetKey];
    if (!preset || !workspaceRef.current) return;
    workspaceRef.current.clear();
    const dom = Blockly.utils.xml.textToDom(preset.xml);
    Blockly.Xml.domToWorkspace(dom, workspaceRef.current);
    const generated = generateFullCode(workspaceRef.current);
    setCode(generated);
  }, []);

  const handleExportCode = useCallback(() => {
    if (!code) return;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'model.py';
    a.click();
    URL.revokeObjectURL(url);
  }, [code]);

  const handleRunCode = useCallback(() => {
    if (!code) return;
    fetch('http://localhost:8080/run?file=network.py', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        console.log('Run result:', data);
      })
      .catch(() => {});
  }, [code]);

  const beforeMount = (monaco: any) => {
    if (typeof window === 'undefined') return;
    ;(window as any).MonacoEnvironment = (window as any).MonacoEnvironment || {};
    (window as any).MonacoEnvironment.getWorkerUrl = function (_moduleId: string, _label: string) {
      const base = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/';
      const workerMain = base + 'vs/base/worker/workerMain.js';
      const blob = new Blob([
        `self.MonacoEnvironment = { baseUrl: '${base}' }; importScripts('${workerMain}');`
      ], { type: 'text/javascript' });
      return URL.createObjectURL(blob);
    };
  };

  return (
    <div className="flex flex-1 min-h-0">
      {/* Left: Blockly canvas */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 px-4 py-2 bg-white/60 backdrop-blur-xl border-b border-zinc-200/40 shrink-0"
        >
          <div className="flex items-center gap-2">
            <Box size={15} className="text-violet-500" strokeWidth={2} />
            <span className="text-xs font-semibold text-zinc-700">积木编程</span>
          </div>
          <div className="h-4 w-px bg-zinc-200" />
          <span className="text-[11px] text-zinc-400 font-medium">预设</span>
          <select
            onChange={(e) => { if (e.target.value) handleLoadPreset(e.target.value); e.target.value = ''; }}
            defaultValue=""
            className="py-1 px-2.5 text-xs font-medium bg-white/80 text-zinc-600 rounded-lg border border-zinc-200/60 outline-none hover:border-zinc-300 transition-colors cursor-pointer"
          >
            <option value="" disabled>选择预设...</option>
            {Object.entries(YOLO_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>{preset.label}</option>
            ))}
          </select>
          <div className="flex-1" />
          <button
            onClick={handleRunCode}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <Play size={12} fill="currentColor" />
            运行
          </button>
          <button
            onClick={handleExportCode}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-zinc-500 bg-zinc-100 hover:bg-zinc-200 transition-colors"
          >
            <Download size={12} />
            导出
          </button>
        </motion.div>

        {/* Blockly workspace */}
        <div className="flex-1">
          <BlocklyWorkspace
            className="h-full w-full"
            toolboxConfiguration={toolboxConfig}
            workspaceConfiguration={{
              grid: { spacing: 20, length: 2, colour: '#d6d3d1', snap: true },
              zoom: { controls: true, wheel: true, startScale: 0.9 },
              trashcan: true,
              renderer: 'thrasos',
            }}
            onWorkspaceChange={handleWorkspaceChange}
            onXmlChange={setXml}
          />
        </div>
      </div>

      {/* Right: Code preview */}
      <aside className="w-96 bg-zinc-950 flex flex-col shrink-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <Code2 size={13} className="text-zinc-500" />
            <span className="text-[11px] font-semibold text-zinc-400 tracking-wide">Python 代码</span>
          </div>
          <button
            onClick={handleExportCode}
            className="p-1 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
            title="复制代码"
          >
            <Download size={12} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Editor
            beforeMount={beforeMount}
            height="100%"
            language="python"
            theme="vs-dark"
            value={code || '# 拖拽积木块生成代码'}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 16 },
              renderLineHighlight: 'none',
              overviewRulerBorder: false,
              scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
            }}
          />
        </div>
      </aside>
    </div>
  );
}
