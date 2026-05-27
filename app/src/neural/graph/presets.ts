import { GraphIR } from './types';

/** YOLOv8-nano backbone + head */
export const YOLOV8_NANO: GraphIR = {
  nodes: [
    { id: 'input_0', type: 'Input', position: { x: 300, y: 0 }, params: { channels: 3, height: 640, width: 640 } },
    { id: 'conv_0', type: 'Conv', position: { x: 300, y: 120 }, params: { out_channels: 16, kernel_size: 3, stride: 2 } },
    { id: 'conv_1', type: 'Conv', position: { x: 300, y: 240 }, params: { out_channels: 32, kernel_size: 3, stride: 2 } },
    { id: 'c2f_0', type: 'C2f', position: { x: 300, y: 360 }, params: { out_channels: 32, n: 1 } },
    { id: 'conv_2', type: 'Conv', position: { x: 300, y: 480 }, params: { out_channels: 64, kernel_size: 3, stride: 2 } },
    { id: 'c2f_1', type: 'C2f', position: { x: 300, y: 600 }, params: { out_channels: 64, n: 2 } },
    { id: 'conv_3', type: 'Conv', position: { x: 300, y: 720 }, params: { out_channels: 128, kernel_size: 3, stride: 2 } },
    { id: 'c2f_2', type: 'C2f', position: { x: 300, y: 840 }, params: { out_channels: 128, n: 2 } },
    { id: 'conv_4', type: 'Conv', position: { x: 300, y: 960 }, params: { out_channels: 256, kernel_size: 3, stride: 2 } },
    { id: 'c2f_3', type: 'C2f', position: { x: 300, y: 1080 }, params: { out_channels: 256, n: 1 } },
    { id: 'sppf_0', type: 'SPPF', position: { x: 300, y: 1200 }, params: { out_channels: 256, kernel_size: 5 } },
    // Head
    { id: 'upsample_0', type: 'Upsample', position: { x: 300, y: 1360 }, params: { scale_factor: 2, mode: 'nearest' } },
    { id: 'concat_0', type: 'Concat', position: { x: 300, y: 1480 }, params: { axis: 0 } },
    { id: 'c2f_4', type: 'C2f', position: { x: 300, y: 1600 }, params: { out_channels: 128, n: 1 } },
    { id: 'upsample_1', type: 'Upsample', position: { x: 300, y: 1720 }, params: { scale_factor: 2, mode: 'nearest' } },
    { id: 'concat_1', type: 'Concat', position: { x: 300, y: 1840 }, params: { axis: 0 } },
    { id: 'c2f_5', type: 'C2f', position: { x: 300, y: 1960 }, params: { out_channels: 64, n: 1 } },
    { id: 'conv_5', type: 'Conv', position: { x: 300, y: 2100 }, params: { out_channels: 64, kernel_size: 3, stride: 2 } },
    { id: 'concat_2', type: 'Concat', position: { x: 300, y: 2220 }, params: { axis: 0 } },
    { id: 'c2f_6', type: 'C2f', position: { x: 300, y: 2340 }, params: { out_channels: 128, n: 1 } },
    { id: 'conv_6', type: 'Conv', position: { x: 300, y: 2480 }, params: { out_channels: 128, kernel_size: 3, stride: 2 } },
    { id: 'concat_3', type: 'Concat', position: { x: 300, y: 2600 }, params: { axis: 0 } },
    { id: 'c2f_7', type: 'C2f', position: { x: 300, y: 2720 }, params: { out_channels: 256, n: 1 } },
    { id: 'detect_0', type: 'Detect', position: { x: 300, y: 2880 }, params: { num_classes: 80 } },
  ],
  edges: [
    // Backbone
    { id: 'e1', source: 'input_0', target: 'conv_0', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e2', source: 'conv_0', target: 'conv_1', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e3', source: 'conv_1', target: 'c2f_0', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e4', source: 'c2f_0', target: 'conv_2', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e5', source: 'conv_2', target: 'c2f_1', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e6', source: 'c2f_1', target: 'conv_3', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e7', source: 'conv_3', target: 'c2f_2', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e8', source: 'c2f_2', target: 'conv_4', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e9', source: 'conv_4', target: 'c2f_3', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e10', source: 'c2f_3', target: 'sppf_0', sourceHandle: 'out', targetHandle: 'in' },
    // Head - P5 path
    { id: 'e11', source: 'sppf_0', target: 'upsample_0', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e12', source: 'upsample_0', target: 'concat_0', sourceHandle: 'out', targetHandle: 'in_0' },
    { id: 'e13', source: 'c2f_2', target: 'concat_0', sourceHandle: 'out', targetHandle: 'in_1' },
    { id: 'e14', source: 'concat_0', target: 'c2f_4', sourceHandle: 'out', targetHandle: 'in' },
    // Head - P4 path
    { id: 'e15', source: 'c2f_4', target: 'upsample_1', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e16', source: 'upsample_1', target: 'concat_1', sourceHandle: 'out', targetHandle: 'in_0' },
    { id: 'e17', source: 'c2f_1', target: 'concat_1', sourceHandle: 'out', targetHandle: 'in_1' },
    { id: 'e18', source: 'concat_1', target: 'c2f_5', sourceHandle: 'out', targetHandle: 'in' },
    // Head - P3 output (c2f_5 -> detect)
    // Downsample path
    { id: 'e19', source: 'c2f_5', target: 'conv_5', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e20', source: 'conv_5', target: 'concat_2', sourceHandle: 'out', targetHandle: 'in_0' },
    { id: 'e21', source: 'c2f_4', target: 'concat_2', sourceHandle: 'out', targetHandle: 'in_1' },
    { id: 'e22', source: 'concat_2', target: 'c2f_6', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e23', source: 'c2f_6', target: 'conv_6', sourceHandle: 'out', targetHandle: 'in' },
    { id: 'e24', source: 'conv_6', target: 'concat_3', sourceHandle: 'out', targetHandle: 'in_0' },
    { id: 'e25', source: 'sppf_0', target: 'concat_3', sourceHandle: 'out', targetHandle: 'in_1' },
    { id: 'e26', source: 'concat_3', target: 'c2f_7', sourceHandle: 'out', targetHandle: 'in' },
    // Detect head
    { id: 'e27', source: 'c2f_5', target: 'detect_0', sourceHandle: 'out', targetHandle: 'p3' },
    { id: 'e28', source: 'c2f_6', target: 'detect_0', sourceHandle: 'out', targetHandle: 'p4' },
    { id: 'e29', source: 'c2f_7', target: 'detect_0', sourceHandle: 'out', targetHandle: 'p5' },
  ],
};

export const PRESETS: Record<string, { label: string; graph: GraphIR }> = {
  'yolov8-nano': { label: 'YOLOv8 Nano', graph: YOLOV8_NANO },
};
