"use client"

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSharedOrderBook } from './shared-order-book-provider'
import { formatTimeAgo } from '@/lib/time-utils'

interface OrderBookDisplayProps {
  conditionId: string
  selectedToken: 'yes' | 'no'
  onTokenChange: (token: 'yes' | 'no') => void
}

type BookLevel = {
  price: string
  size: string
}

type BookData = {
  bids: BookLevel[]
  asks: BookLevel[]
  lastTradePrice?: number
  lastTradeSide?: 'BUY' | 'SELL'
  lastTradeTimestamp?: number
  lastTradePriceFromAPI?: number
  lastTradeSideFromAPI?: 'BUY' | 'SELL'
}

export function OrderBookDisplay({ conditionId, selectedToken, onTokenChange }: OrderBookDisplayProps) {
  const { orderBooks, connectionStatus, retryCount, retryAttempt, maxRetryAttempts, manualRetry } = useSharedOrderBook()

  // Get current market's order book for the selected token
  const displayOrderBook = useMemo(() => {
    const orderBookKey = `${conditionId}_${selectedToken}`
    return orderBooks[orderBookKey] || null
  }, [orderBooks, conditionId, selectedToken])

  // Process order book levels with cumulative values
  const { bids, asks, lastTradePrice, lastTradeSide, lastTradeTimestamp } = useMemo(() => {
    if (!displayOrderBook) return { bids: [], asks: [], lastTradePrice: null, lastTradeSide: null, lastTradeTimestamp: null }

    // Debug logging
    console.log('OrderBookDisplay Debug:', {
      conditionId,
      selectedToken,
      displayOrderBook: {
        lastTradePrice: displayOrderBook.lastTradePrice,
        lastTradePriceFromAPI: displayOrderBook.lastTradePriceFromAPI,
        lastTradeSide: displayOrderBook.lastTradeSide,
        lastTradeSideFromAPI: displayOrderBook.lastTradeSideFromAPI,
        hasOrderBook: !!displayOrderBook
      }
    })

    const processLevels = (levels: BookLevel[], shouldReverse: boolean = false) => {
      let cumulativeSize = 0
      let cumulativeValue = 0
      
      // Process levels in their natural order to calculate cumulative values correctly
      const processedLevels = levels.map(level => {
        const price = parseFloat(level.price)
        const size = parseFloat(level.size)
        const levelValue = price * size
        
        cumulativeSize += size
        cumulativeValue += levelValue
        
        return {
          price,
          size,
          cumulativeSize,
          cumulativeValue
        }
      })
      
      // Only reverse for display if requested
      return shouldReverse ? processedLevels.reverse() : processedLevels
    }

    // For proper order book display:
    // - Bids are already big→small from WebSocket, process normally
    // - Asks are small→big from WebSocket, we want cumulative from low→high prices,
    //   then reverse the entire processed array for display
    
    const processedBids = processLevels(displayOrderBook.bids, false) // Bids: keep big→small
    
    // For asks: calculate cumulative from low→high prices, then reverse for display
    const asksWithCumulative = processLevels(displayOrderBook.asks, false) // Process small→big order
    const processedAsks = asksWithCumulative.reverse() // Reverse entire processed array for display
    
    // Prioritize WebSocket data (with timestamps) over API data
    const effectiveLastTradePrice = displayOrderBook.lastTradePrice ?? displayOrderBook.lastTradePriceFromAPI ?? null
    const effectiveLastTradeSide = displayOrderBook.lastTradeSide ?? displayOrderBook.lastTradeSideFromAPI ?? null
    const effectiveLastTradeTimestamp = displayOrderBook.lastTradeTimestamp ?? null

    return {
      bids: processedBids,
      asks: processedAsks,
      lastTradePrice: effectiveLastTradePrice,
      lastTradeSide: effectiveLastTradeSide,
      lastTradeTimestamp: effectiveLastTradeTimestamp
    }
  }, [displayOrderBook])

  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: 'Connected', color: 'text-green-600', bgColor: 'bg-green-500' }
      case 'connecting':
        return { text: 'Connecting', color: 'text-yellow-600', bgColor: 'bg-yellow-500' }
      case 'retrying':
        return { text: `Retrying (${retryAttempt}/${maxRetryAttempts})`, color: 'text-orange-600', bgColor: 'bg-orange-500' }
      case 'error':
        return { text: 'Failed', color: 'text-destructive', bgColor: 'bg-red-500' }
      default:
        return { text: 'Disconnected', color: 'text-muted-foreground', bgColor: 'bg-gray-500' }
    }
  }

  const statusDisplay = getStatusDisplay()
  const isLoading = connectionStatus === 'connecting' && !displayOrderBook

  return (
    <div className="border-t bg-muted/30 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">Order Book</h4>
          <div className="flex items-center gap-1 text-xs">
            <div className={`w-2 h-2 rounded-full ${statusDisplay.bgColor} ${connectionStatus === 'retrying' ? 'animate-pulse' : ''}`} />
            <span className={statusDisplay.color}>{statusDisplay.text}</span>
            {retryCount > 0 && connectionStatus === 'connected' && (
              <Badge variant="secondary" className="text-xs h-4 px-1">
                #{retryCount}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-1">
          <Button 
            variant={selectedToken === 'yes' ? 'default' : 'outline'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => onTokenChange('yes')}
          >
            YES
          </Button>
          <Button 
            variant={selectedToken === 'no' ? 'default' : 'outline'}
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => onTokenChange('no')}
          >
            NO
          </Button>
        </div>
      </div>

      {(connectionStatus === 'error' || connectionStatus === 'retrying') && (
        <Alert variant={connectionStatus === 'error' ? 'destructive' : 'default'}>
          <AlertDescription className="text-xs flex items-center justify-between">
            <span>
              {connectionStatus === 'error' 
                ? `Connection failed after ${maxRetryAttempts} attempts. Order book may not update.`
                : `Attempting to reconnect... (${retryAttempt}/${maxRetryAttempts})`
              }
            </span>
            {connectionStatus === 'error' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 px-2 text-xs ml-2"
                onClick={manualRetry}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">
              Loading order book...
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground border-b pb-1">
            <div>Price</div>
            <div>Size</div>
            <div>Total</div>
          </div>
          
          <ScrollArea className="h-96">
            <div className="space-y-1">
              {asks.length === 0 && bids.length === 0 ? (
                <div className="text-center text-muted-foreground py-4 text-xs">
                  No order book data available
                </div>
              ) : (
                <>
                  {/* Asks (sells) */}
                  {asks.length > 0 && (
                    <div className="space-y-0.5">
                      {asks.map((lvl, i) => (
                        <div key={`ask-${i}`} className="grid grid-cols-3 gap-2 py-0.5 text-xs text-price-negative hover:bg-red-50 dark:hover:bg-red-950/20">
                          <div className="font-mono">{lvl.price.toFixed(4)}</div>
                          <div className="font-mono">{lvl.size.toFixed(2)}</div>
                          <div className="font-mono">{lvl.cumulativeValue.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Spread and Last Trade */}
                  {asks.length > 0 && bids.length > 0 && (
                    <div className="border-t border-dashed border-muted-foreground/30 py-2">
                      <div className="text-center text-xs space-y-1">
                        <div>
                          <span className="text-muted-foreground">Last: </span>
                          {lastTradePrice ? (
                            <span className={`font-medium ${
                              lastTradeSide === 'BUY' ? 'text-price-positive' : 'text-price-negative'
                            }`}>
                              {lastTradePrice.toFixed(4)}
                            </span>
                          ) : (
                            <span className="font-medium text-muted-foreground">
                              -
                            </span>
                          )}
                          {lastTradeTimestamp && (
                            <span className="ml-2 text-muted-foreground text-xs">
                              {formatTimeAgo(lastTradeTimestamp)}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-muted-foreground font-medium">
                            Spread: {Math.abs(asks[asks.length - 1]?.price - bids[0]?.price).toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Bids (buys) */}
                  {bids.length > 0 && (
                    <div className="space-y-0.5">
                      {bids.map((lvl, i) => (
                        <div key={`bid-${i}`} className="grid grid-cols-3 gap-2 py-0.5 text-xs text-price-positive hover:bg-green-50 dark:hover:bg-green-950/20">
                          <div className="font-mono">{lvl.price.toFixed(4)}</div>
                          <div className="font-mono">{lvl.size.toFixed(2)}</div>
                          <div className="font-mono">{lvl.cumulativeValue.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
} 