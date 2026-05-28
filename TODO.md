# TODO

## Phase 1: React Flow 基础 + 模块注册表 + 拖拽连线
- [x] 安装 @xyflow/react
- [x] Graph IR 类型系统
- [x] 模块注册表（8 个核心模块）
- [x] 图状态 Hook
- [x] 自定义节点组件
- [x] ModulePalette 侧边栏
- [x] NeuralEditor 主编辑器
- [x] 重构 App.tsx + 提取 LegacyEditor
- [x] 图验证器

## Phase 1b: 参数编辑 + JSON 持久化
- [x] PropertiesPanel 参数面板
- [x] JSON 导入导出
- [x] localStorage 持久化

## Phase 2: 形状推理 + 错误可视化
- [x] 形状推理引擎
- [x] ShapeBadge + 错误可视化
- [x] 集成到编辑器

## Phase 3: 代码生成（YOLO YAML + PyTorch）
- [x] YOLO YAML 导出
- [x] PyTorch 代码导出
- [x] YAML 预览组件
- [x] server.py /export-yaml 端点

## Phase 4: YAML 导入 + 预设模板
- [x] YAML 导入（js-yaml）
- [x] 自动布局算法
- [x] 预设模板（YOLOv8-nano）

## Phase 5: 体验打磨
- [x] 撤销/重做（Ctrl+Z / Ctrl+Shift+Z）
- [x] 键盘快捷键（Ctrl+S, Ctrl+E）
- [x] 右侧 Tab 系统（Properties | YAML）
- [x] Ctrl+Z 在 input 聚焦时正常工作
- [x] 撤销后保持节点选中状态
- [x] Detect 节点显示形状信息
- [x] 图加载后自动 fitView

## Phase 6: Tauri 桌面化
- [x] 集成 Tauri 2 框架（src-tauri/）
- [x] 自定义标题栏（窗口控制按钮集成到顶部栏）
- [x] 原生菜单栏（文件/编辑/视图）
- [x] 系统托盘（显示窗口/退出）
- [x] 关闭窗口隐藏到托盘
- [x] 原生文件对话框（保存/加载/导入/导出）
