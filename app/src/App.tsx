import React, { lazy, Suspense, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Layers, Cpu, Puzzle, Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

const NeuralEditor = lazy(() => import('./neural/NeuralEditor'));
const BlocklyEditor = lazy(() => import('./blockly/BlocklyEditor'));
const LegacyEditor = lazy(() => import('./components/LegacyEditor'));

const isTauri = '__TAURI_INTERNALS__' in window;

function WindowControls() {
  const appWindow = getCurrentWindow();
  const handleMinimize = useCallback(() => appWindow.minimize(), [appWindow]);
  const handleToggleMaximize = useCallback(async () => {
    const maximized = await appWindow.isMaximized();
    maximized ? appWindow.unmaximize() : appWindow.maximize();
  }, [appWindow]);
  const handleClose = useCallback(() => appWindow.hide(), [appWindow]);

  return (
    <div className="flex">
      <button onClick={handleMinimize} className="flex items-center justify-center w-11 h-10 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors">
        <Minus size={14} />
      </button>
      <button onClick={handleToggleMaximize} className="flex items-center justify-center w-11 h-10 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors">
        <Square size={11} />
      </button>
      <button onClick={handleClose} className="flex items-center justify-center w-11 h-10 text-zinc-400 hover:bg-red-600 hover:text-white transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

const NAV_ITEMS = [
  { path: '/', label: '网络编辑器', icon: Cpu, activeColor: 'bg-indigo-600' },
  { path: '/blockly', label: '积木编程', icon: Puzzle, activeColor: 'bg-amber-600' },
  { path: '/legacy', label: '形状编辑器', icon: Layers, activeColor: 'bg-blue-600' },
];

function NavBar() {
  const location = useLocation();

  return (
    <div className="h-10 bg-zinc-900 flex items-center px-4 gap-2 z-50 shrink-0" data-tauri-drag-region>
      {isTauri && (
        <div className="flex items-center gap-2 mr-2" data-tauri-drag-region>
          <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-400 to-purple-500" />
        </div>
      )}
      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mr-3">模式</span>
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              isActive
                ? `${item.activeColor} text-white`
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Icon size={14} />
            {item.label}
          </Link>
        );
      })}
      <div className="flex-1" data-tauri-drag-region />
      {isTauri && <WindowControls />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        <NavBar />
        <div className="flex-1 overflow-hidden flex flex-col">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
                加载中...
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<NeuralEditor />} />
              <Route path="/blockly" element={<BlocklyEditor />} />
              <Route path="/legacy" element={<LegacyEditor />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </BrowserRouter>
  );
}
