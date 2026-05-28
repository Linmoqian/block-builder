/**
 * 训练流水线 Blockly 自定义积木块定义
 *
 * 包含 10 个训练相关积木：数据加载、变换、损失函数、优化器、
 * 学习率调度、训练循环、前向/反向传播、评估、模型保存。
 */
import * as Blockly from 'blockly';

// hue 30 = orange，区别于网络模块各颜色
const COLOUR = 30;

Blockly.common.defineBlocksWithJsonArray([
  // ===========================================================================
  // 数据集加载
  // ===========================================================================
  {
    type: 'dataset_load',
    message0: '加载数据集 %1 批次 %2 线程 %3 分割 %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'dataset_name',
        options: [
          ['CIFAR10', 'CIFAR10'],
          ['CIFAR100', 'CIFAR100'],
          ['MNIST', 'MNIST'],
          ['FashionMNIST', 'FashionMNIST'],
          ['ImageFolder', 'ImageFolder'],
          ['COCO', 'COCO'],
        ],
      },
      { type: 'field_number', name: 'batch_size', value: 32, min: 1, max: 512 },
      { type: 'field_number', name: 'num_workers', value: 4, min: 0, max: 32 },
      {
        type: 'field_dropdown',
        name: 'train_split',
        options: [
          ['train', 'train'],
          ['val', 'val'],
          ['test', 'test'],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLOUR,
    tooltip: '加载数据集并创建 DataLoader',
  },

  // ===========================================================================
  // 数据变换
  // ===========================================================================
  {
    type: 'data_transform',
    message0: '图像大小 %1 均值 %2 标准差 %3 增强 %4',
    args0: [
      { type: 'field_number', name: 'resize', value: 224, min: 32, max: 4096 },
      { type: 'field_input', name: 'normalize_mean', text: '0.485, 0.456, 0.406' },
      { type: 'field_input', name: 'normalize_std', text: '0.229, 0.224, 0.225' },
      {
        type: 'field_dropdown',
        name: 'augmentation',
        options: [
          ['无', 'none'],
          ['随机翻转', 'random_flip'],
          ['随机裁剪+翻转', 'random_crop_flip'],
          ['自动增强', 'auto_augment'],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLOUR,
    tooltip: '图像预处理与数据增强',
  },

  // ===========================================================================
  // 损失函数（value output）
  // ===========================================================================
  {
    type: 'loss_function',
    message0: '损失函数 %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'loss_type',
        options: [
          ['CrossEntropyLoss', 'CrossEntropyLoss'],
          ['MSELoss', 'MSELoss'],
          ['BCELoss', 'BCELoss'],
          ['L1Loss', 'L1Loss'],
          ['SmoothL1Loss', 'SmoothL1Loss'],
          ['FocalLoss', 'FocalLoss'],
        ],
      },
    ],
    output: 'Loss',
    colour: COLOUR,
    tooltip: '损失函数',
  },

  // ===========================================================================
  // 优化器
  // ===========================================================================
  {
    type: 'optimizer',
    message0: '优化器 %1 学习率 %2 权重衰减 %3 动量 %4',
    args0: [
      {
        type: 'field_dropdown',
        name: 'optimizer_type',
        options: [
          ['SGD', 'SGD'],
          ['Adam', 'Adam'],
          ['AdamW', 'AdamW'],
          ['RMSprop', 'RMSprop'],
        ],
      },
      { type: 'field_number', name: 'learning_rate', value: 0.001, min: 0, max: 1, precision: 0.0001 },
      { type: 'field_number', name: 'weight_decay', value: 0.0001, min: 0, max: 1, precision: 0.00001 },
      { type: 'field_number', name: 'momentum', value: 0.9, min: 0, max: 1, precision: 0.01 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLOUR,
    tooltip: '优化器设置',
  },

  // ===========================================================================
  // 学习率调度
  // ===========================================================================
  {
    type: 'lr_scheduler',
    message0: '调度器 %1 步长 %2 衰减 %3',
    args0: [
      {
        type: 'field_dropdown',
        name: 'scheduler_type',
        options: [
          ['StepLR', 'StepLR'],
          ['CosineAnnealingLR', 'CosineAnnealingLR'],
          ['ExponentialLR', 'ExponentialLR'],
          ['ReduceLROnPlateau', 'ReduceLROnPlateau'],
          ['OneCycleLR', 'OneCycleLR'],
        ],
      },
      { type: 'field_number', name: 'step_size', value: 10, min: 1, max: 1000 },
      { type: 'field_number', name: 'gamma', value: 0.1, min: 0, max: 1, precision: 0.01 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLOUR,
    tooltip: '学习率调度策略',
  },

  // ===========================================================================
  // 训练循环
  // ===========================================================================
  {
    type: 'train_loop',
    message0: '训练 %1 轮 %2',
    args0: [
      { type: 'field_number', name: 'epochs', value: 100, min: 1, max: 10000 },
      { type: 'input_statement', name: 'DO' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLOUR,
    tooltip: '训练循环',
  },

  // ===========================================================================
  // 前向传播
  // ===========================================================================
  {
    type: 'forward_pass',
    message0: '前向传播（模型推理）',
    args0: [],
    previousStatement: null,
    nextStatement: null,
    colour: COLOUR,
    tooltip: '前向传播',
  },

  // ===========================================================================
  // 反向传播
  // ===========================================================================
  {
    type: 'backward_pass',
    message0: '反向传播 梯度裁剪 %1',
    args0: [
      { type: 'field_number', name: 'gradient_clip', value: 0, min: 0, max: 100, precision: 0.1 },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLOUR,
    tooltip: '反向传播与梯度裁剪',
  },

  // ===========================================================================
  // 评估
  // ===========================================================================
  {
    type: 'evaluate',
    message0: '评估指标 %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'metric',
        options: [
          ['Accuracy', 'Accuracy'],
          ['mAP', 'mAP'],
          ['F1', 'F1'],
          ['Precision', 'Precision'],
          ['Recall', 'Recall'],
        ],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLOUR,
    tooltip: '模型评估指标',
  },

  // ===========================================================================
  // 保存模型
  // ===========================================================================
  {
    type: 'save_model',
    message0: '保存模型到 %1',
    args0: [
      { type: 'field_input', name: 'save_path', text: 'model.pth' },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: COLOUR,
    tooltip: '保存模型权重',
  },
]);
