/**
 * 训练流水线积木块 → Python/PyTorch 代码生成器
 *
 * 为 10 个训练积木块注册 Python 代码生成函数。
 */
import * as Blockly from 'blockly';
import { pythonGenerator, Order } from 'blockly/python';

// ---------------------------------------------------------------------------
// 数据集加载
// ---------------------------------------------------------------------------

pythonGenerator.forBlock['dataset_load'] = function (block: Blockly.Block): string {
  const dataset = block.getFieldValue('dataset_name');
  const batchSize = block.getFieldValue('batch_size');
  const numWorkers = block.getFieldValue('num_workers');
  const split = block.getFieldValue('train_split');

  const isTrain = split === 'train';
  const splitArg = isTrain ? 'train=True' : 'train=False';

  return [
    `# Load ${dataset} dataset`,
    'import torchvision',
    'from torch.utils.data import DataLoader',
    '',
    `train_dataset = torchvision.datasets.${dataset}(root='./data', ${splitArg}, transform=transform)`,
    `train_loader = DataLoader(train_dataset, batch_size=${batchSize}, shuffle=${isTrain}, num_workers=${numWorkers})`,
    '',
  ].join('\n');
};

// ---------------------------------------------------------------------------
// 数据变换
// ---------------------------------------------------------------------------

pythonGenerator.forBlock['data_transform'] = function (block: Blockly.Block): string {
  const resize = block.getFieldValue('resize');
  const mean = block.getFieldValue('normalize_mean');
  const std = block.getFieldValue('normalize_std');
  const aug = block.getFieldValue('augmentation');

  const augMap: Record<string, string> = {
    none: '',
    random_flip: '    transforms.RandomHorizontalFlip(),\n',
    random_crop_flip: '    transforms.RandomResizedCrop(${resize}),\n    transforms.RandomHorizontalFlip(),\n',
    auto_augment: '    transforms.AutoAugment(),\n',
  };

  const augLines = augMap[aug] || '';

  return [
    'from torchvision import transforms',
    '',
    'transform = transforms.Compose([',
    `    transforms.Resize((${resize}, ${resize})),`,
    augLines,
    '    transforms.ToTensor(),',
    `    transforms.Normalize(mean=[${mean}], std=[${std}]),`,
    '])',
    '',
  ].join('\n');
};

// ---------------------------------------------------------------------------
// 损失函数
// ---------------------------------------------------------------------------

pythonGenerator.forBlock['loss_function'] = function (block: Blockly.Block): [string, number] {
  const lossType = block.getFieldValue('loss_type');

  if (lossType === 'FocalLoss') {
    return ['FocalLoss()', Order.ATOMIC];
  }

  return [`nn.${lossType}()`, Order.ATOMIC];
};

// ---------------------------------------------------------------------------
// 优化器
// ---------------------------------------------------------------------------

pythonGenerator.forBlock['optimizer'] = function (block: Blockly.Block): string {
  const optimizerType = block.getFieldValue('optimizer_type');
  const lr = block.getFieldValue('learning_rate');
  const weightDecay = block.getFieldValue('weight_decay');
  const momentum = block.getFieldValue('momentum');

  const extraArgs = optimizerType === 'SGD'
    ? `, momentum=${momentum}`
    : '';

  return [
    `optimizer = torch.optim.${optimizerType}(model.parameters(), lr=${lr}, weight_decay=${weightDecay}${extraArgs})`,
    '',
  ].join('\n');
};

// ---------------------------------------------------------------------------
// 学习率调度
// ---------------------------------------------------------------------------

pythonGenerator.forBlock['lr_scheduler'] = function (block: Blockly.Block): string {
  const schedulerType = block.getFieldValue('scheduler_type');
  const stepSize = block.getFieldValue('step_size');
  const gamma = block.getFieldValue('gamma');

  const schedulerMap: Record<string, string> = {
    StepLR: `scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=${stepSize}, gamma=${gamma})`,
    CosineAnnealingLR: `scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=${stepSize})`,
    ExponentialLR: `scheduler = torch.optim.lr_scheduler.ExponentialLR(optimizer, gamma=${gamma})`,
    ReduceLROnPlateau: `scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=${gamma}, patience=${stepSize})`,
    OneCycleLR: `scheduler = torch.optim.lr_scheduler.OneCycleLR(optimizer, max_lr=${gamma}, total_steps=${stepSize})`,
  };

  return (schedulerMap[schedulerType] || '') + '\n';
};

// ---------------------------------------------------------------------------
// 训练循环
// ---------------------------------------------------------------------------

pythonGenerator.forBlock['train_loop'] = function (block: Blockly.Block): string {
  const epochs = block.getFieldValue('epochs');
  const doCode = pythonGenerator.statementToCode(block, 'DO');

  return [
    `for epoch in range(${epochs}):`,
    '    model.train()',
    `    for batch_idx, (data, target) in enumerate(train_loader):`,
    '        data, target = data.to(device), target.to(device)',
    doCode,
    '',
  ].join('\n');
};

// ---------------------------------------------------------------------------
// 前向传播
// ---------------------------------------------------------------------------

pythonGenerator.forBlock['forward_pass'] = function (): string {
  return [
    '        output = model(data)',
    '        loss = criterion(output, target)',
    '',
  ].join('\n');
};

// ---------------------------------------------------------------------------
// 反向传播
// ---------------------------------------------------------------------------

pythonGenerator.forBlock['backward_pass'] = function (block: Blockly.Block): string {
  const gradientClip = block.getFieldValue('gradient_clip');

  const clipLine = Number(gradientClip) > 0
    ? `        torch.nn.utils.clip_grad_norm_(model.parameters(), ${gradientClip})\n`
    : '';

  return [
    '        optimizer.zero_grad()',
    '        loss.backward()',
    clipLine,
    '        optimizer.step()',
    '',
  ].join('\n');
};

// ---------------------------------------------------------------------------
// 评估
// ---------------------------------------------------------------------------

pythonGenerator.forBlock['evaluate'] = function (block: Blockly.Block): string {
  const metric = block.getFieldValue('metric');

  return [
    '    model.eval()',
    '    correct = 0',
    '    total = 0',
    '    with torch.no_grad():',
    '        for data, target in val_loader:',
    '            data, target = data.to(device), target.to(device)',
    '            output = model(data)',
    `            # Metric: ${metric}`,
    '            pred = output.argmax(dim=1)',
    '            correct += (pred == target).sum().item()',
    '            total += target.size(0)',
    `    print(f'Epoch {epoch}: ${metric} = {correct / total:.4f}')`,
    '',
  ].join('\n');
};

// ---------------------------------------------------------------------------
// 保存模型
// ---------------------------------------------------------------------------

pythonGenerator.forBlock['save_model'] = function (block: Blockly.Block): string {
  const savePath = block.getFieldValue('save_path');
  return `torch.save(model.state_dict(), '${savePath}')\n`;
};

// ---------------------------------------------------------------------------
// generateTrainingCode：将工作区中的训练积木生成完整 train.py
// ---------------------------------------------------------------------------

export function generateTrainingCode(workspace: Blockly.Workspace): string {
  const raw = pythonGenerator.workspaceToCode(workspace);

  if (!raw || raw.trim().length === 0) {
    return '# 拖拽积木块生成代码\n';
  }

  const header = [
    'import torch',
    'import torch.nn as nn',
    'import torchvision',
    'from torch.utils.data import DataLoader',
    'from torchvision import transforms',
    '',
    "device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')",
    '',
  ].join('\n');

  const footer = [
    '',
    "if __name__ == '__main__':",
    '    print("Training complete.")',
    '',
  ].join('\n');

  return header + '\n' + raw + footer;
}
