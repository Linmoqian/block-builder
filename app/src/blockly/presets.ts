/**
 * YOLO 预设模板
 *
 * 每个预设为 Blockly workspace XML 字符串，由链式积木组成。
 * 宽度/深度乘子来自 YOLOv8/v5 官方配置。
 */

export interface BlocklyPreset {
  label: string;
  description: string;
  xml: string;
}

function makePresetXml(fields: {
  widthMult: string;
  depthMult: string;
  neckType: string;
  numClasses: number;
  anchorMode: string;
  confThresh: number;
  iouThresh: number;
}): string {
  return `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="yolo_backbone" x="50" y="50">
    <field name="width_mult">${fields.widthMult}</field>
    <field name="depth_mult">${fields.depthMult}</field>
    <next>
      <block type="yolo_neck">
        <field name="neck_type">${fields.neckType}</field>
        <next>
          <block type="yolo_head">
            <field name="num_classes">${fields.numClasses}</field>
            <field name="anchor_mode">${fields.anchorMode}</field>
            <field name="conf_thresh">${fields.confThresh}</field>
            <field name="iou_thresh">${fields.iouThresh}</field>
          </block>
        </next>
      </block>
    </next>
  </block>
</xml>`;
}

export const YOLO_PRESETS: Record<string, BlocklyPreset> = {
  yolov8n: {
    label: 'YOLOv8n (Nano)',
    description: '最轻量，适合移动端/边缘设备',
    xml: makePresetXml({
      widthMult: '0.25',
      depthMult: '0.33',
      neckType: 'panet',
      numClasses: 80,
      anchorMode: 'anchor_free',
      confThresh: 0.25,
      iouThresh: 0.45,
    }),
  },
  yolov8s: {
    label: 'YOLOv8s (Small)',
    description: '小型模型，速度与精度平衡',
    xml: makePresetXml({
      widthMult: '0.50',
      depthMult: '0.33',
      neckType: 'panet',
      numClasses: 80,
      anchorMode: 'anchor_free',
      confThresh: 0.25,
      iouThresh: 0.45,
    }),
  },
  yolov8m: {
    label: 'YOLOv8m (Medium)',
    description: '中等模型，较高精度',
    xml: makePresetXml({
      widthMult: '0.75',
      depthMult: '0.67',
      neckType: 'panet',
      numClasses: 80,
      anchorMode: 'anchor_free',
      confThresh: 0.25,
      iouThresh: 0.45,
    }),
  },
  yolov5s: {
    label: 'YOLOv5s (Small)',
    description: 'YOLOv5 小型，带锚框',
    xml: makePresetXml({
      widthMult: '0.50',
      depthMult: '0.33',
      neckType: 'panet',
      numClasses: 80,
      anchorMode: 'anchored',
      confThresh: 0.25,
      iouThresh: 0.45,
    }),
  },
  yolov5m: {
    label: 'YOLOv5m (Medium)',
    description: 'YOLOv5 中等，带锚框',
    xml: makePresetXml({
      widthMult: '0.67',
      depthMult: '0.67',
      neckType: 'panet',
      numClasses: 80,
      anchorMode: 'anchored',
      confThresh: 0.25,
      iouThresh: 0.45,
    }),
  },
};
