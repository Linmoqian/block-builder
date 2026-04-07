Block Builder 项目的代码高亮显示组件是一个**轻量级、零依赖的 Python 语法高亮引擎**，采用自定义词法分析器实现，不依赖第三方高亮库（如 Prism.js 或 Highlight.js），在保持体积最小化的同时提供完整的 Python 语法支持。该组件作为**实时代码预览系统的核心渲染层**，将后端同步的 Python 源码转换为具有语法着色的可读格式，并通过主题系统支持多种视觉风格切换。

## 组件架构概览

代码高亮显示系统采用**三层架构设计**：词法分析层负责将源码文本转换为语义化 Token 序列，主题配置层定义各语法元素的颜色映射规则，组件渲染层将 Token 流转换为带样式的 React 元素树。这种分层架构实现了**关注点分离**——词法分析逻辑、视觉主题配置、UI 渲染逻辑三者独立演进，便于单独测试和扩展。核心组件 `CodeHighlighter` 接收原始代码字符串，经过 `tokenizePython` 函数解析为 Token 数组，再通过 `getTokenColor` 函数查询主题配置获取颜色值，最终渲染为带有行号和语法着色的代码块。

Sources: [CodeHighlighter.tsx](src/components/CodeHighlighter.tsx#L1-L57), [codeTheme.ts](src/config/codeTheme.ts#L1-L45)

## 词法分析器实现原理

`tokenizePython` 函数实现了**基于状态机的词法分析算法**，通过单指针扫描（`i` 变量）遍历源码字符串，根据当前字符特征进入不同的解析分支。该分析器识别 **9 种 Token 类型**：`keyword`（Python 保留关键字）、`builtin`（内置函数）、`string`（字符串字面量）、`number`（数字常量）、`comment`（注释）、`function`（函数调用标识符）、`operator`（运算符）、`punctuation`（标点符号）、`variable`（普通变量名）。扫描过程采用**最长匹配原则**——对于可能存在歧义的字符序列（如 `==` 既可以解析为两个 `=` 操作符，也可以解析为一个 `==` 操作符），算法会贪婪地匹配最长的合法 Token。

词法分析器的核心逻辑通过**字符分类和前瞻检查**实现上下文敏感的识别。例如，对于标识符类型判断，算法首先提取完整的标识符字符串，然后依次检查是否属于 `pythonKeywords` 列表（关键字）、`pythonBuiltins` 列表（内置函数），若均不匹配则通过正则表达式 `/^\s*\(/` 进行前瞻，判断该标识符后是否跟随左括号以区分**函数调用**（`function` 类型）和**变量引用**（`variable` 类型）。字符串解析支持转义序列处理，当遇到反斜杠时会跳过下一个字符（处理 `\'`、`\"`、`\n` 等转义）。注释解析从 `#` 字符开始一直扫描到行尾。数字解析支持十六进制表示法（通过 `/[\d.xXa-fA-F]/` 字符集匹配）。

Sources: [CodeHighlighter.tsx](src/components/CodeHighlighter.tsx#L82-L188)

## 主题系统设计

主题配置通过 `CodeTheme` 接口定义了 **17 个语义化颜色属性**，覆盖从基础文本到特殊语法的完整色彩体系。该设计借鉴了**VS Code 主题架构**的语义命名规范，将颜色属性按功能分组：基础颜色（`background`、`foreground`、`lineNumber`）、控制流关键字（`keyword`、`keywordControl`）、函数相关（`function`、`functionCall`）、字面量（`string`、`stringEscape`、`number`）、元数据（`comment`、`decorator`）、标识符（`variable`、`parameter`、`className`、`builtin`）、符号（`operator`、`punctuation`）。这种**语义化命名**（semantic naming）策略确保主题可跨编辑器迁移，并支持未来扩展新语法元素而无需重构现有主题。

项目预置了**三套成熟主题**：`darkPlusTheme`（VS Code 默认深色主题，紫红色关键字配橙色字符串）、`oneDarkTheme`（Atom 风格主题，紫色调关键字配绿色字符串）、`githubDarkTheme`（GitHub 深色主题，红色关键字配蓝色字符串）。每套主题均经过**对比度优化**，确保在深色背景（`#1e1e1e` 至 `#0d1117` 范围）上的可读性符合 WCAG AA 标准。主题切换通过 `theme` prop 实现，组件默认使用 `defaultTheme`（指向 `darkPlusTheme`），调用方可传入自定义主题对象实现完全定制化。

Sources: [codeTheme.ts](src/config/codeTheme.ts#L50-L159)

## 组件 API 与渲染流程

`CodeHighlighter` 组件暴露**三个 props**：`code`（必需，接收待高亮的源码字符串）、`theme`（可选，接收 `CodeTheme` 对象，默认为 `defaultTheme`）、`showLineNumbers`（可选，布尔值控制是否显示行号，默认为 `true`）。组件采用**逐行渲染策略**：首先通过 `code.split('\n')` 将源码分割为行数组，然后对每行调用 `highlightLine` 函数进行 Token 化和着色处理。这种设计避免了**大文件全量解析**的性能问题——即使代码有数千行，也仅在渲染时按需处理可见行。

渲染输出结构为**语义化 HTML**：外层 `<pre>` 元素包裹代码块，内部每行代码包裹在 `<div>` 中实现 Flexbox 布局。行号通过 `<span>` 元素渲染，固定宽度 `w-8`（2rem），右对齐并添加 `pr-3` 右内边距，颜色使用 `theme.lineNumber`。代码内容通过 `highlightLine` 返回的 `<span>` 数组渲染，每个 Token 对应一个带内联样式（`style={{ color }}`）的 span 元素。空行处理通过 `\u00A0`（不间断空格）实现，确保空行仍占据垂直空间。组件应用了 Tailwind CSS 类 `leading-relaxed`（增加行高提升可读性）、`whitespace-pre-wrap`（保留空白并允许换行）、`break-all`（长字符串断行）。

Sources: [CodeHighlighter.tsx](src/components/CodeHighlighter.tsx#L9-L57)

## 实际应用场景

在 Block Builder 主应用中，`CodeHighlighter` 组件被集成于**右侧代码预览面板**，作为实时反馈循环的关键环节。App 组件通过 `setInterval` 机制每秒向后端 `/read-file` 端点发起请求，获取最新生成的 Python 代码内容并存储于 `codeContent` 状态。该状态作为 `code` prop 传递给 `CodeHighlighter`，触发组件重新渲染以反映最新代码。面板顶部显示文件标签（`main.py` + `Python` 语言标识），底部提供**运行按钮**（调用 `/run` 端点执行代码）和**复制按钮**（将代码写入剪贴板）。

右侧面板实现了**可调整宽度**功能：用户可通过拖拽左侧边缘的 1px 手柄（`w-1`）动态调整面板宽度（280px 至 600px 范围）。面板容器应用了 `motion.aside` 组件实现平滑展开/收起动画（`duration: 0.3s`），通过 `AnimatePresence` 管理卸载动画。代码区域使用 `bg-zinc-900` 深色背景配合 `overflow-auto` 实现滚动，字体设置为 `font-mono text-sm` 确保等宽显示。这种集成方案实现了**可视化编程与文本代码的无缝连接**——用户在画布拖拽积木时，右侧面板实时展示生成的 Python 代码，形成即时视觉反馈。

Sources: [App.tsx](src/App.tsx#L38-L93), [App.tsx](src/App.tsx#L777-L818)

## 扩展与定制指南

扩展代码高亮系统支持**三个维度**：添加新语言支持、创建自定义主题、增强 Token 类型。添加新语言需在 `codeTheme.ts` 中定义该语言的关键字和内置函数列表（参考 `pythonKeywords` 和 `pythonBuiltins` 数组），然后在 `CodeHighlighter.tsx` 中创建新的 tokenize 函数（如 `tokenizeJavaScript`），并在组件内部根据语言类型选择对应的 tokenizer。创建自定义主题需实现完整的 `CodeTheme` 接口，建议从现有主题复制后修改颜色值，确保所有 17 个属性均有定义。

增强 Token 类型需扩展 `TokenType` 联合类型（添加如 `'decorator'`、`'className'` 等新类型），在 `CodeTheme` 接口中添加对应的颜色属性，更新 `tokenizePython` 函数的解析逻辑以识别新语法结构，最后在 `getTokenColor` 的 switch 语句中添加新分支。对于**性能优化**，可考虑引入虚拟滚动（Virtual Scrolling）技术处理超大文件（仅渲染可视区域内的行），或添加 memoization 缓存 Token 解析结果避免重复计算。当前实现的**复杂度为 O(n)**（n 为源码长度），对于典型 Python 文件（<1000 行）性能已足够，但对于 MB 级文件可能需要引入增量解析机制。

Sources: [CodeHighlighter.tsx](src/components/CodeHighlighter.tsx#L67-L77), [codeTheme.ts](src/config/codeTheme.ts#L164-L185)

## 与其他组件的协作关系

`CodeHighlighter` 组件在 Block Builder 架构中扮演**代码可视化层的唯一实现者**角色，与多个系统模块形成数据流闭环。后端 Python HTTP 服务器（`server.py`）通过 `/read-file` 端点提供代码内容，前端 App 组件定期轮询该端点获取最新代码字符串，传递给 `CodeHighlighter` 进行渲染。用户通过点击运行按钮触发 `/run` 端点请求，后端执行代码并将输出返回（当前版本未实现输出展示，可扩展为在面板下方添加终端输出区域）。这种**单向数据流**（后端 → 前端状态 → 组件渲染）确保了数据源的唯一性和状态的可预测性。

组件与左侧积木模板栏、中央画布区域形成**跨模块协同**：用户在画布拖拽积木时，后端 Python 语法分析器根据积木类型和连接关系生成对应的 Python 代码片段（如 `print('Hello')` 对应正方形积木），文件同步机制将生成的代码写入临时文件，前端通过轮询机制读取该文件并触发 `CodeHighlighter` 更新。这种**事件驱动架构**实现了积木操作与代码生成的解耦——前端无需理解代码生成逻辑，仅需展示后端提供的文本内容。未来可扩展为 WebSocket 实时推送机制，消除轮询延迟并支持双向通信（如后端推送语法错误标记到前端高亮显示）。