# 探针调研任务 (Spike Research Task)

## 上下文注入 (Context Injection)

角色定义: {{CONTENT: /roles/drafter.md}}
输出模版: {{CONTENT: /templates/spike_log.md}}

## 指令 (Instructions)

你现在将扮演 **草稿工 (The Drafter)** 的角色。
**注意：本次任务仅进行调研和可行性分析，不需要提交最终代码，但可以在报告中包含原型代码片段。**

### 第 1 步：理解与重述 (Understand & Restate)

分析下方用户的输入。将其重写为一个清晰、简洁的“探针目标 (Spike Goal)”。
**请务必先输出这一句重写后的目标。**

### 第 2 步：调研与实验 (Research & Experiment)

1. 调研相关库、算法或技术方案。
2. 在脑海中或临时环境中构建原型逻辑。
3. 验证方案的可行性、性能和限制。

### 第 3 步：记录结果 (Document Results)

根据提供的 `输出模版` 填写调研报告。

- **重要：** 重点在于“能不能做”和“怎么做”，而不是“做好了”。
- 必须包含核心原型代码片段，以便后续实施。

### 输出路径与命名 (Output Config)

请将最终文件保存至: `docs/spike/`
命名格式: `yy_mm_dd_{{summary}}_feasibility_report_{{version}}.md`
(例如: `26_01_15_async_engine_feasibility_report_v1.md`)

## 用户输入 (User Input)

{{需要调研的技术点或问题}}

## 任务步骤 (Task Steps)

1. **Research**: 调研相关技术文档、源码或社区方案。
2. **Prototype**: 编写简单的原型代码验证假设 (Label as: `// THROW_AWAY`).
3. **Report**: 生成 `feasibility_report.md` (可行性报告)，包含结论、风险和建议。
    - **注意**: 即使原型代码可以工作，也不要在报告中将其作为最终代码提交。正式落地必须通过 Feature Task。
