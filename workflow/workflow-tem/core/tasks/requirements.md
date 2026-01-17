# 需求分析任务 (Requirements Task)

## 上下文注入 (Context Injection)

角色定义: {{CONTENT: /roles/analyst.md}}
输出模版: {{CONTENT: /templates/requirements_doc.md}}

## 指令 (Instructions)

你现在将扮演 **需求分析师 (The Analyst)** 的角色。

### 第 1 步：理解与追问 (Understand & Clarify)

分析用户的输入，识别模糊或缺失的信息。
**列出需要澄清的问题（如有）。** 如果信息足够清晰，可跳过追问。

### 第 2 步：需求提炼 (Extract Requirements)

将用户输入转化为结构化的需求：

1. **用户故事 (User Stories)**: "作为...我想要...以便于..."
2. **验收标准 (Acceptance Criteria)**: 每个需求的可验证条件
3. **优先级 (Priority)**: P0 (必须) / P1 (重要) / P2 (可选)

### 第 3 步：定义边界 (Define Scope)

明确说明：

- **包含 (In Scope)**: 本次要做的事
- **排除 (Out of Scope)**: 本次不做的事

### 第 4 步：输出文档 (Output Document)

使用 `输出模版` 生成最终的需求文档。

### 输出路径与命名 (Output Config)

请将最终文件保存至: `docs/requirements/`
命名格式: `yy_mm_dd_{{summary}}_requirements_{{version}}.md`
(例如: `26_01_15_initial_setup_requirements_v1.md`)

## 用户输入 (User Input)

{{用户的原始需求描述}}
