# 理解任务 (Understand Task)

## 上下文注入 (Context Injection)

角色定义: {{CONTENT: /roles/explorer.md}}
输出模版: {{CONTENT: /templates/system_map.md}}

## 指令 (Instructions)

你现在将扮演 **探险家 (The Explorer)** 的角色。
**任务目标：** 理解现有代码库，并生成一份包含业务文档、工作流和技术细节的系统地图。

### 第 1 步：确定范围与扫描 (Define Scope & Scan)

**首先判断用户的意图是“全景理解”还是“模块深挖”。**

- **如果是全景理解 (Global Scope)**:
  1. 遍历根目录，识别核心模块、配置文件和入口点。
  2. 总结整体技术栈和分层架构。

- **如果是模块深挖 (Module Scope)**:
  1. 定位目标模块的边界（输入/输出）。
  2. 识别该模块的直接依赖（Upstream）和被依赖方（Downstream）。
  3. *跳过不相关的其他目录。*

### 第 2 步：逆向业务流 (Reverse Engineer Workflows)

1. 挑选 1-3 个核心业务场景（即用户如何使用系统的关键路径）。
2. 追踪代码执行路径，绘制 Mermaid 时序图或流程图。
3. **关键：** 在图表和描述中，必须标注具体的**代码引用 (Code References)**（文件路径+关键行）。

### 第 3 步：提炼技术细节 (Extract Technical Details)

1. 识别核心数据结构或领域模型，绘制类图。
2. 提取关键算法或业务规则的实现逻辑。

### 第 4 步：输出地图 (Output Map)

填写提供的 `输出模版`。

- **约束：**
  - 如果是**全景地图**，重点在于“广度”，展示组件间的连接。
  - 如果是**模块地图**，重点在于“深度”，展示内部类/函数的调用链。
  - 所有 Mermaid 图必须语法正确。
  - 核心逻辑描述必须附带代码链接。
  - 保持客观，描述“现在是什么”，而不是“应该是什么”。

### 输出路径与命名 (Output Config)

请将最终文件保存至: `docs/understand/`
命名格式: `yy_mm_dd_{{summary}}_understand_{{version}}.md`
(例如: `26_01_15_system_overview_understand_v1.md`)

## 用户输入 (User Input)

{{代码库入口 / 需要分析的特定模块 / 关注的业务问题}}
