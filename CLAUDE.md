# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# git 规范

提交时，不能带有任何 AI 生成的消息。

## Commands

```bash
conda activate x                 # 激活 Python 环境
cd app                           # 进入应用目录
npm install                      # 安装前端依赖
npm run dev                      # Vite 开发服务器 (端口 3000，host 0.0.0.0)
npm run build                    # 生产构建（输出到 ../dist/）
npm run clean                    # 清理 dist 目录
npm run lint                     # TypeScript 类型检查 (tsc --noEmit)
npm run test                     # 运行前端测试 (vitest run)
npm run test:watch               # 前端测试 watch 模式 (vitest)
python server_fastapi.py         # 启动后端服务器 (端口 8080，FastAPI)
cd app && pytest tests/          # 运行后端测试 (pytest, 50 条)
cd app && pytest tests/ -m "not slow" -v  # 快速测试（跳过慢速集成测试）
cd app && pytest tests/test_validate.py -v -s  # 调试单个测试文件
python server.py                 # 启动后端服务器 (端口 8080，旧版回退)
```

前端和后端需同时运行，均在 `app/` 目录下：`npm run dev` + `python server_fastapi.py`。

## 环境配置

- Conda 环境配置：`environment.yml`（根目录）
- 安装：`conda env create -f environment.yml`
- 激活：`conda activate x`

## Architecture

### 前后端双进程架构

前端 (Vite + React) 和后端 (Python HTTP 服务器) 通过 REST API 通信（`http://localhost:8080`）：

| 端点 | 方法 | 触发时机 | 作用 |
|------|------|----------|------|
| `/drag` | POST | 积木拖入画布 | 向 `TmpSrc/sample.py` 追加代码行 |
| `/delete` | POST | 积木被删除 | 从 sample.py 移除对应行 |
| `/run?file=` | POST | 点击运行按钮 | 执行指定 py 文件，返回 stdout/stderr |
| `/read-file?file=` | GET | 每秒轮询 | 读取 py 文件内容显示在右侧面板 |
| `/export` | POST | 导出代码 | 将生成的 PyTorch 代码写入 `TmpSrc/network.py` |
| `/export-yaml` | POST | 导出 YAML | 将网络结构导出为 YOLO YAML 格式 |

后端通过全局字典 `block_print_map` 追踪每个积木 ID 到代码行号的映射。

### Tech Stack
- **React 19** + **TypeScript** + **Vite 6** (前端)
- **@xyflow/react** (React Flow) — 节点-连线画布编辑器
- **Zustand** — 状态管理（含 undo/redo、localStorage 持久化）
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin)
- **Vitest** — 前端单元测试
- **Motion** (Framer Motion) - 动画
- **Lucide React** - 图标库
- **js-yaml** - YAML 导入导出
- **FastAPI + Uvicorn** (后端，端口 8080)
- `app/server.py` — 旧版 HTTPServer 实现（保留作回退）
- Conda 环境名：`x` (Python 3.11 + PyTorch)

### 核心架构：React Flow 可视化图编辑器

项目已迁移到基于 React Flow 的节点-连线编辑模式。核心数据结构是 **Graph IR**（`neural/graph/types.ts`）：

```
GraphIR { nodes: GraphNode[], edges: GraphEdge[], metadata? }
```

每个节点实例 (`GraphNode`) 携带 `type`（模块名）和 `params`（参数字典）。边 (`GraphEdge`) 通过 `sourceHandle`/`targetHandle` 连接端口。

**模块注册表** (`neural/graph/registry.ts`) 定义 18 个模块，按类别分组：
- input: `Input`
- basic: `Conv`, `DWConv`, `BatchNorm2d`, `SiLU`, `MaxPool2d`, `Flatten`, `Linear`
- composite: `C2f`, `C3k2`, `SPPF`
- attention: `CBAM`, `C2PSA`, `CA`, `SimAM`
- head: `Detect`
- connector: `Upsample`, `Concat`

每个模块声明：参数定义 (`params`)、输入输出端口 (`inputs`/`outputs`)、形状推断函数 (`inferShape`)、可选的 `paramSummary`/`estimateParams`/`estimateFLOPs`。

**关键数据流**：
1. 用户从 `ModulePalette` 拖模块到画布 → 创建 React Flow 节点
2. 连线时形状推断引擎（`shapeInference.ts`）自动推断 tensor 形状传播
3. 右侧 `PropertiesPanel` 编辑节点参数 → 触发重新推断
4. 导出：`yamlExport.ts`（YOLO YAML）、`pytorchExport.ts`（PyTorch 代码）

**状态管理**：Zustand store（`store/graphStore.ts`）集中管理节点/边/选中状态/形状推断结果/验证错误，支持 undo/redo 和 localStorage 持久化。

### Source Structure

```
app/src/
├── App.tsx                          # 主应用，路由到 NeuralEditor 或 LegacyEditor
├── types.ts                         # 旧版类型（BlockInstance 等）
├── neural/                          # React Flow 图编辑器（主架构）
│   ├── NeuralEditor.tsx             # 主编辑器，画布 + 侧边栏 + 右侧面板 + 快捷键
│   ├── store/
│   │   └── graphStore.ts            # Zustand store（图状态、历史、UI、推断结果）
│   ├── components/
│   │   ├── ModulePalette.tsx        # 左侧模块拖拽面板
│   │   ├── PropertiesPanel.tsx      # 右侧参数编辑面板
│   │   ├── ShapeBadge.tsx           # 节点上的形状推断标签
│   │   ├── YamlPreview.tsx          # YAML 预览组件
│   │   └── nodes/BaseNode.tsx       # 自定义 React Flow 节点（参数摘要+形状流+类别边框）
│   ├── graph/
│   │   ├── types.ts                 # Graph IR 类型系统
│   │   ├── registry.ts             # 模块注册表（18 个模块定义）
│   │   ├── shapeInference.ts        # 形状推断引擎（拓扑排序 + 逐节点推断）
│   │   ├── validator.ts            # 图验证器（环检测、断连检查）
│   │   ├── yamlExport.ts           # Graph IR → YOLO YAML
│   │   ├── yamlImport.ts           # YAML → Graph IR
│   │   ├── pytorchExport.ts        # Graph IR → PyTorch 代码
│   │   ├── templates.ts            # PyTorch 辅助类模板字符串
│   │   ├── jsonIO.ts              # JSON 导入导出
│   │   ├── autoLayout.ts          # 自动布局算法
│   │   ├── presets.ts             # 预设模板（YOLOv8-nano, YOLO11-nano, YOLO26-nano）
│   │   └── modelStats.ts          # 参数量/FLOPs 估算与格式化
│   └── hooks/
│       ├── useGraphState.ts         # 图状态管理（nodes/edges CRUD）
│       ├── useGraphHistory.ts       # 撤销/重做（Ctrl+Z/Ctrl+Shift+Z）
│       ├── useGraphPersistence.ts   # localStorage 持久化
│       └── useShapeInference.ts     # 形状推断 hook
├── components/
│   ├── BlockShape.tsx              # 旧版积木形状 CSS 渲染
│   ├── CodeHighlighter.tsx         # Python 语法高亮
│   ├── LegacyEditor.tsx            # 旧版拖拽编辑器（保留）
│   └── NetworkBlockCard.tsx        # 旧版网络层积木卡片
├── config/
│   ├── codeTheme.ts                # 代码主题配色
│   └── networkBlocks.ts            # 旧版网络层积木配置
└── graph/
    └── codegen.ts                  # 旧版 PyTorch 代码生成
```

### Path Alias

`@/*` 映射到 `app/` 目录（在 app/vite.config.ts 和 app/tsconfig.json 中配置）。

## Notes

- CLAUDE.md 和 AGENTS.md 已加入 .gitignore
- TmpSrc/ 目录存放生成的代码文件，Vite watch 时被忽略
- 构建输出到项目根 `dist/`
- `src/components/` 和 `src/graph/` 下的文件为旧版架构，主架构在 `src/neural/` 下
- 测试文件在 `src/neural/graph/__tests__/` 下，使用 Vitest
- 快捷键：Ctrl+Z 撤销，Ctrl+Shift+Z 重做，Ctrl+S 保存，Ctrl+E 导出 YAML，Ctrl+D 复制选中节点
- 新增模块需同步修改：registry.ts（定义）→ yamlExport.ts/yamlImport.ts（YAML）→ pytorchExport.ts（PyTorch）→ presets.ts（如需预设）
