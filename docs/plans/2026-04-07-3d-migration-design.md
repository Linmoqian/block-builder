# 3D 化迁移设计文档

## 概述

将积木画布从 2D（Motion + CSS）迁移为全 3D（React Three Fiber），以获得更强的空间表达能力，支持展示复杂神经网络拓扑（跳跃连接、多分支、并行路径）。

## 决策背景

- **核心动机**：3D 空间表达能力（Z 轴层叠展示复杂拓扑）
- **交互需求**：完整 3D 交互（旋转、缩放、平移、拖拽）
- **运行环境**：浏览器优先
- **渐进复杂度**：从简单线性网络开始，逐步支持更复杂结构

## 技术方案：R3F 全 3D

### 新增依赖

| 包 | 用途 |
|---|------|
| `@react-three/fiber` | React Three.js 渲染器 |
| `@react-three/drei` | R3F 工具（OrbitControls, Text, Grid 等） |
| `three` | 3D 引擎核心 |

### 移除依赖

| 包 | 原因 |
|---|------|
| `motion` (framer-motion) | 3D 场景使用 raycasting 拖拽 |

### 保留不变

- React 19 + TypeScript + Vite 6
- Tailwind CSS（侧边栏、面板等 HTML UI）
- Lucide React（图标）
- 后端 server.py

## 渲染架构

R3F Canvas 只负责 3D 画布区域，侧边栏和面板保持 HTML/Tailwind：

```
<div className="flex h-screen">
  <aside>形状库 / 网络层</aside>
  <Canvas>
    <OrbitControls />
    <GridHelper />
    <ambientLight /> <directionalLight />
    <BlockMesh3D />
    <NetworkNode3D />
    <ConnectionTube3D />
  </Canvas>
  <aside>代码阅读器</aside>
</div>
```

## 3D 积木设计

### 形状积木

| 2D | 3D | 几何体 |
|----|-----|--------|
| square | 立方体 | BoxGeometry |
| rect-h | 扁平方块 | BoxGeometry |
| rect-v | 高方块 | BoxGeometry |
| circle | 球体 | SphereGeometry |
| triangle | 三棱锥 | ConeGeometry |
| l-shape | L 型方块 | Box 组合 |
| t-shape | T 型方块 | Box 组合 |

### 网络积木

- 半透明圆角长方体卡片
- 表面显示层名称（drei Text）
- 左侧输入端口（小圆柱），右侧输出端口
- 类别底色：层=蓝、激活=绿、损失=红、数据=黄

## 3D 交互

- **拖拽**：Raycasting 碰撞检测 + DragPlane 平面移动
- **连接**：端口拖出 → raycasting 检测目标端口 → 类型校验
- **相机**：OrbitControls（旋转/缩放/平移）+ 预设视角按钮
- **编辑模式**：点击积木时临时禁用轨道控制

## 文件结构

```
src/
├── App.tsx
├── components/
│   ├── canvas/
│   │   ├── Scene.tsx            # R3F Canvas 入口
│   │   ├── BlockMesh3D.tsx      # 形状积木 3D
│   │   ├── NetworkNode3D.tsx    # 网络积木 3D
│   │   ├── ConnectionTube3D.tsx # 3D 连接线
│   │   ├── DragControls3D.tsx   # 3D 拖拽
│   │   └── GridHelper3D.tsx     # 3D 网格
│   ├── sidebar/
│   │   ├── ShapeLibrary.tsx
│   │   └── NetworkLibrary.tsx
│   ├── CodeHighlighter.tsx
│   └── PropertyPanel.tsx
├── graph/
│   ├── types.ts
│   ├── validator.ts
│   ├── codegen.ts
│   └── topology.ts
├── config/
│   ├── codeTheme.ts
│   └── networkBlocks.ts
├── hooks/
│   └── useDrag3D.ts
├── types.ts
└── main.tsx
```

## 与神经网络设计的关系

上一轮 `2026-04-07-neural-network-visual-programming-design.md` 的设计保持有效：
- 积木体系、端口约束、计算图结构：不变
- 代码导出流程：不变
- 后端 API：不变
- 渲染层和交互层：从 2D 升级为 3D

## 迁移要点

- **保留**：侧边栏 UI、属性面板、代码阅读器
- **重写**：画布（Motion → R3F）、拖拽（2D → raycasting）、连接线（SVG → 3D 管道）
- **删除**：BlockShape.tsx → BlockMesh3D.tsx 替代
