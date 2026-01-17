"use client"

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MarketSummary, OverallStats, TradingBehavior } from '@/lib/services/trading-analysis.service'

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
  }
) {
  const queryClient = useQueryClient()

  const {
    data: marketSummaries,
    isLoading: isLoadingSummaries,
    error: summariesError,
    refetch: refetchSummaries,
  } = useQuery<MarketSummary[]>({
    queryKey: ['trading-analysis', 'market-summaries', walletAddresses],
    queryFn: async () => {
      if (walletAddresses.length === 0) {
        console.warn('[useTradingAnalysis] No wallets provided, skipping fetch')
        return []
      }
      
      const walletsParam = walletAddresses.join(',')
      const url = `/api/trading/market-summary?wallets=${encodeURIComponent(walletsParam)}`
      console.log('[useTradingAnalysis] Fetching market summaries:', { url, walletCount: walletAddresses.length })
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        const errorMessage = data.error || data.details || `HTTP ${response.status}: ${response.statusText}`
        console.error('[useTradingAnalysis] API error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          details: data.details,
          fullData: data,
          url,
          walletAddresses,
        })
        throw new Error(errorMessage)
      }
      
      console.log('[useTradingAnalysis] Market summaries received:', data.summaries?.length || 0)
      return data.summaries || []
    },
    refetchInterval: options?.autoRefresh ? 10000 : false, // 10秒自动刷新
    staleTime: 5000, // 5秒内认为数据新鲜
    enabled: options?.enabled !== false && walletAddresses.length > 0,
  })

  const {
    data: overallStats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery<OverallStats>({
    queryKey: ['trading-analysis', 'overall-stats', walletAddresses],
    queryFn: async () => {
      const walletsParam = walletAddresses.join(',')
      const response = await fetch(`/api/trading/overall-stats?wallets=${encodeURIComponent(walletsParam)}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch overall stats')
      }
      const data = await response.json()
      return data.stats
    },
    refetchInterval: options?.autoRefresh ? 10000 : false,
    staleTime: 5000,
    enabled: options?.enabled !== false && walletAddresses.length > 0,
  })

  const {
    data: tradingBehavior,
    isLoading: isLoadingBehavior,
    error: behaviorError,
    refetch: refetchBehavior,
  } = useQuery<TradingBehavior>({
    queryKey: ['trading-analysis', 'trading-behavior', walletAddresses],
    queryFn: async () => {
      const walletsParam = walletAddresses.join(',')
      const response = await fetch(`/api/trading/trading-behavior?wallets=${encodeURIComponent(walletsParam)}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch trading behavior')
      }
      const data = await response.json()
      return data.behavior
    },
    refetchInterval: options?.autoRefresh ? 10000 : false,
    staleTime: 5000,
    enabled: options?.enabled !== false && walletAddresses.length > 0,
  })

  // 手动刷新所有数据
  const refetchAll = async () => {
    await Promise.all([
      refetchSummaries(),
      refetchStats(),
      refetchBehavior(),
    ])
  }

  return {
    marketSummaries: marketSummaries || [],
    overallStats,
    tradingBehavior,
    isLoading: isLoadingSummaries || isLoadingStats || isLoadingBehavior,
    error: summariesError || statsError || behaviorError,
    refetch: refetchAll,
    refetchSummaries,
    refetchStats,
    refetchBehavior,
  }
}
