import { IPolymarketApiClient } from '../api/api-client'
import { TradeRecord } from '../api/interfaces/trade-history.interface'
import { ActivityRecord } from '../api/interfaces/activity.interface'

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
  firstTradeTime?: number          // 首次交易时间
  lastTradeTime?: number            // 最后交易时间
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
  avgProfit: number                // 平均盈利
  avgLoss: number                  // 平均亏损
}

/**
 * 交易行为分析
 */
export interface TradingBehavior {
  tradeFrequency: {
    daily: number                  // 日均交易次数
    weekly: number                 // 周均交易次数
  }
  averageHoldingTime: number       // 平均持仓时间（秒）
  buySellRatio: {
    buyCount: number
    sellCount: number
    ratio: number                  // 买入/卖出比例
  }
  winRate: number                  // 胜率
  avgProfit: number                // 平均盈利
  avgLoss: number                  // 平均亏损
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

/**
 * 交易分析服务实现
 */
export class TradingAnalysisService implements ITradingAnalysisService {
  constructor(private apiClient: IPolymarketApiClient) {}

  /**
   * 获取市场汇总（支持多钱包聚合）
   */
  async getMarketSummaries(walletAddresses: string[]): Promise<MarketSummary[]> {
    if (walletAddresses.length === 0) {
      return []
    }

    console.log('[TradingAnalysis] Fetching market summaries for wallets:', walletAddresses)

    try {
      // 串行获取所有钱包的交易历史（避免并发导致限流器队列积累过多请求）
      // 虽然限流器是单例，但多个 getAllTradeHistory 同时启动会向队列添加大量请求
      const allTrades: TradeRecord[] = []
      
      for (const address of walletAddresses) {
        try {
          console.log(`[TradingAnalysis] Fetching trades for wallet: ${address}`)
          const trades = await this.apiClient.getAllTradeHistory({ user: address })
          allTrades.push(...trades)
          console.log(`[TradingAnalysis] Fetched ${trades.length} trades for ${address}`)
        } catch (error) {
          console.error(`[TradingAnalysis] Error fetching trades for ${address}:`, error)
          // 继续处理其他钱包，不阻塞
        }
      }
      
      console.log('[TradingAnalysis] Total trades fetched:', allTrades.length)

    // 按市场分组
    const marketMap = new Map<string, TradeRecord[]>()
    for (const trade of allTrades) {
      const key = `${trade.conditionId}-${trade.marketSlug}`
      if (!marketMap.has(key)) {
        marketMap.set(key, [])
      }
      marketMap.get(key)!.push(trade)
    }

      // 计算每个市场的汇总
      const summaries: MarketSummary[] = []
      for (const [key, trades] of marketMap) {
        try {
          const summary = this.calculateMarketSummary(trades)
          summaries.push(summary)
        } catch (error) {
          console.error(`[TradingAnalysis] Error calculating summary for market ${key}:`, error)
          // 跳过有问题的市场，继续处理其他市场
        }
      }

      console.log('[TradingAnalysis] Market summaries calculated:', summaries.length)
      return summaries.sort((a, b) => b.totalPnL - a.totalPnL) // 按总盈亏排序
    } catch (error) {
      console.error('[TradingAnalysis] Error in getMarketSummaries:', error)
      throw error
    }
  }

  /**
   * 获取总体统计（支持多钱包聚合）
   */
  async getOverallStats(walletAddresses: string[]): Promise<OverallStats> {
    if (walletAddresses.length === 0) {
      return {
        totalRealizedPnL: 0,
        totalUnrealizedPnL: 0,
        totalPnL: 0,
        totalTradeCount: 0,
        totalVolume: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        avgProfit: 0,
        avgLoss: 0,
      }
    }

    // 获取所有市场汇总
    const marketSummaries = await this.getMarketSummaries(walletAddresses)

    // 计算总体统计
    let totalRealizedPnL = 0
    let totalUnrealizedPnL = 0
    let totalTradeCount = 0
    let totalVolume = 0
    let winningTrades = 0
    let losingTrades = 0
    const profits: number[] = []
    const losses: number[] = []

    for (const summary of marketSummaries) {
      totalRealizedPnL += summary.realizedPnL
      totalUnrealizedPnL += summary.unrealizedPnL
      totalTradeCount += summary.tradeCount
      totalVolume += summary.totalBought + summary.totalSold

      // 计算盈亏交易数（简化：基于总盈亏判断）
      if (summary.totalPnL > 0) {
        winningTrades++
        profits.push(summary.totalPnL)
      } else if (summary.totalPnL < 0) {
        losingTrades++
        losses.push(Math.abs(summary.totalPnL))
      }
    }

    const avgProfit = profits.length > 0 
      ? profits.reduce((a, b) => a + b, 0) / profits.length 
      : 0
    const avgLoss = losses.length > 0 
      ? losses.reduce((a, b) => a + b, 0) / losses.length 
      : 0

    const winRate = totalTradeCount > 0 
      ? winningTrades / (winningTrades + losingTrades) 
      : 0

    return {
      totalRealizedPnL,
      totalUnrealizedPnL,
      totalPnL: totalRealizedPnL + totalUnrealizedPnL,
      totalTradeCount,
      totalVolume,
      winningTrades,
      losingTrades,
      winRate,
      avgProfit,
      avgLoss,
    }
  }

  /**
   * 获取交易行为分析
   */
  async getTradingBehavior(walletAddresses: string[]): Promise<TradingBehavior> {
    if (walletAddresses.length === 0) {
      return {
        tradeFrequency: { daily: 0, weekly: 0 },
        averageHoldingTime: 0,
        buySellRatio: { buyCount: 0, sellCount: 0, ratio: 0 },
        winRate: 0,
        avgProfit: 0,
        avgLoss: 0,
      }
    }

    // 获取所有交易
    const allTradesPromises = walletAddresses.map(address =>
      this.apiClient.getAllTradeHistory({ user: address })
    )
    const allTradesArrays = await Promise.all(allTradesPromises)
    const allTrades = allTradesArrays.flat()

    if (allTrades.length === 0) {
      return {
        tradeFrequency: { daily: 0, weekly: 0 },
        averageHoldingTime: 0,
        buySellRatio: { buyCount: 0, sellCount: 0, ratio: 0 },
        winRate: 0,
        avgProfit: 0,
        avgLoss: 0,
      }
    }

    // 计算交易频率
    const sortedTrades = allTrades.sort((a, b) => a.timestamp - b.timestamp)
    const firstTrade = sortedTrades[0]
    const lastTrade = sortedTrades[sortedTrades.length - 1]
    const timeSpan = lastTrade.timestamp - firstTrade.timestamp
    const days = timeSpan / (24 * 3600)
    const weeks = days / 7

    const daily = days > 0 ? allTrades.length / days : 0
    const weekly = weeks > 0 ? allTrades.length / weeks : 0

    // 计算买卖比例
    const buyCount = allTrades.filter(t => t.side === 'BUY').length
    const sellCount = allTrades.filter(t => t.side === 'SELL').length
    const buySellRatio = sellCount > 0 ? buyCount / sellCount : buyCount

    // 计算平均持仓时间（简化：基于买入和卖出时间差）
    const holdingTimes: number[] = []
    const buyTrades = sortedTrades.filter(t => t.side === 'BUY')
    const sellTrades = sortedTrades.filter(t => t.side === 'SELL')

    // 简单的FIFO匹配计算持仓时间
    for (const sellTrade of sellTrades) {
      const matchingBuy = buyTrades.find(
        b => b.conditionId === sellTrade.conditionId && 
             b.timestamp < sellTrade.timestamp
      )
      if (matchingBuy) {
        holdingTimes.push(sellTrade.timestamp - matchingBuy.timestamp)
      }
    }

    const averageHoldingTime = holdingTimes.length > 0
      ? holdingTimes.reduce((a, b) => a + b, 0) / holdingTimes.length
      : 0

    // 计算胜率（基于市场汇总）
    const marketSummaries = await this.getMarketSummaries(walletAddresses)
    const winningMarkets = marketSummaries.filter(m => m.totalPnL > 0).length
    const winRate = marketSummaries.length > 0
      ? winningMarkets / marketSummaries.length
      : 0

    // 计算平均盈亏
    const profits = marketSummaries.filter(m => m.totalPnL > 0).map(m => m.totalPnL)
    const losses = marketSummaries.filter(m => m.totalPnL < 0).map(m => Math.abs(m.totalPnL))
    const avgProfit = profits.length > 0
      ? profits.reduce((a, b) => a + b, 0) / profits.length
      : 0
    const avgLoss = losses.length > 0
      ? losses.reduce((a, b) => a + b, 0) / losses.length
      : 0

    return {
      tradeFrequency: { daily, weekly },
      averageHoldingTime,
      buySellRatio: { buyCount, sellCount, ratio: buySellRatio },
      winRate,
      avgProfit,
      avgLoss,
    }
  }

  /**
   * 计算单个市场的汇总数据
   */
  private calculateMarketSummary(trades: TradeRecord[]): MarketSummary {
    if (trades.length === 0) {
      throw new Error('Cannot calculate summary for empty trades')
    }

    // 按时间排序
    const sortedTrades = trades.sort((a, b) => a.timestamp - b.timestamp)
    const firstTrade = sortedTrades[0]
    const lastTrade = sortedTrades[sortedTrades.length - 1]

    // 计算买入和卖出
    let totalBought = 0
    let totalSold = 0
    let totalBuyValue = 0
    let totalSellValue = 0
    let currentHolding = 0
    let avgBuyPrice = 0
    let avgSellPrice = 0

    // 使用FIFO方法计算盈亏
    const buyQueue: Array<{ shares: number; price: number }> = []
    let realizedPnL = 0

    for (const trade of sortedTrades) {
      if (trade.side === 'BUY') {
        totalBought += trade.sharesNormalized
        totalBuyValue += trade.sharesNormalized * trade.price
        buyQueue.push({
          shares: trade.sharesNormalized,
          price: trade.price,
        })
        currentHolding += trade.sharesNormalized
      } else if (trade.side === 'SELL') {
        totalSold += trade.sharesNormalized
        totalSellValue += trade.sharesNormalized * trade.price
        currentHolding -= trade.sharesNormalized

        // FIFO计算已实现盈亏
        let remainingSell = trade.sharesNormalized
        while (remainingSell > 0 && buyQueue.length > 0) {
          const buy = buyQueue[0]
          if (buy.shares <= remainingSell) {
            // 完全卖出这个买入
            realizedPnL += (trade.price - buy.price) * buy.shares
            remainingSell -= buy.shares
            buyQueue.shift()
          } else {
            // 部分卖出
            realizedPnL += (trade.price - buy.price) * remainingSell
            buy.shares -= remainingSell
            remainingSell = 0
          }
        }
      }
    }

    // 计算平均价格
    avgBuyPrice = totalBought > 0 ? totalBuyValue / totalBought : 0
    avgSellPrice = totalSold > 0 ? totalSellValue / totalSold : 0

    // 计算未实现盈亏（当前持仓的盈亏）
    // 使用当前持仓的平均成本价
    const avgCostPrice = buyQueue.length > 0
      ? buyQueue.reduce((sum, b) => sum + b.price * b.shares, 0) /
        buyQueue.reduce((sum, b) => sum + b.shares, 0)
      : avgBuyPrice

    // 假设当前价格为最后一次交易价格（实际应该从市场数据获取）
    const currentPrice = lastTrade.price
    const unrealizedPnL = currentHolding > 0
      ? (currentPrice - avgCostPrice) * currentHolding
      : 0

    return {
      conditionId: firstTrade.conditionId,
      marketSlug: firstTrade.marketSlug,
      title: firstTrade.title,
      totalBought,
      totalSold,
      currentHolding,
      realizedPnL,
      unrealizedPnL,
      totalPnL: realizedPnL + unrealizedPnL,
      tradeCount: trades.length,
      avgBuyPrice,
      avgSellPrice,
      firstTradeTime: firstTrade.timestamp,
      lastTradeTime: lastTrade.timestamp,
    }
  }
}
