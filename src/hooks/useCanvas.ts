import { useState, useRef, useMemo } from 'react';
import { BlockInstance } from '../types';

const ZOOM_MIN = 1;
const ZOOM_MAX = 12;

export function useCanvas() {
  const [zoomLevel, setZoomLevel] = useState(4);
  const [showGrid, setShowGrid] = useState(true);
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [isDraggingExisting, setIsDraggingExisting] = useState(false);
  const [isDraggingTemplate, setIsDraggingTemplate] = useState(false);
  const [isAnyItemDragging, setIsAnyItemDragging] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isOverCanvasRef = useRef(false);
  const dragRafRef = useRef<number | null>(null);

  const zoom = zoomLevel / 4;

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 1, ZOOM_MAX));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 1, ZOOM_MIN));

  const updateDragPosition = (blockId: string, x: number, y: number) => {
    if (dragRafRef.current) cancelAnimationFrame(dragRafRef.current);
    dragRafRef.current = requestAnimationFrame(() => {
      setDragPositions(prev => ({ ...prev, [blockId]: { x, y } }));
    });
  };

  const clearDragPosition = (blockId: string) => {
    setDragPositions(prev => {
      const next = { ...prev };
      delete next[blockId];
      return next;
    });
  };

  const connectionLines = useMemo(() => {
    const drawn = new Set<string>();
    const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    return (blocks: BlockInstance[]) => {
      drawn.clear();
      lines.length = 0;
      const blockMap = new Map<string, BlockInstance>(blocks.map(b => [b.id, b]));
      blocks.forEach(block => {
        const connectedTo = block.connectedTo || [];
        connectedTo.forEach(targetId => {
          const key = block.id < targetId ? `${block.id}|${targetId}` : `${targetId}|${block.id}`;
          if (drawn.has(key)) return;
          drawn.add(key);
          const targetBlock = blockMap.get(targetId);
          if (!targetBlock) return;
          const bx = dragPositions[block.id]?.x ?? block.x;
          const by = dragPositions[block.id]?.y ?? block.y;
          const tx = dragPositions[targetId]?.x ?? targetBlock.x;
          const ty = dragPositions[targetId]?.y ?? targetBlock.y;
          const isBelow = ty > by;
          lines.push({ key, x1: bx, y1: isBelow ? by + 32 : by - 32, x2: tx, y2: isBelow ? ty - 32 : ty + 32 });
        });
      });
      return [...lines];
    };
  }, [dragPositions]);

  return {
    zoom, zoomLevel, setZoomLevel, zoomIn, zoomOut,
    showGrid, setShowGrid,
    dragPositions, setDragPositions, updateDragPosition, clearDragPosition,
    isDraggingExisting, setIsDraggingExisting,
    isDraggingTemplate, setIsDraggingTemplate,
    isAnyItemDragging, setIsAnyItemDragging,
    canvasRef, scrollContainerRef, isOverCanvasRef,
    connectionLines,
  };
}
