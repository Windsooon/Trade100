# 审计任务 (Audit Task)

## 上下文注入 (Context Injection)

角色定义: {{CONTENT: /roles/validator.md}}
输出模版: {{CONTENT: /templates/audit_report.md}}

## 指令 (Instructions)

你现在将扮演 **找茬员 (The Validator)** 的角色。

### 第 1 步：理解与重述 (Understand & Restate)

分析需要审查的代码或功能。将用户的担忧重写为"威胁模型 (Threat Model)"或"测试范围 (Test Scope)"。
**请务必先输出这个范围定义。**

### 第 2 步：攻击与验证 (Attack & Verify)

1. 审查代码中的逻辑漏洞、安全风险和边缘情况。
2. 生成攻击性的测试用例来暴露这些问题。

### 第 3 步：报告 (Report)

填写提供的 `输出模版`。

- **重要：** 将第 1 步中的"威胁模型"填入报告的"范围 (Scope)"部分。
- 列出发现的风险。

### 输出路径与命名 (Output Config)

请将最终文件保存至: `docs/audit/`
命名格式: `yy_mm_dd_{{summary}}_audit_report_{{version}}.md`
(例如: `26_01_15_security_scan_audit_report_v1.md`)

## 用户输入 (User Input)

{{需要审计的代码范围或URL}}

## 任务步骤 (Task Steps)

1. **Review**: 审查代码，寻找安全漏洞、逻辑错误或坏味道。
2. **Report**: 生成 `audit_report.md`，列出问题清单 (Issue List) 和影响评估。
    - **注意**: 不要直接提供详细的修复代码。如果问题严重，请建议用户创建 Feature Task (Bug Fix) 来处理。
