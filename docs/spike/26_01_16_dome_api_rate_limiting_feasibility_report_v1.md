# 可行性报告 (Feasibility Report)

## 探针目标 (Spike Goal)

验证 Dome API 是否满足交易分析功能的需求，并调研使用消息队列实现 API 限流（1 QPS）的可行性方案。

## 调研问题 (Research Questions)

1. **Dome API 功能验证**：
   - Trade History API 是否支持按用户地址、市场、时间范围筛选？
   - Activity API 是否支持获取所有活动类型（TRADE, SPLIT, MERGE, REDEEM等）？
   - API 返回的数据格式是否满足需求？
   - 分页机制是否完善？

2. **限流方案调研**：
   - 如何实现 1 QPS 的限流？
   - 消息队列方案是否适合 Next.js 应用？
   - 有哪些可选的消息队列方案？
   - 如何保证请求的顺序和可靠性？

## 调研结果 (Research Results)

### 1. Dome API 功能验证

#### 1.1 Trade History API 验证

根据 [Dome API Trade History 文档](https://docs.domeapi.io/api-reference/endpoint/get-trade-history)：

**✅ API 端点**：`GET /v1/polymarket/orders`

**✅ 支持的查询参数**：
- `user` (string) - 按用户钱包地址筛选 ✅ **满足需求**
- `market_slug` (string) - 按市场slug筛选 ✅ **满足需求**
- `condition_id` (string) - 按条件ID筛选 ✅ **满足需求**
- `token_id` (string) - 按token ID筛选
- `start_time` (integer) - 开始时间戳（秒）✅ **满足需求**
- `end_time` (integer) - 结束时间戳（秒）✅ **满足需求**
- `limit` (integer, 1-1000) - 每页数量 ✅ **满足需求**
- `offset` (integer) - 分页偏移量 ✅ **满足需求**

**✅ 返回数据格式**：
```json
{
  "orders": [
    {
      "token_id": "...",
      "token_label": "Yes",
      "side": "BUY",
      "market_slug": "...",
      "condition_id": "...",
      "shares": 4995000,
      "shares_normalized": 4.995,
      "price": 0.65,
      "block_number": 123456789,
      "log_index": 42,
      "tx_hash": "...",
      "title": "...",
      "timestamp": 1757008834,
      "order_hash": "...",
      "user": "0x...",
      "taker": "0x..."
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 1250,
    "has_more": true
  }
}
```

**✅ 数据字段验证**：
- ✅ `side`: "BUY" | "SELL" - 满足交易类型筛选需求
- ✅ `timestamp`: Unix时间戳（秒）- 满足时间筛选需求
- ✅ `market_slug`, `condition_id` - 满足市场筛选需求
- ✅ `user` - 满足用户筛选需求
- ✅ `shares_normalized`, `price` - 满足数量、价格计算需求
- ✅ `tx_hash` - 满足交易哈希显示需求
- ✅ `title` - 满足市场名称显示需求

**结论**：✅ **Trade History API 完全满足需求**

#### 1.2 Activity API 验证

根据 [Dome API Activity 文档](https://docs.domeapi.io/api-reference/endpoint/get-activity)：

**✅ API 端点**：`GET /v1/polymarket/activity`

**✅ 支持的查询参数**：
- `user` (string) - 按用户钱包地址筛选 ✅
- `market_slug` (string) - 按市场slug筛选 ✅
- `condition_id` (string) - 按条件ID筛选 ✅
- `start_time` (integer) - 开始时间戳 ✅
- `end_time` (integer) - 结束时间戳 ✅
- `limit` (integer) - 每页数量 ✅
- `offset` (integer) - 分页偏移量 ✅

**✅ 返回数据格式**：
```json
{
  "activities": [
    {
      "token_id": "...",
      "token_label": "Yes",
      "side": "BUY",
      "market_slug": "...",
      "condition_id": "...",
      "shares": 187722726,
      "shares_normalized": 187.722726,
      "price": 1,
      "block_number": 123456789,
      "log_index": 42,
      "tx_hash": "...",
      "title": "...",
      "timestamp": 1721263049,
      "order_hash": "",
      "user": "0x...",
      "type": "TRADE"  // 或 "SPLIT", "MERGE", "REDEEM", "REWARD", "CONVERSION"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "count": 1250,
    "has_more": true
  }
}
```

**✅ 活动类型验证**：
- ✅ `type`: "TRADE" | "SPLIT" | "MERGE" | "REDEEM" | "REWARD" | "CONVERSION"
- ✅ 完全覆盖需求文档中提到的所有活动类型

**结论**：✅ **Activity API 完全满足需求**

#### 1.3 API 限流限制

根据 [Dome API 文档](https://docs.domeapi.io/)：

**限流层级**：
| Tier | QPS | Queries Per 10 Seconds |
|------|-----|------------------------|
| **Free** | 1 | 10 |
| **Dev** | 100 | 500 |
| **Enterprise** | Custom | Custom |

**当前限制**：免费层 = **1 QPS**（每秒1个请求）

**影响分析**：
- ❌ **问题**：1 QPS 对于多钱包聚合查询来说太慢
  - 假设用户有3个钱包地址，每个钱包需要查询交易历史
  - 串行请求需要至少3秒
  - 如果每个钱包有多个市场，需要更多请求
  - 实时更新（10秒刷新）可能无法及时完成

- ✅ **解决方案**：需要实现请求队列和限流机制

### 2. 消息队列限流方案调研

#### 2.1 方案对比

##### 方案 A：内存队列（In-Memory Queue）- ✅ 推荐

**描述**：使用 Node.js 内存队列实现请求限流

**技术选型**：
- `p-queue` - 轻量级 Promise 队列库
- `bottleneck` - 功能强大的限流库
- 自定义实现（基于 `setInterval` + 队列）

**优点**：
- ✅ 无需外部依赖（Redis、RabbitMQ等）
- ✅ 实现简单，适合 Next.js Serverless 环境
- ✅ 零配置，开箱即用
- ✅ 适合单实例部署

**缺点**：
- ❌ 多实例部署时无法共享队列状态
- ❌ 服务器重启会丢失队列中的请求

**适用场景**：✅ **适合当前项目**（Next.js Vercel 部署，单实例或少量实例）

##### 方案 B：Redis 队列

**描述**：使用 Redis 作为消息队列

**技术选型**：
- `bull` / `bullmq` - Redis 队列库
- `ioredis` - Redis 客户端

**优点**：
- ✅ 支持多实例部署
- ✅ 持久化队列
- ✅ 支持任务重试、延迟执行

**缺点**：
- ❌ 需要 Redis 服务（额外成本）
- ❌ 增加系统复杂度
- ❌ 对于单实例部署是过度设计

**适用场景**：多实例部署、需要任务持久化

##### 方案 C：外部消息队列服务

**描述**：使用 RabbitMQ、AWS SQS 等

**优点**：
- ✅ 企业级可靠性
- ✅ 支持复杂的工作流

**缺点**：
- ❌ 成本高
- ❌ 配置复杂
- ❌ 对于1 QPS限流是过度设计

**适用场景**：大规模分布式系统

#### 2.2 推荐方案：内存队列 + 限流器

**技术选型**：`p-queue` + `bottleneck` 或自定义实现

**实现思路**：

```typescript
// THROW_AWAY - 原型代码
import PQueue from 'p-queue';

class DomeApiRateLimiter {
  private queue: PQueue;
  private lastRequestTime: number = 0;
  private minInterval: number = 1000; // 1秒 = 1000ms

  constructor() {
    // 配置队列：并发数1，间隔1000ms
    this.queue = new PQueue({
      concurrency: 1,
      interval: 1000,
      intervalCap: 1
    });
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.queue.add(async () => {
      // 确保距离上次请求至少1秒
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minInterval) {
        const waitTime = this.minInterval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.lastRequestTime = Date.now();
      return fn();
    });
  }
}

// 使用示例
const rateLimiter = new DomeApiRateLimiter();

async function fetchTradeHistory(query: TradeHistoryQuery) {
  return rateLimiter.execute(() => {
    return domeApiClient.getTradeHistory(query);
  });
}
```

**关键特性**：
- ✅ 保证请求间隔 ≥ 1秒
- ✅ 自动排队，无需手动管理
- ✅ 支持并发请求自动序列化
- ✅ 轻量级，无外部依赖

#### 2.3 多钱包聚合查询优化

**问题**：3个钱包 × 多个市场 = 大量请求，串行执行太慢

**解决方案**：请求去重 + 批量查询 + 智能缓存

```typescript
// THROW_AWAY - 原型代码
class SmartRequestManager {
  private rateLimiter: DomeApiRateLimiter;
  private cache: Map<string, { data: any, timestamp: number }>;
  private pendingRequests: Map<string, Promise<any>>;

  constructor() {
    this.rateLimiter = new DomeApiRateLimiter();
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  async getTradeHistory(query: TradeHistoryQuery): Promise<TradeRecord[]> {
    const cacheKey = this.getCacheKey(query);
    
    // 检查缓存（5秒内有效）
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5000) {
      return cached.data;
    }

    // 检查是否有相同请求正在进行
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // 创建新请求
    const request = this.rateLimiter.execute(() => {
      return domeApiClient.getTradeHistory(query);
    }).then(data => {
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      this.pendingRequests.delete(cacheKey);
      return data;
    }).catch(error => {
      this.pendingRequests.delete(cacheKey);
      throw error;
    });

    this.pendingRequests.set(cacheKey, request);
    return request;
  }

  private getCacheKey(query: TradeHistoryQuery): string {
    return JSON.stringify(query);
  }
}
```

**优化效果**：
- ✅ 相同查询自动去重（多个钱包查询同一市场时）
- ✅ 短期缓存减少重复请求
- ✅ 并行请求自动序列化

### 3. 实施可行性评估

#### 3.1 API 功能可行性

| 需求项 | Dome API 支持 | 状态 |
|--------|--------------|------|
| 按用户地址筛选交易 | ✅ `user` 参数 | ✅ 满足 |
| 按市场筛选交易 | ✅ `market_slug`, `condition_id` | ✅ 满足 |
| 按时间范围筛选 | ✅ `start_time`, `end_time` | ✅ 满足 |
| 分页查询 | ✅ `limit`, `offset` | ✅ 满足 |
| 获取活动记录 | ✅ Activity API | ✅ 满足 |
| 所有活动类型 | ✅ TRADE, SPLIT, MERGE, REDEEM等 | ✅ 满足 |
| 返回数据字段 | ✅ 包含所有必需字段 | ✅ 满足 |

**结论**：✅ **Dome API 完全满足功能需求**

#### 3.2 限流方案可行性

| 方案 | 复杂度 | 成本 | 适用性 | 推荐度 |
|------|--------|------|--------|--------|
| 内存队列（p-queue） | 低 | 免费 | 高 | ⭐⭐⭐⭐⭐ |
| Redis 队列 | 中 | 低-中 | 中 | ⭐⭐⭐ |
| 外部消息队列 | 高 | 高 | 低 | ⭐ |

**结论**：✅ **内存队列方案完全可行，推荐使用**

#### 3.3 性能影响评估

**场景1：单钱包查询**
- 请求数：1-2个（交易历史 + 活动记录）
- 耗时：1-2秒（串行）
- ✅ **可接受**

**场景2：多钱包聚合（3个钱包）**
- 请求数：6个（每个钱包2个请求）
- 无优化：6秒
- 有优化（去重+缓存）：2-3秒
- ✅ **可接受**（通过优化）

**场景3：实时更新（10秒刷新）**
- 如果上次查询在5秒内，使用缓存
- 如果超过5秒，触发新查询（1-2秒）
- ✅ **可接受**

## 风险与限制 (Risks & Limitations)

### 风险1：API 限流过于严格

**风险**：1 QPS 可能导致用户体验差（等待时间长）

**缓解措施**：
- ✅ 实现请求去重和缓存
- ✅ 优化查询策略（批量查询、智能缓存）
- ✅ 考虑升级到 Dev 层（100 QPS，成本待确认）

### 风险2：多实例部署问题

**风险**：如果部署多个 Next.js 实例，内存队列无法共享状态

**缓解措施**：
- ✅ 当前项目可能单实例部署（Vercel）
- ✅ 如果多实例，考虑升级到 Redis 方案
- ✅ 或使用 Vercel Edge Functions 的共享状态

### 风险3：队列积压

**风险**：如果请求过多，队列可能积压，导致响应延迟

**缓解措施**：
- ✅ 设置队列最大长度
- ✅ 实现请求超时机制
- ✅ 优先处理重要请求（用户主动刷新 > 自动刷新）

## 建议与结论 (Recommendations & Conclusion)

### 建议

1. **✅ 使用 Dome API**：API 功能完全满足需求
2. **✅ 使用内存队列限流**：推荐 `p-queue` 库，简单高效
3. **✅ 实现请求优化**：
   - 请求去重（相同查询合并）
   - 短期缓存（5秒）
   - 智能批量查询
4. **⚠️ 监控 API 使用**：跟踪请求频率，避免超出限制
5. **💡 考虑升级方案**：如果用户量大，考虑升级到 Dev 层

### 结论

**✅ 功能可行性**：Dome API 完全满足所有功能需求

**✅ 技术可行性**：使用内存队列（p-queue）实现 1 QPS 限流完全可行

**✅ 性能可行性**：通过请求优化，多钱包聚合查询可以在可接受时间内完成

**总体评估**：✅ **方案完全可行，可以开始实施**

## 原型代码 (Prototype Code)

### 限流器实现（简化版）

```typescript
// THROW_AWAY - 原型代码，仅用于验证可行性
// 实际实现应放在 src/lib/api/rate-limiter.ts

import PQueue from 'p-queue';

export class DomeApiRateLimiter {
  private queue: PQueue;
  private readonly MIN_INTERVAL_MS = 1000; // 1秒

  constructor() {
    this.queue = new PQueue({
      concurrency: 1,        // 同时只处理1个请求
      interval: 1000,        // 每1000ms
      intervalCap: 1,        // 最多1个请求
      timeout: 30000,        // 30秒超时
    });
  }

  /**
   * 执行限流的API请求
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.queue.add(fn, { 
      priority: 0  // 可以扩展优先级
    });
  }

  /**
   * 获取队列状态
   */
  getStatus() {
    return {
      size: this.queue.size,
      pending: this.queue.pending,
    };
  }
}

// 单例模式
export const domeApiRateLimiter = new DomeApiRateLimiter();
```

### API 适配器集成限流器

```typescript
// THROW_AWAY - 原型代码
import { domeApiRateLimiter } from './rate-limiter';
import { proxyFetch } from '@/lib/fetch';

export class DomeApiAdapter implements IPolymarketApiClient {
  private baseUrl = 'https://api.domeapi.io/v1/polymarket';
  private apiKey?: string;

  async getTradeHistory(query: TradeHistoryQuery): Promise<TradeHistoryResponse> {
    return domeApiRateLimiter.execute(async () => {
      const url = this.buildUrl('/orders', query);
      const response = await proxyFetch(url, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Dome API error: ${response.status}`);
      }
      
      return response.json();
    });
  }

  private buildUrl(endpoint: string, params: Record<string, any>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
    return url.toString();
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }
}
```

## 下一步行动 (Next Steps)

1. **安装依赖**：
   ```bash
   npm install p-queue
   npm install --save-dev @types/p-queue
   ```

2. **实现限流器**：按照原型代码实现 `src/lib/api/rate-limiter.ts`

3. **集成到适配器**：在 `DomeApiAdapter` 中使用限流器

4. **添加监控**：记录请求频率和队列状态

5. **测试验证**：测试多钱包聚合查询的性能

---

**报告日期**：2026-01-16  
**状态**：✅ 可行性确认，可以开始实施
