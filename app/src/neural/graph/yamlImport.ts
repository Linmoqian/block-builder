import yaml from 'js-yaml';
import { GraphIR, GraphNode, GraphEdge, ParamValue } from './types';
import { MODULE_REGISTRY } from './registry';

interface YoloLayer {
  from: number | number[];
  number: number;
  module: string;
  args: (number | string | null)[];
}

/** Map YOLO positional args to named params for a module type */
function argsToParams(type: string, args: (number | string | null)[]): Record<string, ParamValue> {
  const def = MODULE_REGISTRY[type];
  if (!def) return {};

  const paramKeys = Object.keys(def.params);
  const params: Record<string, ParamValue> = {};

  // Copy defaults first
  for (const [key, paramDef] of Object.entries(def.params)) {
    params[key] = paramDef.default;
  }

  // Override with args
  switch (type) {
    case 'Conv':
      if (args[0] !== undefined) params.out_channels = args[0] as number;
      if (args[1] !== undefined) params.kernel_size = args[1] as number;
      if (args[2] !== undefined) params.stride = args[2] as number;
      break;
    case 'C2f':
      if (args[0] !== undefined) params.out_channels = args[0] as number;
      break;
    case 'SPPF':
      if (args[0] !== undefined) params.out_channels = args[0] as number;
      if (args[1] !== undefined) params.kernel_size = args[1] as number;
      break;
    case 'Upsample':
      if (args[1] !== undefined) params.scale_factor = args[1] as number;
      if (args[2] !== undefined) params.mode = args[2] as string;
      break;
    case 'Concat':
      // YOLO uses NCHW axis (1=channels), we use [C,H,W] axis (0=channels)
      if (args[0] !== undefined) params.axis = Math.max(0, (args[0] as number) - 1);
      break;
    case 'CBAM':
      if (args[0] !== undefined) params.reduction = args[0] as number;
      break;
    case 'Detect':
      if (args[0] !== undefined) params.num_classes = args[0] as number;
      break;
    case 'BatchNorm2d':
      if (args[0] !== undefined) params.eps = args[0] as number;
      if (args[1] !== undefined) params.momentum = args[1] as number;
      break;
    case 'SiLU':
      break;
    case 'MaxPool2d':
      if (args[0] !== undefined) params.kernel_size = args[0] as number;
      if (args[1] !== undefined) params.stride = args[1] as number;
      break;
    case 'Flatten':
      if (args[0] !== undefined) params.start_dim = args[0] as number;
      break;
    case 'Linear':
      if (args[0] !== undefined) params.out_features = args[0] as number;
      break;
    case 'CA':
      if (args[0] !== undefined) params.reduction = args[0] as number;
      break;
    case 'SimAM':
      break;
    default:
      args.forEach((val, i) => {
        if (i < paramKeys.length && val !== null && val !== undefined) {
          params[paramKeys[i]] = val as ParamValue;
        }
      });
  }

  return params;
}

/** Pre-process Ultralytics YAML to handle Python-style literals */
function preprocessYaml(raw: string): string {
  return raw
    .replace(/:\s*None\b/g, ': null')
    .replace(/:\s*True\b/g, ': true')
    .replace(/:\s*False\b/g, ': false')
    .replace(/,\s*None\b/g, ', null')
    .replace(/,\s*True\b/g, ', true')
    .replace(/,\s*False\b/g, ', false');
}

export function importYaml(yamlString: string): GraphIR {
  const processed = preprocessYaml(yamlString);
  const parsed = yaml.load(processed) as Record<string, YoloLayer[]>;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Extract nc for Detect layer substitution
  const nc = (parsed as Record<string, unknown>).nc as number | undefined;

  // Flatten backbone + head into a single list
  const allLayers: YoloLayer[] = [];
  if (parsed.backbone) allLayers.push(...parsed.backbone);
  if (parsed.head) allLayers.push(...parsed.head);

  // Add an Input node at the beginning
  const inputId = 'input_0';
  nodes.push({
    id: inputId,
    type: 'Input',
    position: { x: 250, y: 0 },
    params: { channels: 3, height: 640, width: 640 },
  });

  // Track layer index to node id mapping (0 = Input)
  const layerIndexToNodeId: string[] = [inputId];

  for (let i = 0; i < allLayers.length; i++) {
    const layer = allLayers[i];
    // Strip nn. prefix (Ultralytics uses nn.Upsample, nn.MaxPool2d, etc.)
    const type = layer.module.replace(/^nn\./, '');
    // Substitute nc placeholder in args
    const args = layer.args.map(a => (a === 'nc' && nc ? nc : a));
    const def = MODULE_REGISTRY[type];

    if (!def) {
      console.warn(`Unknown module type: ${type}, skipping`);
      // Push a placeholder ID so subsequent from-field offsets remain correct
      const placeholderId = `unknown_${i}`;
      nodes.push({
        id: placeholderId,
        type: 'Conv', // fallback type to keep graph valid
        position: { x: 250, y: (i + 1) * 120 },
        params: { out_channels: 64, kernel_size: 1, stride: 1 },
      });
      layerIndexToNodeId.push(placeholderId);
      continue;
    }

    const nodeId = `${type.toLowerCase()}_${i}`;
    const params = argsToParams(type, args);

    nodes.push({
      id: nodeId,
      type,
      position: { x: 250, y: (i + 1) * 120 },
      params,
    });

    // Create edges from "from" field
    const from = layer.from;
    const fromIndices: number[] = Array.isArray(from) ? from : [from];

    for (const fromIdx of fromIndices) {
      // In YOLO YAML, -1 means "previous layer", -2 means "two layers back", etc.
      // The actual index in our list is: (current position in allLayers) + fromIdx + 1
      // But we also have the Input node at index 0, so:
      // layerIndexToNodeId has length = i + 1 (Input + previous layers)
      const actualIdx = layerIndexToNodeId.length + fromIdx;
      const sourceId = layerIndexToNodeId[actualIdx];

      if (sourceId) {
        const sourceDef = MODULE_REGISTRY[nodes.find((n) => n.id === sourceId)?.type || ''];
        const targetDef = def;

        // Determine which input port to use
        const edgeCount = edges.filter((e) => e.target === nodeId).length;
        const targetPort = targetDef.inputs[edgeCount]?.id || 'in';

        edges.push({
          id: `e_${sourceId}_${nodeId}_${edgeCount}`,
          source: sourceId,
          target: nodeId,
          sourceHandle: sourceDef?.outputs[0]?.id || 'out',
          targetHandle: targetPort,
        });
      }
    }

    layerIndexToNodeId.push(nodeId);
  }

  return { nodes, edges };
}
