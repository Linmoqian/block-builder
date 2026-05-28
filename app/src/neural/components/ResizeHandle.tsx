import React, { useCallback, useRef } from 'react';

interface ResizeHandleProps {
  side: 'left' | 'right';
  onResize: (delta: number) => void;
  onDoubleClick?: () => void;
}

export function ResizeHandle({ side, onResize, onDoubleClick }: ResizeHandleProps) {
  const startXRef = useRef(0);
  const dragging = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startXRef.current = e.clientX;
      dragging.current = true;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - startXRef.current;
        startXRef.current = ev.clientX;
        onResize(side === 'left' ? delta : -delta);
      };

      const handleMouseUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [onResize, side],
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
      className="w-1 shrink-0 cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors duration-150 group relative"
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}
