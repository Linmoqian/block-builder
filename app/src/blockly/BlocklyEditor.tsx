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
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border-b border-zinc-700 shrink-0">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">YOLO 预设</span>
          <select
            onChange={(e) => { if (e.target.value) handleLoadPreset(e.target.value); e.target.value = ''; }}
            defaultValue=""
            className="py-1 px-2 text-xs bg-zinc-700 text-zinc-200 rounded border border-zinc-600 outline-none"
          >
            <option value="" disabled>选择预设...</option>
            {Object.entries(YOLO_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>{preset.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <BlocklyWorkspace
            className="h-full w-full"
            toolboxConfiguration={toolboxConfig}
            workspaceConfiguration={{
              grid: { spacing: 20, length: 2, colour: '#ccc', snap: true },
              zoom: { controls: true, wheel: true, startScale: 0.9 },
              trashcan: true,
              renderer: 'thrasos',
            }}
            onWorkspaceChange={handleWorkspaceChange}
            onXmlChange={setXml}
          />
        </div>
      </div>
      <aside className="w-96 bg-zinc-900 border-l border-zinc-700 flex flex-col shrink-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Python 代码</span>
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
              fontSize: 11,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              padding: { top: 12 },
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
