"use client"

import * as React from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { format, parse } from "date-fns"
import { Navbar } from "@/components/ui/navbar"
import { Footer } from "@/components/ui/footer"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DatePicker } from "@/components/ui/date-picker"
import { TradeRecord } from "@/lib/api/interfaces/trade-history.interface"
import { ActivityRecord } from "@/lib/api/interfaces/activity.interface"
import { CandlestickData, CandlestickTokenMetadata } from "@/lib/api/interfaces/candlesticks.interface"
import { useWalletManager } from "@/hooks/use-wallet-manager"
import { truncateWalletAddress } from "@/lib/utils"
import { ArrowLeft, AlertCircle, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

export default function MarketDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const marketSlug = decodeURIComponent(params["market-slug"] as string)
  const dateParam = searchParams.get("date")
  const walletsParam = searchParams.get("wallets")
  
  // Parse date from URL or default to today
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
    if (dateParam) {
      try {
        const parsed = parse(dateParam, "yyyy-MM-dd", new Date())
        console.log("[MarketDetail] Initial date from URL:", dateParam, "parsed:", parsed.toISOString())
        return parsed
      } catch (e) {
        console.error("[MarketDetail] Failed to parse date:", dateParam, e)
        return new Date()
      }
    }
    const today = new Date()
    console.log("[MarketDetail] No date in URL, using today:", today.toISOString())
    return today
  })
  
  // Update date when URL changes
  React.useEffect(() => {
    if (dateParam) {
      try {
        const parsed = parse(dateParam, "yyyy-MM-dd", new Date())
        if (parsed.getTime() !== selectedDate.getTime()) {
          console.log("[MarketDetail] Date changed in URL:", dateParam, "updating state")
          setSelectedDate(parsed)
        }
      } catch (e) {
        console.error("[MarketDetail] Failed to parse date from URL:", dateParam, e)
      }
    }
  }, [dateParam, selectedDate])
  
  // Memoize wallets to prevent unnecessary re-renders
  const wallets = React.useMemo(() => {
    return walletsParam ? walletsParam.split(",") : []
  }, [walletsParam])
  
  const [trades, setTrades] = React.useState<TradeRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [totalTradeCount, setTotalTradeCount] = React.useState(0)
  
  // Activity state
  const [activities, setActivities] = React.useState<ActivityRecord[]>([])
  const [isLoadingActivity, setIsLoadingActivity] = React.useState(false)
  
  // Candlesticks state
  const [candlesticks, setCandlesticks] = React.useState<CandlestickData[]>([])
  const [candlestickMetadata, setCandlestickMetadata] = React.useState<CandlestickTokenMetadata | null>(null)
  const [isLoadingCandlesticks, setIsLoadingCandlesticks] = React.useState(false)
  
  // Sorting state
  type SortField = 'time' | 'side' | 'outcome' | 'price' | 'shares' | 'value' | 'wallet'
  type SortDirection = 'asc' | 'desc'
  const [sortField, setSortField] = React.useState<SortField>('time')
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc')
  
  // Get wallet configs for displaying aliases
  const { wallets: walletConfigs } = useWalletManager()
  
  // Calculate date range for API call - memoized
  const dateRange = React.useMemo(() => {
    const startOfDay = new Date(selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(selectedDate)
    endOfDay.setHours(23, 59, 59, 999)
    return {
      startTime: Math.floor(startOfDay.getTime() / 1000),
      endTime: Math.floor(endOfDay.getTime() / 1000),
    }
  }, [selectedDate])
  
  // Fetch trades function
  const fetchTrades = React.useCallback(async (force = false) => {
    console.log("[MarketDetail] fetchTrades called, force:", force)
    
    setIsLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        marketSlug,
        startTime: dateRange.startTime.toString(),
        endTime: dateRange.endTime.toString(),
        limit: "1000",
      })
      
      if (wallets.length > 0) {
        params.append("wallets", wallets.join(","))
      }
      
      console.log("[MarketDetail] Fetching trades:", params.toString())
      
      const response = await fetch(`/api/trading/trade-history?${params.toString()}`)
      const data = await response.json()
      
      console.log("[MarketDetail] Response:", {
        ok: response.ok,
        ordersCount: data.orders?.length,
        pagination: data.pagination,
        firstOrder: data.orders?.[0],
        allOrders: data.orders,
      })
      
      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to fetch trades")
      }
      
      const orders = data.orders || []
      console.log("[MarketDetail] Setting trades state:", orders.length, "trades")
      setTrades(orders)
      setTotalTradeCount(data.pagination?.total || orders.length || 0)
      console.log("[MarketDetail] State updated - trades.length should be:", orders.length)
    } catch (err) {
      console.error("[MarketDetail] Error fetching trades:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch trades")
    } finally {
      setIsLoading(false)
      console.log("[MarketDetail] Loading complete, isLoading set to false")
    }
  }, [marketSlug, dateRange.startTime, dateRange.endTime, wallets.join(',')])
  
  // Debug: Log state changes
  React.useEffect(() => {
    console.log("[MarketDetail] State update:", {
      tradesCount: trades.length,
      isLoading,
      error,
      totalTradeCount,
      selectedDate: selectedDate.toISOString(),
      dateRange,
    })
  }, [trades.length, isLoading, error, totalTradeCount, selectedDate, dateRange])
  
  // Fetch activity data
  const fetchActivity = React.useCallback(async () => {
    if (trades.length === 0) {
      setActivities([])
      return
    }
    
    setIsLoadingActivity(true)
    try {
      const params = new URLSearchParams({
        marketSlug,
        startTime: dateRange.startTime.toString(),
        endTime: dateRange.endTime.toString(),
        limit: "1000",
      })
      
      if (wallets.length > 0) {
        params.append("wallets", wallets.join(","))
      }
      
      const response = await fetch(`/api/trading/activity?${params.toString()}`)
      const data = await response.json()
      
      if (response.ok) {
        setActivities(data.activities || [])
      }
    } catch (err) {
      console.error("[MarketDetail] Error fetching activity:", err)
    } finally {
      setIsLoadingActivity(false)
    }
  }, [marketSlug, dateRange.startTime, dateRange.endTime, wallets.join(','), trades.length])

  // Calculate candlestick time range and interval
  const calculateCandlestickParams = React.useCallback(() => {
    if (trades.length === 0) {
      return null
    }
    
    const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp)
    const firstTrade = sortedTrades[0]
    const lastTrade = sortedTrades[sortedTrades.length - 1]
    
    // 1 hour before first trade, 1 hour after last trade
    const startTime = firstTrade.timestamp - 3600
    const endTime = lastTrade.timestamp + 3600
    const timeRange = endTime - startTime // in seconds
    
    // Target 100-200 candlesticks
    const targetCandlesticks = 150
    const secondsPerCandle = timeRange / targetCandlesticks
    
    let interval: 1 | 60 | 1440
    if (timeRange <= 604800) { // <= 1 week
      interval = 1 // 1 minute
    } else if (timeRange <= 2592000) { // <= 1 month
      interval = 60 // 1 hour
    } else {
      interval = 1440 // 1 day
    }
    
    return { startTime, endTime, interval, conditionId: firstTrade.conditionId }
  }, [trades])

  // Fetch candlesticks data
  const fetchCandlesticks = React.useCallback(async () => {
    const params = calculateCandlestickParams()
    if (!params) {
      setCandlesticks([])
      setCandlestickMetadata(null)
      return
    }
    
    setIsLoadingCandlesticks(true)
    try {
      const queryParams = new URLSearchParams({
        conditionId: params.conditionId,
        startTime: params.startTime.toString(),
        endTime: params.endTime.toString(),
        interval: params.interval.toString(),
      })
      
      const response = await fetch(`/api/trading/candlesticks?${queryParams.toString()}`)
      const data = await response.json()
      
      console.log("[MarketDetail] Candlesticks response:", {
        ok: response.ok,
        hasCandlesticks: !!data.candlesticks,
        candlesticksLength: data.candlesticks?.length,
        firstCandlestick: data.candlesticks?.[0],
        fullData: data,
      })
      
      if (response.ok && data.candlesticks && data.candlesticks.length > 0) {
        // Extract candlestick data and metadata from the response
        // Response structure: [[candlestickData[], metadata], ...]
        const firstCandlestick = data.candlesticks[0]
        if (Array.isArray(firstCandlestick) && firstCandlestick.length === 2) {
          const [candlestickData, metadata] = firstCandlestick
          console.log("[MarketDetail] Extracted candlestick data:", {
            dataLength: Array.isArray(candlestickData) ? candlestickData.length : 'not array',
            metadata,
            firstDataPoint: Array.isArray(candlestickData) ? candlestickData[0] : null,
          })
          setCandlesticks(Array.isArray(candlestickData) ? candlestickData : [])
          setCandlestickMetadata(metadata || null)
        } else {
          console.warn("[MarketDetail] Unexpected candlestick response structure:", firstCandlestick)
        }
      } else {
        console.warn("[MarketDetail] No candlestick data in response:", data)
      }
    } catch (err) {
      console.error("[MarketDetail] Error fetching candlesticks:", err)
    } finally {
      setIsLoadingCandlesticks(false)
    }
  }, [calculateCandlestickParams])

  // Fetch on mount and when key dependencies change
  React.useEffect(() => {
    console.log("[MarketDetail] useEffect triggered - fetching trades")
    fetchTrades()
  }, [marketSlug, dateRange.startTime, dateRange.endTime, wallets.join(',')])
  
  // Fetch activity and candlesticks when trades are loaded
  React.useEffect(() => {
    if (trades.length > 0) {
      fetchActivity()
      fetchCandlesticks()
    } else {
      setActivities([])
      setCandlesticks([])
      setCandlestickMetadata(null)
    }
  }, [trades.length, fetchActivity, fetchCandlesticks])
  
  // Refetch function for the refresh button
  const refetch = React.useCallback(() => {
    console.log("[MarketDetail] Manual refresh triggered")
    fetchTrades(true)
  }, [fetchTrades])
  
  // Update URL when date changes
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      const newDateParam = format(date, "yyyy-MM-dd")
      const newUrl = `/trading-analysis/market/${encodeURIComponent(marketSlug)}?date=${newDateParam}${walletsParam ? `&wallets=${walletsParam}` : ""}`
      router.replace(newUrl)
    }
  }
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  // Helper function to get wallet alias or truncated address
  const getWalletDisplay = (walletAddress: string): string => {
    const config = walletConfigs.find(w => w.address.toLowerCase() === walletAddress.toLowerCase())
    return config?.alias || truncateWalletAddress(walletAddress)
  }

  // Sorting functions
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />
  }

  // Sort trades
  const sortedTrades = React.useMemo(() => {
    const sorted = [...trades]
    
    sorted.sort((a, b) => {
      let aValue: number | string
      let bValue: number | string

      switch (sortField) {
        case 'time':
          aValue = a.timestamp
          bValue = b.timestamp
          break
        case 'side':
          aValue = a.side
          bValue = b.side
          break
        case 'outcome':
          aValue = a.tokenLabel || ''
          bValue = b.tokenLabel || ''
          break
        case 'price':
          aValue = a.price
          bValue = b.price
          break
        case 'shares':
          aValue = a.sharesNormalized
          bValue = b.sharesNormalized
          break
        case 'value':
          aValue = a.price * a.sharesNormalized
          bValue = b.price * b.sharesNormalized
          break
        case 'wallet':
          aValue = a.user || ''
          bValue = b.user || ''
          break
        default:
          return 0
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })

    return sorted
  }, [trades, sortField, sortDirection])
  
  // Calculate summary stats from trades
  const summary = React.useMemo(() => {
    if (trades.length === 0) return null
    
    let totalBought = 0
    let totalSold = 0
    let totalBuyValue = 0
    let totalSellValue = 0
    
    for (const trade of trades) {
      if (trade.side === "BUY") {
        totalBought += trade.sharesNormalized
        totalBuyValue += trade.sharesNormalized * trade.price
      } else if (trade.side === "SELL") {
        totalSold += trade.sharesNormalized
        totalSellValue += trade.sharesNormalized * trade.price
      }
    }
    
    const avgBuyPrice = totalBought > 0 ? totalBuyValue / totalBought : 0
    const avgSellPrice = totalSold > 0 ? totalSellValue / totalSold : 0
    
    return {
      totalBought,
      totalSold,
      avgBuyPrice,
      avgSellPrice,
      title: trades[0]?.title || marketSlug,
    }
  }, [trades, marketSlug])
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header with Back Button */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push(`/trading-analysis?date=${format(selectedDate, "yyyy-MM-dd")}`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold line-clamp-1">
                  {summary?.title || marketSlug}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Trade details for {format(selectedDate, "PPP")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DatePicker
                date={selectedDate}
                onDateChange={handleDateChange}
                placeholder="Select date"
              />
              <Button
                variant="outline"
                onClick={refetch}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Summary Card */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Trades</CardDescription>
                  <CardTitle className="text-2xl">{totalTradeCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Avg Buy Price</CardDescription>
                  <CardTitle className="text-2xl">${summary.avgBuyPrice.toFixed(4)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Avg Sell Price</CardDescription>
                  <CardTitle className="text-2xl">
                    {summary.avgSellPrice > 0 ? `$${summary.avgSellPrice.toFixed(4)}` : "-"}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}
          
          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Trades Table */}
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>
                {trades.length} trades on {format(selectedDate, "PPP")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : trades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No trades found for this market on {format(selectedDate, "PPP")}
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-medium hover:bg-transparent"
                            onClick={() => handleSort('time')}
                          >
                            Time
                            {getSortIcon('time')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-medium hover:bg-transparent"
                            onClick={() => handleSort('side')}
                          >
                            Side
                            {getSortIcon('side')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-medium hover:bg-transparent"
                            onClick={() => handleSort('outcome')}
                          >
                            Outcome
                            {getSortIcon('outcome')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-medium hover:bg-transparent"
                            onClick={() => handleSort('price')}
                          >
                            Price
                            {getSortIcon('price')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-medium hover:bg-transparent"
                            onClick={() => handleSort('shares')}
                          >
                            Shares
                            {getSortIcon('shares')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-medium hover:bg-transparent"
                            onClick={() => handleSort('value')}
                          >
                            Value
                            {getSortIcon('value')}
                          </Button>
                        </TableHead>
                        {wallets.length > 1 && (
                          <TableHead>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 font-medium hover:bg-transparent"
                              onClick={() => handleSort('wallet')}
                            >
                              Wallet
                              {getSortIcon('wallet')}
                            </Button>
                          </TableHead>
                        )}
                        <TableHead>Tx Hash</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTrades.map((trade, idx) => (
                        <TableRow key={`${trade.txHash}-${trade.logIndex}-${idx}`}>
                          <TableCell className="text-sm">
                            {formatDate(trade.timestamp)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={trade.side === "BUY" ? "default" : "secondary"}>
                              {trade.side}
                            </Badge>
                          </TableCell>
                          <TableCell>{trade.tokenLabel}</TableCell>
                          <TableCell>${trade.price.toFixed(4)}</TableCell>
                          <TableCell>{trade.sharesNormalized.toFixed(2)}</TableCell>
                          <TableCell>
                            ${(trade.price * trade.sharesNormalized).toFixed(2)}
                          </TableCell>
                          {wallets.length > 1 && (
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {getWalletDisplay(trade.user)}
                              </Badge>
                            </TableCell>
                          )}
                          <TableCell>
                            <a
                              href={`https://polygonscan.com/tx/${trade.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-500 hover:underline"
                            >
                              {trade.txHash.slice(0, 10)}...
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          
          {/* Activity Table - Only show if trades exist */}
          {trades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Activity</CardTitle>
                <CardDescription>
                  {activities.length} activities on {format(selectedDate, "PPP")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingActivity ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No activities found for this market on {format(selectedDate, "PPP")}
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Shares</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Value</TableHead>
                          {wallets.length > 1 && <TableHead>Wallet</TableHead>}
                          <TableHead>Tx Hash</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activities.map((activity, idx) => (
                          <TableRow key={`${activity.txHash}-${activity.logIndex}-${idx}`}>
                            <TableCell className="text-sm">
                              {formatDate(activity.timestamp)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{activity.type}</Badge>
                            </TableCell>
                            <TableCell>{activity.sharesNormalized.toFixed(2)}</TableCell>
                            <TableCell>${activity.price.toFixed(4)}</TableCell>
                            <TableCell>
                              ${(activity.price * activity.sharesNormalized).toFixed(2)}
                            </TableCell>
                            {wallets.length > 1 && (
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {getWalletDisplay(activity.user)}
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell>
                              <a
                                href={`https://polygonscan.com/tx/${activity.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-500 hover:underline"
                              >
                                {activity.txHash.slice(0, 10)}...
                              </a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Candlestick Chart - Only show if trades exist */}
          {trades.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Price Chart</CardTitle>
                <CardDescription>
                  Candlestick chart showing price movement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingCandlesticks ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : candlesticks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No candlestick data available
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs mt-2">
                        Debug: candlesticks.length = {candlesticks.length}, 
                        isLoadingCandlesticks = {String(isLoadingCandlesticks)}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-muted-foreground mb-2">
                        Debug: {candlesticks.length} candlesticks loaded, 
                        metadata: {candlestickMetadata ? `${candlestickMetadata.side} (${candlestickMetadata.token_id.slice(0, 10)}...)` : 'none'}
                      </div>
                    )}
                    <CandlestickChartComponent 
                      data={candlesticks}
                      metadata={candlestickMetadata}
                      trades={trades}
                      walletConfigs={wallets.length > 1 ? walletConfigs.filter(w => w.enabled) : []}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      <Footer />
      <BottomNavigation />
    </div>
  )
}

// Candlestick Chart Component
function CandlestickChartComponent({ 
  data, 
  metadata,
  trades = [],
  walletConfigs = []
}: { 
  data: CandlestickData[]
  metadata: CandlestickTokenMetadata | null
  trades?: TradeRecord[]
  walletConfigs?: Array<{ address: string; alias?: string }>
}) {
  const chartContainerRef = React.useRef<HTMLDivElement>(null)
  const chartRef = React.useRef<any>(null)
  const seriesRef = React.useRef<any>(null)
  const volumeSeriesRef = React.useRef<any>(null)
  const markersPluginRef = React.useRef<any>(null)
  const markersDataRef = React.useRef<any[]>([])

  React.useEffect(() => {
    if (!chartContainerRef.current) {
      console.log('[CandlestickChart] No container ref')
      return
    }
    
    if (data.length === 0) {
      console.log('[CandlestickChart] No data to display')
      return
    }

    console.log('[CandlestickChart] Initializing chart with', data.length, 'data points')

    // Dynamically import lightweight-charts (v5.x API)
    import('lightweight-charts').then(({ 
      createChart, 
      ColorType, 
      CandlestickSeries,
      HistogramSeries,
      createSeriesMarkers
    }) => {
      console.log('[CandlestickChart] Lightweight charts loaded')
      
      if (chartRef.current) {
        console.log('[CandlestickChart] Removing existing chart')
        chartRef.current.remove()
        chartRef.current = null
      }

      if (!chartContainerRef.current) {
        console.error('[CandlestickChart] Container ref lost after import')
        return
      }

      // Detect theme and use appropriate colors
      const isDarkMode = typeof window !== 'undefined' && 
        (document.documentElement.classList.contains('dark') || 
         window.matchMedia('(prefers-color-scheme: dark)').matches)
      
      const colors = isDarkMode
        ? {
            foreground: '#fafafa',  // Light text for dark background
            border: '#3f3f46',      // Dark border
            background: '#18181b', // Dark background
          }
        : {
            foreground: '#09090b',  // Dark text for light background
            border: '#e4e4e7',      // Light border
            background: '#ffffff',  // White background
          }
      
      console.log('[CandlestickChart] Using colors (dark mode:', isDarkMode, '):', colors)

      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: colors.background },
          textColor: colors.foreground,
        },
        width: chartContainerRef.current.clientWidth,
        height: 400,
        grid: {
          vertLines: { color: colors.border },
          horzLines: { color: colors.border },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      })

      chartRef.current = chart
      console.log('[CandlestickChart] Chart created')

      // Add candlestick series (v5.x API: use addSeries with CandlestickSeries)
      // This will use the default right price scale
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      })
      
      // Configure candlestick price scale to leave bottom 30% for volume
      candlestickSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0,
          bottom: 0.3, // Leave bottom 30% for volume
        },
      })

      // Add volume series on a separate overlay price scale (bottom section)
      // This prevents volume bars from overlapping with candlestick prices
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume-scale', // Use separate overlay price scale
      })
      
      // Configure the volume price scale to occupy bottom 30% of chart
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.7,  // Volume occupies bottom 30% (70% from top)
          bottom: 0,
        },
      })

      seriesRef.current = candlestickSeries
      volumeSeriesRef.current = volumeSeries

      // Prepare data
      const candlestickData = data.map(c => {
        const open = parseFloat(c.price.open_dollars || '0')
        const high = parseFloat(c.price.high_dollars || '0')
        const low = parseFloat(c.price.low_dollars || '0')
        const close = parseFloat(c.price.close_dollars || '0')
        
        return {
          time: c.end_period_ts as any, // Unix timestamp in seconds
          open,
          high,
          low,
          close,
        }
      }).filter(d => d.time && d.open > 0) // Filter out invalid data

      const volumeData = data.map(c => ({
        time: c.end_period_ts as any,
        value: c.volume || 0,
        color: parseFloat(c.price.close_dollars || '0') >= parseFloat(c.price.open_dollars || '0')
          ? 'rgba(38, 166, 154, 0.6)' 
          : 'rgba(239, 83, 80, 0.6)',
      })).filter(d => d.time && d.value > 0)

      console.log('[CandlestickChart] Prepared data:', {
        candlestickCount: candlestickData.length,
        volumeCount: volumeData.length,
        firstCandlestick: candlestickData[0],
        firstVolume: volumeData[0],
      })

      if (candlestickData.length > 0) {
        candlestickSeries.setData(candlestickData)
        console.log('[CandlestickChart] Candlestick data set')
      }

      if (volumeData.length > 0) {
        volumeSeries.setData(volumeData)
        console.log('[CandlestickChart] Volume data set')
      }

      // Create markers from trades
      if (trades.length > 0 && candlestickData.length > 0) {
        // Get all candlestick timestamps for matching
        const candlestickTimes = candlestickData.map(d => d.time as number).sort((a, b) => a - b)
        
        // Helper to find nearest candlestick timestamp
        const findNearestCandlestickTime = (tradeTime: number): number => {
          let nearest = candlestickTimes[0]
          let minDiff = Math.abs(tradeTime - nearest)
          
          for (const candleTime of candlestickTimes) {
            const diff = Math.abs(tradeTime - candleTime)
            if (diff < minDiff) {
              minDiff = diff
              nearest = candleTime
            }
          }
          
          return nearest
        }
        
        // Helper to get wallet alias
        const getWalletAlias = (walletAddress: string): string => {
          const config = walletConfigs.find(w => w.address.toLowerCase() === walletAddress.toLowerCase())
          return config?.alias || truncateWalletAddress(walletAddress)
        }
        
        // Create markers for all trades
        const markers = trades.map(trade => {
          const nearestTime = findNearestCandlestickTime(trade.timestamp)
          const price = trade.price.toFixed(2)
          
          // Build marker text: "BUY $43" or "SELL $38" with spacing from arrow
          // Add spaces to create visual separation between arrow and text
          const markerText = `  ${trade.side} $${price}`
          
          return {
            time: nearestTime as any,
            position: trade.side === 'BUY' ? 'aboveBar' as const : 'belowBar' as const,
            color: trade.side === 'BUY' ? '#26a69a' : '#ef5350',
            shape: trade.side === 'BUY' ? 'arrowUp' as const : 'arrowDown' as const,
            text: markerText,
            size: 0.05, // 5% of default size - very small markers
          }
        })
        
        console.log('[CandlestickChart] Creating markers:', {
          tradeCount: trades.length,
          markerCount: markers.length,
          sampleMarkers: markers.slice(0, 3),
        })
        
        // Store markers data for re-application on zoom
        markersDataRef.current = markers
        
        // Create markers plugin and store reference
        markersPluginRef.current = createSeriesMarkers(candlestickSeries, markers)
        console.log('[CandlestickChart] Markers added to chart')
        
        // Re-apply markers when visible range changes (zoom/pan) to fix disappearing markers
        chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
          if (markersPluginRef.current && markersDataRef.current.length > 0) {
            // Re-apply markers to ensure they remain visible after zoom/pan
            markersPluginRef.current.setMarkers(markersDataRef.current)
          }
        })
      }

      chart.timeScale().fitContent()
      console.log('[CandlestickChart] Chart initialized successfully')

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ 
            width: chartContainerRef.current.clientWidth 
          })
        }
      }

      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        if (chartRef.current) {
          chartRef.current.remove()
        }
      }
    }).catch((error) => {
      console.error('[CandlestickChart] Error loading lightweight-charts:', error)
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [data])

  return (
    <div className="w-full">
      <div ref={chartContainerRef} className="w-full h-[400px]" style={{ minHeight: '400px' }} />
    </div>
  )
}
