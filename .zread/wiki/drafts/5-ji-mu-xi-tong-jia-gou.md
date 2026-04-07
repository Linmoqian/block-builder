积木系统是本项目的核心功能模块，它实现了一个可视化拖拽式的代码生成环境。该系统基于 **数据驱动架构** 设计，前端通过 React 组件树管理积木状态，后端通过 Python HTTP 服务器监听事件并生成对应代码。系统架构分为四个核心层次：**数据模型层** 定义积木的数据结构，**视图渲染层** 负责七种形状的可视化呈现，**状态管理层** 处理拖拽、对齐、连接等交互逻辑，**通信协议层** 实现前后端事件同步与代码生成。这种分层设计确保了各模块的职责清晰，便于扩展新的积木类型或自定义生成逻辑。

## 整体架构概览

积木系统采用经典的前后端分离架构，前端基于 React 19 构建响应式界面，后端使用 Python http.server 提供轻量级事件监听服务。系统的核心设计理念是 **事件驱动** —— 每个用户交互（拖拽、删除、连接）都会触发前后端状态同步，最终映射为可执行的 Python 代码。

```mermaid
graph TB
    subgraph "前端层 Frontend Layer"
        A[用户交互<br/>User Interaction] --> B[React 状态管理<br/>State Management]
        B --> C[积木实例数据<br/>Block Instances]
        B --> D[视图渲染<br/>View Rendering]
        D --> E[BlockShape 组件<br/>Shape Components]
        D --> F[画布区域<br/>Canvas Area]
        C --> G[事件处理器<br/>Event Handlers]
    end
    
    subgraph "通信层 Communication Layer"
        G --> H{HTTP API<br/>REST Endpoints}
        H -->|POST /drag| I[拖拽事件<br/>Drag Event]
        H -->|POST /delete| J[删除事件<br/>Delete Event]
        H -->|POST /connect| K[连接事件<br/>Connect Event]
        H -->|GET /read-file| L[代码读取<br/>Code Read]
    end
    
    subgraph "后端层 Backend Layer"
        I --> M[Python HTTP 服务器<br/>HTTP Server]
        J --> M
        K --> M
        L --> M
        M --> N[事件映射表<br/>Event Mapping]
        N --> O[代码生成器<br/>Code Generator]
        O --> P[文件系统<br/>TmpSrc/sample.py]
        P --> Q[代码执行引擎<br/>Code Executor]
    end
    
    subgraph "数据层 Data Layer"
        C --> R[(类型定义<br/>types.ts)]
        N --> S[(积木映射表<br/>PRINT_MAP)]
        P --> T[(代码文件<br/>sample.py)]
    end
    
    style A fill:#e1f5ff
    style B fill:#fff4e6
    style M fill:#f3f4f6
    style O fill:#fef3c7
    style P fill:#dbeafe
```

Sources: [types.ts](src/types.ts#L1-L47), [App.tsx](src/App.tsx#L1-L93), [server.py](server.py#L1-L230)

## 核心数据模型

积木系统的数据模型通过 TypeScript 接口定义，包含三个核心实体：**ShapeType** 定义七种积木形状枚举，**BlockInstance** 描述画布上的积木实例完整状态，**BlockTemplate** 提供预设模板配置。这种强类型设计确保了数据一致性，同时为 IDE 提供完整的类型提示支持。

### 数据模型关系图

```mermaid
classDiagram
    class ShapeType {
        <<enumeration>>
        square
        rect-h
        rect-v
        circle
        triangle
        l-shape
        t-shape
    }
    
    class BlockInstance {
        +string id
        +ShapeType type
        +number x
        +number y
        +string color
        +number rotation
        +number zIndex
        +string[] connectedTo
    }
    
    class BlockTemplate {
        +ShapeType type
        +string label
        +string defaultColor
    }
    
    class Connection {
        +string from
        +string to
    }
    
    BlockInstance --> ShapeType: type
    BlockTemplate --> ShapeType: type
    Connection --> BlockInstance: references
    
    note for BlockInstance "积木实例包含位置、颜色、\n旋转角度、层级和连接关系"
    note for BlockTemplate "模板定义默认属性，\n用于左侧模板栏初始化"
```

### 数据模型详解

| 数据结构 | 用途 | 关键属性 | 使用场景 |
|---------|------|---------|---------|
| **ShapeType** | 形状枚举 | 7种预定义形状 | 类型约束、组件渲染分发 |
| **BlockInstance** | 积木实例 | id, type, x, y, color, rotation, zIndex, connectedTo | 画布状态管理、事件处理 |
| **BlockTemplate** | 模板配置 | type, label, defaultColor | 左侧模板栏初始化、新积木创建 |
| **Connection** | 连接关系 | from, to | 积木间依赖关系（预留功能） |

Sources: [types.ts](src/types.ts#L1-L47)

## 七种积木形状系统

系统定义了七种基础积木形状，每种形状对应特定的渲染逻辑和默认颜色配置。形状系统采用 **组合模式** —— BlockShape 组件根据 type 属性动态分发到对应的渲染分支，使用 CSS 技术实现形状绘制（clip-path、position absolute 组合等），避免使用 SVG 或 Canvas 以保持轻量级。

### 形状定义与渲染策略

```mermaid
graph LR
    A[BlockShape 组件] --> B{type 判断}
    B -->|square| C[正方形<br/>width=height=64px]
    B -->|rect-h| D[横向长方形<br/>width=96px height=48px]
    B -->|rect-v| E[纵向长方形<br/>width=48px height=96px]
    B -->|circle| F[圆形<br/>border-radius=50%]
    B -->|triangle| G[三角形<br/>clip-path polygon]
    B -->|l-shape| H[L型<br/>双 div 组合]
    B -->|t-shape| I[T型<br/>双 div 组合]
    
    C --> J[统一样式处理<br/>backgroundColor=color]
    D --> J
    E --> J
    F --> J
    G --> J
    H --> J
    I --> J
    
    J --> K[输出 DOM 元素]
    
    style A fill:#dbeafe
    style J fill:#fef3c7
    style K fill:#d1fae5
```

### 形状属性对照表

| 形状类型 | 中文名称 | 尺寸规格 (px) | 默认颜色 | 渲染技术 | 代码生成模板 |
|---------|---------|--------------|---------|---------|-------------|
| square | 正方形 | 64×64 | #3b82f6 (蓝) | 简单 div | print("我是正方形") |
| rect-h | 长方形(横) | 96×48 | #ef4444 (红) | 简单 div | print("我是长方形(横)") |
| rect-v | 长方形(纵) | 48×96 | #10b981 (绿) | 简单 div | print("我是长方形(纵)") |
| circle | 圆形 | 64×64 | #f59e0b (琥珀) | border-radius: 50% | print("我是圆形") |
| triangle | 三角形 | 64×64 | #8b5cf6 (紫) | clip-path: polygon | print("我是三角形") |
| l-shape | L型 | 64×64 | #ec4899 (粉) | 双 div absolute 定位 | print("我是L型") |
| t-shape | T型 | 64×64 | #06b6d4 (青) | 双 div absolute 定位 | print("我是T型") |

Sources: [types.ts](src/types.ts#L25-L33), [BlockShape.tsx](src/components/BlockShape.tsx#L11-L52), [server.py](server.py#L23-L31)

## 状态管理架构

应用状态采用 React Hooks 进行集中管理，核心状态包括 **积木实例数组**、**选中积木ID**、**网格显示状态**、**拖拽状态标志** 等十多个状态变量。状态更新遵循 **单向数据流** 原则 —— 用户交互触发事件处理器，处理器调用 setState 更新状态，状态变化触发组件重新渲染。这种架构确保了状态变化的可预测性和可调试性。

### 状态流转机制

```mermaid
stateDiagram-v2
    [*] --> Idle: 应用初始化
    
    Idle --> TemplateDragging: 从模板栏拖拽
    Idle --> BlockSelected: 点击积木
    Idle --> BlockDragging: 拖拽画布积木
    Idle --> ContextMenuOpen: 右键点击
    
    TemplateDragging --> BlockCreating: 释放到画布
    TemplateDragging --> Idle: 释放到无效区域
    
    BlockCreating --> BlockCreated: 添加新积木
    BlockCreated --> BackendSync: POST /drag
    BackendSync --> CodeGenerated: 写入 sample.py
    CodeGenerated --> Idle
    
    BlockDragging --> PositionUpdating: 释放积木
    PositionUpdating --> SnapCheck: 检查对齐
    SnapCheck --> GridAligned: 网格对齐
    SnapCheck --> BlockAligned: 积木对齐
    GridAligned --> Idle
    BlockAligned --> Idle
    
    BlockSelected --> BlockRotating: 旋转操作
    BlockSelected --> BlockDuplicating: 复制操作
    BlockSelected --> BlockDeleting: 删除操作
    BlockSelected --> Idle: 取消选中
    
    BlockDeleting --> BackendDelete: POST /delete
    BackendDelete --> CodeRemoved: 从文件删除
    CodeRemoved --> Idle
    
    ContextMenuOpen --> BlockConnecting: 连接模式
    BlockConnecting --> ConnectionEstablished: 选择目标积木
    ConnectionEstablished --> BackendConnect: POST /connect
    BackendConnect --> Idle
    
    BlockRotating --> Idle
    BlockDuplicating --> Idle
```

### 核心状态变量

| 状态变量 | 类型 | 初始值 | 用途说明 |
|---------|------|-------|---------|
| blocks | BlockInstance[] | [] | 画布上所有积木实例 |
| selectedId | string \| null | null | 当前选中积木的ID |
| showGrid | boolean | true | 网格显示开关 |
| nextZIndex | number | 1 | 下一个积木的层级值 |
| connectingFrom | string \| null | null | 连接模式下的源积木ID |
| contextMenu | object \| null | null | 右键菜单位置与目标ID |
| dragPositions | Record<string, {x,y}> | {} | 拖拽时的实时位置缓存 |
| codeContent | string | "print('Hello...')" | 右侧代码预览内容 |

Sources: [App.tsx](src/App.tsx#L28-L55)

## 拖拽交互与对齐机制

拖拽系统基于 Motion 动画库的 drag 控制器实现，支持两种拖拽场景：**模板拖拽** 从左侧模板栏创建新积木，**实例拖拽** 移动画布上的已有积木。对齐机制包含 **网格对齐**（24px 网格单元）和 **积木间吸附**（24px 阈值），确保积木在视觉上整齐排列，便于构建结构化布局。

### 拖拽对齐算法流程

```mermaid
flowchart TD
    A[拖拽开始] --> B{拖拽类型判断}
    
    B -->|模板拖拽| C[记录模板类型]
    B -->|实例拖拽| D[记录积木ID]
    
    C --> E[实时跟踪鼠标位置]
    D --> E
    
    E --> F{是否离开画布?}
    F -->|否| G[更新拖拽状态]
    G --> E
    
    F -->|是| H[拖拽释放]
    H --> I{释放位置判断}
    
    I -->|左侧边栏| J[删除积木<br/>POST /delete]
    I -->|画布区域| K[计算最终位置]
    
    K --> L{网格开关?}
    L -->|开启| M[网格对齐<br/>Math.round/24*24]
    L -->|关闭| N[积木间吸附检测]
    
    N --> O[遍历其他积木]
    O --> P{距离 < 24px?}
    P -->|是| Q[吸附到边缘]
    P -->|否| R[保持原位置]
    
    M --> S[创建/更新积木]
    Q --> S
    R --> S
    
    S --> T{新建积木?}
    T -->|是| U[通知后端<br/>POST /drag]
    T -->|否| V[更新前端状态]
    
    U --> W[后端生成代码]
    V --> X[拖拽结束]
    W --> X
    J --> X
    
    style A fill:#e0f2fe
    style S fill:#fef3c7
    style W fill:#d1fae5
    style X fill:#f3f4f6
```

### 对齐规则详解

| 对齐类型 | 触发条件 | 计算方式 | 优先级 |
|---------|---------|---------|--------|
| **网格对齐** | showGrid = true | Math.round(x/24)*24 | 高（网格开启时） |
| **左边缘吸附** | abs(x - other.x) < 24 | snappedX = other.x | 中 |
| **右边缘吸附** | abs((x+64) - other.x) < 24 | snappedX = other.x - 64 | 中 |
| **上边缘吸附** | abs(y - other.y) < 24 | snappedY = other.y | 中 |
| **下边缘吸附** | abs((y+64) - other.y) < 24 | snappedY = other.y - 64 | 中 |

Sources: [App.tsx](src/App.tsx#L95-L144), [App.tsx](src/App.tsx#L259-L328)

## 前后端通信协议

前后端通过 HTTP REST API 进行通信，采用 **事件溯源模式** —— 前端发送积木操作事件，后端根据事件类型映射为对应的 Python 代码片段。所有 API 请求均为异步，使用 fetch API 发送，失败时静默处理（catch 空函数）以保证用户体验流畅性。通信协议支持 CORS 跨域，允许前后端部署在不同端口。

### API 端点规范

```mermaid
sequenceDiagram
    participant F as 前端 React App
    participant B as 后端 HTTP Server
    participant FS as 文件系统
    participant E as Python 执行器
    
    Note over F,E: 积木拖拽流程
    F->>B: POST /drag {id, type, name}
    B->>B: 查询 PRINT_MAP 映射表
    B->>FS: 追加代码到 sample.py
    B->>B: 更新 block_print_map
    B-->>F: {"status": "ok"}
    
    Note over F,E: 代码读取流程
    F->>B: GET /read-file
    B->>FS: 读取 sample.py
    B-->>F: {"content": "...", "success": true}
    F->>F: 更新 codeContent 状态
    
    Note over F,E: 积木删除流程
    F->>B: POST /delete {id, name}
    B->>FS: 删除对应行
    B->>B: 更新其他行号
    B-->>F: {"status": "ok"}
    
    Note over F,E: 代码执行流程
    F->>B: POST /run
    B->>E: subprocess.run python
    E-->>B: stdout/stderr
    B-->>F: {stdout, stderr, returncode}
```

### API 接口定义

| 端点路径 | HTTP 方法 | 请求参数 | 响应格式 | 功能说明 |
|---------|----------|---------|---------|---------|
| /drag | POST | {id, type, name} | {"status": "ok"} | 添加积木，生成对应代码 |
| /delete | POST | {id, name} | {"status": "ok"} | 删除积木，移除对应代码行 |
| /connect | POST | {from: {type, name}, to: {type, name}} | {"status": "ok"} | 建立积木连接关系（预留） |
| /read-file | GET | - | {"content": "...", "success": bool} | 读取当前生成的代码文件 |
| /run | POST | - | {stdout, stderr, returncode} | 执行生成的 Python 代码 |

Sources: [App.tsx](src/App.tsx#L78-L93), [App.tsx](src/App.tsx#L164-L169), [App.tsx](src/App.tsx#L179-L187), [server.py](server.py#L70-L206)

## 组件渲染架构

前端组件采用 **单一职责原则** 设计，App.tsx 作为根组件管理全局状态和业务逻辑，BlockShape 作为纯展示组件负责形状渲染，CodeHighlighter 作为独立组件处理代码高亮显示。组件间通过 Props 传递数据和回调函数，避免紧耦合，提升可测试性和复用性。

### 组件依赖关系

```mermaid
graph TB
    subgraph "应用层 Application Layer"
        App[App.tsx<br/>根组件]
    end
    
    subgraph "组件层 Component Layer"
        BS[BlockShape.tsx<br/>形状渲染组件]
        CH[CodeHighlighter.tsx<br/>代码高亮组件]
    end
    
    subgraph "配置层 Config Layer"
        CT[codeTheme.ts<br/>代码主题配置]
    end
    
    subgraph "类型层 Type Layer"
        Types[types.ts<br/>类型定义]
    end
    
    subgraph "外部库 External Libraries"
        Motion[motion/react<br/>动画库]
        Lucide[lucide-react<br/>图标库]
        React[React 19<br/>UI 框架]
    end
    
    App --> BS
    App --> CH
    App --> Types
    App --> Motion
    App --> Lucide
    App --> React
    
    BS --> Types
    BS --> React
    
    CH --> CT
    CH --> React
    
    style App fill:#dbeafe
    style BS fill:#fef3c7
    style CH fill:#d1fae5
    style Types fill:#f3f4f6
```

Sources: [App.tsx](src/App.tsx#L1-L26), [BlockShape.tsx](src/components/BlockShape.tsx#L1-L52)

## 扩展性设计

积木系统架构采用 **开放-封闭原则**，系统对扩展开放，对修改封闭。扩展新积木类型只需三步：在 types.ts 的 ShapeType 枚举中添加新类型，在 BLOCK_TEMPLATES 数组中配置模板属性，在 BlockShape 组件的 switch 分支中添加渲染逻辑。后端代码生成映射表 PRINT_MAP 同样支持扩展，只需添加新的类型-代码映射条目。

### 扩展流程示意图

```mermaid
flowchart LR
    A[需求: 新增积木类型] --> B[1. 扩展类型定义<br/>types.ts]
    B --> C[2. 配置模板属性<br/>BLOCK_TEMPLATES]
    C --> D[3. 实现渲染逻辑<br/>BlockShape.tsx]
    D --> E[4. 添加代码映射<br/>server.py PRINT_MAP]
    E --> F[✓ 新积木可用]
    
    style A fill:#fef3c7
    style F fill:#d1fae5
```

Sources: [types.ts](src/types.ts#L1-L47), [BlockShape.tsx](src/components/BlockShape.tsx#L14-L51), [server.py](server.py#L23-L31)

## 后续学习路径

掌握了积木系统架构后，建议按以下顺序深入学习具体实现细节：

- **[七种积木形状](6-qi-chong-ji-mu-xing-zhuang)** - 详解每种形状的 CSS 渲染技术和设计考量
- **[网格对齐机制](7-wang-ge-dui-qi-ji-zhi)** - 深入对齐算法的数学原理和边界情况处理
- **[积木连接功能](8-ji-mu-lian-jie-gong-neng)** - 探索积木间依赖关系的建立与可视化
- **[主应用状态管理](10-zhu-ying-yong-zhuang-tai-guan-li)** - 学习 React Hooks 管理复杂状态的实践技巧
- **[拖拽交互实现](11-tuo-zhuai-jiao-hu-shi-xian)** - 掌握 Motion 动画库的拖拽控制高级用法