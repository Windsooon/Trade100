# 重构规划任务 (Refactoring Planning Task)

## 上下文注入 (Context Injection)

角色定义: {{CONTENT: /roles/refactorer.md}}
输出模版: {{CONTENT: /templates/refactor_proposal.md}}

## 指令 (Instructions)

你现在将扮演 **精修师 (The Refactorer)** 的角色。
**注意：本次任务仅制定重构方案，不直接修改代码库。**

### 第 1 步：理解与重述 (Understand & Restate)

分析提供的代码和用户的意图。将其重写为一个明确的“重构目标 (Refactoring Objective)”。
**请务必先输出这个重构目标。**
**任务目标：** 对现有代码进行重构，提升质量。

### 重构策略 (Refactoring Strategy) - *用户可选*

1. **Conservative Strategy (保守策略 - 推荐)**:
   - **目标**: 零风险，纯清理。
   - **Scope**: 仅允许重命名、提取方法 (Extract Method)、内联函数。
   - **承诺**: 保证逻辑结构和算法完全不变，Public Interface 不变。
2. **Structural Strategy (结构化策略)**:
   - **目标**: 优化架构。
   - **Scope**: 引入设计模式（如 Strategy Pattern）、拆分类、移动文件。
   - **承诺**: 代码结构变了，但行为不变。需要较强的测试覆盖支持。
3. **Aggressive Strategy (激进策略)**:
   - **目标**: 现代化或性能优化。
   - **Scope**: 重写底层算法、更换依赖库。
   - **风险**: 高风险高收益。

### 第 2 步：分析与设计 (Analyze & Design)

1. **划定依赖半径 (Identify Dependency Radius)**: 找出直接调用该模块的组件（Upstream）和该模块直接调用的组件（Downstream）。
2. 识别代码中的"坏味道" (Code Smells)。
3. 设计重构后的结构（类图、函数签名等）。
4. 确保重构不改变外部行为。

### 第 3 步：输出方案 (Output Plan)

填写提供的 `输出模版`。

- **重要：** 清晰描述重构前后的对比，并列出具体的重构步骤。

### 输出路径与命名 (Output Config)

请将最终文件保存至: `docs/refactor/`
命名格式: `yy_mm_dd_{{summary}}_refactor_proposal_{{version}}.md`
(例如: `26_01_15_order_service_refactor_proposal_v1.md`)

## 用户输入 (User Input)

{{需要重构的代码片段或目标}}

## 任务步骤 (Task Steps)

1. **Diagnosis**: 分析代码，识别坏味道 (Code Smells) 和结构问题。
2. **Strategy**: 选择合适的重构策略 (Conservative/Structural/Aggressive)。
3. **Target Design**: 描述重构后的理想状态 (类图/时序图)。
4. **Proposal**: 生成 `refactor_proposal.md`。
   - **注意**: 不要生成详细的代码实施步骤，这属于 Feature Task 的职责。仅仅列出“建议改动点”。
