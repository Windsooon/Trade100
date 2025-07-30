import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { TradeHistoryDialogProps } from './types'
import { TradeChart } from './trade-chart'

// Trade History Dialog Component  
export function TradeHistoryDialog({ 
  holder, 
  selectedMarket,
  selectedToken
}: TradeHistoryDialogProps) {
  const [allTrades, setAllTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const tradesPerPage = 20

  // Fetch all trades for this user and market (limit 100)
  const fetchTrades = useCallback(async () => {
    if (!selectedMarket?.conditionId || !holder?.proxyWallet) {
      const errorMsg = `Missing market or user data: market=${!!selectedMarket?.conditionId}, holder=${!!holder?.proxyWallet}`
      setError(errorMsg)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const url = `/api/trades?user=${encodeURIComponent(holder.proxyWallet)}&market=${encodeURIComponent(selectedMarket.conditionId)}`
      
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch trades')
      }

      const tradesData = result.data || []
      
      setAllTrades(tradesData)
    } catch (err) {
      setError('Failed to load trade history')
      setAllTrades([])
    } finally {
      setLoading(false)
    }
  }, [selectedMarket?.conditionId, holder?.proxyWallet])

  // Fetch trades when component mounts
  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  // Reset to page 1 when market or holder changes
  useEffect(() => {
    setCurrentPage(1)
    setAllTrades([])
    setError(null)
  }, [selectedMarket?.conditionId, holder?.proxyWallet])

  // Calculate pagination
  const totalPages = Math.ceil(allTrades.length / tradesPerPage)
  const startIndex = (currentPage - 1) * tradesPerPage
  const endIndex = startIndex + tradesPerPage
  const currentPageTrades = allTrades.slice(startIndex, endIndex)

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const formatPrice = (price: number): string => {
    return price.toFixed(4)
  }

  return (
    <div className="space-y-6">
      {/* Price Chart with Buy/Sell Indicators */}
      <div className="border rounded-lg p-6 bg-muted/20">
        <h4 className="text-sm font-medium mb-4">Price Chart with Buy/Sell Indicators</h4>
        <TradeChart 
          trades={allTrades} // Pass all trades to chart
          loading={loading}
          error={error}
          holder={holder}
          selectedMarket={selectedMarket}
          selectedToken={selectedToken}
          selectedPeriod="1h"
        />
      </div>

      {/* Trading History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Last 100 Trading History</h4>
          <Badge variant="outline" className="text-xs">
            {allTrades.length} activities
          </Badge>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading activities...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Trades List */}
        {!loading && !error && currentPageTrades.length > 0 && (
          <div className="space-y-3">
            {currentPageTrades.map((trade: any, index: number) => (
              <div key={index} className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={trade.side === 'BUY' ? 'default' : 'destructive'} 
                      className="text-xs"
                    >
                      {trade.side}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {trade.outcome}
                    </Badge>
                    <span className="text-sm">
                      {trade.size} shares @ {formatPrice(trade.price)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      ${(trade.size * trade.price).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimestamp(trade.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && allTrades.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No activities found for this user in this market</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({allTrades.length} total activities)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 