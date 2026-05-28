# Apple 风格 UI 改进方案

## 一、现状问题诊断

通过完整的代码审查，确认以下具体问题：

### 1.1 字体尺寸混乱

在 `neural/components/` 下共发现：
- `text-[9px]`（错误提示、ShapeBadge、Badge）出现 15 次
- `text-[10px]`（标题标签、按钮文字、提示文案）出现约 30 次
- `text-[11px]`（ModulePalette 卡片标签、RightPanel Tab）出现 5 次
- `text-xs`（12px，标准表单标签、PropertiesPanel 标题）出现若干

没有清晰的层级关系，9px 和 10px 在视觉上几乎无法区分。

### 1.2 圆角不一致

`rounded-sm`(2px)、`rounded`(4px)、`rounded-md`(6px)、`rounded-lg`(8px)、`rounded-xl`(12px)、`rounded-t-[10px]`、`rounded-b-[10px]`、`rounded-full` — 共 **8 种**不同的圆角值在同一界面中出现。

### 1.3 颜色系统分裂

`zinc` 系列和 `gray` 系列混用。TrainingPanel.tsx 中全部使用 `gray-xxx`，其余组件使用 `zinc-xxx`。两者在 Tailwind 中是不同的色阶曲线，在 OKLCH 空间下尤其明显。

### 1.4 间距无层级

`py-1.5`、`py-2`、`py-2.5`、`py-3` 在类似上下文中交替使用。`gap-1`、`gap-1.5`、`gap-2`、`gap-3` 没有逻辑分层。

### 1.5 模块色彩饱和度

registry.ts 中 16 个模块使用了 16 种高饱和度色彩（`#10b981`、`#3b82f6`、`#8b5cf6`、`#f59e0b` 等），视觉上过于鲜艳。

### 1.6 视觉密度过高

大量使用 `text-[9px]` 和 `text-[10px]` 导致信息挤压，可读性差。

---

## 二、设计令牌体系（Design Token System）

### 2.1 排版量表（Typography Scale）

统一为 5 个层级，消除所有 `text-[9px]`、`text-[10px]`、`text-[11px]` 硬编码值。

| 令牌名称 | Tailwind v4 定义 | 尺寸 | 行高 | 字重 | 用途 | 当前对应 |
|----------|-----------------|------|------|------|------|----------|
| `--text-caption` | `font-size: 0.6875rem` | 11px | 1.4 | 500 | 辅助说明、提示、端口号 | text-[9px], text-[10px] |
| `--text-label` | `font-size: 0.75rem` | 12px | 1.5 | 600 | 参数标签、按钮文字、Tab | text-[11px], text-xs |
| `--text-body` | `font-size: 0.8125rem` | 13px | 1.5 | 400 | 正文内容、表单输入 | text-sm (14px) 微调 |
| `--text-heading` | `font-size: 0.875rem` | 14px | 1.4 | 700 | 面板标题、模块标题 | text-sm font-bold |
| `--text-display` | `font-size: 0.9375rem` | 15px | 1.3 | 700 | 侧边栏大标题 | text-base (16px) 微调 |

**最低字号不低于 11px**，彻底消除 9px 和 10px。

### 2.2 间距量表（Spacing Scale）

统一为 6 个核心值，消除 `gap-1.5`（6px）、`py-2.5`、`px-1.5` 等中间值。

| 令牌名称 | 值 | Tailwind 对应 | 用途 |
|----------|-----|--------------|------|
| `--space-1` | 4px | `gap-1` | 图标与文字间距 |
| `--space-2` | 8px | `gap-2` | 表单元素、列表项间距 |
| `--space-3` | 12px | `gap-3` | 分组间距 |
| `--space-4` | 16px | `gap-4` | 面板内边距 |
| `--space-5` | 20px | `gap-5` | 面板段落间距 |
| `--space-6` | 24px | `gap-6` | 区域分隔间距 |

### 2.3 圆角量表（Border Radius Scale）

从 8 种缩减为 3 种 + full。

| 令牌名称 | 值 | 用途 |
|----------|-----|------|
| `--radius-sm` | 6px | 输入框、Badge、小元素 |
| `--radius-md` | 10px | 卡片、节点、面板区块 |
| `--radius-lg` | 14px | 面板、对话框、浮层 |
| `--radius-full` | 9999px | 胶囊按钮、状态点 |

消除：`rounded-sm`(2px)、`rounded`(4px)、`rounded-lg`(8px)、`rounded-xl`(12px)。

### 2.4 色彩策略

**中性色统一为 zinc**：TrainingPanel.tsx 中所有 `gray-xxx` 替换为 `zinc-xxx`。

**背景色层级**：

| 层级 | 值 | 用途 |
|------|-----|------|
| bg-base | `white` | 主面板、节点背景 |
| bg-subtle | `zinc-50` | 次级面板、悬停态 |
| bg-muted | `zinc-100` | 禁用态、输入框背景 |
| bg-elevated | `white/80 backdrop-blur-xl` | 浮层面板 |
| bg-overlay | `zinc-900/80 backdrop-blur-sm` | 模态遮罩 |

### 2.5 阴影/层级体系（Elevation System）

| 层级 | CSS 值 | 用途 |
|------|--------|------|
| level-0 | `none` | 平面元素 |
| level-1 | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | 画布节点、卡片 |
| level-2 | `0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)` | 浮层面板、浮动按钮 |
| level-3 | `0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)` | 模态框、下拉菜单 |

阴影更柔和（alpha 值降低），模拟 Apple 的"浮动而非投射"感觉。

### 2.6 Tailwind v4 实现方案

在 `index.css` 的 `@theme inline` 块中扩展：

```css
@theme inline {
  /* 排版令牌 */
  --font-size-caption: 0.6875rem;   /* 11px */
  --font-size-label: 0.75rem;       /* 12px */
  --font-size-body: 0.8125rem;      /* 13px */
  --font-size-heading: 0.875rem;    /* 14px */
  --font-size-display: 0.9375rem;   /* 15px */

  /* 统一圆角 */
  --radius-sm: 0.375rem;    /* 6px */
  --radius-md: 0.625rem;    /* 10px */
  --radius-lg: 0.875rem;    /* 14px */

  /* 阴影令牌 */
  --shadow-elevation-1: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-elevation-2: 0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04);
  --shadow-elevation-3: 0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
}
```

---

## 三、布局改进

### 3.1 整体三栏布局

| 区域 | 当前宽度 | 改进宽度 | 变化说明 |
|------|---------|---------|---------|
| 左侧栏 | 256px (w-64) | 240px (w-60) | 稍微收窄，减少视觉权重 |
| 画布 | flex-1 | flex-1 | 保持 |
| 右侧面板 | 320px (w-80) | 300px (w-[300px]) | 稍微收窄 |

### 3.2 左侧栏内部改进

- 面板标题区域：`px-4 py-3` → `px-5 py-4`，边框 `border-zinc-100` → `border-zinc-100/60`
- 底部按钮区域：`px-4 py-3` → `px-5 py-4`，`space-y-2` → `space-y-3`
- 按钮组 `gap-2` → `gap-3`

### 3.3 右侧面板改进

- Tab 文字：`text-[11px]` → `text-label`（12px）
- Tab 激活态：取消每个 Tab 不同颜色（蓝/绿/琥珀），统一为 `text-zinc-900 + border-b-2 border-zinc-900`
- 面板内容区：`p-4 space-y-4` → `p-5 space-y-5`

### 3.4 画布区域改进

- 顶部提示条：`shadow-lg` → `shadow-elevation-2`
- `bg-white/80 backdrop-blur-md` → `bg-white/70 backdrop-blur-xl`
- `border-zinc-200` → `border-zinc-200/50`
- 背景网格点：`size={1}` → `size={0.8}`

---

## 四、组件级改进

### 4.1 ModulePalette（模块面板）

| 元素 | 当前 | 改进后 |
|------|------|--------|
| 分类标题 | `text-[10px] font-bold zinc-400 uppercase tracking-widest` | `text-caption font-semibold zinc-400 uppercase tracking-wider` |
| 卡片内边距 | `px-3 py-2.5` | `px-3 py-3` |
| 卡片圆角 | `rounded-lg`(8px) | `rounded-md`(10px) |
| 卡片背景 | `bg-zinc-50 border-zinc-100` | `bg-zinc-50/80 border-zinc-100/60` |
| 悬停态 | `hover:border-blue-400 hover:bg-blue-50` | `hover:border-zinc-300 hover:bg-zinc-100` |
| 颜色圆点 | `w-3 h-3` | `w-2.5 h-2.5` |
| 模块文字 | `text-[11px] font-semibold zinc-700` | `text-label font-medium zinc-600` |
| 网格间距 | `gap-2` | `gap-3` |
| 分类间距 | `space-y-4` | `space-y-5` |

### 4.2 BaseNode（画布节点）

| 元素 | 当前 | 改进后 |
|------|------|--------|
| 容器 | `bg-white rounded-xl shadow-md border-2` | `bg-white rounded-md shadow-elevation-1 border border-zinc-200/80` |
| 选中态边框 | `border-blue-500` (border-2) | `border-blue-500/60`（border，更细更柔） |
| 错误态边框 | `border-red-500` (border-2) | `border-red-400/60`（border，更细更柔） |
| 头部色块透明度 | `color + '18'`（~10%） | `color + '0D'`（~5%，更淡） |
| 头部圆点 | `w-2.5 h-2.5` | `w-2 h-2` |
| 头部文字 | `text-xs font-bold zinc-700` | `text-label font-semibold zinc-600` |
| 形状区域 | `text-[10px] zinc-500` | `text-caption zinc-400` |
| 最小宽度 | `min-w-[140px]` | `min-w-[160px]` |
| Handle 尺寸 | `width:10 height:10` | `width:8 height:8` |
| 过渡 | `transition-colors` | `transition-all duration-200` |
| 选中态新增 | 无 | `ring-2 ring-blue-500/20` 外发光 |

### 4.3 ShapeBadge（形状标签）

| 元素 | 当前 | 改进后 |
|------|------|--------|
| 正常态 | `text-[9px] zinc-500 bg-zinc-50 rounded border-zinc-100` | `text-caption zinc-400 bg-zinc-50/60 rounded-md border-zinc-100/40` |
| 错误态 | `text-[9px] red-600 bg-red-50 rounded border-red-200` | `text-caption red-400 bg-red-50/60 rounded-md border-red-200/40` |
| 内边距 | `px-1.5 py-0.5` | `px-2 py-0.5` |

### 4.4 PropertiesPanel（属性面板）

| 元素 | 当前 | 改进后 |
|------|------|--------|
| 标题区 | `text-sm font-bold zinc-700` | `text-heading font-bold zinc-700` |
| 参数标签 | `text-[10px] font-bold zinc-500 uppercase` | `text-caption font-semibold zinc-400 uppercase` |
| 错误提示 | `text-[9px] red-500` | `text-caption red-400` |
| 范围提示 | `text-[9px] zinc-400` | `text-caption zinc-300` |
| 端口标题 | `text-[10px] font-bold zinc-400 uppercase` | `text-caption font-semibold zinc-400 uppercase` |
| 分隔线 | `border-t border-zinc-100` | `border-t border-zinc-100/60` |
| 参数间距 | `space-y-3` | `space-y-4` |
| 整体内边距 | `p-4 space-y-4` | `p-5 space-y-5` |

### 4.5 YamlPreview（YAML 预览）

| 元素 | 当前 | 改进后 |
|------|------|--------|
| 外层 Card | `bg-zinc-900 border-zinc-700 rounded-none` | 去掉 Card 包裹，直接 `bg-zinc-950 h-full` |
| 头部 | `bg-zinc-800 px-3 py-2` | `bg-zinc-900 px-4 py-2.5` |
| 复制按钮 | `text-[10px] zinc-300 bg-zinc-700` | `text-caption zinc-400 bg-zinc-800 rounded-md` |
| 编辑器字号 | `fontSize: 11` | `fontSize: 12` |
| 编辑器 padding | `padding: { top: 12 }` | `padding: { top: 16 }` |

### 4.6 ErrorPanel（错误面板）

| 元素 | 当前 | 改进后 |
|------|------|--------|
| 展开列表背景 | `bg-white/95 backdrop-blur-md shadow-lg` | `bg-white/90 backdrop-blur-xl shadow-elevation-3` |
| 边框 | `border-zinc-200` | `border-zinc-200/50` |
| 错误项 | `px-3 py-2` | `px-4 py-3` |
| 错误 Badge | `text-[9px]` | `text-caption` |
| 错误信息 | `text-[10px] zinc-600` | `text-caption zinc-500` |
| 底部按钮 | `bg-white/80 backdrop-blur-md shadow-sm` | `bg-white/70 backdrop-blur-xl shadow-elevation-2` |

### 4.7 TrainingPanel（训练面板）

| 元素 | 当前 | 改进后 |
|------|------|--------|
| 全部颜色 | `gray-xxx` | 统一替换为 `zinc-xxx` |
| 选择器圆角 | `rounded-xl`(12px) | `rounded-md`(10px) |
| 输入框圆角 | `rounded-lg`(8px) | `rounded-md`(10px) |
| 配置区内边距 | `p-3 space-y-2` | `p-4 space-y-3` |
| 控制栏 | `px-4 py-2.5` | `px-5 py-3` |

### 4.8 TrainDashboard（训练仪表盘）

| 元素 | 当前 | 改进后 |
|------|------|--------|
| MetricCard 标签 | `text-[10px] gray-400` | `text-caption zinc-500` |
| 结果摘要文字 | `text-[11px] gray-400` | `text-label zinc-400` |
| 日志文字 | `text-[10px] gray-500 font-mono` | `text-caption zinc-500 font-mono` |

---

## 五、模块色彩策略

### 5.1 分类级别降饱和

不在 registry.ts 中修改原始颜色定义，而是在 UI 层通过透明度和尺寸控制视觉软化。

| 分类 | 当前色 | 展示策略 |
|------|--------|---------|
| input | `#10b981` (emerald-500) | 分类标题用 `-300` 色阶 |
| basic | `#3b82f6` (blue-500) | 分类标题用 `-300` 色阶 |
| composite | `#8b5cf6` (violet-500) | 分类标题用 `-300` 色阶 |
| attention | `#f97316` (orange-500) | 分类标题用 `-300` 色阶 |
| head | `#ef4444` (red-500) | 分类标题用 `-300` 色阶 |
| connector | `#ec4899` (pink-500) | 分类标题用 `-300` 色阶 |

### 5.2 UI 层调整

- **BaseNode 头部背景**：从 `color + '18'`（~10%）降到 `color + '0D'`（~5%）
- **ModulePalette 圆点**：从 `w-3 h-3` 缩为 `w-2.5 h-2.5`
- **MiniMap**：节点颜色通过 CSS `opacity: 0.7` 降饱和

---

## 六、动画与交互改进

### 6.1 过渡动画统一

| 交互场景 | 当前 | 改进 |
|----------|------|------|
| 按钮悬停 | `transition-colors` | `transition-all duration-150` |
| 卡片悬停 | `transition-colors` | `transition-all duration-200` |
| 面板出现 | 无 | `motion.div` fade-in + slide-up, 200ms |
| Tab 切换 | 无动画 | `AnimatePresence` + `opacity + translateY(4px)` |
| 节点选中 | `transition-colors` | `transition-all duration-200` + ring 扩散 |

### 6.2 微交互建议

1. **模块卡片拖拽**：拖起时 `scale(1.02)` + `shadow-elevation-2`，放下时恢复
2. **节点连接反馈**：连接成功时 Handle 短暂 `scale` 脉冲动画
3. **输入框聚焦**：`border-zinc-400` + `shadow-[0_0_0_3px_rgba(59,130,246,0.1)]` 外发光
4. **Toast 提示**：复制成功后从右侧滑入轻量 Toast

---

## 七、实施优先级与分期计划

### Phase 1：设计令牌基础层（影响最大，工作量中等）

**预计工作量**：2-3 天

1. 修改 `index.css`：在 `@theme inline` 中添加排版、圆角、阴影令牌定义
2. 统一 `gray` → `zinc`：TrainingPanel.tsx、TrainDashboard.tsx 批量替换
3. 统一圆角：消除 `rounded-sm`、`rounded`(无后缀)、`rounded-xl`
4. 统一最低字号：`text-[9px]` → `text-caption`，`text-[10px]` → `text-caption`，`text-[11px]` → `text-label`

**涉及文件**：
- `app/src/index.css`
- `app/src/neural/components/TrainingPanel.tsx`
- `app/src/neural/components/TrainDashboard.tsx`
- 所有 `neural/components/` 下的 `.tsx` 文件

### Phase 2：核心组件改造（视觉效果最明显）

**预计工作量**：3-4 天

1. BaseNode 重构：降低边框、调整阴影、缩小 Handle、统一圆角
2. ModulePalette 重构：增加间距、缩小色彩指示器、降低悬停对比度
3. RightPanel Tab 统一：取消每 Tab 不同颜色，统一单色调
4. PropertiesPanel 间距调整：增加段落间距和内边距

**涉及文件**：
- `app/src/neural/components/nodes/BaseNode.tsx`
- `app/src/neural/components/ModulePalette.tsx`
- `app/src/neural/components/RightPanel.tsx`
- `app/src/neural/components/PropertiesPanel.tsx`

### Phase 3：面板与浮层优化（提升整体品质感）

**预计工作量**：2 天

1. ErrorPanel 玻璃态优化：统一 `backdrop-blur-xl`，减淡边框
2. YamlPreview 精简：去掉 Card 嵌套
3. 画布浮动提示条优化：降低透明度，增强模糊
4. ShapeBadge 可读性：增加字号到 11px

**涉及文件**：
- `app/src/neural/components/ErrorPanel.tsx`
- `app/src/neural/components/YamlPreview.tsx`
- `app/src/neural/components/ShapeBadge.tsx`
- `app/src/neural/NeuralEditor.tsx`

### Phase 4：动画与交互增强（锦上添花）

**预计工作量**：2 天

1. Tab 切换动画：RightPanel 增加 `AnimatePresence`
2. 卡片拖拽动画：ModulePalette 增加 scale/shadow 反馈
3. 节点连接反馈：Handle 脉冲动画
4. Toast 通知：替换"已复制"按钮文字

**涉及文件**：
- `app/src/neural/components/RightPanel.tsx`
- `app/src/neural/components/ModulePalette.tsx`
- `app/src/neural/components/nodes/BaseNode.tsx`

---

## 八、关键设计决策说明

### 为何统一 Tab 为单色调

Apple 的 Tab 设计（macOS Finder 偏好设置、iOS 设置）从不为不同 Tab 使用不同强调色。当前方案中"属性"蓝色、"YAML"绿色、"训练"琥珀色，增加了视觉噪音。统一后通过图标或文字区分 Tab 内容。

### 为何最低字号定为 11px

面向专业用户的开发工具，信息密度有一定需求。11px 作为辅助文字可接受，9px 和 10px 在高 DPI 屏幕上太小且视觉上无法区分。

### 为何不修改 registry.ts 颜色定义

颜色字段被 BaseNode、MiniMap、PropertiesPanel 等多处引用，修改底层定义风险较大。通过 UI 层控制透明度和尺寸来实现视觉软化更安全。

### 为何用 backdrop-blur-xl

Apple 的毛玻璃效果通常使用较强模糊值（约 20-30px），`backdrop-blur-xl`（24px）更接近这一标准。同时降低背景不透明度（80% → 70%），让模糊效果更明显。
