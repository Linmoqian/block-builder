/**
 * YOLO 积木块 → Python 代码生成器
 *
 * 架构积木生成 PyTorch 类定义，训练积木生成 ultralytics API 调用。
 */
import * as Blockly from 'blockly';
import { pythonGenerator, Order } from 'blockly/python';

// ---------------------------------------------------------------------------
// 架构积木生成器
// ---------------------------------------------------------------------------

pythonGenerator.forBlock['yolo_backbone'] = function (block: Blockly.Block): string {
  const widthMult = block.getFieldValue('width_mult');
  const depthMult = block.getFieldValue('depth_mult');

  const makeDiv = (v: number, divisor: number): number => {
    const newV = Math.max(divisor, Math.round(v / divisor) * divisor);
    if (newV < 0.9 * divisor / 10) return newV + divisor;
    return newV;
  };

  const w = parseFloat(widthMult);
  const base = [64, 128, 256, 512, 1024];
  const ch = base.map((c) => makeDiv(c * w, 8));

  const depth = Math.max(Math.round(parseFloat(depthMult) * 3), 1);

  return [
    '# YOLO Backbone (CSPDarknet)',
    `# width_mult=${widthMult}, depth_mult=${depthMult}`,
    `# channels=${ch.join(', ')}, repeat=${depth}`,
    '',
    'class ConvBNAct(nn.Module):',
    '    def __init__(self, c1, c2, k=3, s=1):',
    '        super().__init__()',
    '        self.conv = nn.Conv2d(c1, c2, k, s, k // 2, bias=False)',
    '        self.bn = nn.BatchNorm2d(c2)',
    '        self.act = nn.SiLU(inplace=True)',
    '',
    '    def forward(self, x):',
    '        return self.act(self.bn(self.conv(x)))',
    '',
    'class Bottleneck(nn.Module):',
    '    def __init__(self, c1, c2, shortcut=True):',
    '        super().__init__()',
    '        self.cv1 = ConvBNAct(c1, c2, 3)',
    '        self.cv2 = ConvBNAct(c2, c2, 3)',
    '        self.add = shortcut and c1 == c2',
    '',
    '    def forward(self, x):',
    '        return x + self.cv2(self.cv1(x)) if self.add else self.cv2(self.cv1(x))',
    '',
    'class C2f(nn.Module):',
    '    def __init__(self, c1, c2, n=1, shortcut=True):',
    '        super().__init__()',
    '        self.cv1 = ConvBNAct(c1, 2 * c2, 1)',
    '        self.cv2 = ConvBNAct((2 + n) * c2, c2, 1)',
    '        self.m = nn.ModuleList(Bottleneck(c2, c2, shortcut) for _ in range(n))',
    '',
    '    def forward(self, x):',
    '        y = list(self.cv1(x).chunk(2, 1))',
    '        y.extend(m(y[-1]) for m in self.m)',
    '        return self.cv2(torch.cat(y, 1))',
    '',
    'class SPPF(nn.Module):',
    '    def __init__(self, c1, c2, k=5):',
    '        super().__init__()',
    '        self.cv1 = ConvBNAct(c1, c2, 1)',
    '        self.cv2 = ConvBNAct(c2 * 4, c2, 1)',
    '        self.m = nn.MaxPool2d(k, 1, k // 2)',
    '',
    '    def forward(self, x):',
    '        y1 = self.m(x)',
    '        y2 = self.m(y1)',
    '        return self.cv2(torch.cat([x, y1, y2, self.m(y2)], 1))',
    '',
    'class YOLOBackbone(nn.Module):',
    `    # channels: ${ch.join(', ')}  depth_repeat: ${depth}`,
    '    def __init__(self):',
    '        super().__init__()',
    `        self.stem = ConvBNAct(3, ${ch[0]}, 3, 2)`,
    `        self.stage1 = ConvBNAct(${ch[0]}, ${ch[1]}, 3, 2)`,
    `        self.c2f1 = C2f(${ch[1]}, ${ch[1]}, n=${depth})`,
    `        self.stage2 = ConvBNAct(${ch[1]}, ${ch[2]}, 3, 2)`,
    `        self.c2f2 = C2f(${ch[2]}, ${ch[2]}, n=${depth})`,
    `        self.stage3 = ConvBNAct(${ch[2]}, ${ch[3]}, 3, 2)`,
    `        self.c2f3 = C2f(${ch[3]}, ${ch[3]}, n=${depth})`,
    `        self.stage4 = ConvBNAct(${ch[3]}, ${ch[4]}, 3, 2)`,
    `        self.c2f4 = C2f(${ch[4]}, ${ch[4]}, n=${depth})`,
    `        self.sppf = SPPF(${ch[4]}, ${ch[4]})`,
    '',
    '    def forward(self, x):',
    '        x = self.stem(x)',
    '        p1 = self.c2f1(self.stage1(x))',
    '        p2 = self.c2f2(self.stage2(p1))',
    '        p3 = self.c2f3(self.stage3(p2))',
    '        p4 = self.sppf(self.stage4(p3))',
    '        return p2, p3, p4',
  ].join('\n');
};

pythonGenerator.forBlock['yolo_neck'] = function (block: Blockly.Block): string {
  const neckType = block.getFieldValue('neck_type');

  const neckCode: Record<string, string> = {
    panet: [
      '# YOLO Neck (PANet)',
      'class YOLONeck(nn.Module):',
      '    def __init__(self, c3, c4, c5):',
      '        super().__init__()',
      '        self.up1 = nn.Upsample(None, 2, "nearest")',
      '        self.c2f_p4 = C2f(c4 + c5, c4)',
      '        self.up2 = nn.Upsample(None, 2, "nearest")',
      '        self.c2f_p3 = C2f(c3 + c4, c3)',
      '        self.down1 = ConvBNAct(c3, c3, 3, 2)',
      '        self.c2f_n3 = C2f(c3 + c4, c4)',
      '        self.down2 = ConvBNAct(c4, c4, 3, 2)',
      '        self.c2f_n4 = C2f(c4 + c5, c5)',
      '',
      '    def forward(self, p3, p4, p5):',
      '        x = torch.cat([self.up1(p5), p4], 1)',
      '        x = self.c2f_p4(x)',
      '        x = torch.cat([self.up2(x), p3], 1)',
      '        n3 = self.c2f_p3(x)',
      '        x = torch.cat([self.down1(n3), x], 1)',
      '        n4 = self.c2f_n4(self.down2(self.c2f_n3(x)))',
      '        return n3, n4, x',
    ].join('\n'),
    fpn: [
      '# YOLO Neck (FPN)',
      'class YOLONeck(nn.Module):',
      '    def __init__(self, c3, c4, c5):',
      '        super().__init__()',
      '        self.lateral5 = ConvBNAct(c5, c4, 1)',
      '        self.lateral4 = ConvBNAct(c4, c3, 1)',
      '        self.up1 = nn.Upsample(None, 2, "nearest")',
      '        self.up2 = nn.Upsample(None, 2, "nearest")',
      '        self.smooth3 = ConvBNAct(c3, c3, 3)',
      '        self.smooth4 = ConvBNAct(c4, c4, 3)',
      '        self.smooth5 = ConvBNAct(c5, c5, 3)',
      '',
      '    def forward(self, p3, p4, p5):',
      '        x5 = self.lateral5(p5)',
      '        x4 = self.lateral4(p4) + self.up1(x5)',
      '        x3 = p3 + self.up2(x4)',
      '        return self.smooth3(x3), self.smooth4(x4), self.smooth5(x5)',
    ].join('\n'),
    bifpn: [
      '# YOLO Neck (BiFPN)',
      'class BiFPNAdd(nn.Module):',
      '    def __init__(self, channels):',
      '        super().__init__()',
      '        self.w = nn.Parameter(torch.ones(2, dtype=torch.float32))',
      '        self.eps = 1e-4',
      '        self.conv = ConvBNAct(channels, channels, 3)',
      '',
      '    def forward(self, x1, x2):',
      '        w = torch.relu(self.w)',
      '        w = w / (w.sum() + self.eps)',
      '        return self.conv(w[0] * x1 + w[1] * x2)',
      '',
      'class YOLONeck(nn.Module):',
      '    def __init__(self, c3, c4, c5):',
      '        super().__init__()',
      '        self.up1 = nn.Upsample(None, 2, "nearest")',
      '        self.up2 = nn.Upsample(None, 2, "nearest")',
      '        self.merge4 = BiFPNAdd(c4)',
      '        self.merge3 = BiFPNAdd(c3)',
      '        self.down1 = ConvBNAct(c3, c3, 3, 2)',
      '        self.down2 = ConvBNAct(c4, c4, 3, 2)',
      '        self.refine4 = BiFPNAdd(c4)',
      '        self.refine5 = BiFPNAdd(c5)',
      '',
      '    def forward(self, p3, p4, p5):',
      '        m4 = self.merge4(p4, self.up1(p5))',
      '        m3 = self.merge3(p3, self.up2(m4))',
      '        o4 = self.refine4(m4, self.down1(m3))',
      '        o5 = self.refine5(p5, self.down2(o4))',
      '        return m3, o4, o5',
    ].join('\n'),
  };

  return neckCode[neckType] || neckCode.panet;
};

pythonGenerator.forBlock['yolo_head'] = function (block: Blockly.Block): string {
  const nc = block.getFieldValue('num_classes');
  const anchorMode = block.getFieldValue('anchor_mode');
  const confThresh = block.getFieldValue('conf_thresh');
  const iouThresh = block.getFieldValue('iou_thresh');

  const anchorComment = anchorMode === 'anchor_free'
    ? '# Anchor-free (YOLOv8 style: direct prediction)'
    : anchorMode === 'anchored'
      ? '# Anchored (YOLOv5 style: predefined anchors)'
      : '# Auto anchor computation';

  return [
    '# YOLO Detection Head',
    anchorComment,
    `# num_classes=${nc}, conf=${confThresh}, iou=${iouThresh}`,
    '',
    'class Detect(nn.Module):',
    `    # nc=${nc}, ch=(256, 512, 512)`,
    '    def __init__(self, nc, ch=(256, 512, 512)):',
    '        super().__init__()',
    '        self.nc = nc',
    '        self.nl = 3',
    '        self.no = nc + 5',
    '        self.m = nn.ModuleList(nn.Conv2d(c, self.no * 1, 1) for c in ch)',
    '',
    '    def forward(self, x):',
    '        for i in range(self.nl):',
    '            x[i] = self.m[i](x[i])',
    '        return x',
    '',
    'def non_max_suppression(prediction, conf_thres=0.25, iou_thres=0.45):',
    '    """Simplified NMS for detection post-processing."""',
    '    bs = prediction.shape[0]',
    '    nc = prediction.shape[2] - 5',
    '    xc = prediction[..., 4] > conf_thres',
    '    output = [torch.zeros(0, 6)] * bs',
    '    for xi, x in enumerate(prediction):',
    '        x = x[xc[xi]]',
    '        if not x.shape[0]:',
    '            continue',
    '        x[:, 5:] *= x[:, 4:5]',
    '        box, cls = x[:, :4], x[:, 5:].argmax(1, keepdim=True)',
    '        j = torch.cat((box, cls, x[:, 4:5]), 1)[x[:, 5:].max(1).values > conf_thres]',
    '        if j.shape[0]:',
    '            boxes, scores = j[:, :4], j[:, 4]',
    '            i = torchvision.ops.nms(boxes, scores, iou_thres)',
    '            i = i[:300]',
    '            output[xi] = j[i]',
    '    return output',
  ].join('\n');
};

// ---------------------------------------------------------------------------
// 训练流水线积木生成器
// ---------------------------------------------------------------------------

pythonGenerator.forBlock['yolo_dataset'] = function (block: Blockly.Block): string {
  const fmt = block.getFieldValue('format');
  const dataPath = block.getFieldValue('data_path');
  const batch = block.getFieldValue('batch_size');
  const workers = block.getFieldValue('num_workers');

  const formatMap: Record<string, string> = {
    yolo: 'YOLO',
    coco: 'COCO',
    voc: 'VOC',
  };

  return [
    `# 数据集配置 (${formatMap[fmt]} 格式)`,
    'data = {',
    `    "path": "${dataPath}",`,
    `    "format": "${fmt}",`,
    `    "batch": ${batch},`,
    `    "workers": ${workers},`,
    '}',
  ].join('\n');
};

pythonGenerator.forBlock['yolo_augment'] = function (block: Blockly.Block): string {
  const mosaic = block.getFieldValue('mosaic');
  const mixup = block.getFieldValue('mixup');
  const hsvH = block.getFieldValue('hsv_h');
  const flipud = block.getFieldValue('flipud');
  const scale = block.getFieldValue('scale');

  return [
    '# 数据增强配置',
    'augment = {',
    `    "mosaic": ${mosaic},`,
    `    "mixup": ${mixup},`,
    `    "hsv_h": ${hsvH},`,
    `    "flipud": ${flipud},`,
    `    "scale": ${scale},`,
    '}',
  ].join('\n');
};

pythonGenerator.forBlock['yolo_anchors'] = function (block: Blockly.Block): string {
  const mode = block.getFieldValue('anchor_mode');
  const evolve = block.getFieldValue('auto_evolve');

  const presetAnchors: Record<string, string> = {
    auto: '"auto"',
    preset_coco: '[[10,13,16,30,33,23],[30,61,62,45,59,119],[116,90,156,198,373,326]]',
    preset_voc: '[[9,11,16,26,21,16],[24,53,37,32,49,79],[89,66,123,104,152,171]]',
    custom: '[[8,12,16,20,28,24],[28,56,48,40,56,96],[96,72,132,112,168,184]]',
  };

  return [
    '# 锚框配置',
    `anchors = ${presetAnchors[mode]}`,
    `auto_evolve = ${evolve}`,
  ].join('\n');
};

pythonGenerator.forBlock['yolo_train_config'] = function (block: Blockly.Block): string {
  const epochs = block.getFieldValue('epochs');
  const lr = block.getFieldValue('learning_rate');
  const optimizer = block.getFieldValue('optimizer');
  const device = block.getFieldValue('device');

  return [
    '# 训练配置',
    'train_cfg = {',
    `    "epochs": ${epochs},`,
    `    "lr0": ${lr},`,
    `    "optimizer": "${optimizer}",`,
    `    "device": "${device}",`,
    '}',
  ].join('\n');
};

pythonGenerator.forBlock['yolo_nms'] = function (block: Blockly.Block): string {
  const conf = block.getFieldValue('conf_thres');
  const iou = block.getFieldValue('iou_thres');
  const maxDet = block.getFieldValue('max_det');

  return [
    '# NMS 后处理配置',
    'nms_cfg = {',
    `    "conf_thres": ${conf},`,
    `    "iou_thres": ${iou},`,
    `    "max_det": ${maxDet},`,
    '}',
  ].join('\n');
};

pythonGenerator.forBlock['yolo_inference'] = function (block: Blockly.Block): string {
  const source = block.getFieldValue('source');
  const conf = block.getFieldValue('conf');
  const imgSize = block.getFieldValue('img_size');

  return [
    '# YOLO 推理',
    `results = model.predict(source="${source}", conf=${conf}, imgsz=${imgSize})`,
    'for r in results:',
    '    r.show()',
  ].join('\n');
};

pythonGenerator.forBlock['yolo_map_eval'] = function (block: Blockly.Block): string {
  const iouThresholds = block.getFieldValue('iou_thresholds');

  return [
    '# mAP 评估',
    `metrics = model.val(iou="${iouThresholds}")`,
    'print(f"mAP50: {metrics.box.map50:.4f}")',
    'print(f"mAP50-95: {metrics.box.map:.4f}")',
  ].join('\n');
};

pythonGenerator.forBlock['yolo_export'] = function (block: Blockly.Block): string {
  const fmt = block.getFieldValue('export_format');
  const half = block.getFieldValue('half_precision');

  return [
    '# 导出模型',
    `model.export(format="${fmt}", half=${half.toLowerCase()})`,
    `print(f"模型已导出为 ${fmt} 格式")`,
  ].join('\n');
};

// ---------------------------------------------------------------------------
// generateYOLOCode：将整个工作区转为完整 YOLO 脚本
// ---------------------------------------------------------------------------

export function generateYOLOCode(workspace: Blockly.Workspace): string {
  const raw = pythonGenerator.workspaceToCode(workspace);
  if (!raw || raw.trim().length === 0) return '# 拖拽积木块生成代码\n';

  const header = [
    'import torch',
    'import torch.nn as nn',
    'import torchvision',
    '',
    "device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')",
    '',
  ].join('\n');

  const footer = [
    '',
    'if __name__ == "__main__":',
    '    print("YOLO model generated.")',
  ].join('\n');

  return header + '\n' + raw + footer;
}
