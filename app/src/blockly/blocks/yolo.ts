/**
 * YOLO 专属积木块定义
 *
 * 架构积木（3 个）：yolo_backbone, yolo_neck, yolo_head
 * 训练流水线积木（8 个）：数据集、增强、锚框、训练配置、NMS、推理、评估、导出
 */
import * as Blockly from 'blockly';

const ARCH_COLOUR = 340;
const TRAIN_COLOUR = 20;

Blockly.common.defineBlocksWithJsonArray([
  // ===========================================================================
  // 架构积木
  // ===========================================================================
  {
    type: 'yolo_backbone',
    message0: 'YOLO 骨干  宽度 %1 深度 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'width_mult',
        options: [
          ['0.25 (Nano)', '0.25'],
          ['0.50 (Small)', '0.50'],
          ['0.75 (Medium)', '0.75'],
          ['1.00 (Large)', '1.00'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'depth_mult',
        options: [
          ['0.33 (Nano/Small)', '0.33'],
          ['0.67 (Medium)', '0.67'],
          ['1.00 (Large)', '1.00'],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: ARCH_COLOUR,
    tooltip: 'CSPDarknet 骨干网络，可配置宽度/深度乘子',
  },
  {
    type: 'yolo_neck',
    message0: 'YOLO 颈部  类型 %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'neck_type',
        options: [
          ['PANet (YOLOv8)', 'panet'],
          ['FPN', 'fpn'],
          ['BiFPN', 'bifpn'],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: ARCH_COLOUR,
    tooltip: '多尺度特征融合颈部',
  },
  {
    type: 'yolo_head',
    message0: 'YOLO 检测头  类别数 %1 锚框 %2 置信度 %3 IoU %4',
    args0: [
      { type: 'field_number', name: 'num_classes', value: 80, min: 1, max: 1000 },
      {
        type: 'field_dropdown',
        name: 'anchor_mode',
        options: [
          ['Anchor-free (YOLOv8)', 'anchor_free'],
          ['Anchored (YOLOv5)', 'anchored'],
          ['Auto', 'auto'],
        ],
      },
      { type: 'field_number', name: 'conf_thresh', value: 0.25, min: 0, max: 1, precision: 0.01 },
      { type: 'field_number', name: 'iou_thresh', value: 0.45, min: 0, max: 1, precision: 0.01 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: ARCH_COLOUR,
    tooltip: 'YOLO 检测头 + NMS 配置',
  },

  // ===========================================================================
  // 训练流水线积木
  // ===========================================================================
  {
    type: 'yolo_dataset',
    message0: 'YOLO 数据集  格式 %1 路径 %2 批次 %3 线程 %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'format',
        options: [
          ['YOLO 格式', 'yolo'],
          ['COCO 格式', 'coco'],
          ['VOC 格式', 'voc'],
        ],
      },
      { type: 'field_input', name: 'data_path', text: './datasets/coco128' },
      { type: 'field_number', name: 'batch_size', value: 16, min: 1, max: 256 },
      { type: 'field_number', name: 'num_workers', value: 8, min: 0, max: 32 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: TRAIN_COLOUR,
    tooltip: '加载 YOLO 格式数据集',
  },
  {
    type: 'yolo_augment',
    message0: 'YOLO 数据增强  mosaic %1 mixup %2 hsv %3 翻转 %4 缩放 %5',
    args0: [
      { type: 'field_number', name: 'mosaic', value: 1.0, min: 0, max: 1, precision: 0.1 },
      { type: 'field_number', name: 'mixup', value: 0.0, min: 0, max: 1, precision: 0.1 },
      { type: 'field_number', name: 'hsv_h', value: 0.015, min: 0, max: 1, precision: 0.001 },
      { type: 'field_number', name: 'flipud', value: 0.0, min: 0, max: 1, precision: 0.1 },
      { type: 'field_number', name: 'scale', value: 0.5, min: 0, max: 1, precision: 0.1 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: TRAIN_COLOUR,
    tooltip: 'YOLO 训练数据增强配置',
  },
  {
    type: 'yolo_anchors',
    message0: '锚框配置  模式 %1 自动演化 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'anchor_mode',
        options: [
          ['自动计算', 'auto'],
          ['COCO 预设', 'preset_coco'],
          ['VOC 预设', 'preset_voc'],
          ['自定义', 'custom'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'auto_evolve',
        options: [
          ['是', 'True'],
          ['否', 'False'],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: TRAIN_COLOUR,
    tooltip: '锚框计算与配置',
  },
  {
    type: 'yolo_train_config',
    message0: 'YOLO 训练  epochs %1 学习率 %2 优化器 %3 设备 %4',
    args0: [
      { type: 'field_number', name: 'epochs', value: 100, min: 1, max: 1000 },
      { type: 'field_number', name: 'learning_rate', value: 0.01, min: 0, max: 1, precision: 0.001 },
      {
        type: 'field_dropdown',
        name: 'optimizer',
        options: [
          ['SGD', 'SGD'],
          ['AdamW', 'AdamW'],
          ['Adam', 'Adam'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'device',
        options: [
          ['GPU (cuda)', '0'],
          ['CPU', 'cpu'],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: TRAIN_COLOUR,
    tooltip: 'YOLO 训练配置',
  },
  {
    type: 'yolo_nms',
    message0: 'NMS 后处理  置信度 %1 IoU %2 最大检测 %3',
    args0: [
      { type: 'field_number', name: 'conf_thres', value: 0.25, min: 0, max: 1, precision: 0.01 },
      { type: 'field_number', name: 'iou_thres', value: 0.45, min: 0, max: 1, precision: 0.01 },
      { type: 'field_number', name: 'max_det', value: 300, min: 1, max: 10000 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: TRAIN_COLOUR,
    tooltip: '非极大值抑制后处理',
  },
  {
    type: 'yolo_inference',
    message0: 'YOLO 推理  源 %1 置信度 %2 图像尺寸 %3',
    args0: [
      { type: 'field_input', name: 'source', text: 'test_images/' },
      { type: 'field_number', name: 'conf', value: 0.25, min: 0, max: 1, precision: 0.01 },
      { type: 'field_number', name: 'img_size', value: 640, min: 32, max: 4096 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: TRAIN_COLOUR,
    tooltip: 'YOLO 模型推理',
  },
  {
    type: 'yolo_map_eval',
    message0: 'mAP 评估  IoU 阈值 %1',
    args0: [
      { type: 'field_input', name: 'iou_thresholds', text: '0.50:0.95' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: TRAIN_COLOUR,
    tooltip: 'mAP 指标评估',
  },
  {
    type: 'yolo_export',
    message0: '导出模型  格式 %1 半精度 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'export_format',
        options: [
          ['ONNX', 'onnx'],
          ['TensorRT', 'engine'],
          ['CoreML', 'coreml'],
          ['TFLite', 'tflite'],
        ],
      },
      {
        type: 'field_dropdown',
        name: 'half_precision',
        options: [
          ['FP16', 'True'],
          ['FP32', 'False'],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: TRAIN_COLOUR,
    tooltip: '导出模型为 ONNX/TensorRT 等格式',
  },
]);
