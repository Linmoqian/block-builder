# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install      # 安装依赖
npm run dev      # 开发服务器 (端口 3000，自动检测可用端口)
npm run build    # 生产构建
npm run preview  # 预览构建结果
npm run clean    # 清理 dist 目录
npm run lint     # TypeScript 类型检查 (tsc --noEmit)
```

## Architecture

### Tech Stack
- **React 19** + **TypeScript** + **Vite 6**
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin)
- **Motion** (Framer Motion) - 拖拽动画
- **Lucide React** - 图标库

### Core Structure

```
src/
├── App.tsx           # 主应用 - 所有状态和逻辑
├── components/
│   └── BlockShape.tsx # 形状渲染组件
├── types.ts          # 类型定义、模板、颜色
└── main.tsx          # 入口
```

### Key Concepts

**BlockInstance** - 画布上的积木实例：
```typescript
interface BlockInstance {
  id: string;       // 唯一标识
  type: ShapeType;  // 7种形状之一
  x: number;        // X坐标
  y: number;        // Y坐标
  color: string;    // 颜色值
  rotation: number; // 旋转角度 (0-360)
  zIndex: number;   // 层级
}
```

**7种形状**: `square` | `rect-h` | `rect-v` | `circle` | `triangle` | `l-shape` | `t-shape`

**网格系统**: 24px 网格，支持吸附对齐

**吸附逻辑**: `findSnapPosition()` 实现积木边缘对齐，阈值 24px

### BlockShape Component

接收 `type`, `color`, `size` 参数，使用 CSS (`clipPath`, `position: absolute`) 渲染不同形状。L型和T型由多个子 div 组合而成。

### Motion Library Usage

- `drag` - 拖拽功能
- `dragSnapToOrigin` - 模板拖拽回弹
- `whileDrag` - 拖拽时的视觉效果 (scale, shadow)
- `AnimatePresence` - 进场/退场动画

## Notes

- 环境变量 `GEMINI_API_KEY` 在 vite.config.ts 中注入 (当前未使用)
- AI Studio 环境下 `DISABLE_HMR=true` 会禁用 HMR
- 侧边栏宽度硬编码为 320px (用于判断拖拽是否进入画布)
