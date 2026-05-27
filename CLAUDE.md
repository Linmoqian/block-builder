# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install      # 安装前端依赖
npm run dev      # Vite 开发服务器 (端口 3000，host 0.0.0.0)
npm run build    # 生产构建
npm run preview  # 预览构建结果
npm run clean    # 清理 dist 目录
npm run lint     # TypeScript 类型检查 (tsc --noEmit)
cd app && python server.py # 启动后端服务器 (端口 8080，需先激活 conda 环境 x)
```

前端和后端需同时运行：前端 `npm run dev` + 后端 `cd app && python server.py`。

## Architecture

### 前后端双进程架构

前端 (Vite + React) 和后端 (Python HTTP 服务器) 通过 REST API 通信：

| 端点 | 方法 | 用途 |
|------|------|------|
| `/drag` | POST | 积木添加到画布时，后端在 `app/TmpSrc/sample.py` 追加对应 Python 代码 |
| `/delete` | POST | 积木删除时，后端移除对应代码行 |
| `/connect` | POST | 积木连接时通知后端 |
| `/run` | POST | 执行 `app/TmpSrc/sample.py`，返回运行结果 |
| `/read-file` | GET | 读取 `app/TmpSrc/sample.py` 内容供代码阅读器显示 |

后端通过全局字典 `block_print_map` 追踪每个积木 ID 到代码行号的映射，实现积木与代码的双向同步。

### Tech Stack
- **React 19** + **TypeScript** + **Vite 6** (前端)
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin)
- **Motion** (Framer Motion) - 拖拽和动画
- **Lucide React** - 图标库
- **Python stdlib HTTPServer** (后端，端口 8080)
- Conda 环境名：`x` (Python 3.11 + PyTorch)

### Project Overview

**神经网络工坊 (Block Builder)**：一个可视化积木拖拽编辑器。用户从左侧形状库拖拽积木到画布，每个积木对应一段 Python 代码。代码实时写入 `app/TmpSrc/sample.py`，可在右侧面板查看和运行。

### Source Structure

```
app/
├── server.py                    # Python 后端，处理拖拽/删除/连接/运行事件，维护 sample.py
├── index.html                   # Vite 入口 HTML
├── environment.yml              # Conda 环境配置
├── torch/                       # PyTorch 相关代码
├── TmpSrc/sample.py             # 积木生成的代码文件（前后端共享）
└── src/
    ├── App.tsx                  # 主应用 - 全部状态、拖拽逻辑、画布渲染（单体组件）
    ├── components/
    │   ├── BlockShape.tsx       # 7种积木形状的 CSS 渲染（clipPath + absolute positioning）
    │   ├── CodeHighlighter.tsx  # Python 语法高亮（自研 tokenizer，非第三方库）
    │   └── NetworkBlockCard.tsx # 网络层积木卡片
    ├── config/
    │   ├── codeTheme.ts         # 代码主题配色（Dark+/One Dark/GitHub Dark）+ Python 关键字表
    │   └── networkBlocks.ts     # 网络层积木配置
    ├── graph/
    │   └── codegen.ts           # PyTorch 代码生成
    ├── types.ts                 # BlockInstance、Connection、BlockTemplate 类型和常量
    ├── index.css                # 全局样式
    └── main.tsx                 # React 入口
```

### Frontend-Backend Communication

前端通过 `fetch` 调用后端 API（`http://localhost:8080`）：

| 端点 | 方法 | 触发时机 | 作用 |
|------|------|----------|------|
| `/drag` | POST | 新积木拖入画布 | 向 sample.py 追加 print 语句 |
| `/delete` | POST | 积木被删除 | 从 sample.py 移除对应行 |
| `/connect` | POST | 两个积木建立连接 | 终端输出连接信息 |
| `/run` | POST | 点击运行按钮 | 执行 sample.py |
| `/read-file` | GET | 每秒轮询 | 读取 sample.py 内容显示在右侧面板 |

后端使用 `__file__` 相对路径，可通过 `cd app && python server.py` 从任意位置启动。

后端用 `block_print_map` 字典跟踪每个积木 ID 到 sample.py 行号的映射。

### Key Concepts

**BlockInstance** - 画布上的积木实例，包含 `connectedTo` 字段记录连接关系。

**7种形状**: `square` | `rect-h` | `rect-v` | `circle` | `triangle` | `l-shape` | `t-shape`

**网格系统**: 24px 网格，`findSnapPosition()` 实现边缘吸附对齐（阈值 24px）。

**拖拽流程**: 模板积木使用 `dragSnapToOrigin`（松手回弹），画布积木使用自由拖拽。拖到侧边栏区域触发删除。

**代码同步**: 每种积木类型在 `server.py` 的 `PRINT_MAP` 中映射到一条 `print` 语句，拖入/删除时实时更新 sample.py。

### Motion Library Usage

- `drag` - 拖拽功能
- `dragSnapToOrigin` - 模板拖拽回弹
- `whileDrag` - 拖拽时的视觉效果 (scale, shadow)
- `AnimatePresence` - 进场/退场动画 (积木、侧边栏、右键菜单)

### Path Alias

`@/*` 映射到 `app/` 目录（在 vite.config.ts 和 tsconfig.json 中配置）。

## Notes

- 环境变量 `GEMINI_API_KEY` 在 vite.config.ts 中注入（当前未使用）
- AI Studio 环境下 `DISABLE_HMR=true` 禁用 HMR
- 左侧边栏宽度硬编码 320px（用于判断拖拽是否进入画布）
- 右侧边栏（代码阅读器）可拖拽调整宽度（280-600px）
- `TmpSrc/` 目录在 Vite watch 中被忽略
- Vite root 设为 `./app`，构建输出到 `../dist`
- App.tsx 是单体组件，所有状态和 UI 逻辑集中在一个文件中
