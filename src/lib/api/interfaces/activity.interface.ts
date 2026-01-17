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
