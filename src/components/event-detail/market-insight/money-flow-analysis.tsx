import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Brain } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Pie, PieChart } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { MoneyFlowAnalysisProps, TradeAnalysisData, MoneyFlowChartData } from './types'

// Money Flow Analysis Component
export function MoneyFlowAnalysis({ selectedMarket }: MoneyFlowAnalysisProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tradeData, setTradeData] = useState<TradeAnalysisData | null>(null)
  
  // Component instance ID to track if we get multiple instances
  const instanceId = useRef(Math.random().toString(36).substr(2, 9))
  
  // Client-side cache for trade analysis data (1 minute cache)
  const cacheRef = useRef<Map<string, { data: TradeAnalysisData; timestamp: number }>>(new Map())
  const CACHE_DURATION = 60 * 1000 // 1 minute in milliseconds
  
  // Enhanced duplicate prevention using a global registry
  const activeRequestsRef = useRef<Set<string>>(new Set())

  // Check if we have valid cached data
  const getCachedData = useCallback((conditionId: string): TradeAnalysisData | null => {
    const cached = cacheRef.current.get(conditionId)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data
    }
    return null
  }, [CACHE_DURATION])

  // Store data in cache
  const setCachedData = useCallback((conditionId: string, data: TradeAnalysisData) => {
    cacheRef.current.set(conditionId, {
      data,
      timestamp: Date.now()
    })
  }, [])

  // Fetch trade analysis data
  const fetchTradeAnalysis = useCallback(async () => {
    if (!selectedMarket?.conditionId) {
      setError('No market selected')
      return
    }

    const conditionId = selectedMarket.conditionId

    // Check if this exact request is already active (StrictMode protection)
    if (activeRequestsRef.current.has(conditionId)) {
      return
    }

    // Check cache first
    const cachedData = getCachedData(conditionId)
    if (cachedData) {
      setTradeData(cachedData)
      setError(null)
      return
    }

    // Mark this request as active immediately
    activeRequestsRef.current.add(conditionId)
    setLoading(true)
    setError(null)

    try {
      const url = `https://api-test-production-3326.up.railway.app/api/trade-analyze?market=${encodeURIComponent(conditionId)}`
      
      const response = await fetch(url)
      
      // Check if this request is still relevant (user might have switched markets)
      if (!activeRequestsRef.current.has(conditionId)) {
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch trade analysis: ${response.status}`)
      }

      const data = await response.json()
      
      // Store in cache
      setCachedData(conditionId, data)
      setTradeData(data)
    } catch (err) {
      // Only set error if this request is still relevant
      if (activeRequestsRef.current.has(conditionId)) {
        console.error('Trade analysis fetch error:', err)
        setError('No trade analysis data available for this market')
      }
    } finally {
      // Always clean up the active request marker
      activeRequestsRef.current.delete(conditionId)
      setLoading(false)
    }
  }, [selectedMarket?.conditionId, getCachedData, setCachedData])

  // Fetch data when market changes
  useEffect(() => {
    if (selectedMarket?.conditionId) {
      // Use a small delay to handle StrictMode double execution
      const timeoutId = setTimeout(() => {
        fetchTradeAnalysis()
      }, 10) // 10ms delay to let StrictMode settle
      
      return () => {
        clearTimeout(timeoutId)
      }
    } else {
      // Clear all active requests and reset state when no market selected
      activeRequestsRef.current.clear()
      setTradeData(null)
      setError(null)
    }
  }, [selectedMarket?.conditionId, fetchTradeAnalysis])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRequestsRef.current.clear()
    }
  }, [])

  // Format currency
  const formatCurrency = useCallback((value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
  }, [])

  // Prepare unified chart data with both buy and sell orders
  const unifiedChartData = useCallback((): MoneyFlowChartData[] => {
    if (!tradeData) return []

    const segments = [
      // Buy orders (Bullish) - Green shades
      {
        orderSize: "Buy Large",
        volume: tradeData.yesPosition.largeOrders.totalVolume,
        fill: "rgb(15, 143, 98)", // Large buy
      },
      {
        orderSize: "Buy Medium",
        volume: tradeData.yesPosition.middleOrders.totalVolume,
        fill: "rgb(46, 189, 133)", // Medium buy
      },
      {
        orderSize: "Buy Small",
        volume: tradeData.yesPosition.smallOrders.totalVolume,
        fill: "rgb(120, 214, 172)", // Small buy
      },
      // Sell orders (Bearish) - Red shades
      {
        orderSize: "Sell Large",
        volume: tradeData.noPosition.largeOrders.totalVolume,
        fill: "rgb(217, 48, 78)", // Large sell
      },
      {
        orderSize: "Sell Medium",
        volume: tradeData.noPosition.middleOrders.totalVolume,
        fill: "rgb(246, 70, 93)", // Medium sell
      },
      {
        orderSize: "Sell Small",
        volume: tradeData.noPosition.smallOrders.totalVolume,
        fill: "rgb(255, 153, 160)", // Small sell
      },
    ]

    // Filter out zero-value segments
    return segments.filter(item => item.volume > 0)
  }, [tradeData])

  // Unified chart configuration
  const unifiedChartConfig = {
    volume: {
      label: "Volume",
    },
    "Buy Large": {
      label: "Buy Large Orders (>$1,000)",
      color: "rgb(15, 143, 98)",
    },
    "Buy Medium": {
      label: "Buy Medium Orders ($100-$1,000)",
      color: "rgb(46, 189, 133)",
    },
    "Buy Small": {
      label: "Buy Small Orders (<$100)",
      color: "rgb(120, 214, 172)",
    },
    "Sell Large": {
      label: "Sell Large Orders (>$1,000)",
      color: "rgb(217, 48, 78)",
    },
    "Sell Medium": {
      label: "Sell Medium Orders ($100-$1,000)",
      color: "rgb(246, 70, 93)",
    },
    "Sell Small": {
      label: "Sell Small Orders (<$100)",
      color: "rgb(255, 153, 160)",
    },
  } satisfies ChartConfig

  // Calculate table data
  const tableData = useCallback(() => {
    if (!tradeData) return []

    return [
      {
        orderSize: "Large",
        buy: tradeData.yesPosition.largeOrders.totalVolume,
        sell: tradeData.noPosition.largeOrders.totalVolume,
        inflow: tradeData.yesPosition.largeOrders.totalVolume - tradeData.noPosition.largeOrders.totalVolume,
        threshold: ">$1,000"
      },
      {
        orderSize: "Medium",
        buy: tradeData.yesPosition.middleOrders.totalVolume,
        sell: tradeData.noPosition.middleOrders.totalVolume,
        inflow: tradeData.yesPosition.middleOrders.totalVolume - tradeData.noPosition.middleOrders.totalVolume,
        threshold: "$100-$1,000"
      },
      {
        orderSize: "Small",
        buy: tradeData.yesPosition.smallOrders.totalVolume,
        sell: tradeData.noPosition.smallOrders.totalVolume,
        inflow: tradeData.yesPosition.smallOrders.totalVolume - tradeData.noPosition.smallOrders.totalVolume,
        threshold: "<$100"
      },
    ]
  }, [tradeData])

  // Calculate totals
  const totals = useCallback(() => {
    if (!tableData().length) return { buy: 0, sell: 0, inflow: 0 }
    
    return tableData().reduce((acc, row) => ({
      buy: acc.buy + row.buy,
      sell: acc.sell + row.sell,
      inflow: acc.inflow + row.inflow
    }), { buy: 0, sell: 0, inflow: 0 })
  }, [tableData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" style={{ minHeight: '500px' }}>
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading trade analysis...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12" style={{ minHeight: '500px' }}>
        <div className="text-center space-y-4">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!tradeData) {
    return (
      <div className="flex items-center justify-center py-12" style={{ minHeight: '500px' }}>
        <div className="text-center space-y-4">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No market selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" style={{ minHeight: '500px' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">24h trading flow</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {tradeData.totalTrades} trades
          </Badge>
        </div>
      </div>

      {/* Side by Side Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Order Volume Breakdown Chart */}
        <div className="border-0">
          <div className="items-center pb-0">
            <h3 className="text-base font-semibold text-center">Order Volume Breakdown</h3>
          </div>
          <div className="flex-1 pb-0">
            {unifiedChartData().length === 0 ? (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <p className="text-sm">No order data available</p>
              </div>
            ) : (
              <ChartContainer
                config={unifiedChartConfig}
                className="[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square max-h-[400px] pb-0"
              >
                <PieChart>
                  <ChartTooltip 
                    content={
                      <ChartTooltipContent 
                        hideLabel 
                        formatter={(value) => [formatCurrency(Number(value)), "Volume"]}
                      />
                    } 
                  />
                  <Pie 
                    data={unifiedChartData()} 
                    dataKey="volume" 
                    nameKey="orderSize"
                    cx="50%" 
                    cy="50%" 
                    outerRadius={84}
                    label={({ percent }) => `${((percent || 0) * 100).toFixed(1)}%`}
                  />
                </PieChart>
              </ChartContainer>
            )}
          </div>
        </div>

        {/* Order Flow Breakdown Table */}
        <div className="border-0">
          <div>
            <h3 className="text-base font-semibold">Order Flow Breakdown</h3>
            <p className="text-sm text-muted-foreground">Bullish vs Bearish volume by order size</p>
          </div>
          <div>
            <div className="space-y-4">
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground">Orders</th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground">Buy Yes + Sell No</th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground">Buy No + Sell Yes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData().map((row, index) => (
                      <tr key={row.orderSize} className="border-b border-border/50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: index === 0 ? 'var(--chart-1)' : index === 1 ? 'var(--chart-2)' : 'var(--chart-3)' }}
                            />
                            <span className="font-medium">{row.orderSize}</span>
                          </div>
                          <div className="text-xs text-muted-foreground ml-5">{row.threshold}</div>
                        </td>
                        <td className="text-right py-3 text-price-positive font-medium">
                          {formatCurrency(row.buy)}
                        </td>
                        <td className="text-right py-3 text-price-negative font-medium">
                          {formatCurrency(row.sell)}
                        </td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="border-t-2 font-semibold">
                      <td className="py-3">Total</td>
                      <td className="text-right py-3 text-price-positive">
                        {formatCurrency(totals().buy)}
                      </td>
                      <td className="text-right py-3 text-price-negative">
                        {formatCurrency(totals().sell)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 