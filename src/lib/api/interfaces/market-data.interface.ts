/**
 * 市场数据接口定义
 * 用于市场整体数据相关接口
 */

/**
 * 市场统计信息
 */
export interface MarketStats {
  conditionId: string
  marketSlug: string
  title: string
  totalVolume: number              // 总交易量
  totalTradeCount: number          // 总交易次数
  currentPrice: number             // 当前价格
  priceChange24h?: number          // 24小时价格变化
  priceChange7d?: number            // 7天价格变化
  priceChange30d?: number          // 30天价格变化
  liquidity?: number               // 流动性
}
