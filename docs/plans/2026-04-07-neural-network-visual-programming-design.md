# 神经网络可视化编程 — 设计文档

## 概述

将"神经网络工坊"从积木拖拽编辑器扩展为神经网络可视化编程工具。保留现有形状积木功能，新增网络层积木体系，用户通过拖拽网络积木、连接端口构建计算图，确认后导出 PyTorch 代码。

## 目标用户

- **学习者/学生**：通过拖拽理解网络结构和数据流
- **开发者/研究人员**：快速搭建原型，导出可运行的 PyTorch 代码

## 设计方案

**方案 A：增强现有架构** — 在现有代码基础上扩展，网络积木与形状积木画布共存，计算图作为独立数据结构管理。

## 网络积木体系

### 四类积木

| 类别 | 积木示例 | 输入端口 | 输出端口 |
|------|---------|---------|---------|
| 层类型 | Linear, Conv2d, LSTM, Transformer | `tensor` | `tensor` |
| 激活/正则化 | ReLU, Sigmoid, Dropout, BatchNorm | `tensor` | `tensor` |
| 损失/优化器 | CrossEntropy, MSE, Adam, SGD | `tensor` + `labels` | `scalar` / `optimizer` |
| 数据处理 | DataLoader, Transform, Split | `data_source` | `tensor` |

### 端口类型约束

- `tensor` → `tensor`（层串联）
- `tensor` + `labels` → `scalar`（损失计算）
- `data_source` → `tensor`（数据加载）
- `scalar` → `optimizer`（优化步进）

## 计算图数据结构

```typescript
ComputationalGraph {
  nodes: Map<blockId, NetworkBlock>
  edges: Map<edgeId, Edge>
}

NetworkBlock {
  id: string
  blockType: 'layer' | 'activation' | 'loss' | 'data'
  operator: string
  params: Record<string, any>
  ports: { inputs: Port[], outputs: Port[] }
}

Edge {
  id: string
  from: { nodeId: string, portIndex: number }
  to: { nodeId: string, portIndex: number }
  type: 'tensor' | 'scalar' | 'optimizer' | 'data_source'
}
```

## 代码导出流程

1. **图验证**：未连接端口、类型不匹配、循环依赖
2. **拓扑排序**：按数据流方向排序
3. **代码生成**：遍历节点，生成 PyTorch 代码片段
4. **组装输出**：import + class Net + __init__ + forward + 训练循环模板

## UI 变更

- 左侧边栏新增 Tab：形状库 / 网络层
- 网络积木显示为带端口圆点的卡片（如 `Linear(784→128)`）
- 网络积木连接线为实线带箭头（区别于形状积木虚线）
- 端口拖拽：输出 → 匹配类型的输入，不匹配显示红色禁止

## 文件结构

```
src/
├── App.tsx                      # 主布局
├── components/
│   ├── BlockShape.tsx           # 形状积木（不变）
│   ├── CodeHighlighter.tsx      # 代码阅读器（不变）
│   ├── NetworkBlock.tsx         # 网络积木渲染（含端口）
│   ├── PortConnector.tsx        # 端口连接交互
│   ├── Sidebar/
│   │   ├── ShapeLibrary.tsx     # 形状库 tab
│   │   └── NetworkLibrary.tsx   # 网络积木库 tab
│   └── PropertyPanel.tsx        # 网络积木属性编辑
├── graph/
│   ├── types.ts                 # 计算图类型
│   ├── validator.ts             # 图验证
│   ├── codegen.ts               # PyTorch 代码生成
│   └── topology.ts              # 拓扑排序
├── config/
│   ├── codeTheme.ts             # 现有
│   └── networkBlocks.ts         # 网络积木注册表
└── types.ts                     # 扩展
```

## 分阶段实施

### Phase 1：基础框架
- graph/types.ts, config/networkBlocks.ts
- NetworkBlock.tsx, PortConnector.tsx, NetworkLibrary.tsx
- 画布支持网络积木与形状积木共存
- 先支持 6 个核心层：Linear, Conv2d, ReLU, Dropout, CrossEntropy, Adam

### Phase 2：代码生成
- validator.ts, topology.ts, codegen.ts
- 右侧面板"导出代码"按钮
- 后端 /export 端点

### Phase 3：打磨体验
- PropertyPanel.tsx 参数编辑
- 端口高亮、悬停反馈
- 教学模式提示
- 更多网络层（LSTM, Transformer, BatchNorm 等）
