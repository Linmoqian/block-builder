import React, { useState, lazy, Suspense } from 'react';
import { Layers, Cpu } from 'lucide-react';

const LegacyEditor = lazy(() => import('./components/LegacyEditor'));
const NeuralEditor = lazy(() => import('./neural/NeuralEditor'));

type EditorMode = 'legacy' | 'neural';

export default function App() {
  const [mode, setMode] = useState<EditorMode>('neural');

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Mode toggle bar */}
      <div className="h-10 bg-zinc-900 flex items-center px-4 gap-2 z-50 shrink-0">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest mr-3">Mode</span>
        <button
          onClick={() => setMode('neural')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
            mode === 'neural'
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Cpu size={14} />
          Network Editor
        </button>
        <button
          onClick={() => setMode('legacy')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
            mode === 'legacy'
              ? 'bg-blue-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Layers size={14} />
          Shape Editor
        </button>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
              Loading...
            </div>
          }
        >
          {mode === 'neural' ? <NeuralEditor /> : <LegacyEditor />}
        </Suspense>
      </div>
    </div>
  );
}
