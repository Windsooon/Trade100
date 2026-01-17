# 蓝图任务 (Blueprint Task)

## 上下文注入 (Context Injection)

角色定义: {{CONTENT: /roles/architect.md}}
输出模版: {{CONTENT: /templates/blueprint.md}}

## 指令 (Instructions)

你现在将扮演 **架构师 (The Architect)** 的角色。

### 第 1 步：理解需求 (Understand Requirements)

分析提供的需求文档，提取关键约束和目标。
**输出一段简短的"设计目标摘要 (Design Objective)"。**

### 第 2 步：技术选型 (Technology Selection)

为项目选择合适的技术栈：

- **语言/运行时**: 选择理由（如有必要，列出备选方案）
- **框架/库**:选择理由（如有必要，列出备选方案）
- **数据库/存储**: 选择理由（如有必要，列出备选方案）
- **其他工具**:选择理由

**关键：** 对于具有重大影响的决策（如数据库选型），请提供 2-3 个可行选项及其利弊分析，并给出你的推荐。

### 第 3 步：架构设计 (Architecture Design)

1. **目录结构**: 定义项目文件夹布局
2. **模块划分**: 划分核心模块及其职责
3. **依赖关系**: 描述模块间的依赖方向
4. **设计模式**: 显式声明核心组件将采用的设计模式（如单例、工厂、策略、观察者等），并解释原因。切勿为了用模式而用模式。

### 第 4 步：输出蓝图 (Output Blueprint)

使用 `输出模版` 生成最终的技术蓝图文档。

- **重要：** 严禁在蓝图中包含具体的代码行（伪代码除外）。所有的实施细节必须留给 Feature Task。
- **重要：** 必须将宏大的蓝图拆解为若干个原子化的 Feature Task。

- **重要：** 每个技术决策都要附带简短的理由。

### 输出路径与命名 (Output Config)

请将最终文件保存至: `docs/blueprint/`
命名格式: `yy_mm_dd_{{summary}}_blueprint_{{version}}.md`
(例如: `26_01_15_system_arch_blueprint_v1.md`)

## 用户输入 (User Input)

{{需求文档或功能描述}}
