import { useEffect, useRef } from 'react';
import { GraphIR } from '../graph/types';

const STORAGE_KEY = 'neural-graph-autosave';

export function useGraphPersistence(
  getGraphIR: () => GraphIR,
  loadGraphIR: (graph: GraphIR) => void
) {
  const isInitialLoad = useRef(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const graph = JSON.parse(saved) as GraphIR;
        if (graph.nodes && graph.edges) {
          loadGraphIR(graph);
        }
      }
    } catch {
      // Ignore corrupt data
    }
    isInitialLoad.current = false;
  }, [loadGraphIR]);

  // Auto-save on change (debounced)
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const save = () => {
    if (isInitialLoad.current) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      try {
        const graph = getGraphIR();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
      } catch {
        // Ignore storage errors
      }
    }, 500);
  };

  return { save };
}
