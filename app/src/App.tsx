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
      <button onClick={handleMinimize} className="flex items-center justify-center w-11 h-12 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
        <Minus size={14} />
      </button>
      <button onClick={handleToggleMaximize} className="flex items-center justify-center w-11 h-12 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
        <Square size={11} />
      </button>
      <button onClick={handleClose} className="flex items-center justify-center w-11 h-12 text-zinc-400 hover:bg-red-500 hover:text-white transition-colors">
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
    <div className="h-12 bg-white/70 backdrop-blur-2xl border-b border-zinc-200/40 flex items-center px-5 gap-1 z-50 shrink-0" data-tauri-drag-region>
      {isTauri && (
        <div className="flex items-center gap-2 mr-3" data-tauri-drag-region>
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-violet-500 shadow-sm" />
        </div>
      )}
      <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest mr-4 select-none">模式</span>
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              isActive
                ? 'bg-zinc-900 text-white shadow-elevation-1'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            <Icon size={13} strokeWidth={isActive ? 2.2 : 1.8} />
            {item.label}
          </Link>
        );
      })}
      <div className="flex-1" data-tauri-drag-region />
      <span className="text-xs text-zinc-400 font-semibold tracking-wide select-none">神经网络工坊</span>
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
