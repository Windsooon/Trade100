"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MarketSummary } from "@/lib/services/trading-analysis.service"
import { TradeRecord } from "@/lib/api/interfaces/trade-history.interface"
import { formatCurrency, formatPercentage } from "@/lib/portfolio-utils"
import { TrendingUp, TrendingDown, ChevronDown, ChevronRight, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface MarketAnalysisTableProps {
  summaries: MarketSummary[]
  isLoading?: boolean
  wallets?: string[] // 钱包地址列表，用于获取交易记录
  onMarketClick?: (summary: MarketSummary) => void
}

type SortField = 'title' | 'totalPnL' | 'tradeCount' | 'realizedPnL' | 'unrealizedPnL'
type SortDirection = 'asc' | 'desc'

export function MarketAnalysisTable({ summaries, isLoading, wallets = [], onMarketClick }: MarketAnalysisTableProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortField, setSortField] = React.useState<SortField>('totalPnL')
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc')
  const [filterPnL, setFilterPnL] = React.useState<'all' | 'profit' | 'loss'>('all')
  const [expandedMarkets, setExpandedMarkets] = React.useState<Set<string>>(new Set())
  const [marketTrades, setMarketTrades] = React.useState<Map<string, TradeRecord[]>>(new Map())
  const [loadingTrades, setLoadingTrades] = React.useState<Set<string>>(new Set())

  // Filter and sort markets
  const filteredAndSorted = React.useMemo(() => {
    let filtered = summaries.filter(summary => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        summary.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        summary.marketSlug.toLowerCase().includes(searchQuery.toLowerCase())
      
      // P/L filter
      const matchesPnL = filterPnL === 'all' ||
        (filterPnL === 'profit' && summary.totalPnL > 0) ||
        (filterPnL === 'loss' && summary.totalPnL < 0)
      
      return matchesSearch && matchesPnL
    })

    // Sort
    filtered.sort((a, b) => {
      let aValue: number | string
      let bValue: number | string

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'totalPnL':
          aValue = a.totalPnL
          bValue = b.totalPnL
          break
        case 'tradeCount':
          aValue = a.tradeCount
          bValue = b.tradeCount
          break
        case 'realizedPnL':
          aValue = a.realizedPnL
          bValue = b.realizedPnL
          break
        case 'unrealizedPnL':
          aValue = a.unrealizedPnL
          bValue = b.unrealizedPnL
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

    return filtered
  }, [summaries, searchQuery, sortField, sortDirection, filterPnL])

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

  const toggleMarketExpansion = async (summary: MarketSummary) => {
    const key = `${summary.conditionId}-${summary.marketSlug}`
    
    if (expandedMarkets.has(key)) {
      // Collapse
      setExpandedMarkets(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    } else {
      // Expand - fetch trades
      setExpandedMarkets(prev => new Set(prev).add(key))
      
      if (!marketTrades.has(key)) {
        setLoadingTrades(prev => new Set(prev).add(key))
        try {
          // Fetch trades for this market
          // 如果有钱包地址，使用 wallets 参数；否则只使用 marketSlug 和 conditionId
          const params = new URLSearchParams({
            conditionId: summary.conditionId,
            marketSlug: summary.marketSlug,
            limit: '1000',
          })
          if (wallets.length > 0) {
            params.append('wallets', wallets.join(','))
          }
          
          const response = await fetch(`/api/trading/trade-history?${params.toString()}`)
          if (response.ok) {
            const data = await response.json()
            setMarketTrades(prev => new Map(prev).set(key, data.orders || []))
          }
        } catch (error) {
          console.error('Error fetching trades:', error)
        } finally {
          setLoadingTrades(prev => {
            const next = new Set(prev)
            next.delete(key)
            return next
          })
        }
      }
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  if (isLoading && summaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Analysis</CardTitle>
          <CardDescription>Loading market data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading markets...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Market Analysis</CardTitle>
            <CardDescription>
              {filteredAndSorted.length} of {summaries.length} markets
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterPnL} onValueChange={(value: 'all' | 'profit' | 'loss') => setFilterPnL(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by P/L" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              <SelectItem value="profit">Profitable Only</SelectItem>
              <SelectItem value="loss">Loss Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Markets Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort('title')}
                  >
                    Market
                    {getSortIcon('title')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort('totalPnL')}
                  >
                    Total P/L
                    {getSortIcon('totalPnL')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort('realizedPnL')}
                  >
                    Realized
                    {getSortIcon('realizedPnL')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort('unrealizedPnL')}
                  >
                    Unrealized
                    {getSortIcon('unrealizedPnL')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort('tradeCount')}
                  >
                    Trades
                    {getSortIcon('tradeCount')}
                  </Button>
                </TableHead>
                <TableHead>Holding</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No markets found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((summary) => {
                  const key = `${summary.conditionId}-${summary.marketSlug}`
                  const isExpanded = expandedMarkets.has(key)
                  const trades = marketTrades.get(key) || []
                  const isLoadingTrades = loadingTrades.has(key)
                  const isProfit = summary.totalPnL > 0
                  const pnlPercentage = summary.avgBuyPrice > 0
                    ? ((summary.totalPnL / (summary.avgBuyPrice * summary.totalBought)) * 100)
                    : 0

                  return (
                    <React.Fragment key={key}>
                      {/* Market Summary Row */}
                      <TableRow className="hover:bg-muted/50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleMarketExpansion(summary)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium line-clamp-1">{summary.title}</div>
                            <div className="text-xs text-muted-foreground">{summary.marketSlug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isProfit ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <span className={`font-semibold ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                              {formatCurrency(summary.totalPnL)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={summary.realizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {formatCurrency(summary.realizedPnL)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={summary.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {formatCurrency(summary.unrealizedPnL)}
                          </span>
                        </TableCell>
                        <TableCell>{summary.tradeCount}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{summary.currentHolding.toFixed(2)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              B: {summary.totalBought.toFixed(2)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              S: {summary.totalSold.toFixed(2)}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Trades Table */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={9} className="p-0">
                            <div className="bg-muted/30 p-4">
                              <div className="mb-4 flex items-center justify-between">
                                <h4 className="font-semibold">Trades for {summary.title}</h4>
                                <div className="flex gap-2 text-sm">
                                  <Badge variant="outline">
                                    Avg Buy: ${summary.avgBuyPrice.toFixed(4)}
                                  </Badge>
                                  {summary.avgSellPrice > 0 && (
                                    <Badge variant="outline">
                                      Avg Sell: ${summary.avgSellPrice.toFixed(4)}
                                    </Badge>
                                  )}
                                  {pnlPercentage !== 0 && (
                                    <Badge variant={isProfit ? "default" : "destructive"}>
                                      {formatPercentage(pnlPercentage)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              {isLoadingTrades ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  Loading trades...
                                </div>
                              ) : trades.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  No trades found
                                </div>
                              ) : (
                                <ScrollArea className="h-[400px]">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Side</TableHead>
                                        <TableHead>Outcome</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Shares</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Tx Hash</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {trades.map((trade, idx) => (
                                        <TableRow key={`${trade.txHash}-${trade.logIndex}-${idx}`}>
                                          <TableCell className="text-xs">
                                            {formatDate(trade.timestamp)}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant={trade.side === 'BUY' ? 'default' : 'secondary'}>
                                              {trade.side}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>{trade.tokenLabel}</TableCell>
                                          <TableCell>${trade.price.toFixed(4)}</TableCell>
                                          <TableCell>{trade.sharesNormalized.toFixed(2)}</TableCell>
                                          <TableCell>
                                            {formatCurrency(trade.price * trade.sharesNormalized)}
                                          </TableCell>
                                          <TableCell>
                                            <a
                                              href={`https://polygonscan.com/tx/${trade.txHash}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-blue-500 hover:underline"
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
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
