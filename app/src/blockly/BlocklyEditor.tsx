/**
 * Blockly 可视化编辑器主组件
 *
 * 左侧为 Blockly 积木画布，右侧为实时生成的 Python 代码预览。
 * 积木定义和代码生成器通过 side-effect import 注册。
 */
import React, { useState, useCallback } from 'react';
import { BlocklyWorkspace } from 'react-blockly';
import type { Workspace } from 'blockly/core';
import 'blockly/blocks';

import { toolboxConfig } from './toolbox';
// side-effect：注册所有自定义积木块
import './blocks/network';
// side-effect：注册所有 Python 代码生成器
import './generators/python';
import { generateModelCode } from './generators/python';

export function BlocklyEditor(): React.ReactElement {
  const [code, setCode] = useState('');
  const [xml, setXml] = useState('');

  const handleWorkspaceChange = useCallback((workspace: Workspace) => {
    const generated = generateModelCode(workspace);
    setCode(generated);
  }, []);

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 min-w-0">
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
      <aside className="w-96 bg-zinc-900 border-l border-zinc-700 flex flex-col shrink-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Python 代码
          </span>
        </div>
        <div className="flex-1 overflow-auto p-3">
          <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap">
            {code || '# 拖拽积木块生成代码'}
          </pre>
        </div>
      </aside>
    </div>
  );
}
