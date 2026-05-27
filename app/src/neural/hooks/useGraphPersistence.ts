import { useEffect, useRef, useCallback } from 'react';
import { GraphIR } from '../graph/types';

const STORAGE_KEY = 'neural-graph-autosave';

export function useGraphPersistence(
  getGraphIR: () => GraphIR,
  loadGraphIR: (graph: GraphIR) => void
) {
  const isInitialLoad = useRef(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

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

  // Cleanup pending timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeout(saveTimeout.current);
    };
  }, []);

  // Memoized debounced save
  const save = useCallback(() => {
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
  }, [getGraphIR]);

  return { save };
}
