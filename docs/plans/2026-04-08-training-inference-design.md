# 训练与推理功能设计文档

## 概述

为神经网络工坊添加内置训练和推理体验。用户在工具内直接训练模型并查看实时反馈，支持单样本推理演示。训练通过本地 Python 后端（server.py）执行，前端 REST 轮询获取进度。

## 设计方案

**方案 A：REST 轮询** — 扩展现有 HTTPServer，前端每 500ms 轮询获取训练进度。不引入新依赖。

## 训练流程

```
用户组装网络 → 配置参数 → 点击训练
      ↓
POST /train/start { graph, config, dataset }
      ↓
后端生成训练脚本 → subprocess 启动
      ↓
训练脚本每 epoch 写入 metrics.jsonl
      ↓
GET /train/status 每 500ms 轮询 → 实时渲染曲线
      ↓
训练完成 → GET /train/result → 展示结果
```

## 后端 API

| 端点 | 方法 | 用途 |
|------|------|------|
| `/train/start` | POST | 提交计算图 + 训练配置，启动训练 |
| `/train/status` | GET | 获取当前训练进度和 metrics |
| `/train/stop` | POST | 中途停止训练 |
| `/inference` | POST | 上传样本，返回预测结果 |
| `/model/info` | GET | 获取模型摘要 |

## 训练配置

用户可配置：数据集（内置）、epochs、batch_size、学习率、设备（CPU/CUDA 自动检测）。

## 前端训练 UI

右侧边栏扩展为三个 tab：

**Tab 1: 代码阅读器** — 查看生成代码（现有）

**Tab 2: 训练**
- 配置区：数据集选择、epochs、batch_size、学习率
- 训练曲线：recharts 双 Y 轴折线图（loss + accuracy）
- 进度条：当前 epoch / 总 epochs
- 模型摘要：参数量、每层输出形状
- 控制按钮：开始/停止

**Tab 3: 推理**
- 图片上传区（拖拽/点击）
- top-5 预测结果（类别 + 置信度柱状图）
- 图片 + 预测标签叠加显示

## 训练状态管理

```typescript
type TrainState =
  | { status: 'idle' }
  | { status: 'configuring' }
  | { status: 'running', epoch: number, metrics: Metrics[] }
  | { status: 'completed', result: TrainResult }
  | { status: 'error', message: string }
```

## 内置数据集

| 数据集 | 类型 | 样本数 | 用途 |
|--------|------|--------|------|
| MNIST | 手写数字 | 60K+10K | 入门教学 |
| CIFAR-10 | 自然图像 | 50K+10K | 进阶学习 |

首次使用时后端自动下载到 `data/` 目录（torchvision 内置支持）。后续扩展自定义上传。

## 推理流程

```
用户上传图片 → POST /inference { image: base64 }
      ↓
后端预处理 → 模型前向传播 → 返回 top-5 预测
      ↓
前端展示预测结果
```

## 新增依赖

- 前端：`recharts`（训练曲线图，~40KB gzip）

## 数据目录结构

```
block-builder/
├── data/           # 数据集（自动下载）
├── TmpSrc/
│   ├── sample.py
│   └── train_tmp.py  # 生成训练脚本
├── models/saved/     # 训练好的模型权重
└── metrics/train.jsonl
```

## 与已有设计的关系

本设计建立在之前两份设计文档基础上：
- `2026-04-07-neural-network-visual-programming-design.md`：计算图和代码生成
- `2026-04-07-3d-migration-design.md`：3D 画布渲染

代码生成模块（`graph/codegen.ts`）将扩展，除了生成模型定义代码外，还需生成完整训练脚本。
