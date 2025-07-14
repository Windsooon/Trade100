import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { TradeHistoryDialogProps } from './types'
import { TradeChart } from './trade-chart'

// Trade History Dialog Component  
export function TradeHistoryDialog({ 
  holder, 
  selectedMarket 
}: TradeHistoryDialogProps) {
  const [trades, setTrades] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTrades, setTotalTrades] = useState(0)
  const tradesPerPage = 15

  // Fetch trades for this user and market
  const fetchTrades = useCallback(async (page: number) => {
    if (!selectedMarket?.conditionId || !holder?.proxyWallet) {
      const errorMsg = `Missing market or user data: market=${!!selectedMarket?.conditionId}, holder=${!!holder?.proxyWallet}`
      setError(errorMsg)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const offset = (page - 1) * tradesPerPage
      const url = `/api/trades?user=${encodeURIComponent(holder.proxyWallet)}&market=${encodeURIComponent(selectedMarket.conditionId)}&limit=${tradesPerPage}&offset=${offset}&takerOnly=false`
      
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch trades')
      }

      const tradesData = result.data || []
      
      setTrades(tradesData)
      setTotalTrades(tradesData.length)
    } catch (err) {
      setError('Failed to load trade history')
      setTrades([])
    } finally {
      setLoading(false)
    }
  }, [selectedMarket?.conditionId, holder?.proxyWallet, tradesPerPage])

  // Fetch trades when component mounts or page changes
  useEffect(() => {
    fetchTrades(currentPage)
  }, [fetchTrades, currentPage])

  // Reset to page 1 when market or holder changes
  useEffect(() => {
    setCurrentPage(1)
    setTrades([])
    setTotalTrades(0)
    setError(null)
  }, [selectedMarket?.conditionId, holder?.proxyWallet])

  const totalPages = Math.ceil(totalTrades / tradesPerPage)

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
          trades={trades}
          loading={loading}
          error={error}
          holder={holder}
          selectedMarket={selectedMarket}
          selectedPeriod="1h"
        />
      </div>

      {/* Trading History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Trading History</h4>
          <Badge variant="outline" className="text-xs">
            {totalTrades} trades
          </Badge>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading trades...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => fetchTrades(currentPage)}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Trades List */}
        {!loading && !error && trades.length > 0 && (
          <div className="space-y-3">
            {trades.map((trade: any, index: number) => (
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
        {!loading && !error && trades.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No trades found for this user in this market</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalTrades} total trades)
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