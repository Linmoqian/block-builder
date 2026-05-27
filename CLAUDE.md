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
python server.py                 # 启动后端服务器 (端口 8080)
```

前端和后端需同时运行，均在 `app/` 目录下：`npm run dev` + `python server.py`。

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

后端通过全局字典 `block_print_map` 追踪每个积木 ID 到代码行号的映射。使用 `__file__` 相对路径，可从任意目录启动。

### Tech Stack
- **React 19** + **TypeScript** + **Vite 6** (前端)
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin)
- **Motion** (Framer Motion) - 拖拽和动画
- **Lucide React** - 图标库
- **Python stdlib HTTPServer** (后端，端口 8080)
- Conda 环境名：`x` (Python 3.11 + PyTorch)

### Project Overview

**神经网络工坊 (Block Builder)**：一个可视化积木拖拽编辑器。用户从左侧形状库拖拽积木到画布，每个积木对应一段 Python 代码。代码实时写入 `TmpSrc/sample.py`，可在右侧面板查看和运行。

### Source Structure

```
app/                                # 应用目录（npm/python 命令均在此执行）
├── package.json                    # 前端依赖和脚本
├── vite.config.ts                  # Vite 配置
├── tsconfig.json                   # TypeScript 配置
├── index.html                      # Vite 入口 HTML
├── server.py                       # Python 后端
├── torch/                          # PyTorch 相关代码
├── TmpSrc/sample.py                # 积木生成的代码文件（前后端共享）
└── src/
    ├── App.tsx                     # 主应用 - 全部状态、拖拽逻辑、画布渲染（单体组件）
    ├── components/
    │   ├── BlockShape.tsx          # 积木形状的 CSS 渲染
    │   ├── CodeHighlighter.tsx     # Python 语法高亮（自研 tokenizer）
    │   └── NetworkBlockCard.tsx    # 网络层积木卡片
    ├── config/
    │   ├── codeTheme.ts            # 代码主题配色
    │   └── networkBlocks.ts        # 网络层积木配置
    ├── graph/
    │   └── codegen.ts              # PyTorch 代码生成
    ├── types.ts                    # BlockInstance、Connection、BlockTemplate 类型和常量
    ├── index.css                   # 全局样式
    └── main.tsx                    # React 入口
docs/                               # 文档
environment.yml                     # Conda 环境配置（根目录）
```

### Key Concepts

**积木类型** — 分两类：
- 基础形状（7种）：`square` | `rect-h` | `rect-v` | `circle` | `triangle` | `l-shape` | `t-shape`
- 网络层：`Linear` | `Conv2d` | `ReLU` | `Dropout` | `CrossEntropy` | `Adam` | `RandomData`

**BlockInstance** — 画布上的积木实例，包含 `connectedTo` 字段记录连接关系。`BLOCK_PORTS` 定义每种积木的端口约束（`maxInputs`/`maxOutputs`）。

**网格系统**: 24px 网格，`findSnapPosition()` 实现边缘吸附对齐（阈值 24px）。

**拖拽流程**: 模板积木使用 `dragSnapToOrigin`（松手回弹），画布积木使用自由拖拽。拖到侧边栏区域触发删除。

**连接逻辑**: 前端本地校验端口约束（`BLOCK_PORTS`），非法连接显示 Toast，不调用后端。

**代码同步**: 基础形状在 `server.py` 的 `PRINT_MAP` 中映射到 print 语句；网络层通过 `graph/codegen.ts` 生成 PyTorch 代码。

### Path Alias

`@/*` 映射到 `app/` 目录（在 app/vite.config.ts 和 app/tsconfig.json 中配置）。

## Notes

- 环境变量 `GEMINI_API_KEY` 在 vite.config.ts 中注入（当前未使用）
- AI Studio 环境下 `DISABLE_HMR=true` 禁用 HMR
- 左侧边栏宽度硬编码 320px（用于判断拖拽是否进入画布）
- 右侧边栏（代码阅读器）可拖拽调整宽度（280-600px）
- 构建输出到项目根 `dist/`，`TmpSrc/` 在 Vite watch 中被忽略
- App.tsx 是单体组件，所有状态和 UI 逻辑集中在一个文件中
