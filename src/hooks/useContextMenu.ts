import { useState, useEffect } from 'react';

interface ContextMenuState {
  x: number;
  y: number;
  blockId: string;
}

export function useContextMenu(setConnectingFrom: (v: string | null) => void) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    const handleResize = () => setContextMenu(null);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        setConnectingFrom(null);
      }
    };
    window.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [setConnectingFrom]);

  return { contextMenu, setContextMenu };
}
