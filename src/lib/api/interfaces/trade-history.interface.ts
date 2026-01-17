/**
 * 交易历史查询参数
 */
export interface TradeHistoryQuery {
  user?: string                    // 用户钱包地址（可选，用于筛选特定用户）
  marketSlug?: string              // 市场slug（可选）
  conditionId?: string              // 条件ID（可选）
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
