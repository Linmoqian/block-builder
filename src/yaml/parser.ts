import { BlockInstance, YoloModuleType } from '../types';
import { YOLO_TEMPLATES } from '../config/yoloBlocks';

interface RawYamlLayer {
  from: number | number[];
  repeats: number;
  module: string;
  args: any[];
}

/**
 * Parse a YOLO YAML config string into BlockInstance array.
 * Handles the format used by Ultralytics:
 *   backbone:
 *     - [-1, 1, Conv, [64, 3, 2]]
 *   head:
 *     - [[-1, 6], 1, Concat, [1]]
 */
export function parseYoloYaml(yaml: string): {
  blocks: BlockInstance[];
  nc: number;
} {
  const lines = yaml.split('\n');
  const rawLayers: RawYamlLayer[] = [];
  let currentSection: 'backbone' | 'head' | null = null;
  let nc = 80;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip empty and comment lines
    if (!line || line.startsWith('#')) continue;

    // Extract nc (number of classes)
    const ncMatch = line.match(/^nc:\s*(\d+)/);
    if (ncMatch) {
      nc = parseInt(ncMatch[1], 10);
      continue;
    }

    // Detect section headers
    if (line === 'backbone:') { currentSection = 'backbone'; continue; }
    if (line === 'head:') { currentSection = 'head'; continue; }

    // Skip non-list lines (scales, etc.)
    if (!line.startsWith('- [')) continue;

    // Parse the YAML list item: - [from, repeats, module, [args]]
    const parsed = parseYamlLine(line);
    if (parsed) {
      rawLayers.push(parsed);
    }
  }

  // Convert RawYamlLayer to BlockInstance[]
  const blocks: BlockInstance[] = [];
  const layerCount = rawLayers.length;

  rawLayers.forEach((raw, idx) => {
    const block = rawLayerToBlock(raw, idx, layerCount);
    blocks.push(block);
  });

  // Resolve connections based on `from` field
  blocks.forEach((block, idx) => {
    const raw = rawLayers[idx];
    if (!raw) return;

    const fromValues = Array.isArray(raw.from) ? raw.from : [raw.from];
    const connectedTo: string[] = [];

    for (const fromVal of fromValues) {
      // -1 means "previous layer" = layer above in visual layout
      // For first layer, from=-1 means no input (raw image)
      if (fromVal === -1) {
        if (idx > 0) {
          // Connect to the block above (previous layer)
          const prevBlock = blocks[idx - 1];
          if (prevBlock) {
            connectedTo.push(prevBlock.id);
          }
        }
      } else if (fromVal >= 0 && fromVal < blocks.length) {
        // Connect to the specific layer index
        const targetBlock = blocks[fromVal];
        if (targetBlock) {
          connectedTo.push(targetBlock.id);
        }
      }
    }

    if (connectedTo.length > 0) {
      block.connectedTo = connectedTo;
    }
  });

  // Position blocks vertically with spacing
  const SPACING_X = 100;
  const SPACING_Y = 90;
  const START_X = 60;
  const START_Y = 60;

  blocks.forEach((block, idx) => {
    block.x = START_X;
    block.y = START_Y + idx * SPACING_Y;
  });

  return { blocks, nc };
}

function parseYamlLine(line: string): RawYamlLayer | null {
  // Remove leading "- " and surrounding brackets
  // Format: - [from, repeats, module, [args]]
  let content = line.replace(/^- /, '');
  if (!content.startsWith('[') || !content.endsWith(']')) return null;
  content = content.slice(1, -1); // Remove outer []

  // Find the split: from, repeats, module, [args]
  // We need to split on commas at depth 0 (not inside nested brackets)
  const parts = splitTopLevel(content);

  if (parts.length < 4) return null;

  // Parse `from` - may be a number or a list
  const fromRaw = parts[0].trim();
  let from: number | number[];
  if (fromRaw.startsWith('[')) {
    from = fromRaw.slice(1, -1).split(',').map(s => parseInt(s.trim(), 10));
  } else {
    from = parseInt(fromRaw, 10);
  }

  const repeats = parseInt(parts[1].trim(), 10);
  const module = parts[2].trim();

  // Parse args - the last part is the args array [arg1, arg2, ...]
  const argsRaw = parts.slice(3).join(',');
  const args = parseArgs(argsRaw);

  return { from, repeats, module, args };
}

function splitTopLevel(str: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (inString) {
      current += ch;
      if (ch === stringChar && str[i - 1] !== '\\') {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }

    if (ch === '[') { depth++; current += ch; continue; }
    if (ch === ']') { depth--; current += ch; continue; }

    if (ch === ',' && depth === 0) {
      result.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) {
    result.push(current);
  }

  return result;
}

function parseArgs(argsRaw: string): any[] {
  // Remove surrounding brackets if present
  let s = argsRaw.trim();
  if (s.startsWith('[') && s.endsWith(']')) {
    s = s.slice(1, -1);
  }

  // Early return for empty args
  if (!s.trim()) return [];

  const args: any[] = [];
  let depth = 0;
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      current += ch;
      if (ch === stringChar && s[i - 1] !== '\\') {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }

    if (ch === '[') { depth++; current += ch; continue; }
    if (ch === ']') { depth--; current += ch; continue; }

    if (ch === ',' && depth === 0) {
      args.push(parseValue(current.trim()));
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) {
    args.push(parseValue(current.trim()));
  }

  return args;
}

function parseValue(s: string): any {
  if (s === 'None' || s === 'null') return null;
  if (s === 'True' || s === 'true') return true;
  if (s === 'False' || s === 'false') return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  // Handle placeholder values
  if (s === 'nc') return 'nc';
  return s;
}

function rawLayerToBlock(raw: RawYamlLayer, idx: number, total: number): BlockInstance {
  const template = YOLO_TEMPLATES.find(t => t.type === raw.module as YoloModuleType);

  // Map positional args to named params
  const yoloParams: Record<string, any> = {};

  if (template) {
    template.argNames.forEach((name, i) => {
      if (i < raw.args.length) {
        yoloParams[name] = raw.args[i];
      } else {
        // Use default value
        const paramDef = template.params.find(p => p.name === name);
        if (paramDef) {
          yoloParams[name] = paramDef.default;
        }
      }
    });
  } else {
    // Unknown module - store args positionally
    yoloParams._rawArgs = raw.args;
  }

  const block: BlockInstance = {
    id: `yolo-${idx}-${Date.now()}`,
    type: (template?.type || 'Conv') as YoloModuleType,
    x: 0,
    y: 0,
    color: template?.defaultColor || '#6b7280',
    rotation: 0,
    zIndex: idx + 1,
    repeats: raw.repeats,
    yoloParams,
  };

  return block;
}
