import { useCallback, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

export function useGraphHistory() {
  const history = useRef<Snapshot[]>([]);
  const pointer = useRef(-1);
  const skipping = useRef(false);
  const skipTimer = useRef<ReturnType<typeof setTimeout>>();

  const pushSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
    // Skip if this is an undo/redo-triggered update
    if (skipping.current) return;

    // Don't record empty graph as first snapshot
    if (nodes.length === 0 && history.current.length === 0) return;

    const snapshot: Snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };

    // Truncate future history
    history.current = history.current.slice(0, pointer.current + 1);
    history.current.push(snapshot);

    // Limit history size
    if (history.current.length > MAX_HISTORY) {
      history.current.shift();
    }

    pointer.current = history.current.length - 1;
  }, []);

  const undo = useCallback((): Snapshot | null => {
    if (pointer.current <= 0) return null;
    pointer.current--;
    skipping.current = true;
    clearTimeout(skipTimer.current);
    skipTimer.current = setTimeout(() => { skipping.current = false; }, 100);
    return history.current[pointer.current];
  }, []);

  const redo = useCallback((): Snapshot | null => {
    if (pointer.current >= history.current.length - 1) return null;
    pointer.current++;
    skipping.current = true;
    clearTimeout(skipTimer.current);
    skipTimer.current = setTimeout(() => { skipping.current = false; }, 100);
    return history.current[pointer.current];
  }, []);

  const canUndo = useCallback(() => pointer.current > 0, []);
  const canRedo = useCallback(() => pointer.current < history.current.length - 1, []);

  return { pushSnapshot, undo, redo, canUndo, canRedo };
}
