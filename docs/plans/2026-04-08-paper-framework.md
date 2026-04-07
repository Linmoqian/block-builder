# 论文框架设计

## 基本信息

- **目标会议**：IEEE VIS（系统工具论文，Area 3: System & Rendering）
- **论文类型**：案例驱动论文，以 YOLO 解构为核心
- **评估方式**：纯设计分析（Case Study + Comparative Analysis + Expert Feedback）
- **页数限制**：正文 9 页 + 参考文献 2 页

## 建议标题

**NN-Workshop: Deconstructing Object Detection Models through Interactive 3D Block-based Visualization**

## 核心立点

**问题**：现代目标检测模型（如 YOLO）架构日益复杂——多尺度特征融合、跳跃连接、复合模块——但现有可视化工具无法帮助学习者交互式地解构和理解这些复杂拓扑。

**回答**：通过将网络层抽象为带类型约束端口的 3D 积木，用户可以在三维空间中直观观察多尺度融合拓扑，展开/折叠复合模块逐层理解，拖拽替换模块对比架构差异。

## 三个创新点（Contributions）

1. **3D 积木化表示法**：将神经网络层抽象为带类型约束端口（tensor/scalar/optimizer/data_source）的 3D 积木交互范式，支持多输入/多输出节点，使复杂网络拓扑在三维空间中可直观理解

2. **多粒度展开策略**：三级展开机制（折叠/展开/原子），解决复合模块（C2f/C3k2/SPPF）在可视化中"太复杂看不清"与"太简单看不到细节"的矛盾

3. **交互式架构探索**：通过积木拖拽替换和实时代码生成，用户可对比不同架构变体（如 YOLOv8 vs YOLOv11），降低架构理解门槛

## 叙事弧（主调）

**主基调**：从"理解困难"到"直观可探索"

1. **背景**：目标检测（YOLO 系列）是现代 AI 最重要的应用之一，架构复杂度快速增长
2. **不足**：论文图表静态/事后生成、教学工具只覆盖简单 CNN、模型查看器缺乏高层语义
3. **挑战**：复合模块表示、多尺度融合可视化、架构变体对比
4. **我们的工作**：NN-Workshop，3D 积木 + 类型约束端口 + 三级展开 + 积木替换
5. **贡献**：三个创新点
6. **案例预览**：以 YOLOv8/v11 为案例

## 章节结构

| 章节 | 页数 | 内容 |
|------|------|------|
| 1. Introduction | 1.5页 | 叙事弧 |
| 2. Related Work | 1页 | 架构可视化 / 教学工具 / 积木编程 |
| 3. Design Requirements | 0.5页 | YOLO 架构分析提炼的设计需求 |
| 4. NN-Workshop System | 2.5页 | 3D 积木模型、端口类型、展开策略、代码生成 |
| 5. Case Study: Deconstructing YOLO | 2页 | v8 解构 + v8→v11 模块替换对比 |
| 6. Discussion | 1页 | 可扩展性、局限、泛化性 |
| 7. Conclusion | 0.5页 | 总结 + 未来工作 |

## 评估策略（替代 User Study）

1. **Case Study**：详细 YOLOv8 → v11 解构过程，展示工具每项能力
2. **Comparative Analysis**：与 Net2Vis/Netron/CNN Explainer 功能对比
3. **Expert Feedback**：2-3 位 DL 研究者使用后反馈（非正式访谈）

## 参考范文

- Net2Vis (IEEE TVCG 2021) — 系统工具论文 + 专家评估
- GAN Lab (IEEE TVCG 2019) — 交互式教学工具 + Usage Scenario
- CNN Explainer (IEEE TVCG 2021) — 教学工具 + 用户评估
- VELCRO (J. Computational Science 2024) — 可视化编程工具

## 投稿时间线参考

IEEE VIS 通常每年 3 月截稿（摘要 3 月 21 日，全文 3 月 31 日）。
