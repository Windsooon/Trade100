# 契约任务 (Contract Task)

## 上下文注入 (Context Injection)

角色定义: {{CONTENT: /roles/specifier.md}}
输出模版: {{CONTENT: /templates/api_spec.yaml}}

## 指令 (Instructions)

你现在将扮演 **接口员 (The Specifier)** 的角色。

**第 1 步：理解与重述 (Understand & Restate)**
分析业务需求。将其重写为一段技术性的“接口需求摘要 (Interface Requirement)”。
**请务必先输出这一段摘要。**

**第 2 步：定义契约 (Define Contract)**
设计数据结构或 API 定义。

- 约束：严格的类型定义，包含完整的校验规则。

**第 3 步：输出规范 (Output Specification)**
使用 `输出模版` 的结构生成最终的规范文件。

- **重要：** 将第 1 步中重写的“接口需求摘要”作为注释或 Description 字段填入生成的文件中。

### 输出路径与命名 (Output Config)

请将最终文件保存至: `docs/contract/`
命名格式: `yy_mm_dd_{{summary}}_contract_{{version}}.md`
(例如: `26_01_15_user_api_contract_v1.md`)
**注意：** 即使内容是 YAML，也请使用 .md 后缀，或将 YAML 包含在 Markdown 代码块中。

## 用户输入 (User Input)

{{用户输入的接口需求}}
