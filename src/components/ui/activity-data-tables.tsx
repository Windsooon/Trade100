'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'
import { Input } from './input'
import { Button } from './button'
import { Badge } from './badge'
import { Alert, AlertDescription } from './alert'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './table'
import { ScrollArea } from './scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { RefreshCw, DollarSign, Target, AlertCircle, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, BookmarkCheck } from 'lucide-react'

interface TradeActivity {
  id: string
  timestamp: number
  user: {
    name: string
    pseudonym: string
    profileImage?: string
  }
  market: {
    title: string
    slug: string
    eventSlug: string
    conditionId: string
    icon?: string
  }
  trade: {
    outcome: string
    outcomeIndex: number
    side: 'BUY' | 'SELL'
    price: number
    size: number
    totalValue: number
  }
  transactionHash: string
}

interface ActivityDataTablesProps {
  trades: TradeActivity[]
  onRefresh?: () => void
}

// Import the watchlist store
import { useWatchlistStore } from '@/lib/stores'

export function ActivityDataTables({ trades, onRefresh }: ActivityDataTablesProps) {
  const { getWatchlistConditionIds } = useWatchlistStore()
  // Whale Trades state
  const [whaleThreshold, setWhaleThreshold] = useState<string>('1000')
  const [whaleTrades, setWhaleTrades] = useState<TradeActivity[]>([])
  const [whaleCurrentPage, setWhaleCurrentPage] = useState(1)
  const [whaleSortBy, setWhaleSortBy] = useState<string>('timestamp')
  const [whaleSortDirection, setWhaleSortDirection] = useState<'asc' | 'desc'>('asc')
  const [whaleOutcomeFilter, setWhaleOutcomeFilter] = useState<string>('all')
  const [whaleMinTotalValue, setWhaleMinTotalValue] = useState<string>('')
  const [whaleMaxTotalValue, setWhaleMaxTotalValue] = useState<string>('')
  const [whaleSideFilter, setWhaleSideFilter] = useState<string>('all')

  // Price Range state
  const [minPrice, setMinPrice] = useState<string>('0.9')
  const [maxPrice, setMaxPrice] = useState<string>('1.0')
  const [priceRangeTrades, setPriceRangeTrades] = useState<TradeActivity[]>([])
  const [priceRangeError, setPriceRangeError] = useState<string>('')
  const [priceCurrentPage, setPriceCurrentPage] = useState(1)
  const [priceSortBy, setPriceSortBy] = useState<string>('timestamp')
  const [priceSortDirection, setPriceSortDirection] = useState<'asc' | 'desc'>('asc')
  const [priceOutcomeFilter, setPriceOutcomeFilter] = useState<string>('all')
  const [priceMinTotalValue, setPriceMinTotalValue] = useState<string>('')
  const [priceMaxTotalValue, setPriceMaxTotalValue] = useState<string>('')
  const [priceSideFilter, setPriceSideFilter] = useState<string>('all')

  // Watchlist state
  const [watchlistTrades, setWatchlistTrades] = useState<TradeActivity[]>([])
  const [watchlistCurrentPage, setWatchlistCurrentPage] = useState(1)
  const [watchlistSortBy, setWatchlistSortBy] = useState<string>('timestamp')
  const [watchlistSortDirection, setWatchlistSortDirection] = useState<'asc' | 'desc'>('asc')
  const [watchlistOutcomeFilter, setWatchlistOutcomeFilter] = useState<string>('all')
  const [watchlistMinTotalValue, setWatchlistMinTotalValue] = useState<string>('')
  const [watchlistMaxTotalValue, setWatchlistMaxTotalValue] = useState<string>('')
  const [watchlistSideFilter, setWatchlistSideFilter] = useState<string>('all')

  const recordsPerPage = 20
  const maxTradesPerTab = 5000

  // Sorting function
  const sortTrades = useCallback((trades: TradeActivity[], sortBy: string, sortDirection: 'asc' | 'desc'): TradeActivity[] => {
    return [...trades].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp
          break
        case 'market':
          comparison = a.market.title.localeCompare(b.market.title)
          break
        case 'price':
          comparison = a.trade.price - b.trade.price
          break
        case 'totalValue':
          comparison = a.trade.totalValue - b.trade.totalValue
          break
        default:
          return 0
      }

      return sortDirection === 'desc' ? -comparison : comparison
    })
  }, [])

  // Validate price range inputs
  const validatePriceRange = useCallback((min: string, max: string): string => {
    const minVal = parseFloat(min)
    const maxVal = parseFloat(max)

    if (isNaN(minVal) || isNaN(maxVal)) {
      return 'Please enter valid numbers'
    }

    if (minVal < 0 || maxVal < 0) {
      return 'Prices must be non-negative'
    }

    // Allow any max price value - no upper limit validation
    // If max < min, we'll just return empty results instead of showing error

    return ''
  }, [])

  // Apply filters function
  const applyFilters = useCallback((trades: TradeActivity[], outcomeFilter: string, minTotalValue: string, maxTotalValue: string, sideFilter: string): TradeActivity[] => {
    return trades.filter(trade => {
      // Outcome filter
      if (outcomeFilter !== 'all' && trade.trade.outcome.toLowerCase() !== outcomeFilter.toLowerCase()) {
        return false
      }

      // Side filter
      if (sideFilter !== 'all' && trade.trade.side.toLowerCase() !== sideFilter.toLowerCase()) {
        return false
      }

      // Total value range filter
      const minVal = parseFloat(minTotalValue) || 0
      const maxVal = parseFloat(maxTotalValue) || Infinity
      
      if (trade.trade.totalValue < minVal || trade.trade.totalValue > maxVal) {
        return false
      }

      return true
    })
  }, [])

  // Update whale trades when threshold, filters, or trades change
  useEffect(() => {
    const threshold = parseFloat(whaleThreshold) || 0
    const baseFiltered = trades.filter(trade => trade.trade.totalValue >= threshold)
    const filtered = applyFilters(baseFiltered, whaleOutcomeFilter, whaleMinTotalValue, whaleMaxTotalValue, whaleSideFilter)
      .slice(0, maxTradesPerTab)
    const sorted = sortTrades(filtered, whaleSortBy, whaleSortDirection)
    setWhaleTrades(sorted)
    setWhaleCurrentPage(1) // Reset to first page when data changes
  }, [trades, whaleThreshold, whaleOutcomeFilter, whaleMinTotalValue, whaleMaxTotalValue, whaleSideFilter, whaleSortBy, whaleSortDirection, sortTrades, applyFilters])

  // Update price range trades when range, filters, or trades change
  useEffect(() => {
    const error = validatePriceRange(minPrice, maxPrice)
    setPriceRangeError(error)

    if (!error) {
      const minVal = parseFloat(minPrice)
      const maxVal = parseFloat(maxPrice)
      
      // If max price is less than min price, return empty results
      if (maxVal < minVal) {
        setPriceRangeTrades([])
        setPriceCurrentPage(1)
        return
      }
      
      // Filter trades within the price range
      const baseFiltered = trades.filter(trade => {
        const price = trade.trade.price
        return price >= minVal && price <= maxVal
      })
      const filtered = applyFilters(baseFiltered, priceOutcomeFilter, priceMinTotalValue, priceMaxTotalValue, priceSideFilter)
        .slice(0, maxTradesPerTab)
      const sorted = sortTrades(filtered, priceSortBy, priceSortDirection)
      setPriceRangeTrades(sorted)
      setPriceCurrentPage(1) // Reset to first page when data changes
    } else {
      setPriceRangeTrades([])
      setPriceCurrentPage(1)
    }
  }, [trades, minPrice, maxPrice, priceOutcomeFilter, priceMinTotalValue, priceMaxTotalValue, priceSideFilter, validatePriceRange, priceSortBy, priceSortDirection, sortTrades, applyFilters])

  // Update watchlist trades when watchlist or trades change
  useEffect(() => {
    const watchlistConditionIds = getWatchlistConditionIds()
    
    if (watchlistConditionIds.size === 0) {
      setWatchlistTrades([])
      setWatchlistCurrentPage(1)
      return
    }
    
    // Filter trades for watchlisted markets
    const baseFiltered = trades.filter(trade => 
      watchlistConditionIds.has(trade.market.conditionId)
    )
    const filtered = applyFilters(baseFiltered, watchlistOutcomeFilter, watchlistMinTotalValue, watchlistMaxTotalValue, watchlistSideFilter)
      .slice(0, maxTradesPerTab)
    const sorted = sortTrades(filtered, watchlistSortBy, watchlistSortDirection)
    setWatchlistTrades(sorted)
    setWatchlistCurrentPage(1)
  }, [trades, getWatchlistConditionIds, watchlistOutcomeFilter, watchlistMinTotalValue, watchlistMaxTotalValue, watchlistSideFilter, watchlistSortBy, watchlistSortDirection, sortTrades, applyFilters])

  // Handle input changes for whale threshold
  const handleWhaleThresholdChange = (value: string) => {
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWhaleThreshold(value)
    }
  }

  // Handle input changes for price range
  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    // Allow only numbers and decimal point - no upper limit restriction for max price
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      if (type === 'min') {
        setMinPrice(value)
      } else {
        setMaxPrice(value)
      }
    }
  }

  // Handle input changes for total value filters
  const handleTotalValueChange = (tab: 'whale' | 'price' | 'watchlist', type: 'min' | 'max', value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      if (tab === 'whale') {
        if (type === 'min') {
          setWhaleMinTotalValue(value)
        } else {
          setWhaleMaxTotalValue(value)
        }
      } else if (tab === 'price') {
        if (type === 'min') {
          setPriceMinTotalValue(value)
        } else {
          setPriceMaxTotalValue(value)
        }
      } else if (tab === 'watchlist') {
        if (type === 'min') {
          setWatchlistMinTotalValue(value)
        } else {
          setWatchlistMaxTotalValue(value)
        }
      }
    }
  }

  // Pagination calculations
  const getPaginatedData = (data: TradeActivity[], currentPage: number) => {
    const startIndex = (currentPage - 1) * recordsPerPage
    const endIndex = startIndex + recordsPerPage
    return data.slice(startIndex, endIndex)
  }

  const getTotalPages = (dataLength: number) => {
    return Math.ceil(dataLength / recordsPerPage)
  }

  // Sort handlers
  const handleSort = (column: string, tabType: 'whale' | 'price' | 'watchlist') => {
    if (tabType === 'whale') {
      if (whaleSortBy === column) {
        setWhaleSortDirection(whaleSortDirection === 'desc' ? 'asc' : 'desc')
      } else {
        setWhaleSortBy(column)
        setWhaleSortDirection('asc')
      }
    } else if (tabType === 'price') {
      if (priceSortBy === column) {
        setPriceSortDirection(priceSortDirection === 'desc' ? 'asc' : 'desc')
      } else {
        setPriceSortBy(column)
        setPriceSortDirection('asc')
      }
    } else if (tabType === 'watchlist') {
      if (watchlistSortBy === column) {
        setWatchlistSortDirection(watchlistSortDirection === 'desc' ? 'asc' : 'desc')
      } else {
        setWatchlistSortBy(column)
        setWatchlistSortDirection('asc')
      }
    }
  }

  // Paginated data
  const paginatedWhaleTrades = getPaginatedData(whaleTrades, whaleCurrentPage)
  const paginatedPriceRangeTrades = getPaginatedData(priceRangeTrades, priceCurrentPage)
  const sortedWatchlistTrades = sortTrades(watchlistTrades, watchlistSortBy, watchlistSortDirection)
  const paginatedWatchlistTrades = getPaginatedData(sortedWatchlistTrades, watchlistCurrentPage)

  // Total pages
  const whaleTotalPages = getTotalPages(whaleTrades.length)
  const priceTotalPages = getTotalPages(priceRangeTrades.length)
  const watchlistTotalPages = getTotalPages(sortedWatchlistTrades.length)

  // Format functions
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString()
  }

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(3)}`
  }

  const formatSize = (size: number): string => {
    if (size >= 1000000) return `${(size / 1000000).toFixed(2)}M`
    if (size >= 1000) return `${(size / 1000).toFixed(1)}K`
    return size.toFixed(0)
  }

  const formatTotalValue = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(2)}`
  }

  // Get sort icon
  const getSortIcon = (column: string, currentSortBy: string, currentSortDirection: 'asc' | 'desc') => {
    if (currentSortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
    }
    return currentSortDirection === 'desc' 
      ? <ArrowDown className="h-4 w-4" />
      : <ArrowUp className="h-4 w-4" />
  }

  // Common table component
  const TradesTable = ({ 
    trades, 
    emptyMessage,
    sortBy,
    sortDirection,
    onSort,
    tabType
  }: { 
    trades: TradeActivity[]
    emptyMessage: string
    sortBy: string
    sortDirection: 'asc' | 'desc'
    onSort: (column: string) => void
    tabType: 'whale' | 'price' | 'watchlist'
  }) => (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => onSort('timestamp')}
                >
                  Timestamp
                  {getSortIcon('timestamp', sortBy, sortDirection)}
                </Button>
              </TableHead>
              <TableHead className="w-[300px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => onSort('market')}
                >
                  Market
                  {getSortIcon('market', sortBy, sortDirection)}
                </Button>
              </TableHead>
              <TableHead className="w-[120px]">User</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => onSort('price')}
                >
                  Price
                  {getSortIcon('price', sortBy, sortDirection)}
                </Button>
              </TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="w-[100px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => onSort('totalValue')}
                >
                  Total Value
                  {getSortIcon('totalValue', sortBy, sortDirection)}
                </Button>
              </TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              trades.map((trade) => (
                <TableRow key={trade.id} className="hover:bg-muted/50">
                  <TableCell className="text-xs">
                    {formatTimestamp(trade.timestamp)}
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <div className="truncate text-sm" title={trade.market.title}>
                      {trade.market.title}
                    </div>
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <span className="text-sm font-medium truncate">
                      {trade.user.pseudonym}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={trade.trade.side === 'BUY' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {trade.trade.side}
                      </Badge>
                      <Badge 
                        variant={trade.trade.outcome === 'Yes' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {trade.trade.outcome}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatPrice(trade.trade.price)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatSize(trade.trade.size)}
                  </TableCell>
                  <TableCell className="text-sm font-medium w-[100px]">
                    {formatTotalValue(trade.trade.totalValue)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/events/${trade.market.eventSlug}?market=${trade.market.conditionId}`, '_blank')}
                      className="h-7 px-2 text-xs cursor-pointer"
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  // Pagination controls component
  const PaginationControls = ({
    currentPage,
    totalPages,
    totalRecords,
    onPageChange
  }: {
    currentPage: number
    totalPages: number
    totalRecords: number
    onPageChange: (page: number) => void
  }) => {
    if (totalPages <= 1) return null

    const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1
    const endRecord = Math.min(currentPage * recordsPerPage, totalRecords)

    return (
      <div className="flex items-center justify-between px-2 py-2">
        <div className="text-sm text-muted-foreground">
          Showing {startRecord}-{endRecord} of {totalRecords} records
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="h-8 px-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium px-2">
            Page {currentPage} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="h-8 px-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" />
          Activity Analysis
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <Tabs defaultValue="whale" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="whale" className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Whale Trades
            </TabsTrigger>
            <TabsTrigger value="price" className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Price Range
            </TabsTrigger>
            <TabsTrigger value="watchlist" className="flex items-center gap-1">
              <BookmarkCheck className="h-3 w-3" />
              Watchlists
            </TabsTrigger>
          </TabsList>

          {/* Whale Trades Tab */}
          <TabsContent value="whale" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-full flex flex-col">
              <div className="space-y-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label htmlFor="whale-threshold" className="text-sm font-medium">
                      Minimum Trade Value ($):
                    </label>
                    <Input
                      id="whale-threshold"
                      type="text"
                      value={whaleThreshold}
                      onChange={(e) => handleWhaleThresholdChange(e.target.value)}
                      className="w-32"
                      placeholder="1000"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {whaleTrades.length} whale trades found
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Total Value Range ($):</label>
                    <Input
                      type="text"
                      value={whaleMinTotalValue}
                      onChange={(e) => handleTotalValueChange('whale', 'min', e.target.value)}
                      className="w-24"
                      placeholder="Min"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="text"
                      value={whaleMaxTotalValue}
                      onChange={(e) => handleTotalValueChange('whale', 'max', e.target.value)}
                      className="w-24"
                      placeholder="Max"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Outcome:</label>
                    <Select value={whaleOutcomeFilter} onValueChange={setWhaleOutcomeFilter}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Side:</label>
                    <Select value={whaleSideFilter} onValueChange={setWhaleSideFilter}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1">
                  <TradesTable 
                    trades={paginatedWhaleTrades}
                    emptyMessage={`No trades found with current filters`}
                    sortBy={whaleSortBy}
                    sortDirection={whaleSortDirection}
                    onSort={(column) => handleSort(column, 'whale')}
                    tabType="whale"
                  />
                </ScrollArea>
                <PaginationControls
                  currentPage={whaleCurrentPage}
                  totalPages={whaleTotalPages}
                  totalRecords={whaleTrades.length}
                  onPageChange={setWhaleCurrentPage}
                />
              </div>
            </div>
          </TabsContent>

          {/* Price Range Tab */}
          <TabsContent value="price" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-full flex flex-col">
              <div className="space-y-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Price Range ($):</label>
                    <Input
                      type="text"
                      value={minPrice}
                      onChange={(e) => handlePriceChange('min', e.target.value)}
                      className="w-24"
                      placeholder="Min"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="text"
                      value={maxPrice}
                      onChange={(e) => handlePriceChange('max', e.target.value)}
                      className="w-24"
                      placeholder="Max"
                    />
                  </div>
                  {!priceRangeError && (
                    <div className="text-sm text-muted-foreground">
                      {priceRangeTrades.length} trades found
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Total Value Range ($):</label>
                    <Input
                      type="text"
                      value={priceMinTotalValue}
                      onChange={(e) => handleTotalValueChange('price', 'min', e.target.value)}
                      className="w-24"
                      placeholder="Min"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="text"
                      value={priceMaxTotalValue}
                      onChange={(e) => handleTotalValueChange('price', 'max', e.target.value)}
                      className="w-24"
                      placeholder="Max"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Outcome:</label>
                    <Select value={priceOutcomeFilter} onValueChange={setPriceOutcomeFilter}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Side:</label>
                    <Select value={priceSideFilter} onValueChange={setPriceSideFilter}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {priceRangeError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{priceRangeError}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1">
                  <TradesTable 
                    trades={paginatedPriceRangeTrades}
                    emptyMessage={
                      priceRangeError 
                        ? 'Fix the price range errors above to see trades'
                        : `No trades found with current filters`
                    }
                    sortBy={priceSortBy}
                    sortDirection={priceSortDirection}
                    onSort={(column) => handleSort(column, 'price')}
                    tabType="price"
                  />
                </ScrollArea>
                <PaginationControls
                  currentPage={priceCurrentPage}
                  totalPages={priceTotalPages}
                  totalRecords={priceRangeTrades.length}
                  onPageChange={setPriceCurrentPage}
                />
              </div>
            </div>
          </TabsContent>

          {/* Watchlists Tab */}
          <TabsContent value="watchlist" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-full flex flex-col">
              <div className="space-y-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Total Value Range ($):</label>
                    <Input
                      type="text"
                      value={watchlistMinTotalValue}
                      onChange={(e) => handleTotalValueChange('watchlist', 'min', e.target.value)}
                      className="w-24"
                      placeholder="Min"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="text"
                      value={watchlistMaxTotalValue}
                      onChange={(e) => handleTotalValueChange('watchlist', 'max', e.target.value)}
                      className="w-24"
                      placeholder="Max"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Outcome:</label>
                    <Select value={watchlistOutcomeFilter} onValueChange={setWatchlistOutcomeFilter}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Side:</label>
                    <Select value={watchlistSideFilter} onValueChange={setWatchlistSideFilter}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {watchlistTrades.length} trades found from watchlisted markets
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1">
                  <TradesTable 
                    trades={paginatedWatchlistTrades}
                    emptyMessage="No watchlisted markets found. Add markets to your watchlist using the ★ icon in the markets table to track their trading activity here."
                    sortBy={watchlistSortBy}
                    sortDirection={watchlistSortDirection}
                    onSort={(column) => handleSort(column, 'watchlist')}
                    tabType="watchlist"
                  />
                </ScrollArea>
                <PaginationControls
                  currentPage={watchlistCurrentPage}
                  totalPages={watchlistTotalPages}
                  totalRecords={watchlistTrades.length}
                  onPageChange={setWatchlistCurrentPage}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 