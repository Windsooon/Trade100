"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
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
import { MarketSummary } from "@/lib/services/trading-analysis.service"
import { formatCurrency, formatPercentage } from "@/lib/portfolio-utils"
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface MarketAnalysisTableProps {
  summaries: MarketSummary[]
  isLoading?: boolean
  wallets?: string[] // 钱包地址列表，用于获取交易记录
  selectedDate?: Date // 当前选择的日期，用于传递到详情页
  totalTradeCount?: number // 总交易数
  walletConfigs?: Array<{ address: string; alias: string }> // 钱包配置（包含别名）
}

type SortField = 'title' | 'tradeCount' | 'yesHolding' | 'noHolding' | 'netHolding'
type SortDirection = 'asc' | 'desc'

export function MarketAnalysisTable({ summaries, isLoading, wallets = [], selectedDate, totalTradeCount, walletConfigs = [] }: MarketAnalysisTableProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sortField, setSortField] = React.useState<SortField>('tradeCount')
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc')

  // Filter and sort markets
  const filteredAndSorted = React.useMemo(() => {
    let filtered = summaries.filter(summary => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        summary.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        summary.marketSlug.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesSearch
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
        case 'tradeCount':
          aValue = a.tradeCount
          bValue = b.tradeCount
          break
        case 'yesHolding':
          aValue = a.yesHolding
          bValue = b.yesHolding
          break
        case 'noHolding':
          aValue = a.noHolding
          bValue = b.noHolding
          break
        case 'netHolding':
          aValue = a.netHolding
          bValue = b.netHolding
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
  }, [summaries, searchQuery, sortField, sortDirection])

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

  // Navigate to market detail page
  const handleMarketClick = (summary: MarketSummary) => {
    const dateParam = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    const walletsParam = wallets.length > 0 ? `&wallets=${encodeURIComponent(wallets.join(','))}` : ''
    router.push(`/trading-analysis/market/${encodeURIComponent(summary.marketSlug)}?date=${dateParam}${walletsParam}`)
  }

  // Helper function to get wallet aliases for a market
  const getWalletAliases = (walletAddresses: string[]): string[] => {
    return walletAddresses
      .map(addr => {
        const config = walletConfigs.find(w => w.address.toLowerCase() === addr.toLowerCase())
        return config?.alias || addr
      })
      .filter(Boolean)
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
              {totalTradeCount !== undefined && (
                <span className="ml-2">• {totalTradeCount} trades</span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search Controls */}
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
        </div>

        {/* Markets Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
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
                    onClick={() => handleSort('tradeCount')}
                  >
                    Trades
                    {getSortIcon('tradeCount')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort('yesHolding')}
                  >
                    Yes Shares
                    {getSortIcon('yesHolding')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort('noHolding')}
                  >
                    No Shares
                    {getSortIcon('noHolding')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium hover:bg-transparent"
                    onClick={() => handleSort('netHolding')}
                  >
                    Net Shares
                    {getSortIcon('netHolding')}
                  </Button>
                </TableHead>
                <TableHead>
                  <span className="font-medium">Wallets</span>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No markets found matching your criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((summary) => {
                  const key = `${summary.conditionId}-${summary.marketSlug}`
                  const walletAliases = getWalletAliases(summary.walletAddresses || [])

                  return (
                    <TableRow 
                      key={key} 
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleMarketClick(summary)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium line-clamp-1">{summary.title}</div>
                          <div className="text-xs text-muted-foreground">{summary.marketSlug}</div>
                        </div>
                      </TableCell>
                      <TableCell>{summary.tradeCount}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{summary.yesHolding.toFixed(2)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{summary.noHolding.toFixed(2)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={summary.netHolding > 0 ? "default" : summary.netHolding < 0 ? "secondary" : "outline"}>
                          {summary.netHolding > 0 ? '+' : ''}{summary.netHolding.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {walletAliases.length > 0 ? (
                            walletAliases.map((alias, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {alias}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
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
