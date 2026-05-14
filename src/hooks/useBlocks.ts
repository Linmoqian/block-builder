import { useState, useCallback } from 'react';
import { BlockInstance, BLOCK_TEMPLATES, AllBlockType, BLOCK_PORTS } from '../types';
import { NETWORK_TEMPLATES } from '../config/networkBlocks';
import { YOLO_TEMPLATES } from '../config/yoloBlocks';

interface UseBlocksDeps {
  showToast: (msg: string) => void;
}

export function useBlocks({ showToast }: UseBlocksDeps) {
  const [blocks, setBlocks] = useState<BlockInstance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState(1);

  const addBlockAt = useCallback((type: AllBlockType, color: string, x: number, y: number) => {
    const template = [...BLOCK_TEMPLATES, ...NETWORK_TEMPLATES, ...YOLO_TEMPLATES].find(t => t.type === type);
    const isYoloBlock = YOLO_TEMPLATES.some(t => t.type === type);
    const yoloTemplate = isYoloBlock ? YOLO_TEMPLATES.find(t => t.type === type) : undefined;
    const yoloParams = yoloTemplate
      ? Object.fromEntries(yoloTemplate.params.map(p => [p.name, p.default]))
      : undefined;

    const newBlock: BlockInstance = {
      id: Math.random().toString(36).substr(2, 9),
      type, x, y, color, rotation: 0,
      zIndex: nextZIndex,
      ...(yoloParams && { yoloParams }),
      ...(yoloTemplate && { repeats: yoloTemplate.defaultRepeats }),
    };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedId(newBlock.id);
    setNextZIndex(prev => prev + 1);

    if (!template?.isNetwork && !isYoloBlock) {
      fetch('http://localhost:8080/drag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newBlock.id, type, name: template?.label || type })
      }).catch(err => console.error('[BlockBuilder]', err));
    }
  }, [nextZIndex]);

  const updateBlock = useCallback((id: string, updates: Partial<BlockInstance>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const block = prev.find(b => b.id === id);
      if (block) {
        const isYoloBlock = YOLO_TEMPLATES.some(t => t.type === block.type);
        if (!isYoloBlock) {
          const template = [...BLOCK_TEMPLATES, ...NETWORK_TEMPLATES].find(t => t.type === block.type);
          if (!template?.isNetwork) {
            fetch('http://localhost:8080/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, name: template?.label || block.type })
            }).catch(err => console.error('[BlockBuilder]', err));
          }
        }
      }
      const newBlocks = prev.filter(b => b.id !== id);
      return newBlocks.map(b => ({
        ...b,
        connectedTo: b.connectedTo ? b.connectedTo.filter(cid => cid !== id) : undefined
      }));
    });
    setSelectedId(prev => prev === id ? null : prev);
  }, []);

  const bringToFront = useCallback((id: string) => {
    setNextZIndex(prev => {
      updateBlock(id, { zIndex: prev });
      return prev + 1;
    });
  }, [updateBlock]);

  const rotateBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const block = prev.find(b => b.id === id);
      if (block) {
        return prev.map(b => b.id === id ? { ...b, rotation: (b.rotation + 45) % 360 } : b);
      }
      return prev;
    });
  }, []);

  const duplicateBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const block = prev.find(b => b.id === id);
      if (!block) return prev;
      const newBlock: BlockInstance = {
        ...block,
        id: Math.random().toString(36).substr(2, 9),
        x: block.x + 24,
        y: block.y + 24,
        connectedTo: [],
      };
      setSelectedId(newBlock.id);
      return [...prev, newBlock];
    });
    setNextZIndex(prev => prev + 1);
  }, []);

  const clearCanvas = useCallback(() => {
    setBlocks([]);
    setSelectedId(null);
  }, []);

  return {
    blocks, setBlocks, selectedId, setSelectedId, nextZIndex, setNextZIndex,
    addBlockAt, updateBlock, deleteBlock, bringToFront, rotateBlock, duplicateBlock, clearCanvas,
  };
}
