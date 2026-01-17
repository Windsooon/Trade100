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
  
  // Fetch on mount and when key dependencies change
  React.useEffect(() => {
    console.log("[MarketDetail] useEffect triggered - fetching trades")
    fetchTrades()
  }, [marketSlug, dateRange.startTime, dateRange.endTime, wallets.join(',')])
  
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
        </div>
      </div>
      
      <Footer />
      <BottomNavigation />
    </div>
  )
}
