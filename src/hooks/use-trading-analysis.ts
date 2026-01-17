"use client"

import * as React from "react"
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { startOfDay, endOfDay } from 'date-fns'
import { MarketSummary, OverallStats, TradingBehavior } from '@/lib/services/trading-analysis.service'

/**
 * Calculate Unix timestamps for a given date (start of day to end of day)
 */
function getDateRange(date: Date): { startTime: number; endTime: number } {
  const start = startOfDay(date)
  const end = endOfDay(date)
  return {
    startTime: Math.floor(start.getTime() / 1000),
    endTime: Math.floor(end.getTime() / 1000),
  }
}

/**
 * React Hook 封装交易分析服务
 * 使用 React Query 进行数据获取和缓存
 * 通过 Next.js API 路由调用，避免客户端直接使用服务端代码
 */
export function useTradingAnalysis(
  walletAddresses: string[],
  options?: {
    autoRefresh?: boolean
    enabled?: boolean
    selectedDate?: Date  // 选择的日期，默认为今天
  }
) {
  const queryClient = useQueryClient()
  
  // Log hook invocation
  const renderCountRef = React.useRef(0)
  renderCountRef.current += 1
  console.log(`[useTradingAnalysis] Hook called (render #${renderCountRef.current}):`, {
    walletCount: walletAddresses.length,
    selectedDate: options?.selectedDate?.toISOString(),
    autoRefresh: options?.autoRefresh,
    enabled: options?.enabled,
  })
  
  // Memoize selectedDate to prevent unnecessary recalculations
  const selectedDate = React.useMemo(() => {
    const date = options?.selectedDate || new Date()
    console.log('[useTradingAnalysis] selectedDate memoized:', date.toISOString())
    return date
  }, [options?.selectedDate?.getTime()])
  
  // Memoize dateRange to prevent query key changes
  const dateRange = React.useMemo(() => {
    const range = getDateRange(selectedDate)
    console.log('[useTradingAnalysis] dateRange memoized:', range)
    return range
  }, [selectedDate.getTime()])
  
  // Memoize wallet addresses to prevent unnecessary refetches
  const stableWalletAddresses = React.useMemo(() => {
    const stable = [...walletAddresses].sort() // Sort for stable reference
    console.log('[useTradingAnalysis] stableWalletAddresses memoized:', stable)
    return stable
  }, [walletAddresses.join(',')])
  
  // Log query key
  const queryKey = ['trading-analysis', 'market-summaries', stableWalletAddresses, dateRange.startTime, dateRange.endTime]
  console.log('[useTradingAnalysis] Query key:', JSON.stringify(queryKey))

  // Use unified endpoint that makes ONE API call
  const {
    data: analysisData,
    isLoading,
    error,
    refetch,
  } = useQuery<{
    marketSummaries: MarketSummary[]
    overallStats: OverallStats
    tradingBehavior: TradingBehavior
  }>({
    queryKey: ['trading-analysis', 'all', stableWalletAddresses, dateRange.startTime, dateRange.endTime],
    queryFn: async () => {
      console.log('[useTradingAnalysis] queryFn EXECUTING - fetching ALL analyses with SINGLE API call')
      if (stableWalletAddresses.length === 0) {
        console.warn('[useTradingAnalysis] No wallets provided, skipping fetch')
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
      
      const walletsParam = stableWalletAddresses.join(',')
      const url = `/api/trading/analysis?wallets=${encodeURIComponent(walletsParam)}&startTime=${dateRange.startTime}&endTime=${dateRange.endTime}`
      console.log('[useTradingAnalysis] Fetching all analyses:', { url, walletCount: stableWalletAddresses.length, dateRange })
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        const errorMessage = data.error || data.details || `HTTP ${response.status}: ${response.statusText}`
        console.error('[useTradingAnalysis] API error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          details: data.details,
          url,
        })
        throw new Error(errorMessage)
      }
      
      console.log('[useTradingAnalysis] All analyses received:', {
        markets: data.marketSummaries?.length || 0,
        hasStats: !!data.overallStats,
        hasBehavior: !!data.tradingBehavior,
      })
      
      return {
        marketSummaries: data.marketSummaries || [],
        overallStats: data.overallStats,
        tradingBehavior: data.tradingBehavior,
      }
    },
    refetchInterval: options?.autoRefresh ? 100000 : false, // 100秒自动刷新
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: options?.enabled !== false && stableWalletAddresses.length > 0,
  })
  
  // Extract individual data from unified response
  const marketSummaries = analysisData?.marketSummaries || []
  const overallStats = analysisData?.overallStats
  const tradingBehavior = analysisData?.tradingBehavior

  return {
    marketSummaries,
    overallStats,
    tradingBehavior,
    isLoading,
    error,
    refetch,
  }
}
