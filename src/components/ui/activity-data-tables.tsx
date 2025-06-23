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
import { RefreshCw, DollarSign, Target, User, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

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

export function ActivityDataTables({ trades, onRefresh }: ActivityDataTablesProps) {
  // Whale Trades state
  const [whaleThreshold, setWhaleThreshold] = useState<string>('1000')
  const [whaleTrades, setWhaleTrades] = useState<TradeActivity[]>([])
  const [whaleCurrentPage, setWhaleCurrentPage] = useState(1)

  // Price Range state
  const [minPrice, setMinPrice] = useState<string>('0.9')
  const [maxPrice, setMaxPrice] = useState<string>('1.0')
  const [priceRangeTrades, setPriceRangeTrades] = useState<TradeActivity[]>([])
  const [priceRangeError, setPriceRangeError] = useState<string>('')
  const [priceCurrentPage, setPriceCurrentPage] = useState(1)

  // My Position Markets state (empty for now)
  const [positionTrades] = useState<TradeActivity[]>([])
  const [positionCurrentPage, setPositionCurrentPage] = useState(1)

  const recordsPerPage = 20
  const maxTradesPerTab = 500

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

    if (minVal > 1 || maxVal > 1) {
      return 'Prices must be between 0 and 1 for prediction markets'
    }

    if (minVal >= maxVal) {
      return 'Minimum price must be less than maximum price'
    }

    return ''
  }, [])

  // Update whale trades when threshold or trades change
  useEffect(() => {
    const threshold = parseFloat(whaleThreshold) || 0
    const filtered = trades
      .filter(trade => trade.trade.totalValue >= threshold)
      .slice(0, maxTradesPerTab)
    setWhaleTrades(filtered)
    setWhaleCurrentPage(1) // Reset to first page when data changes
  }, [trades, whaleThreshold])

  // Update price range trades when range or trades change
  useEffect(() => {
    const error = validatePriceRange(minPrice, maxPrice)
    setPriceRangeError(error)

    if (!error) {
      const minVal = parseFloat(minPrice)
      const maxVal = parseFloat(maxPrice)
      
      // Clear previous data when range changes
      const filtered = trades
        .filter(trade => {
          const price = trade.trade.price
          return price >= minVal && price <= maxVal
        })
        .slice(0, maxTradesPerTab)
      setPriceRangeTrades(filtered)
      setPriceCurrentPage(1) // Reset to first page when data changes
    } else {
      setPriceRangeTrades([])
      setPriceCurrentPage(1)
    }
  }, [trades, minPrice, maxPrice, validatePriceRange])

  // Handle input changes for whale threshold
  const handleWhaleThresholdChange = (value: string) => {
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setWhaleThreshold(value)
    }
  }

  // Handle input changes for price range
  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    // Allow only numbers and decimal point, with validation for 0-1 range
    if (value === '' || /^0?\.?\d*$/.test(value)) {
      if (type === 'min') {
        setMinPrice(value)
      } else {
        setMaxPrice(value)
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

  // Paginated data
  const paginatedWhaleTrades = getPaginatedData(whaleTrades, whaleCurrentPage)
  const paginatedPriceRangeTrades = getPaginatedData(priceRangeTrades, priceCurrentPage)
  const paginatedPositionTrades = getPaginatedData(positionTrades, positionCurrentPage)

  // Total pages
  const whaleTotalPages = getTotalPages(whaleTrades.length)
  const priceTotalPages = getTotalPages(priceRangeTrades.length)
  const positionTotalPages = getTotalPages(positionTrades.length)

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

  // Common table component
  const TradesTable = ({ 
    trades, 
    emptyMessage 
  }: { 
    trades: TradeActivity[]
    emptyMessage: string 
  }) => (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Market</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Total Value</TableHead>
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
                  <TableCell>
                    <span className="text-sm font-medium truncate max-w-[100px]">
                      {trade.user.pseudonym}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="truncate text-sm" title={trade.market.title}>
                      {trade.market.title}
                    </div>
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
                  <TableCell className="text-sm font-medium">
                    {formatTotalValue(trade.trade.totalValue)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/events/${trade.market.eventSlug}?market=${trade.market.conditionId}`, '_blank')}
                      className="h-7 px-2 text-xs"
                    >
                      View
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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Activity Analysis
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="h-8 px-3"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
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
            <TabsTrigger value="position" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              My Positions
            </TabsTrigger>
          </TabsList>

          {/* Whale Trades Tab */}
          <TabsContent value="whale" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-full flex flex-col">
              <div className="flex items-center gap-4">
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
              
              <div className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1">
                  <TradesTable 
                    trades={paginatedWhaleTrades}
                    emptyMessage={`No trades found with value ≥ $${whaleThreshold || 0}`}
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
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label htmlFor="min-price" className="text-sm font-medium">
                    Min Price ($):
                  </label>
                  <Input
                    id="min-price"
                    type="text"
                    value={minPrice}
                    onChange={(e) => handlePriceChange('min', e.target.value)}
                    className="w-24"
                    placeholder="0.9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="max-price" className="text-sm font-medium">
                    Max Price ($):
                  </label>
                  <Input
                    id="max-price"
                    type="text"
                    value={maxPrice}
                    onChange={(e) => handlePriceChange('max', e.target.value)}
                    className="w-24"
                    placeholder="1.0"
                  />
                </div>
                {!priceRangeError && (
                  <div className="text-sm text-muted-foreground">
                    {priceRangeTrades.length} trades found
                  </div>
                )}
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
                        : `No trades found in price range $${minPrice || 0} - $${maxPrice || 0}`
                    }
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

          {/* My Position Markets Tab */}
          <TabsContent value="position" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-full flex flex-col">
              <div className="text-sm text-muted-foreground">
                Position tracking will be available when user authentication is implemented.
              </div>
              
              <div className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1">
                  <TradesTable 
                    trades={paginatedPositionTrades}
                    emptyMessage="No position data available. This feature requires user authentication."
                  />
                </ScrollArea>
                <PaginationControls
                  currentPage={positionCurrentPage}
                  totalPages={positionTotalPages}
                  totalRecords={positionTrades.length}
                  onPageChange={setPositionCurrentPage}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 