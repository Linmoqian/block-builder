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
- [ ] 撤销/重做
- [ ] 键盘快捷键
- [ ] 右侧 Tab 系统完善
