import { useState, useCallback } from 'react';
import { BlockInstance, BLOCK_TEMPLATES, BLOCK_PORTS } from '../types';
import { NETWORK_TEMPLATES } from '../config/networkBlocks';
import { YOLO_TEMPLATES } from '../config/yoloBlocks';

interface UseConnectionsDeps {
  blocks: BlockInstance[];
  setBlocks: React.Dispatch<React.SetStateAction<BlockInstance[]>>;
  showToast: (msg: string) => void;
}

export function useConnections({ blocks, setBlocks, showToast }: UseConnectionsDeps) {
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  const connectBlocks = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;

    const fromBlock = blocks.find(b => b.id === fromId);
    const toBlock = blocks.find(b => b.id === toId);
    if (!fromBlock || !toBlock) return;

    const fromLimits = BLOCK_PORTS[fromBlock.type] || { maxInputs: 1, maxOutputs: 1 };
    const toLimits = BLOCK_PORTS[toBlock.type] || { maxInputs: 1, maxOutputs: 1 };

    const fromOutputCount = fromBlock.connectedTo ? fromBlock.connectedTo.length : 0;
    const toInputCount = blocks.filter(b => b.connectedTo && b.connectedTo.includes(toId)).length;

    if (fromOutputCount >= fromLimits.maxOutputs) {
      const label = [...BLOCK_TEMPLATES, ...NETWORK_TEMPLATES, ...YOLO_TEMPLATES].find(t => t.type === fromBlock.type)?.label || fromBlock.type;
      showToast(`${label} 无法添加更多输出连接！(最大: ${fromLimits.maxOutputs})`);
      return;
    }

    if (toInputCount >= toLimits.maxInputs) {
      const label = [...BLOCK_TEMPLATES, ...NETWORK_TEMPLATES, ...YOLO_TEMPLATES].find(t => t.type === toBlock.type)?.label || toBlock.type;
      showToast(`${label} 无法接受更多输入连接！(最大: ${toLimits.maxInputs})`);
      return;
    }

    const outputList = fromBlock.connectedTo || [];
    if (outputList.includes(toId) || (toBlock.connectedTo || []).includes(fromId)) {
      showToast('这两个积木已存在连接！');
      return;
    }

    // DFS 循环检测
    const visited = new Set<string>();
    const stack = [toId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === fromId) {
        showToast('连接会形成环路，已阻止！');
        return;
      }
      if (visited.has(current)) continue;
      visited.add(current);
      const block = blocks.find(b => b.id === current);
      if (block?.connectedTo) stack.push(...block.connectedTo);
    }

    setBlocks(prev => prev.map(block => {
      if (block.id === fromId) {
        const connectedTo = block.connectedTo || [];
        if (!connectedTo.includes(toId)) {
          return { ...block, connectedTo: [...connectedTo, toId] };
        }
      }
      return block;
    }));

    showToast('连接成功！');

    const isYoloConnect = YOLO_TEMPLATES.some(t => t.type === fromBlock.type || t.type === toBlock.type);
    if (!isYoloConnect) {
      const fromTemplate = [...BLOCK_TEMPLATES, ...NETWORK_TEMPLATES].find(t => t.type === fromBlock.type);
      const toTemplate = [...BLOCK_TEMPLATES, ...NETWORK_TEMPLATES].find(t => t.type === toBlock.type);
      fetch('http://localhost:8080/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: { type: fromBlock.type, name: fromTemplate?.label },
          to: { type: toBlock.type, name: toTemplate?.label }
        })
      }).catch(err => console.error('[BlockBuilder]', err));
    }
  }, [blocks, setBlocks, showToast]);

  return { connectingFrom, setConnectingFrom, connectBlocks };
}
