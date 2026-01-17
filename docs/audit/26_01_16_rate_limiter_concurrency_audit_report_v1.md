# 安全审查报告 - 限流器并发问题 (Rate Limiter Concurrency Audit Report)

## 范围 (Scope)

### 威胁模型 / 测试范围

本次审计针对 **Dome API 限流器的并发控制机制**，重点关注：

1. **限流器实现** (`src/lib/api/rate-limiter.ts`)
   - p-queue 配置和单例模式
   - 请求间隔控制机制
   - 并发请求处理

2. **服务层并发调用** (`src/lib/services/trading-analysis.service.ts`)
   - `Promise.all()` 并行获取多个钱包数据
   - 多个 `getAllTradeHistory` 同时启动的影响

3. **API 路由并发** (`src/app/api/trading/*`)
   - 多个 API 路由同时被调用
   - 每个路由创建新的服务实例

4. **分页请求处理** (`src/lib/api/adapters/dome-api.adapter.ts`)
   - `getAllTradeHistory` 中的循环分页
   - 限流器在循环中的行为

## 发现的问题 (Findings)

### 🔴 高风险 (Critical)

| ID | 问题描述 | 位置 | 建议修复 |
| :--- | :--- | :--- | :--- |
| C1 | **多个 API 路由并发调用**：`market-summary`、`overall-stats`、`trading-behavior` 三个 API 路由同时被调用，每个都创建新的服务实例并调用 `getAllTradeHistory`，导致多个分页循环同时进行 | `src/app/trading-analysis/page.tsx:25-37`, `src/lib/services/trading-analysis.service.ts:98-105` | 需要串行化这些 API 调用，或者使用共享的请求队列 |
| C2 | **Promise.all() 导致并发启动**：虽然每个 `getAllTradeHistory` 内部使用限流器，但多个 `getAllTradeHistory` 同时启动时，它们会同时向队列中添加大量请求，导致短时间内请求过于密集 | `src/lib/services/trading-analysis.service.ts:98-105` | 改为串行执行，或者使用更智能的批处理机制 |
| C3 | **限流器间隔计算不准确**：`lastRequestTime` 在请求开始执行时更新，但实际网络请求可能在延迟后才发送，导致实际请求间隔小于预期 | `src/lib/api/rate-limiter.ts:69` | 应该在网络请求完成后更新 `lastRequestTime` |

### 🟠 中风险 (Medium)

| ID | 问题描述 | 位置 | 建议修复 |
| :--- | :--- | :--- | :--- |
| M1 | **p-queue interval 和手动延迟重复**：既使用了 p-queue 的 `interval` 配置，又添加了手动延迟检查，可能导致过度延迟 | `src/lib/api/rate-limiter.ts:45-67` | 简化逻辑，只使用一种机制 |
| M2 | **429 错误重试时未考虑限流**：虽然重试会通过限流器，但重试等待时间（10秒）可能与限流器队列中的其他请求冲突 | `src/lib/api/adapters/dome-api.adapter.ts:38-60` | 重试时应该考虑限流器的当前状态 |
| M3 | **没有请求去重机制**：相同的请求可能被多次添加到队列中，浪费 API 配额 | `src/lib/api/adapters/dome-api.adapter.ts` | 添加请求缓存和去重机制 |

### 🟡 低风险 (Low)

| ID | 问题描述 | 位置 | 建议修复 |
| :--- | :--- | :--- | :--- |
| L1 | **日志过多**：每次请求都记录详细日志，可能影响性能 | `src/lib/api/adapters/dome-api.adapter.ts` | 减少日志频率，或使用日志级别控制 |
| L2 | **没有监控和告警**：无法实时监控限流器状态和 429 错误频率 | `src/lib/api/rate-limiter.ts` | 添加监控指标和告警机制 |

## 攻击性测试用例 (Attack Test Cases)

### 边缘情况测试 (Edge Cases)

```typescript
// 测试用例 1: 多个 API 路由同时调用
// 攻击：同时调用三个 API 路由
Promise.all([
  fetch('/api/trading/market-summary?wallets=0x123'),
  fetch('/api/trading/overall-stats?wallets=0x123'),
  fetch('/api/trading/trading-behavior?wallets=0x123'),
])
// 预期：所有请求都应该通过限流器，但实际可能同时启动多个分页循环
// 状态：❌ 存在问题

// 测试用例 2: 多个钱包并行获取
// 攻击：同时获取 5 个钱包的数据
const wallets = ['0x1', '0x2', '0x3', '0x4', '0x5']
Promise.all(wallets.map(w => getAllTradeHistory({ user: w })))
// 预期：应该串行执行，但实际可能并行启动
// 状态：❌ 存在问题

// 测试用例 3: 大量分页请求
// 攻击：获取有 20000+ 条记录的钱包数据
getAllTradeHistory({ user: '0x3b1f15f55716197399247392a280deee45806500' })
// 预期：应该每 1.1 秒请求一次，总共需要 200+ 秒
// 状态：⚠️ 可能触发 429 错误

// 测试用例 4: 429 错误后的重试
// 攻击：触发 429 错误，然后重试
// 预期：重试应该等待 10 秒，然后通过限流器
// 状态：⚠️ 可能与队列中的其他请求冲突
```

## 根本原因分析

### 问题 1: 多个 API 路由并发调用

**现象**：
- 前端同时调用 3 个 API 路由（market-summary, overall-stats, trading-behavior）
- 每个路由都调用 `getMarketSummaries`，启动 `getAllTradeHistory`
- 虽然限流器是单例，但多个分页循环同时向队列添加请求

**影响**：
- 短时间内队列中积累大量请求
- 即使限流器控制间隔，但 Dome API 可能基于时间窗口（如 10 秒窗口）限制，导致 429 错误

### 问题 2: Promise.all() 并发启动

**现象**：
```typescript
const allTradesPromises = walletAddresses.map(address =>
  this.apiClient.getAllTradeHistory({ user: address })
)
const allTradesArrays = await Promise.all(allTradesPromises)
```

**问题**：
- 所有 `getAllTradeHistory` 同时启动
- 每个都会立即开始向队列添加分页请求
- 虽然队列会串行执行，但队列中可能积累数百个请求

### 问题 3: 限流器时间计算

**现象**：
- `lastRequestTime` 在函数开始执行时更新
- 但实际网络请求可能在几毫秒后才发送
- 导致实际请求间隔可能略小于 1.1 秒

## 修复方案

### 方案 1: 串行化 API 调用（推荐）

```typescript
// 在服务层串行执行，而不是并行
async getMarketSummaries(walletAddresses: string[]): Promise<MarketSummary[]> {
  const allTrades: TradeRecord[] = []
  
  // 串行获取每个钱包的数据
  for (const address of walletAddresses) {
    try {
      const trades = await this.apiClient.getAllTradeHistory({ user: address })
      allTrades.push(...trades)
    } catch (error) {
      console.error(`Error fetching trades for ${address}:`, error)
      // 继续处理其他钱包
    }
  }
  
  // ... 后续处理
}
```

### 方案 2: 改进限流器时间计算

```typescript
async execute<T>(fn: () => Promise<T>, priority: number = 0): Promise<T> {
  return this.queue.add(async () => {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.MIN_INTERVAL_MS) {
      const waitTime = this.MIN_INTERVAL_MS - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    // 执行请求
    const result = await fn()
    
    // 在请求完成后更新时间
    this.lastRequestTime = Date.now()
    return result
  }, { priority })
}
```

### 方案 3: 增加请求间隔到 1.2 秒

```typescript
private readonly MIN_INTERVAL_MS = 1200 // 1.2秒，更大的安全边际
```

### 方案 4: 添加请求去重和缓存

```typescript
class RequestCache {
  private cache = new Map<string, { data: any, timestamp: number }>()
  private readonly TTL = 5000 // 5秒缓存
  
  get(key: string) {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.data
    }
    return null
  }
  
  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() })
  }
}
```

## 总结 (Summary)

| 风险等级 | 数量 |
| :--- | :--- |
| 🔴 高风险 | 3 |
| 🟠 中风险 | 3 |
| 🟡 低风险 | 2 |

### 关键发现

1. **并发调用是主要问题**：多个 API 路由和多个钱包同时调用，导致限流器队列积累过多请求
2. **时间计算不准确**：`lastRequestTime` 更新时机不当，可能导致实际间隔略小于预期
3. **缺少请求去重**：相同请求可能被多次执行

### 推荐修复顺序

1. **立即修复**：串行化 `getMarketSummaries` 中的钱包数据获取（C2）
2. **短期修复**：改进限流器时间计算（C3）
3. **中期改进**：添加请求去重和缓存（M3）
4. **长期优化**：考虑使用更智能的批处理机制

---

**审计日期**: 2026-01-16  
**审计人员**: AI Validator  
**版本**: v1
