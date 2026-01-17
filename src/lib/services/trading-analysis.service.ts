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
  yesHolding: number              // Yes 持仓量
  noHolding: number               // No 持仓量
  netHolding: number              // 净持仓量 (Yes - No)
  tradeCount: number               // 交易次数
  avgBuyPrice: number              // 平均买入价格
  avgSellPrice: number             // 平均卖出价格
  firstTradeTime?: number          // 首次交易时间
  lastTradeTime?: number            // 最后交易时间
  walletAddresses: string[]        // 参与该市场的钱包地址列表
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
 * 日期范围过滤
 */
export interface DateRange {
  startTime?: number  // Unix timestamp in seconds
  endTime?: number    // Unix timestamp in seconds
}

/**
 * 所有分析结果的组合
 */
export interface TradingAnalysisResult {
  marketSummaries: MarketSummary[]
  overallStats: OverallStats
  tradingBehavior: TradingBehavior
}

/**
 * 交易分析服务接口
 */
export interface ITradingAnalysisService {
  /**
   * 获取市场汇总（支持多钱包聚合和日期过滤）
   */
  getMarketSummaries(walletAddresses: string[], dateRange?: DateRange): Promise<MarketSummary[]>
  
  /**
   * 获取总体统计（支持多钱包聚合）
   */
  getOverallStats(walletAddresses: string[], dateRange?: DateRange): Promise<OverallStats>
  
  /**
   * 获取交易行为分析
   */
  getTradingBehavior(walletAddresses: string[], dateRange?: DateRange): Promise<TradingBehavior>
  
  /**
   * 一次性获取所有分析数据（只调用一次 API，最高效）
   * 这是推荐的方法，因为它只获取一次交易数据，然后计算所有分析结果
   */
  getAllAnalysis(walletAddresses: string[], dateRange?: DateRange): Promise<TradingAnalysisResult>
}

/**
 * Module-level cache shared across all service instances
 * This prevents duplicate API calls when multiple API routes call getMarketSummaries
 */
const sharedMarketSummariesCache = new Map<string, { data: MarketSummary[]; timestamp: number }>()
const CACHE_TTL = 30 * 1000 // 30 seconds cache TTL

/**
 * Generate cache key for market summaries
 */
function getCacheKey(walletAddresses: string[], dateRange?: DateRange): string {
  const walletsKey = [...walletAddresses].sort().join(',')
  const dateKey = dateRange 
    ? `${dateRange.startTime}-${dateRange.endTime}` 
    : 'all'
  return `market-summaries:${walletsKey}:${dateKey}`
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(cached: { timestamp: number }): boolean {
  return Date.now() - cached.timestamp < CACHE_TTL
}

/**
 * Clear the cache (useful for testing or manual refresh)
 */
export function clearTradingAnalysisCache(): void {
  console.log('[TradingAnalysis] Clearing market summaries cache')
  sharedMarketSummariesCache.clear()
}

/**
 * 交易分析服务实现
 */
export class TradingAnalysisService implements ITradingAnalysisService {
  constructor(private apiClient: IPolymarketApiClient) {}

  /**
   * 获取市场汇总（支持多钱包聚合和日期过滤）
   */
  async getMarketSummaries(walletAddresses: string[], dateRange?: DateRange): Promise<MarketSummary[]> {
    if (walletAddresses.length === 0) {
      return []
    }

    // Check shared cache first
    const cacheKey = getCacheKey(walletAddresses, dateRange)
    const cached = sharedMarketSummariesCache.get(cacheKey)
    
    if (cached && isCacheValid(cached)) {
      console.log('[TradingAnalysis] ✅ CACHE HIT - Using cached market summaries for:', cacheKey, `(${cached.data.length} summaries)`)
      return cached.data
    }

    console.log('[TradingAnalysis] ❌ CACHE MISS - Fetching market summaries for wallets:', walletAddresses, 'dateRange:', dateRange)

    try {
      // 串行获取所有钱包的交易历史（避免并发导致限流器队列积累过多请求）
      // 虽然限流器是单例，但多个 getAllTradeHistory 同时启动会向队列添加大量请求
      const allTrades: TradeRecord[] = []
      
      for (const address of walletAddresses) {
        try {
          console.log(`[TradingAnalysis] Fetching trades for wallet: ${address}`)
          const query: { user: string; startTime?: number; endTime?: number } = { user: address }
          if (dateRange?.startTime) query.startTime = dateRange.startTime
          if (dateRange?.endTime) query.endTime = dateRange.endTime
          
          // For market summaries, limit to 1000 trades per wallet per day to reduce API calls
          // This is reasonable since we're grouping by market - we don't need ALL trades
          const trades = await this.apiClient.getAllTradeHistory(query, 1000)
          allTrades.push(...trades)
          console.log(`[TradingAnalysis] Fetched ${trades.length} trades for ${address}`)
        } catch (error) {
          console.error(`[TradingAnalysis] Error fetching trades for ${address}:`, error)
          // 继续处理其他钱包，不阻塞
        }
      }
      
      console.log('[TradingAnalysis] Total trades fetched:', allTrades.length)
      
      // Debug: Check if trades have tokenLabel
      if (allTrades.length > 0) {
        const tradesWithTokenLabel = allTrades.filter(t => t.tokenLabel && t.tokenLabel.trim())
        const tradesWithYes = allTrades.filter(t => t.tokenLabel?.trim() === 'Yes')
        const tradesWithNo = allTrades.filter(t => t.tokenLabel?.trim() === 'No')
        const tradesWithShares = allTrades.filter(t => t.sharesNormalized > 0)
        
        console.log('[TradingAnalysis] Trade data quality check:', {
          totalTrades: allTrades.length,
          tradesWithTokenLabel: tradesWithTokenLabel.length,
          tradesWithYes: tradesWithYes.length,
          tradesWithNo: tradesWithNo.length,
          tradesWithShares: tradesWithShares.length,
          sampleTokenLabels: [...new Set(allTrades.slice(0, 10).map(t => t.tokenLabel).filter(Boolean))],
        })
      }

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
      // Sort by trade count (most active markets first)
      const sortedSummaries = summaries.sort((a, b) => b.tradeCount - a.tradeCount)
      
      // Store in shared cache
      sharedMarketSummariesCache.set(cacheKey, {
        data: sortedSummaries,
        timestamp: Date.now(),
      })
      console.log('[TradingAnalysis] ✅ Cached market summaries for:', cacheKey, `(${sortedSummaries.length} summaries)`)
      
      return sortedSummaries
    } catch (error) {
      console.error('[TradingAnalysis] Error in getMarketSummaries:', error)
      throw error
    }
  }

  /**
   * 获取总体统计（支持多钱包聚合和日期过滤）
   */
  async getOverallStats(walletAddresses: string[], dateRange?: DateRange): Promise<OverallStats> {
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
    const marketSummaries = await this.getMarketSummaries(walletAddresses, dateRange)

    // 计算总体统计（P/L 相关字段已移除，设为 0）
    let totalTradeCount = 0
    let totalVolume = 0

    for (const summary of marketSummaries) {
      totalTradeCount += summary.tradeCount
      totalVolume += summary.totalBought + summary.totalSold
    }

    return {
      totalRealizedPnL: 0,
      totalUnrealizedPnL: 0,
      totalPnL: 0,
      totalTradeCount,
      totalVolume,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      avgProfit: 0,
      avgLoss: 0,
    }
  }

  /**
   * 获取交易行为分析（支持日期过滤）
   * 优化：先获取市场汇总（使用缓存），然后从汇总中提取交易数据，避免重复API调用
   */
  async getTradingBehavior(walletAddresses: string[], dateRange?: DateRange): Promise<TradingBehavior> {
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

    // 先获取市场汇总（这会使用缓存，避免重复API调用）
    const marketSummaries = await this.getMarketSummaries(walletAddresses, dateRange)
    
    // 如果市场汇总为空，尝试直接获取交易（但限制数量）
    let allTrades: TradeRecord[] = []
    if (marketSummaries.length === 0) {
      // 只有在没有市场汇总时才直接获取交易（限制为1000条以避免过多API调用）
      console.log('[TradingAnalysis] No market summaries found, fetching trades directly (limited to 1000)')
      const allTradesPromises = walletAddresses.map(address => {
        const query: { user: string; startTime?: number; endTime?: number } = { user: address }
        if (dateRange?.startTime) query.startTime = dateRange.startTime
        if (dateRange?.endTime) query.endTime = dateRange.endTime
        return this.apiClient.getAllTradeHistory(query, 1000) // Limit to 1000
      })
      const allTradesArrays = await Promise.all(allTradesPromises)
      allTrades = allTradesArrays.flat()
    } else {
      // 从市场汇总中重建交易列表（通过重新获取，但使用缓存）
      // 实际上，我们需要原始交易数据来计算行为，所以还是需要获取
      // 但我们可以限制数量，因为市场汇总已经告诉我们大概有多少交易
      console.log('[TradingAnalysis] Using cached market summaries, fetching trades for behavior analysis (limited to 1000)')
      const allTradesPromises = walletAddresses.map(address => {
        const query: { user: string; startTime?: number; endTime?: number } = { user: address }
        if (dateRange?.startTime) query.startTime = dateRange.startTime
        if (dateRange?.endTime) query.endTime = dateRange.endTime
        return this.apiClient.getAllTradeHistory(query, 1000) // Limit to 1000 to match market summaries
      })
      const allTradesArrays = await Promise.all(allTradesPromises)
      allTrades = allTradesArrays.flat()
    }

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

    // P/L-based calculations removed (winRate, avgProfit, avgLoss set to 0)

    return {
      tradeFrequency: { daily, weekly },
      averageHoldingTime,
      buySellRatio: { buyCount, sellCount, ratio: buySellRatio },
      winRate: 0,
      avgProfit: 0,
      avgLoss: 0,
    }
  }

  /**
   * 一次性获取所有分析数据（只调用一次 Dome API，最高效）
   * 这是推荐的方法，因为它只获取一次交易数据，然后计算所有分析结果
   */
  async getAllAnalysis(walletAddresses: string[], dateRange?: DateRange): Promise<TradingAnalysisResult> {
    if (walletAddresses.length === 0) {
      return {
        marketSummaries: [],
        overallStats: {
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
        },
        tradingBehavior: {
          tradeFrequency: { daily: 0, weekly: 0 },
          averageHoldingTime: 0,
          buySellRatio: { buyCount: 0, sellCount: 0, ratio: 0 },
          winRate: 0,
          avgProfit: 0,
          avgLoss: 0,
        },
      }
    }

    console.log('[TradingAnalysis] getAllAnalysis - Fetching trades ONCE for all analyses:', {
      wallets: walletAddresses,
      dateRange,
    })

    // Step 1: Fetch all trades ONCE (limited to 1000 per wallet per day)
    const allTrades: TradeRecord[] = []
    const errors: string[] = []
    
    for (const address of walletAddresses) {
      try {
        const query: { user: string; startTime?: number; endTime?: number } = { user: address }
        if (dateRange?.startTime) query.startTime = dateRange.startTime
        if (dateRange?.endTime) query.endTime = dateRange.endTime
        
        const trades = await this.apiClient.getAllTradeHistory(query, 1000)
        allTrades.push(...trades)
        console.log(`[TradingAnalysis] Fetched ${trades.length} trades for ${address}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[TradingAnalysis] Error fetching trades for ${address}:`, errorMessage)
        errors.push(`Failed to fetch trades for ${address}: ${errorMessage}`)
      }
    }

    console.log(`[TradingAnalysis] Total trades fetched: ${allTrades.length} - Now calculating all analyses from this single dataset`)
    
    // If all wallets failed and we have no trades, throw an error
    if (allTrades.length === 0 && errors.length > 0) {
      const errorMessage = errors.length === 1 
        ? errors[0]
        : `Failed to fetch trades from all wallets:\n${errors.join('\n')}`
      throw new Error(errorMessage)
    }

    // Step 2: Calculate market summaries from the trades
    const marketMap = new Map<string, TradeRecord[]>()
    for (const trade of allTrades) {
      const key = `${trade.conditionId}-${trade.marketSlug}`
      if (!marketMap.has(key)) {
        marketMap.set(key, [])
      }
      marketMap.get(key)!.push(trade)
    }

    const marketSummaries: MarketSummary[] = []
    for (const [key, trades] of marketMap) {
      try {
        const summary = this.calculateMarketSummary(trades)
        marketSummaries.push(summary)
      } catch (error) {
        console.error(`[TradingAnalysis] Error calculating summary for market ${key}:`, error)
      }
    }
    // Sort by trade count (most active markets first)
    const sortedMarketSummaries = marketSummaries.sort((a, b) => b.tradeCount - a.tradeCount)

    // Step 3: Calculate overall stats from market summaries (P/L fields removed)
    let totalTradeCount = 0
    let totalVolume = 0

    for (const summary of sortedMarketSummaries) {
      totalTradeCount += summary.tradeCount
      totalVolume += summary.totalBought + summary.totalSold
    }

    const overallStats: OverallStats = {
      totalRealizedPnL: 0,
      totalUnrealizedPnL: 0,
      totalPnL: 0,
      totalTradeCount,
      totalVolume,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      avgProfit: 0,
      avgLoss: 0,
    }

    // Step 4: Calculate trading behavior from the trades
    if (allTrades.length === 0) {
      return {
        marketSummaries: sortedMarketSummaries,
        overallStats,
        tradingBehavior: {
          tradeFrequency: { daily: 0, weekly: 0 },
          averageHoldingTime: 0,
          buySellRatio: { buyCount: 0, sellCount: 0, ratio: 0 },
          winRate: 0,
          avgProfit: 0,
          avgLoss: 0,
        },
      }
    }

    const sortedTrades = allTrades.sort((a, b) => a.timestamp - b.timestamp)
    const firstTrade = sortedTrades[0]
    const lastTrade = sortedTrades[sortedTrades.length - 1]
    const timeSpan = lastTrade.timestamp - firstTrade.timestamp
    const days = timeSpan / (24 * 3600)
    const weeks = days / 7

    const daily = days > 0 ? allTrades.length / days : 0
    const weekly = weeks > 0 ? allTrades.length / weeks : 0

    const buyCount = allTrades.filter(t => t.side === 'BUY').length
    const sellCount = allTrades.filter(t => t.side === 'SELL').length
    const buySellRatio = sellCount > 0 ? buyCount / sellCount : buyCount

    const holdingTimes: number[] = []
    const buyTrades = sortedTrades.filter(t => t.side === 'BUY')
    const sellTrades = sortedTrades.filter(t => t.side === 'SELL')

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

    // P/L-based calculations removed (winRate, avgProfit, avgLoss set to 0)

    const tradingBehavior: TradingBehavior = {
      tradeFrequency: { daily, weekly },
      averageHoldingTime,
      buySellRatio: { buyCount, sellCount, ratio: buySellRatio },
      winRate: 0,
      avgProfit: 0,
      avgLoss: 0,
    }

    console.log(`[TradingAnalysis] getAllAnalysis completed - ${sortedMarketSummaries.length} markets, ${allTrades.length} trades`)

    return {
      marketSummaries: sortedMarketSummaries,
      overallStats,
      tradingBehavior,
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
    let avgBuyPrice = 0
    let avgSellPrice = 0

    // 计算 Yes 和 No 持仓
    // 对于体育市场，token_label 是队伍名称（如 "Red Wings", "Senators"），不是 "Yes"/"No"
    // 我们需要识别两个不同的 outcomes，并将它们映射到 Yes/No
    
    // 收集所有唯一的 token_label（去除空值）
    const uniqueTokenLabels = Array.from(
      new Set(sortedTrades.map(t => t.tokenLabel?.trim()).filter(Boolean))
    ).sort() // 排序以确保一致性
    
    // 确定 Yes 和 No 对应的 token_label
    // 如果 token_label 是 "Yes" 或 "No"，直接使用
    // 否则，将第一个 outcome 视为 "Yes"，第二个视为 "No"
    let yesTokenLabel: string | null = null
    let noTokenLabel: string | null = null
    
    if (uniqueTokenLabels.includes('Yes')) {
      yesTokenLabel = 'Yes'
      noTokenLabel = uniqueTokenLabels.find(l => l === 'No') || (uniqueTokenLabels.length > 1 ? uniqueTokenLabels.find(l => l !== 'Yes') || null : null)
    } else if (uniqueTokenLabels.includes('No')) {
      noTokenLabel = 'No'
      yesTokenLabel = uniqueTokenLabels.find(l => l !== 'No') || null
    } else {
      // 体育市场：第一个 outcome 是 "Yes"，第二个是 "No"
      if (uniqueTokenLabels.length >= 1) {
        yesTokenLabel = uniqueTokenLabels[0]
      }
      if (uniqueTokenLabels.length >= 2) {
        noTokenLabel = uniqueTokenLabels[1]
      }
    }
    
    console.log(`[calculateMarketSummary] Market ${firstTrade.marketSlug} token mapping:`, {
      uniqueTokenLabels,
      yesTokenLabel,
      noTokenLabel,
    })

    let yesHolding = 0
    let noHolding = 0

    for (const trade of sortedTrades) {
      const tokenLabel = trade.tokenLabel?.trim() || ''
      
      if (trade.side === 'BUY') {
        totalBought += trade.sharesNormalized
        totalBuyValue += trade.sharesNormalized * trade.price
        
        // 根据 token_label 累加持仓
        if (yesTokenLabel && tokenLabel === yesTokenLabel) {
          yesHolding += trade.sharesNormalized
        } else if (noTokenLabel && tokenLabel === noTokenLabel) {
          noHolding += trade.sharesNormalized
        }
      } else if (trade.side === 'SELL') {
        totalSold += trade.sharesNormalized
        totalSellValue += trade.sharesNormalized * trade.price
        
        // 根据 token_label 减少持仓
        if (yesTokenLabel && tokenLabel === yesTokenLabel) {
          yesHolding -= trade.sharesNormalized
        } else if (noTokenLabel && tokenLabel === noTokenLabel) {
          noHolding -= trade.sharesNormalized
        }
      }
    }

    // Debug: Count trades by tokenLabel
    const tokenLabelCounts = sortedTrades.reduce((acc, t) => {
      const label = t.tokenLabel?.trim() || 'EMPTY'
      acc[label] = (acc[label] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const buyYesCount = yesTokenLabel ? sortedTrades.filter(t => t.side === 'BUY' && t.tokenLabel?.trim() === yesTokenLabel).length : 0
    const buyNoCount = noTokenLabel ? sortedTrades.filter(t => t.side === 'BUY' && t.tokenLabel?.trim() === noTokenLabel).length : 0
    const sellYesCount = yesTokenLabel ? sortedTrades.filter(t => t.side === 'SELL' && t.tokenLabel?.trim() === yesTokenLabel).length : 0
    const sellNoCount = noTokenLabel ? sortedTrades.filter(t => t.side === 'SELL' && t.tokenLabel?.trim() === noTokenLabel).length : 0

    console.log(`[calculateMarketSummary] Calculated holdings for ${firstTrade.marketSlug}:`, {
      yesHolding,
      noHolding,
      netHolding: yesHolding - noHolding,
      totalTrades: sortedTrades.length,
      tokenLabelCounts,
      buyCount: sortedTrades.filter(t => t.side === 'BUY').length,
      sellCount: sortedTrades.filter(t => t.side === 'SELL').length,
      buyYesCount,
      buyNoCount,
      sellYesCount,
      sellNoCount,
      yesTokenLabel,
      noTokenLabel,
    })

    // 计算平均价格
    avgBuyPrice = totalBought > 0 ? totalBuyValue / totalBought : 0
    avgSellPrice = totalSold > 0 ? totalSellValue / totalSold : 0

    // 计算净持仓 (Yes - No)
    const netHolding = yesHolding - noHolding

    // 提取参与该市场的唯一钱包地址
    const walletAddresses = Array.from(new Set(sortedTrades.map(t => t.user).filter(Boolean)))

    return {
      conditionId: firstTrade.conditionId,
      marketSlug: firstTrade.marketSlug,
      title: firstTrade.title,
      totalBought,
      totalSold,
      yesHolding,
      noHolding,
      netHolding,
      tradeCount: trades.length,
      avgBuyPrice,
      avgSellPrice,
      firstTradeTime: firstTrade.timestamp,
      lastTradeTime: lastTrade.timestamp,
      walletAddresses,
    }
  }
}
