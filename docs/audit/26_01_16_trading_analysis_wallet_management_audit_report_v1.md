# 安全审查报告 (Security Review Report)

## 范围 (Scope)

### 威胁模型 / 测试范围

本次审计针对 **Trading Analysis 功能的钱包管理和 API 路由**，重点关注：

1. **钱包管理功能** (`src/lib/wallet-manager.ts`, `src/hooks/use-wallet-manager.ts`)
   - localStorage 数据持久化和同步
   - 钱包地址验证和重复检查
   - 状态管理和跨组件通信

2. **API 路由安全** (`src/app/api/trading/*`)
   - 参数验证和输入清理
   - 错误处理和敏感信息泄露
   - 空值和边界情况处理

3. **前端状态管理** (`src/app/trading-analysis/page.tsx`, `src/hooks/use-trading-analysis.ts`)
   - React Query 配置和错误处理
   - 钱包状态同步问题
   - 用户反馈和错误提示

4. **数据流和状态一致性**
   - 钱包添加/删除后的状态更新
   - API 调用时的参数传递
   - 错误信息的用户可见性

## 发现的问题 (Findings)

### 🔴 高风险 (Critical)

| ID | 问题描述 | 位置 | 建议修复 |
| :--- | :--- | :--- | :--- |
| C1 | **API 路由空参数处理不当**：当 `wallets=` 参数为空字符串时，API 返回 400 错误，但错误信息不明确，且前端无法正确处理 | `src/app/api/trading/market-summary/route.ts:15`, `src/app/api/trading/overall-stats/route.ts:15`, `src/app/api/trading/trading-behavior/route.ts:15` | ✅ **已修复**：添加了空字符串检查和更明确的错误信息 |
| C2 | **钱包状态同步失败**：添加钱包后，`enabledWallets` 可能未正确更新，导致 API 调用时传递空参数 | `src/app/trading-analysis/page.tsx:22-24` | ✅ **已修复**：改用直接基于 `wallets` 数组计算，避免函数引用问题 |
| C3 | **错误信息不完整**：API 错误时，前端错误对象为空 `{}`，用户无法看到具体错误原因 | `src/hooks/use-trading-analysis.ts:36-41` | ✅ **已修复**：改进了错误日志，包含完整的错误信息 |

### 🟠 中风险 (Medium)

| ID | 问题描述 | 位置 | 建议修复 |
| :--- | :--- | :--- | :--- |
| M1 | **localStorage 数据验证不足**：从 localStorage 读取钱包数据时，没有验证数据结构的完整性，可能导致运行时错误 | `src/lib/wallet-manager.ts:64-68` | 添加数据验证和类型检查，使用 schema 验证（如 Zod） |
| M2 | **钱包地址大小写不一致**：虽然代码中使用了 `toLowerCase()`，但在某些地方可能遗漏，导致重复检查失败 | `src/lib/wallet-manager.ts:95`, `src/components/trading-analysis/wallet-manager-dialog.tsx:33` | 确保所有地址比较都使用规范化的小写形式 |
| M3 | **API 参数长度限制缺失**：没有限制 `wallets` 参数的长度和数量，可能导致 DoS 攻击或性能问题 | `src/app/api/trading/*/route.ts` | 添加最大钱包数量限制（建议 10-20 个）和总参数长度限制 |
| M4 | **错误堆栈信息泄露**：开发环境下错误响应包含堆栈信息，可能泄露敏感信息 | `src/app/api/trading/market-summary/route.ts:65` | ✅ **已处理**：仅在开发环境显示，但建议在生产环境完全禁用 |
| M5 | **React Query 错误处理不统一**：不同查询的错误处理方式不一致，某些错误可能被静默忽略 | `src/hooks/use-trading-analysis.ts` | 统一错误处理逻辑，确保所有错误都能被正确捕获和显示 |

### 🟡 低风险 (Low)

| ID | 问题描述 | 位置 | 建议修复 |
| :--- | :--- | :--- | :--- |
| L1 | **用户反馈不明确**：当没有钱包或钱包未启用时，错误提示不够清晰，用户可能不知道如何操作 | `src/app/trading-analysis/page.tsx:112-120` | ✅ **已修复**：区分"没有钱包"和"钱包未启用"两种情况 |
| L2 | **localStorage 存储空间限制**：没有处理 localStorage 存储空间不足的情况 | `src/lib/wallet-manager.ts:166` | 添加 try-catch 处理 `QuotaExceededError`，并提供用户友好的错误提示 |
| L3 | **跨标签页同步延迟**：使用 `storage` 事件进行跨标签页同步，但同一标签页内的更新不会触发该事件 | `src/hooks/use-wallet-manager.ts:32-41` | 已使用自定义事件 `wallets-updated` 作为补充，但可以进一步优化 |
| L4 | **API 调用缺少超时处理**：React Query 没有配置请求超时，可能导致长时间挂起 | `src/hooks/use-trading-analysis.ts` | 添加 `timeout` 配置，建议 30-60 秒 |
| L5 | **钱包别名未验证**：钱包别名可以包含任意字符，可能导致 XSS 风险（虽然使用了 React，但仍需注意） | `src/lib/wallet-manager.ts:102` | 添加别名长度限制和字符验证（仅允许字母、数字、空格、连字符） |

## 攻击性测试用例 (Attack Test Cases)

### 边缘情况测试 (Edge Cases)

```typescript
// 测试用例 1: 空 wallets 参数
// 攻击：发送空字符串作为 wallets 参数
fetch('/api/trading/market-summary?wallets=')
// 预期：返回 400 错误，错误信息明确
// 状态：✅ 已修复

// 测试用例 2: 多个空钱包地址
// 攻击：发送多个逗号分隔的空字符串
fetch('/api/trading/market-summary?wallets=,,,')
// 预期：过滤空值后返回 400 错误
// 状态：✅ 已修复

// 测试用例 3: 钱包地址大小写不一致
// 攻击：添加 '0xABC...' 和 '0xabc...' 作为不同钱包
const wallet1 = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
const wallet2 = '0x742d35cc6634c0532925a3b844bc9e7595f0beb'
// 预期：第二个添加应该失败（重复检查）
// 状态：⚠️ 需要验证

// 测试用例 4: localStorage 数据损坏
// 攻击：手动修改 localStorage 中的钱包数据为无效 JSON
localStorage.setItem('wallet_addresses', 'invalid json')
// 预期：应该优雅处理，返回空数组，不崩溃
// 状态：✅ 已有 try-catch，但可以改进验证

// 测试用例 5: 钱包数量过多
// 攻击：尝试添加 100+ 个钱包地址
for (let i = 0; i < 100; i++) {
  addWallet(`0x${i.toString(16).padStart(40, '0')}`)
}
// 预期：应该限制最大数量或提供性能警告
// 状态：❌ 未实现
```

### 安全测试 (Security Tests)

```typescript
// 测试用例 1: XSS 攻击（钱包别名）
// 攻击：尝试在别名中注入脚本
addWallet('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', '<script>alert("XSS")</script>')
// 预期：React 应该自动转义，但建议在前端也进行验证
// 状态：⚠️ 需要验证 React 的自动转义是否足够

// 测试用例 2: SQL 注入（虽然使用 NoSQL，但作为防御性编程）
// 攻击：在参数中包含特殊字符
fetch('/api/trading/market-summary?wallets=0x123,0x456;DROP TABLE wallets')
// 预期：地址验证应该拒绝无效格式
// 状态：✅ 已有地址格式验证

// 测试用例 3: 路径遍历攻击
// 攻击：尝试在参数中包含路径字符
fetch('/api/trading/market-summary?wallets=../../../etc/passwd')
// 预期：地址验证应该拒绝
// 状态：✅ 已有地址格式验证

// 测试用例 4: 超长参数攻击
// 攻击：发送超长的 wallets 参数
const longParam = Array(10000).fill('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb').join(',')
fetch(`/api/trading/market-summary?wallets=${longParam}`)
// 预期：应该限制参数长度
// 状态：❌ 未实现

// 测试用例 5: 并发请求攻击
// 攻击：同时发送大量 API 请求
Promise.all(Array(100).fill(0).map(() => 
  fetch('/api/trading/market-summary?wallets=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
))
// 预期：限流器应该控制请求频率
// 状态：✅ 已有 1 QPS 限流器
```

## 总结 (Summary)

| 风险等级 | 数量 |
| :--- | :--- |
| 🔴 高风险 | 3 (全部已修复) |
| 🟠 中风险 | 5 (1 个已处理，4 个待修复) |
| 🟡 低风险 | 5 (1 个已修复，4 个待改进) |

### 关键发现

1. **状态同步问题**：钱包添加后状态未正确更新，导致 API 调用失败。这是导致用户报告问题的根本原因。
2. **错误处理不完善**：错误信息不完整，难以调试和用户理解。
3. **参数验证不足**：缺少对空值、长度和数量的限制。

### 已修复的问题

- ✅ API 路由空参数处理
- ✅ 钱包状态同步
- ✅ 错误信息改进
- ✅ 用户反馈优化

### 待修复的问题

1. **高优先级**：
   - 添加钱包数量限制（M3）
   - 改进 localStorage 数据验证（M1）
   - 统一错误处理逻辑（M5）

2. **中优先级**：
   - 添加 API 请求超时（L4）
   - 处理 localStorage 存储空间限制（L2）
   - 验证钱包别名（L5）

3. **低优先级**：
   - 优化跨标签页同步（L3）
   - 生产环境禁用堆栈信息（M4）

## 建议优先级 (Recommended Priority)

1. **立即修复**：钱包数量限制（M3）- 防止 DoS 攻击
2. **短期修复**：localStorage 数据验证（M1）- 提高稳定性
3. **中期改进**：统一错误处理（M5）- 改善用户体验
4. **长期优化**：其他低风险项 - 提升代码质量

## 修复建议详细说明

### M1: localStorage 数据验证

```typescript
// 建议使用 Zod 进行数据验证
import { z } from 'zod'

const WalletConfigSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  alias: z.string().max(50).optional(),
  enabled: z.boolean(),
  createdAt: z.number(),
})

getWallets(): WalletConfig[] {
  try {
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (!stored) return []
    
    const parsed = JSON.parse(stored)
    const validated = z.array(WalletConfigSchema).parse(parsed)
    return validated
  } catch (error) {
    console.error('Invalid wallet data, resetting...', error)
    this.saveWallets([]) // 重置为空数组
    return []
  }
}
```

### M3: 钱包数量限制

```typescript
// 在 API 路由中添加
const MAX_WALLETS = 20
const MAX_PARAM_LENGTH = 2000 // 字符数

if (walletAddresses.length > MAX_WALLETS) {
  return NextResponse.json(
    { error: `Maximum ${MAX_WALLETS} wallets allowed` },
    { status: 400 }
  )
}

if (walletsParam.length > MAX_PARAM_LENGTH) {
  return NextResponse.json(
    { error: 'Request parameter too long' },
    { status: 400 }
  )
}
```

### M5: 统一错误处理

```typescript
// 创建统一的错误处理工具
function handleApiError(error: unknown, context: string) {
  const errorMessage = error instanceof Error 
    ? error.message 
    : 'Unknown error'
  
  console.error(`[${context}] Error:`, {
    message: errorMessage,
    stack: error instanceof Error ? error.stack : undefined,
  })
  
  return {
    error: errorMessage,
    context,
    timestamp: new Date().toISOString(),
  }
}
```

---

**审计日期**: 2026-01-16  
**审计人员**: AI Validator  
**版本**: v1
