import { BlockInstance } from '../types';
import { parseYoloYaml } from '../yaml/parser';

/** Scale definition matching YOLO's model compound scaling */
export interface YoloScale {
  depth: number;
  width: number;
  maxCh: number;
}

export const SCALES: Record<string, YoloScale> = {
  n: { depth: 0.50, width: 0.25, maxCh: 1024 },
  s: { depth: 0.50, width: 0.50, maxCh: 1024 },
  m: { depth: 0.50, width: 1.00, maxCh: 512 },
  l: { depth: 1.00, width: 1.00, maxCh: 512 },
  x: { depth: 1.00, width: 1.50, maxCh: 512 },
};

export interface YoloPreset {
  family: string;
  label: string;
  scales: string[];
  yamlSource: string;
}

/**
 * Base yolo11.yaml – Ultralytics YOLO11 detection model with P3/8-P5/32 outputs.
 */
const YOLO11_YAML = `nc: 80

backbone:
  - [-1, 1, Conv, [64, 3, 2]]
  - [-1, 1, Conv, [128, 3, 2]]
  - [-1, 2, C3k2, [256, False, 0.25]]
  - [-1, 1, Conv, [256, 3, 2]]
  - [-1, 2, C3k2, [512, False, 0.25]]
  - [-1, 1, Conv, [512, 3, 2]]
  - [-1, 2, C3k2, [512, True]]
  - [-1, 1, Conv, [1024, 3, 2]]
  - [-1, 2, C3k2, [1024, True]]
  - [-1, 1, SPPF, [1024, 5]]
  - [-1, 2, C2PSA, [1024]]

head:
  - [-1, 1, nn.Upsample, [None, 2, "nearest"]]
  - [[-1, 6], 1, Concat, [1]]
  - [-1, 2, C3k2, [512, False]]
  - [-1, 1, nn.Upsample, [None, 2, "nearest"]]
  - [[-1, 4], 1, Concat, [1]]
  - [-1, 2, C3k2, [256, False]]
  - [-1, 1, Conv, [256, 3, 2]]
  - [[-1, 13], 1, Concat, [1]]
  - [-1, 2, C3k2, [512, False]]
  - [-1, 1, Conv, [512, 3, 2]]
  - [[-1, 10], 1, Concat, [1]]
  - [-1, 2, C3k2, [1024, True]]
  - [[16, 19, 22], 1, Detect, [nc]]
`;

/** Available presets */
export const YOLO_PRESETS: YoloPreset[] = [
  {
    family: 'YOLO11',
    label: 'YOLO11',
    scales: ['n', 's', 'm', 'l', 'x'],
    yamlSource: YOLO11_YAML,
  },
];

/**
 * Apply YOLO compound scaling to block instances.
 * Repeats are multiplied by depth, channel params by width (rounded to mult. of 8).
 */
export function applyScaleToBlocks(blocks: BlockInstance[], scaleKey: string): BlockInstance[] {
  const scale = SCALES[scaleKey];
  if (!scale) return blocks;

  return blocks.map(block => {
    const depth = scale.depth;
    const width = scale.width;
    const maxCh = scale.maxCh;

    // Scale repeats
    const repeats = Math.max(1, Math.round((block.repeats || 1) * depth));

    // Scale channel params (c2, and any other channel-like number)
    const yoloParams = block.yoloParams ? { ...block.yoloParams } : undefined;

    if (yoloParams) {
      // Scale output channel (c2) – present in most modules
      if (typeof yoloParams.c2 === 'number') {
        yoloParams.c2 = Math.min(
          Math.max(Math.round(yoloParams.c2 * width / 8) * 8, 8),
          maxCh,
        );
      }
    }

    return { ...block, repeats, yoloParams };
  });
}

/**
 * Load a preset model: parse base YAML, apply scale, return positioned blocks.
 */
export function loadPreset(
  family: string,
  scaleKey: string,
  offsetY: number = 0,
  startZIndex: number = 1,
): BlockInstance[] {
  const preset = YOLO_PRESETS.find(p => p.family === family);
  if (!preset) return [];

  const { blocks } = parseYoloYaml(preset.yamlSource);
  const scaled = applyScaleToBlocks(blocks, scaleKey);

  // Position blocks vertically with spacing
  return scaled.map((b, i) => ({
    ...b,
    x: 60,
    y: offsetY + i * 90,
    zIndex: startZIndex + i,
  }));
}
