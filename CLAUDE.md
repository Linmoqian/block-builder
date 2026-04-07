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
python server.py # 启动后端服务器 (端口 8080，需先激活 conda 环境 x)
```

前端和后端需同时运行：前端 `npm run dev` + 后端 `python server.py`。

## Architecture

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
src/
├── App.tsx                  # 主应用 - 全部状态、拖拽逻辑、画布渲染（单体组件）
├── components/
│   ├── BlockShape.tsx       # 7种积木形状的 CSS 渲染（clipPath + absolute positioning）
│   └── CodeHighlighter.tsx  # Python 语法高亮（自研 tokenizer，非第三方库）
├── config/
│   └── codeTheme.ts         # 代码主题配色（Dark+/One Dark/GitHub Dark）+ Python 关键字表
├── types.ts                 # BlockInstance、Connection、BlockTemplate 类型和常量
└── main.tsx                 # React 入口
server.py                    # Python 后端，处理拖拽/删除/连接/运行事件，维护 sample.py
TmpSrc/sample.py             # 积木生成的代码文件（前后端共享）
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

后端用 `block_print_map` 字典跟踪每个积木 ID 到 sample.py 行号的映射。

### Key Concepts

**BlockInstance** - 画布上的积木实例，包含 `connectedTo` 字段记录连接关系。

**7种形状**: `square` | `rect-h` | `rect-v` | `circle` | `triangle` | `l-shape` | `t-shape`

**网格系统**: 24px 网格，`findSnapPosition()` 实现边缘吸附对齐（阈值 24px）。

**拖拽流程**: 模板积木使用 `dragSnapToOrigin`（松手回弹），画布积木使用自由拖拽。拖到侧边栏区域触发删除。

**代码同步**: 每种积木类型在 `server.py` 的 `PRINT_MAP` 中映射到一条 `print` 语句，拖入/删除时实时更新 sample.py。

### Path Alias

`@/*` 映射到项目根目录（在 vite.config.ts 和 tsconfig.json 中配置）。

## Notes

- 环境变量 `GEMINI_API_KEY` 在 vite.config.ts 中注入（当前未使用）
- AI Studio 环境下 `DISABLE_HMR=true` 禁用 HMR
- 左侧边栏宽度硬编码 320px（用于判断拖拽是否进入画布）
- `TmpSrc/` 目录在 Vite watch 中被忽略
- App.tsx 是单体组件，所有状态和 UI 逻辑集中在一个文件中
