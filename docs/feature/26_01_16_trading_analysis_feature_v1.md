# 实现计划 (Implementation Plan)

## 需求 (Requirements)

基于需求文档 `26_01_16_trading_analysis_requirements_v1.md`，本项目旨在开发一个强大的交易分析工具，帮助用户查看和分析 Polymarket 交易记录。

### 目标重述 (Goal Restatement)

**核心目标**：构建一个比 Polymarket 官方 dashboard 更强大的交易分析工具，包括：

1. **完整的交易记录查看**：支持多维度筛选、排序和分页
2. **市场级深度分析**：整合用户交易数据和市场整体数据，进行对比分析
3. **收益统计分析**：已实现/未实现盈亏、时间维度趋势
4. **交易行为分析**：交易频率、持仓时间、胜率等
5. **多钱包聚合**：支持多个钱包地址的聚合分析
6. **实时数据更新**：默认每10秒自动刷新，支持手动刷新

**成功定义**：
- 用户能够查看所有历史交易记录，并进行多维度筛选
- 用户能够按市场查看交易汇总和盈亏情况
- 用户能够对比自己的交易表现与市场整体表现
- 用户能够管理多个钱包地址并查看聚合数据
- 数据能够实时更新（可配置）

### 约束确认 (Constraints)

- [x] **Public API 变更**：是 - 需要创建新的 API 端点（通过抽象层）
- [x] **Config 变更**：是 - 需要添加 Dome API 配置（API Key等）
- [x] **数据存储变更**：是 - 需要 localStorage 存储钱包地址列表和更新配置
- [x] **现有功能影响**：是 - 需要增强现有 Portfolio 页面，可能创建新页面

### 验收标准 (Acceptance Criteria)

#### P0 - 必须实现

- [ ] **AC-001**: 用户能够查看所有历史交易记录列表，支持按时间范围、市场、交易类型筛选
- [ ] **AC-002**: 用户能够按市场分组查看交易汇总，每个市场显示总买入量、总卖出量、当前持仓、盈亏
- [ ] **AC-003**: 市场级分析页面同时显示"我的交易数据"和"市场整体数据"，并能进行对比
- [ ] **AC-004**: 用户能够查看总体收益统计，包括已实现/未实现盈亏、交易次数、胜率
- [ ] **AC-005**: 用户能够添加、删除、启用/禁用多个钱包地址，并查看聚合数据
- [ ] **AC-006**: 数据默认每10秒自动刷新，用户可在设置中关闭并改为手动刷新

#### P1 - 重要

- [ ] **AC-007**: 用户能够按日/周/月查看收益趋势图表
- [ ] **AC-008**: 用户能够查看交易行为分析（交易频率、持仓时间、买卖比例、胜率）
- [ ] **AC-009**: 用户能够查看每个市场的详细交易时间线

#### P2 - 可选

- [ ] **AC-010**: 用户能够通过高级图表可视化交易数据
- [ ] **AC-011**: 用户能够导出交易记录和分析报告（CSV/PDF）
- [ ] **AC-012**: 用户能够获得基于历史数据的交易策略建议

### 核心接口定义 (Public Interface Design)

#### 1. API 抽象层接口

**模块**: `src/lib/api/interfaces/`

##### Trade History Interface

```typescript
// src/lib/api/interfaces/trade-history.interface.ts

/**
 * 交易历史查询参数
 */
export interface TradeHistoryQuery {
  user?: string                    // 用户钱包地址（可选，用于筛选特定用户）
  marketSlug?: string              // 市场slug（可选）
  conditionId?: string             // 条件ID（可选）
  tokenId?: string                 // Token ID（可选）
  startTime?: number               // 开始时间戳（秒）
  endTime?: number                // 结束时间戳（秒）
  limit?: number                   // 每页数量（1-1000，默认100）
  offset?: number                  // 分页偏移量（默认0）
}

/**
 * 交易记录
 */
export interface TradeRecord {
  tokenId: string
  tokenLabel: string                // "Yes" 或 "No"
  side: 'BUY' | 'SELL'
  marketSlug: string
  conditionId: string
  shares: number                   // 原始份额（整数）
  sharesNormalized: number         // 标准化份额（小数）
  price: number                    // 价格（0-1之间）
  blockNumber: number
  logIndex: number
  txHash: string                   // 交易哈希
  title: string                    // 市场标题
  timestamp: number                // Unix时间戳（秒）
  orderHash: string
  user: string                     // 用户钱包地址
  taker?: string                   // Taker地址（可选）
}

/**
 * 交易历史响应
 */
export interface TradeHistoryResponse {
  orders: TradeRecord[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}
```

##### Activity Interface

```typescript
// src/lib/api/interfaces/activity.interface.ts

/**
 * 活动记录查询参数
 */
export interface ActivityQuery {
  user?: string
  marketSlug?: string
  conditionId?: string
  startTime?: number
  endTime?: number
  limit?: number
  offset?: number
}

/**
 * 活动类型
 */
export type ActivityType = 'TRADE' | 'SPLIT' | 'MERGE' | 'REDEEM' | 'REWARD' | 'CONVERSION'

/**
 * 活动记录
 */
export interface ActivityRecord {
  tokenId: string
  tokenLabel: string
  side: 'BUY' | 'SELL' | ''
  marketSlug: string
  conditionId: string
  shares: number
  sharesNormalized: number
  price: number
  blockNumber: number
  logIndex: number
  txHash: string
  title: string
  timestamp: number
  orderHash: string
  user: string
  type: ActivityType
}

/**
 * 活动记录响应
 */
export interface ActivityResponse {
  activities: ActivityRecord[]
  pagination: {
    limit: number
    offset: number
    count: number
    hasMore: boolean
  }
}
```

##### API Client Interface

```typescript
// src/lib/api/api-client.ts

import { TradeHistoryQuery, TradeHistoryResponse } from './interfaces/trade-history.interface'
import { ActivityQuery, ActivityResponse } from './interfaces/activity.interface'

/**
 * API客户端抽象接口
 * 所有API适配器必须实现此接口
 */
export interface IPolymarketApiClient {
  /**
   * 获取交易历史
   */
  getTradeHistory(query: TradeHistoryQuery): Promise<TradeHistoryResponse>
  
  /**
   * 获取活动记录
   */
  getActivity(query: ActivityQuery): Promise<ActivityResponse>
  
  /**
   * 获取所有交易历史（自动处理分页）
   */
  getAllTradeHistory(query: Omit<TradeHistoryQuery, 'limit' | 'offset'>): Promise<TradeRecord[]>
  
  /**
   * 获取所有活动记录（自动处理分页）
   */
  getAllActivity(query: Omit<ActivityQuery, 'limit' | 'offset'>): Promise<ActivityRecord[]>
}
```

**设计理由**：
- 使用接口抽象，便于未来更换API供应商
- 统一的查询参数和响应格式，隐藏底层API差异
- 提供便捷方法（getAll*）自动处理分页，简化业务代码

#### 2. API 限流器接口

**模块**: `src/lib/api/rate-limiter.ts`

```typescript
/**
 * 限流器状态
 */
export interface RateLimiterStatus {
  size: number              // 队列中等待的请求数
  pending: number           // 正在处理的请求数
}

/**
 * API 限流器接口
 * 用于控制 Dome API 的请求频率（1 QPS）
 */
export interface IApiRateLimiter {
  /**
   * 执行限流的API请求
   * @param fn 要执行的异步函数
   * @param priority 优先级（可选，数字越大优先级越高）
   */
  execute<T>(fn: () => Promise<T>, priority?: number): Promise<T>
  
  /**
   * 获取限流器状态
   */
  getStatus(): RateLimiterStatus
  
  /**
   * 清空队列（取消所有等待的请求）
   */
  clear(): void
}
```

**设计理由**：
- Dome API 免费层限制为 1 QPS（每秒1个请求）
- 需要确保请求间隔 ≥ 1秒
- 使用队列自动管理请求顺序
- 支持优先级，重要请求可以优先处理

#### 3. 请求管理器接口（可选优化）

**模块**: `src/lib/api/request-manager.ts`

```typescript
/**
 * 请求管理器接口
 * 提供请求去重、缓存等优化功能
 */
export interface IRequestManager {
  /**
   * 获取交易历史（带缓存和去重）
   */
  getTradeHistory(query: TradeHistoryQuery): Promise<TradeHistoryResponse>
  
  /**
   * 获取活动记录（带缓存和去重）
   */
  getActivity(query: ActivityQuery): Promise<ActivityResponse>
  
  /**
   * 清除缓存
   */
  clearCache(): void
  
  /**
   * 获取缓存统计
   */
  getCacheStats(): { hits: number, misses: number, size: number }
}
```

**设计理由**：
- 多钱包聚合查询时，可能查询相同市场
- 请求去重避免重复API调用
- 短期缓存（5秒）减少API请求
- 提升用户体验，减少等待时间

#### 4. 钱包管理接口

**模块**: `src/lib/wallet-manager.ts`

```typescript
/**
 * 钱包地址配置
 */
export interface WalletConfig {
  address: string                  // Ethereum地址
  alias?: string                  // 用户设置的别名
  enabled: boolean                // 是否启用
  createdAt: number               // 创建时间戳
}

/**
 * 钱包管理器接口
 */
export interface IWalletManager {
  /**
   * 获取所有钱包配置
   */
  getWallets(): WalletConfig[]
  
  /**
   * 获取启用的钱包地址列表
   */
  getEnabledWallets(): string[]
  
  /**
   * 添加钱包地址
   */
  addWallet(address: string, alias?: string): void
  
  /**
   * 删除钱包地址
   */
  removeWallet(address: string): void
  
  /**
   * 更新钱包配置
   */
  updateWallet(address: string, updates: Partial<WalletConfig>): void
  
  /**
   * 验证Ethereum地址格式
   */
  validateAddress(address: string): boolean
}
```

#### 3. 数据聚合服务接口

**模块**: `src/lib/services/trading-analysis.service.ts`

```typescript
/**
 * 市场交易汇总
 */
export interface MarketSummary {
  conditionId: string
  marketSlug: string
  title: string
  totalBought: number             // 总买入量
  totalSold: number                // 总卖出量
  currentHolding: number          // 当前持仓
  realizedPnL: number             // 已实现盈亏
  unrealizedPnL: number            // 未实现盈亏
  totalPnL: number                 // 总盈亏
  tradeCount: number               // 交易次数
  avgBuyPrice: number              // 平均买入价格
  avgSellPrice: number             // 平均卖出价格
}

/**
 * 总体收益统计
 */
export interface OverallStats {
  totalRealizedPnL: number
  totalUnrealizedPnL: number
  totalPnL: number
  totalTradeCount: number
  totalVolume: number
  winningTrades: number
  losingTrades: number
  winRate: number                  // 胜率（0-1）
}

/**
 * 交易分析服务接口
 */
export interface ITradingAnalysisService {
  /**
   * 获取市场汇总（支持多钱包聚合）
   */
  getMarketSummaries(walletAddresses: string[]): Promise<MarketSummary[]>
  
  /**
   * 获取总体统计（支持多钱包聚合）
   */
  getOverallStats(walletAddresses: string[]): Promise<OverallStats>
  
  /**
   * 获取交易行为分析
   */
  getTradingBehavior(walletAddresses: string[]): Promise<TradingBehavior>
}
```

### 备选方案 (Alternatives)

#### 方案 A：稳健策略（Robust Strategy）- ✅ 推荐采纳

**描述**：
- 完整实现API抽象层（接口定义 + 适配器模式）
- 创建独立的钱包管理服务
- 创建交易分析服务层，封装业务逻辑
- 使用React Query进行数据管理和自动刷新
- 创建新的交易分析页面组件

**优点**：
- ✅ 架构清晰，易于维护和扩展
- ✅ 符合SOLID原则，职责分离
- ✅ 便于单元测试和Mock
- ✅ 未来更换API供应商成本低
- ✅ 代码复用性好

**缺点**：
- ❌ 初期开发工作量较大
- ❌ 需要创建较多新文件

**理由**：本项目是核心功能，需要长期维护，稳健策略能提供更好的可维护性和扩展性。

#### 方案 B：极简策略（Minimalist Strategy）- ❌ 驳回

**描述**：
- 直接在现有API路由中调用Dome API
- 在Portfolio页面组件中直接添加新功能
- 使用useState和useEffect管理状态和刷新

**优点**：
- ✅ 开发速度快
- ✅ 代码量少

**缺点**：
- ❌ 违反需求文档中的"必须实现API抽象层"要求
- ❌ 难以测试和维护
- ❌ 未来更换API供应商需要大量重构
- ❌ 代码耦合度高，难以复用

**理由**：虽然开发速度快，但违反了关键架构要求，且长期维护成本高。

### 依赖影响 (Dependency Impact)

#### 新增依赖

1. **Dome API**（外部服务）
   - 需要API Key（待确认）
   - 需要配置环境变量：`DOME_API_KEY`（可选）
   - 基础URL：`https://api.domeapi.io/v1/polymarket`
   - 影响：如果API不可用，功能将无法工作

2. **React Query**（已存在）
   - 用于数据获取、缓存和自动刷新
   - 需要确认版本兼容性

#### 现有依赖复用

1. **shadcn/ui 组件库**（已存在）
   - 复用：Card, Table, Select, Button, Badge, Dialog等
   - 无需新增依赖

2. **recharts**（已存在）
   - 复用：用于收益趋势图表
   - 无需新增依赖

3. **lucide-react**（已存在）
   - 复用：图标组件
   - 无需新增依赖

#### 对现有模块的影响

1. **Portfolio 页面** (`src/app/portfolio/page.tsx`)
   - 影响：增强现有页面，添加新的Tab或Section
   - 风险：低 - 主要是添加新功能，不破坏现有功能

2. **API 路由** (`src/app/api/`)
   - 影响：创建新的API端点，通过抽象层调用
   - 风险：低 - 新端点不影响现有端点

3. **钱包地址Hook** (`src/hooks/use-wallet-address.ts`)
   - 影响：可能需要扩展以支持多钱包
   - 风险：中 - 需要保持向后兼容

## 约束与复用检查 (Constraints & Reuse)

### 配置检查

- [x] **配置变更**：是
  - 新增环境变量：`DOME_API_KEY`（可选，如果Dome API需要）
  - 新增配置文件：`src/lib/config.ts` 中添加Dome API配置
  - 理由：需要配置API基础URL和认证信息

### 接口检查

- [x] **Public API 变更**：是
  - 新增API端点：
    - `/api/trading/trade-history` - 获取交易历史
    - `/api/trading/activity` - 获取活动记录
    - `/api/trading/market-summary` - 获取市场汇总
    - `/api/trading/overall-stats` - 获取总体统计
  - 理由：通过Next.js API路由提供统一的数据接口

### 复用分析

#### 需实现功能 vs 现有代码

1. **钱包地址验证**
   - 需实现功能：验证Ethereum地址格式
   - 现有候选：`src/app/api/portfolio/activity/route.ts` 中的 `isValidEthereumAddress`
   - 决策：**复用** - 提取到 `src/lib/utils.ts` 作为公共函数

2. **数据获取和代理**
   - 需实现功能：通过代理获取外部API数据
   - 现有候选：`src/lib/fetch.ts` 中的 `proxyFetch`
   - 决策：**复用** - 在API适配器中使用 `proxyFetch`

3. **图表组件**
   - 需实现功能：收益趋势图表
   - 现有候选：`src/app/portfolio/page.tsx` 中的图表实现
   - 决策：**复用** - 复用recharts和现有Chart组件

4. **钱包地址管理**
   - 需实现功能：多钱包地址存储和管理
   - 现有候选：`src/hooks/use-wallet-address.ts`（单钱包）
   - 决策：**新写** - 创建新的多钱包管理服务，但可以复用localStorage逻辑

5. **Portfolio工具函数**
   - 需实现功能：盈亏计算、格式化等
   - 现有候选：`src/lib/portfolio-utils.ts`
   - 决策：**扩展** - 在现有文件中添加新函数，不破坏现有功能

## 影响分析 (Impact Analysis)

### 受影响范围 (Scope)

#### 模块影响

1. **新增模块**：
   - `src/lib/api/` - API抽象层（全新）
   - `src/lib/services/` - 业务服务层（部分新增）
   - `src/components/trading-analysis/` - 交易分析组件（全新）

2. **修改模块**：
   - `src/app/portfolio/page.tsx` - 增强Portfolio页面
   - `src/lib/config.ts` - 添加API配置
   - `src/lib/portfolio-utils.ts` - 添加新的工具函数

3. **扩展模块**：
   - `src/hooks/` - 可能需要新的Hook（如 `useTradingAnalysis`）

#### API 影响

- **无 Breaking Changes**：
  - 所有新API端点都是新增的，不影响现有API
  - 现有API端点保持不变

#### 数据影响

- **Schema 变更**：
  - localStorage新增键：
    - `wallet_addresses` - 存储钱包地址列表
    - `auto_refresh_enabled` - 存储自动刷新配置
  - 不影响现有数据存储

### 风险 (Risks)

1. **API依赖风险**
   - 风险：Dome API不可用或限流
   - 缓解：实现错误处理和降级策略，显示友好的错误提示

2. **性能风险**
   - 风险：多钱包聚合查询可能导致API请求过多
   - 缓解：使用React Query缓存，并行请求但控制并发数，实现请求去重

3. **数据准确性风险**
   - 风险：盈亏计算逻辑复杂，可能出现计算错误
   - 缓解：编写单元测试，与Polymarket官方数据对比验证

4. **向后兼容风险**
   - 风险：修改现有Portfolio页面可能影响现有用户
   - 缓解：保持现有功能不变，新功能以Tab或Section形式添加

5. **API抽象层复杂度风险**
   - 风险：抽象层设计不当可能导致过度工程
   - 缓解：遵循YAGNI原则，只抽象必要的接口，保持简单

## 详细变更计划 (Detailed Changes)

### 阶段1：API抽象层基础架构

#### 1. 新增文件: `src/lib/api/interfaces/trade-history.interface.ts`

- **变更类型**: 新增
- **变更描述**:
  - 定义 `TradeHistoryQuery` 接口（查询参数）
  - 定义 `TradeRecord` 接口（交易记录）
  - 定义 `TradeHistoryResponse` 接口（API响应）
  - 导出所有接口供其他模块使用

#### 2. 新增文件: `src/lib/api/interfaces/activity.interface.ts`

- **变更类型**: 新增
- **变更描述**:
  - 定义 `ActivityQuery` 接口
  - 定义 `ActivityType` 类型（TRADE, SPLIT, MERGE等）
  - 定义 `ActivityRecord` 接口
  - 定义 `ActivityResponse` 接口

#### 3. 新增文件: `src/lib/api/interfaces/market-data.interface.ts`

- **变更类型**: 新增
- **变更描述**:
  - 定义市场数据相关接口（用于市场整体数据）
  - 定义市场统计接口

#### 4. 新增文件: `src/lib/api/api-client.ts`

- **变更类型**: 新增
- **变更描述**:
  - 定义 `IPolymarketApiClient` 接口
  - 作为所有API适配器的统一接口
  - 包含核心方法：`getTradeHistory`, `getActivity`, `getAllTradeHistory`, `getAllActivity`

#### 5. 新增文件: `src/lib/api/rate-limiter.ts`

- **变更类型**: 新增
- **变更描述**:
  - 实现 `IApiRateLimiter` 接口
  - 使用 `p-queue` 库实现请求队列
  - 配置限流参数：1 QPS（concurrency: 1, interval: 1100ms，确保安全边际）
  - 添加额外的延迟检查，确保请求间隔至少 1.1 秒
  - 支持请求优先级
  - 提供状态查询和队列管理

**关键逻辑**：
```typescript
import PQueue from 'p-queue';

export class DomeApiRateLimiter implements IApiRateLimiter {
  private queue: PQueue;
  private readonly MIN_INTERVAL_MS = 1100; // 1.1秒，确保安全边际
  private lastRequestTime: number = 0;

  constructor() {
    this.queue = new PQueue({
      concurrency: 1,        // 同时只处理1个请求
      interval: 1100,        // 每1100ms（1.1秒），确保安全边际
      intervalCap: 1,        // 最多1个请求
      timeout: 60000,        // 60秒超时（增加超时时间）
    });
  }

  async execute<T>(fn: () => Promise<T>, priority: number = 0): Promise<T> {
    return this.queue.add(async () => {
      // 额外的安全检查：确保距离上次请求至少 1.1 秒
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.MIN_INTERVAL_MS) {
        const waitTime = this.MIN_INTERVAL_MS - timeSinceLastRequest;
        console.log(`[RateLimiter] Waiting ${waitTime}ms to ensure 1.1s interval`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      this.lastRequestTime = Date.now();
      return fn();
    }, { priority });
  }

  getStatus(): RateLimiterStatus {
    return {
      size: this.queue.size,
      pending: this.queue.pending,
    };
  }

  clear(): void {
    this.queue.clear();
  }
}

// 单例模式，全局共享限流器
export const domeApiRateLimiter = new DomeApiRateLimiter();
```

**改进说明**：
- **请求间隔优化**：从 1000ms 增加到 1100ms，确保安全边际，避免触发 429 错误
- **双重保护**：p-queue 的 interval 配置 + 额外的延迟检查，确保请求间隔严格控制在 1.1 秒以上
- **超时时间增加**：从 30 秒增加到 60 秒，适应大量数据的获取场景

**依赖安装**：
```bash
npm install p-queue
npm install --save-dev @types/p-queue
```

#### 5.1 429 错误处理和自动重试机制

- **变更类型**: 增强
- **变更描述**:
  - 在 `DomeApiAdapter` 中添加 `handleApiResponse` 方法
  - 自动检测和处理 429 限流错误
  - 解析 API 返回的 `retry_after` 时间
  - 自动重试（最多 3 次），重试时也会通过限流器
  - 改进错误日志，包含更详细的错误信息

**关键逻辑**：
```typescript
private async handleApiResponse<T>(
  response: Response,
  retryFn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  if (response.ok) {
    return await response.json() as T
  }

  const errorText = await response.text()
  
  // 处理 429 限流错误
  if (response.status === 429) {
    try {
      const errorData = JSON.parse(errorText)
      retryAfter = errorData.retry_after || (errorData.rate_limit?.reset_time 
        ? Math.max(1, errorData.rate_limit.reset_time - Math.floor(Date.now() / 1000))
        : 6) // 默认等待 6 秒
      
      if (maxRetries > 0) {
        console.warn(`[Dome API] Rate limit exceeded (429). Retrying after ${retryAfter}s`)
        await new Promise(resolve => setTimeout(resolve, retryAfter! * 1000))
        return retryFn() // 重试时也会通过限流器
      }
    } catch {
      // 如果无法解析 JSON，使用默认重试逻辑
      if (maxRetries > 0) {
        await new Promise(resolve => setTimeout(resolve, 6000))
        return retryFn()
      }
    }
  }
  
  // 处理其他错误...
  throw new Error(errorMessage)
}
```

**工作原理**：
1. 每个 API 请求都通过 `handleApiResponse` 处理响应
2. 如果遇到 429 错误：
   - 解析 `retry_after` 时间（或使用默认 6 秒）
   - 等待指定时间
   - 自动重试（最多 3 次）
   - 重试时也会通过限流器，确保遵守 1 QPS 限制
3. 所有错误都会记录详细的日志信息

#### 6. 新增文件: `src/lib/api/request-manager.ts`（可选优化）

- **变更类型**: 新增
- **变更描述**:
  - 实现 `IRequestManager` 接口
  - 提供请求去重功能（相同查询合并）
  - 实现短期缓存（5秒TTL）
  - 集成限流器
  - 减少重复API调用

**关键逻辑**：
```typescript
export class RequestManager implements IRequestManager {
  private rateLimiter: IApiRateLimiter;
  private cache: Map<string, { data: any, timestamp: number }>;
  private pendingRequests: Map<string, Promise<any>>;
  private readonly CACHE_TTL_MS = 5000; // 5秒缓存

  constructor(rateLimiter: IApiRateLimiter) {
    this.rateLimiter = rateLimiter;
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  async getTradeHistory(query: TradeHistoryQuery): Promise<TradeHistoryResponse> {
    const cacheKey = this.getCacheKey('trade-history', query);
    
    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    // 检查是否有相同请求正在进行
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // 创建新请求（通过限流器）
    const request = this.rateLimiter.execute(() => {
      return apiClient.getTradeHistory(query);
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

  private getCacheKey(prefix: string, query: any): string {
    return `${prefix}:${JSON.stringify(query)}`;
  }
}
```

#### 7. 新增文件: `src/lib/api/adapters/dome-api.adapter.ts`

- **变更类型**: 新增
- **变更描述**:
  - 实现 `IPolymarketApiClient` 接口
  - 封装 Dome API 调用逻辑
  - 使用 `proxyFetch` 进行HTTP请求
  - **集成限流器**：所有API调用通过限流器执行
  - 处理API响应格式转换（Dome API格式 -> 统一接口格式）
  - 实现自动分页逻辑（`getAll*` 方法）
  - 错误处理和重试逻辑

**关键逻辑**：
```typescript
import { domeApiRateLimiter } from '../rate-limiter';
import { proxyFetch } from '@/lib/fetch';

class DomeApiAdapter implements IPolymarketApiClient {
  private baseUrl = 'https://api.domeapi.io/v1/polymarket';
  private apiKey?: string;

  async getTradeHistory(query: TradeHistoryQuery): Promise<TradeHistoryResponse> {
    // 通过限流器执行请求
    return domeApiRateLimiter.execute(async () => {
      const url = this.buildUrl('/orders', query);
      const response = await proxyFetch(url, {
        headers: this.getHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`Dome API error: ${response.status}`);
      }
      
      const data = await response.json();
      // 转换响应格式（Dome API格式 -> 统一接口格式）
      return this.transformTradeHistoryResponse(data);
    });
  }
  
  async getAllTradeHistory(query): Promise<TradeRecord[]> {
    // 循环调用 getTradeHistory
    // 处理分页（offset递增）
    // 合并所有结果
    // 注意：每次分页请求都会通过限流器，自动保证1 QPS
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

#### 8. 修改文件: `src/lib/config.ts`

- **变更类型**: 修改
- **变更描述**:
  - 添加 Dome API 配置：
    ```typescript
    DOME_API: {
      BASE_URL: 'https://api.domeapi.io/v1/polymarket',
      API_KEY: process.env.DOME_API_KEY, // 可选
      RATE_LIMIT: {
        QPS: 1,                    // 每秒1个请求
        INTERVAL_MS: 1000,         // 间隔1000ms
      }
    }
    ```

### 阶段2：钱包管理功能

#### 9. 新增文件: `src/lib/wallet-manager.ts`

- **变更类型**: 新增
- **变更描述**:
  - 实现 `IWalletManager` 接口
  - 使用 localStorage 持久化钱包配置
  - 实现钱包的增删改查
  - 实现地址格式验证（复用现有 `isValidEthereumAddress`）

**关键逻辑**：
```typescript
class WalletManager implements IWalletManager {
  private STORAGE_KEY = 'wallet_addresses'
  
  getWallets(): WalletConfig[] {
    // 从 localStorage 读取
    // 返回配置列表
  }
  
  addWallet(address: string, alias?: string): void {
    // 验证地址格式
    // 检查是否已存在
    // 添加到列表
    // 保存到 localStorage
  }
}
```

#### 10. 新增文件: `src/hooks/use-wallet-manager.ts`

- **变更类型**: 新增
- **变更描述**:
  - React Hook 封装钱包管理器
  - 提供响应式状态管理
  - 自动同步 localStorage

### 阶段3：交易分析服务层

#### 11. 新增文件: `src/lib/services/trading-analysis.service.ts`

- **变更类型**: 新增
- **变更描述**:
  - 实现 `ITradingAnalysisService` 接口
  - 封装业务逻辑：市场汇总、总体统计、交易行为分析
  - 支持多钱包聚合计算
  - 实现盈亏计算逻辑（已实现/未实现）

**关键逻辑**：
```typescript
class TradingAnalysisService implements ITradingAnalysisService {
  constructor(private apiClient: IPolymarketApiClient) {}
  
  async getMarketSummaries(walletAddresses: string[]): Promise<MarketSummary[]> {
    // 并行获取所有钱包的交易历史
    // 按市场分组
    // 计算每个市场的汇总数据
    // 返回市场汇总列表
  }
  
  calculatePnL(trades: TradeRecord[]): { realized: number, unrealized: number } {
    // 实现FIFO或平均成本法计算盈亏
    // 区分已实现和未实现盈亏
  }
}
```

#### 12. 新增文件: `src/hooks/use-trading-analysis.ts`

- **变更类型**: 新增
- **变更描述**:
  - React Hook 封装交易分析服务
  - 使用 React Query 进行数据获取和缓存
  - 实现自动刷新（refetchInterval: 10000）
  - 支持手动刷新
  - 支持多钱包聚合查询

**关键逻辑**：
```typescript
export function useTradingAnalysis(walletAddresses: string[], options?: {
  autoRefresh?: boolean
}) {
  const queryClient = useQueryClient()
  const analysisService = useTradingAnalysisService()
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['trading-analysis', walletAddresses],
    queryFn: () => analysisService.getMarketSummaries(walletAddresses),
    refetchInterval: options?.autoRefresh ? 10000 : false,
    staleTime: 5000,
  })
  
  return { data, isLoading, error, refetch }
}
```

### 阶段4：API路由层

#### 13. 新增文件: `src/app/api/trading/trade-history/route.ts`

- **变更类型**: 新增
- **变更描述**:
  - Next.js API 路由
  - 接收查询参数（user, marketSlug, startTime等）
  - 调用 API 客户端获取数据
  - 返回统一格式的响应

#### 14. 新增文件: `src/app/api/trading/activity/route.ts`

- **变更类型**: 新增
- **变更描述**: 类似 trade-history，用于活动记录

#### 15. 新增文件: `src/app/api/trading/market-summary/route.ts`

- **变更类型**: 新增
- **变更描述**:
  - 接收钱包地址列表
  - 调用交易分析服务
  - 返回市场汇总数据

#### 16. 新增文件: `src/app/api/trading/overall-stats/route.ts`

- **变更类型**: 新增
- **变更描述**: 返回总体统计数据

### 阶段5：UI组件层

#### 17. 新增文件: `src/components/trading-analysis/trade-history-table.tsx`

- **变更类型**: 新增
- **变更描述**:
  - 交易记录表格组件
  - 支持筛选（时间、市场、类型）
  - 支持排序
  - 支持分页
  - 使用 shadcn/ui Table 组件

#### 18. 新增文件: `src/components/trading-analysis/market-summary-card.tsx`

- **变更类型**: 新增
- **变更描述**:
  - 市场汇总卡片组件
  - 显示市场基本信息
  - 显示交易汇总和盈亏
  - 可点击查看详情

#### 19. 新增文件: `src/components/trading-analysis/market-detail-view.tsx`

- **变更类型**: 新增
- **变更描述**:
  - 市场详细分析视图
  - 显示"我的交易数据"和"市场整体数据"
  - 对比图表
  - 交易时间线

#### 20. 新增文件: `src/components/trading-analysis/wallet-manager-dialog.tsx`

- **变更类型**: 新增
- **变更描述**:
  - 钱包管理对话框
  - 添加/删除钱包
  - 设置别名
  - 启用/禁用

#### 21. 修改文件: `src/app/portfolio/page.tsx`

- **变更类型**: 修改
- **变更描述**:
  - 添加新的 Tab 或 Section："交易分析"
  - 集成交易分析组件
  - 保持现有功能不变
  - 使用新的多钱包管理

### 阶段6：工具函数扩展

#### 22. 修改文件: `src/lib/utils.ts`

- **变更类型**: 修改
- **变更描述**:
  - 提取 `isValidEthereumAddress` 函数（从现有API路由中）
  - 使其成为公共工具函数

#### 23. 修改文件: `src/lib/portfolio-utils.ts`

- **变更类型**: 修改
- **变更描述**:
  - 添加新的工具函数：
    - `calculateRealizedPnL()` - 计算已实现盈亏
    - `calculateUnrealizedPnL()` - 计算未实现盈亏
    - `calculateWinRate()` - 计算胜率
    - `calculateAverageHoldingTime()` - 计算平均持仓时间

## 实施步骤 (Execution Steps)

### Phase 1: 基础架构（API抽象层 + 限流器）

1. [ ] 安装依赖：`npm install p-queue` 和 `npm install --save-dev @types/p-queue`
2. [ ] 创建目录结构 `src/lib/api/interfaces/`、`src/lib/api/adapters/`
3. [ ] 创建 `src/lib/api/interfaces/trade-history.interface.ts`，定义接口
4. [ ] 创建 `src/lib/api/interfaces/activity.interface.ts`，定义接口
5. [ ] 创建 `src/lib/api/interfaces/market-data.interface.ts`，定义接口
6. [ ] 创建 `src/lib/api/api-client.ts`，定义 `IPolymarketApiClient` 接口
7. [ ] **创建 `src/lib/api/rate-limiter.ts`，实现限流器**
   - 实现 `IApiRateLimiter` 接口
   - 使用 `p-queue` 配置 1 QPS 限流
   - 实现单例模式
   - 添加状态查询方法
8. [ ] **创建 `src/lib/api/request-manager.ts`（可选优化）**
   - 实现请求去重和缓存
   - 集成限流器
   - 减少重复API调用
9. [ ] 创建 `src/lib/api/adapters/dome-api.adapter.ts`，实现适配器
   - **集成限流器**：所有API调用通过 `domeApiRateLimiter.execute()` 执行
   - 封装 Dome API 调用逻辑
   - 处理响应格式转换
10. [ ] 修改 `src/lib/config.ts`，添加 Dome API 配置和限流配置
11. [ ] 编写单元测试验证限流器功能（测试请求间隔、队列管理等）
12. [ ] 编写单元测试验证适配器功能

### Phase 2: 钱包管理

13. [ ] 创建 `src/lib/wallet-manager.ts`，实现钱包管理器
14. [ ] 创建 `src/hooks/use-wallet-manager.ts`，创建 React Hook
15. [ ] 提取 `isValidEthereumAddress` 到 `src/lib/utils.ts`
16. [ ] 测试钱包管理功能（添加、删除、启用/禁用）

### Phase 3: 服务层

17. [ ] 创建 `src/lib/services/trading-analysis.service.ts`，实现分析服务
18. [ ] 实现盈亏计算逻辑（FIFO或平均成本法）
19. [ ] 创建 `src/hooks/use-trading-analysis.ts`，集成 React Query
20. [ ] 测试服务层逻辑
21. [ ] **测试限流器在多钱包聚合查询中的表现**（验证请求间隔、队列管理）

### Phase 4: API路由

22. [ ] 创建 `src/app/api/trading/trade-history/route.ts`
23. [ ] 创建 `src/app/api/trading/activity/route.ts`
24. [ ] 创建 `src/app/api/trading/market-summary/route.ts`
25. [ ] 创建 `src/app/api/trading/overall-stats/route.ts`
26. [ ] 测试所有API端点
27. [ ] **测试API路由的限流行为**（验证不会超出1 QPS限制）

### Phase 5: UI组件

28. [ ] 创建 `src/components/trading-analysis/trade-history-table.tsx`
29. [ ] 创建 `src/components/trading-analysis/market-summary-card.tsx`
30. [ ] 创建 `src/components/trading-analysis/market-detail-view.tsx`
31. [ ] 创建 `src/components/trading-analysis/wallet-manager-dialog.tsx`
32. [ ] 修改 `src/app/portfolio/page.tsx`，集成新组件
33. [ ] 测试UI交互和响应式设计
34. [ ] **添加限流器状态显示**（可选：显示队列长度、等待时间等）

### Phase 6: 完善和优化

35. [ ] 扩展 `src/lib/portfolio-utils.ts`，添加新工具函数
36. [ ] 实现实时更新配置（localStorage）
37. [ ] 添加错误处理和用户提示
38. [ ] **性能优化**：
   - 验证请求去重和缓存策略的有效性
   - 监控限流器队列状态
   - 优化多钱包查询策略
39. [ ] **限流器监控和日志**：
   - 记录API请求频率
   - 监控队列积压情况
   - 添加告警机制（队列过长时）
40. [ ] 编写集成测试（包括限流器测试）
41. [ ] 代码审查和重构

## 验证计划 (Verification Plan)

### 自动化测试

1. **单元测试**：
   - **限流器**：测试请求间隔、队列管理、优先级
   - **请求管理器**：测试请求去重、缓存机制
   - API适配器：测试Dome API响应转换、限流器集成
   - 钱包管理器：测试localStorage操作
   - 交易分析服务：测试盈亏计算逻辑
   - 工具函数：测试各种计算函数

2. **集成测试**：
   - API路由：测试端到端数据流
   - React Hook：测试数据获取和状态管理
   - 组件：测试用户交互

### 手动验证

1. **功能验证**：
   - 添加多个钱包地址
   - 查看交易记录列表，测试筛选和排序
   - 查看市场汇总，验证数据准确性
   - 查看市场详细分析，对比我的数据与市场数据
   - 测试实时更新（10秒自动刷新）
   - 测试手动刷新
   - 关闭自动更新，验证手动刷新按钮

2. **数据准确性验证**：
   - 与Polymarket官方dashboard对比数据
   - 验证盈亏计算是否正确
   - 验证多钱包聚合是否正确

3. **性能验证**：
   - 测试大量交易记录（1000+条）的加载性能
   - 测试多钱包聚合查询的性能（验证限流器效果）
   - 验证缓存是否正常工作
   - **验证限流器**：
     - 确认请求间隔 ≥ 1秒
     - 验证队列不会无限增长
     - 测试请求去重是否有效
     - 验证缓存是否减少API调用

4. **兼容性验证**：
   - 测试Chrome、Firefox、Safari
   - 测试暗色/亮色主题
   - 测试响应式布局

---

*文档将分步完善，当前完成：理解与重述、验收标准、核心接口定义、备选方案、依赖影响分析、详细变更计划、实施步骤、验证计划*
