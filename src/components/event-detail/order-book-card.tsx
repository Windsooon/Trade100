"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Info, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useOrderBook } from '@/lib/order-book-context'

interface OrderBookCardProps {
  event: any
  selectedMarket: any
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
}

type PriceChangeMessage = {
  asset_id: string
  changes: Array<{
    price: string
    side: 'BUY' | 'SELL'
    size: string
  }>
  event_type: 'price_change'
  market: string
  timestamp: string
}

type BookMessage = {
  asset_id: string
  bids: BookLevel[]
  asks: BookLevel[]
  market: string
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export function OrderBookCard({ event, selectedMarket, selectedToken, onTokenChange }: OrderBookCardProps) {
  // Use shared order book context
  const { updateOrderBook } = useOrderBook()
  
  // State for order books (keyed by conditionId, storing YES token data only)
  const [orderBooks, setOrderBooks] = useState<Record<string, BookData>>({})
  const [loading, setLoading] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [reconnectKey, setReconnectKey] = useState(0)
  const isConnectingRef = useRef(false)
  const isUnmountingRef = useRef(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const dividerRef = useRef<HTMLDivElement | null>(null)
  const userHasScrolledRef = useRef(false)
  const lastScrollTopRef = useRef(0)

  // Custom time formatting function
  const formatTimeAgo = useCallback((date: Date): string => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes}m ago`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours}h ago`
    } else {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days}d ago`
    }
  }, [])

  // Filter active markets (active=true, archived=false, closed=false)
  const activeMarkets = useMemo(() => {
    if (!event?.markets) return []
    return event.markets.filter((market: any) => 
      market.active === true && market.archived === false && market.closed === false
    )
  }, [event])

  // Get YES token IDs for all active markets
  const activeYesTokenIds = useMemo(() => {
    return activeMarkets.map((market: any) => {
      try {
        const ids = JSON.parse(market.clobTokenIds || '[]')
        return ids[0] // YES token is always first
      } catch {
        return null
      }
    }).filter(Boolean).sort()
  }, [activeMarkets])

  // Get current market's token IDs
  const currentMarketTokens = useMemo(() => {
    if (!selectedMarket?.clobTokenIds) return { yes: null, no: null }
    try {
      const ids = JSON.parse(selectedMarket.clobTokenIds)
      return { yes: ids[0], no: ids[1] }
    } catch {
      return { yes: null, no: null }
    }
  }, [selectedMarket])

  // Check if current market is active
  const isCurrentMarketActive = useMemo(() => {
    return selectedMarket?.active === true && selectedMarket?.archived === false && selectedMarket?.closed === false
  }, [selectedMarket])

  // Get order book data for current market
  const currentOrderBook = useMemo(() => {
    if (!selectedMarket?.conditionId || !isCurrentMarketActive) {
      return null
    }
    const book = orderBooks[selectedMarket.conditionId] || null
    return book
  }, [selectedMarket, orderBooks, isCurrentMarketActive])

  // Binary search insertion for maintaining sorted order
  const insertPriceLevel = useCallback((levels: BookLevel[], newLevel: BookLevel, isDescending: boolean): BookLevel[] => {
    const newPrice = parseFloat(newLevel.price)
    const newSize = parseFloat(newLevel.size)
    
    // Remove if size is 0
    if (newSize === 0) {
      return levels.filter(level => level.price !== newLevel.price)
    }
    
    // Find insertion point using binary search
    let left = 0
    let right = levels.length
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2)
      const midPrice = parseFloat(levels[mid].price)
      
      // For descending order: if midPrice > newPrice, go right; if midPrice <= newPrice, go left
      if (isDescending ? midPrice > newPrice : midPrice < newPrice) {
        left = mid + 1
      } else {
        right = mid
      }
    }
    
    // Check if price already exists
    const existingIndex = levels.findIndex(level => level.price === newLevel.price)
    if (existingIndex !== -1) {
      // Update existing level
      const updated = [...levels]
      updated[existingIndex] = newLevel
      return updated
    } else {
      // Insert new level
      const updated = [...levels]
      updated.splice(left, 0, newLevel)
      return updated
    }
  }, [])

  // Process price change message
  const processPriceChange = useCallback((message: PriceChangeMessage) => {
    const { asset_id, changes } = message
    
    // Find which market this asset_id belongs to
    const market = activeMarkets.find((m: any) => {
      try {
        const ids = JSON.parse(m.clobTokenIds || '[]')
        return ids[0] === asset_id // Only YES tokens
      } catch {
        return false
      }
    })
    
    if (!market) {
      return
    }
    
    setOrderBooks(prev => {
      const current = prev[market.conditionId] || { bids: [], asks: [] }
      let newBids = [...current.bids]
      let newAsks = [...current.asks]
      
      changes.forEach(change => {
        const level: BookLevel = {
          price: change.price,
          size: change.size
        }
        
        if (change.side === 'BUY') {
          // BUY side goes to bids (descending order: high to low)
          newBids = insertPriceLevel(newBids, level, true)
        } else {
          // SELL side goes to asks (descending order: high to low)
          newAsks = insertPriceLevel(newAsks, level, true)
        }
      })
      
      const updatedOrderBook = {
        bids: newBids,
        asks: newAsks
      }
      
      // Schedule context update for next tick to avoid render-time state updates
      setTimeout(() => {
        updateOrderBook(market.conditionId, {
          bids: newBids.map(b => [parseFloat(b.price), parseFloat(b.size)]),
          asks: newAsks.map(a => [parseFloat(a.price), parseFloat(a.size)]),
          lastUpdated: Date.now()
        })
      }, 0)
      
      setLastUpdated(new Date())
      
      return {
        ...prev,
        [market.conditionId]: updatedOrderBook
      }
    })
  }, [activeMarkets, insertPriceLevel, updateOrderBook])

  // Process full book message
  const processBookMessage = useCallback((message: BookMessage) => {
    const { asset_id, bids, asks } = message
    
    // Find which market this asset_id belongs to
    const market = activeMarkets.find((m: any) => {
      try {
        const ids = JSON.parse(m.clobTokenIds || '[]')
        return ids[0] === asset_id // Only YES tokens
      } catch {
        return false
      }
    })
    
    if (!market) {
      return
    }
    
    // WebSocket sends:
    // - Bids: low→high (0.001, 0.002, 0.005) - NEED TO REVERSE
    // - Asks: high→low (0.999, 0.998, 0.997) - KEEP AS IS
    // We need both in high→low order for proper display
    const sortedBids = [...(bids || [])].reverse() // Convert low→high to high→low
    const sortedAsks = asks || [] // Keep high→low as is

    const updatedOrderBook = {
      bids: sortedBids,
      asks: sortedAsks
    }
    
    // Update shared context
    updateOrderBook(market.conditionId, {
      bids: sortedBids.map(b => [parseFloat(b.price), parseFloat(b.size)]),
      asks: sortedAsks.map(a => [parseFloat(a.price), parseFloat(a.size)]),
      lastUpdated: Date.now()
    })
    
    setLastUpdated(new Date())
    
    setOrderBooks(prev => {
      const newState = {
        ...prev,
        [market.conditionId]: updatedOrderBook
      }
      return newState
    })
  }, [activeMarkets, updateOrderBook])

  // Convert YES order book to NO order book
  const convertToNoOrderBook = useCallback((yesBook: BookData): BookData => {
    const convertLevel = (level: BookLevel): BookLevel => ({
      price: (1 - parseFloat(level.price)).toFixed(4),
      size: level.size
    })
    
    // YES asks become NO bids, YES bids become NO asks
    const noBids = yesBook.asks.map(convertLevel).sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
    const noAsks = yesBook.bids.map(convertLevel).sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
    
    return { bids: noBids, asks: noAsks }
  }, [])

  // Get display order book based on selected token
  const displayOrderBook = useMemo(() => {
    if (!currentOrderBook) return null
    
    if (selectedToken === 'yes') {
      return currentOrderBook
    } else {
      return convertToNoOrderBook(currentOrderBook)
    }
  }, [currentOrderBook, selectedToken, convertToNoOrderBook])

  // Effect to manage WebSocket connection
  useEffect(() => {
    if (!activeYesTokenIds.length || isConnectingRef.current) return
    
    isUnmountingRef.current = false
    isConnectingRef.current = true
    setLoading(true)
    setConnectionStatus('connecting')
    
    const ws = new WebSocket('wss://ws-subscriptions-clob.polymarket.com/ws/market')
    wsRef.current = ws

    ws.onopen = () => {
      setConnectionStatus('connected')
      
      const subscribeMessage = {
        assets_ids: activeYesTokenIds,
        type: 'market'
      }
      ws.send(JSON.stringify(subscribeMessage))
      
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('PING')
        }
      }, 30000)
    }

    ws.onerror = (e) => {
      if (!isUnmountingRef.current) {
        setConnectionStatus('error')
      }
      isConnectingRef.current = false
    }

    ws.onclose = (e) => {
      if (!isUnmountingRef.current) {
        setConnectionStatus('disconnected')
      }
      isConnectingRef.current = false
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
    }

    ws.onmessage = (event) => {
      if (event.data === 'PONG') return
      
      try {
        const data = JSON.parse(event.data)
        
        const processItem = (item: any) => {
          if (item.event_type === 'price_change') {
            processPriceChange(item as PriceChangeMessage)
          } else if (item.asset_id && (item.bids || item.asks)) {
            processBookMessage(item as BookMessage)
            setLoading(false) // Set loading to false when we receive book data
          }
        }

        if (Array.isArray(data)) {
          data.forEach(processItem)
        } else if (typeof data === 'object' && data !== null) {
          processItem(data)
        }
      } catch (e) {
        setConnectionStatus('error')
      }
    }

    return () => {
      isUnmountingRef.current = true
      isConnectingRef.current = false
      ws.close()
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
    }
  }, [activeYesTokenIds.join(','), reconnectKey, processPriceChange, processBookMessage])

  const handleManualReconnect = () => {
    // This will trigger the useEffect to reconnect by changing state.
    // We reset attempts to 0 and let the useEffect handle the connection.
    setReconnectKey(prev => prev + 1); 
  }

  // Get connection status display
  const getConnectionStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return { bgColor: 'bg-green-500', text: 'Connected', color: 'text-green-600' }
      case 'connecting':
        return { bgColor: 'bg-yellow-500', text: 'Connecting', color: 'text-yellow-600' }
      case 'error':
        return { bgColor: 'bg-red-500', text: 'Error', color: 'text-red-600' }
      case 'disconnected':
        return { bgColor: 'bg-red-500', text: 'Disconnected', color: 'text-red-600' }
      default:
        return { bgColor: 'bg-red-500', text: 'Disconnected', color: 'text-red-600' }
    }
  }

  const { bids, asks, spread } = useMemo(() => {
    let rawBids = currentOrderBook?.bids || []
    let rawAsks = currentOrderBook?.asks || []

    if (selectedToken === 'no' && currentOrderBook) {
      const converted = convertToNoOrderBook(currentOrderBook)
      rawBids = converted.bids
      rawAsks = converted.asks
    }
    
    
    // Calculate cumulative value (price × size + previous total) and cumulative size for depth chart
    let cumulativeBidSize = 0
    let cumulativeBidValue = 0
    const processedBids = rawBids.map((bid, index) => {
      const price = parseFloat(bid.price)
      const size = parseFloat(bid.size)
      const value = price * size
      cumulativeBidSize += size
      cumulativeBidValue += value
      
      return { 
        price, 
        size, 
        cumulative: cumulativeBidSize, // For depth chart
        cumulativeValue: cumulativeBidValue // For Total column display
      }
    })
    
    // For asks: keep high→low order for display (standard order book convention)
    // WebSocket gives us high→low, which is correct for asks display
    // But we need to calculate cumulative from lowest ask upward, so reverse for calculation only
    const asksForCalculation = [...rawAsks].reverse() // low→high for cumulative calculation
    
    let cumulativeAskSize = 0
    let cumulativeAskValue = 0
    const askCumulatives: { cumulativeSize: number; cumulativeValue: number }[] = []
    
    // Calculate cumulatives from lowest to highest price
    asksForCalculation.forEach(ask => {
      const price = parseFloat(ask.price)
      const size = parseFloat(ask.size)
      const value = price * size
      cumulativeAskSize += size
      cumulativeAskValue += value
      askCumulatives.push({ cumulativeSize: cumulativeAskSize, cumulativeValue: cumulativeAskValue })
    })
    
    // Now create display array in high→low order with correct cumulatives
    const processedAsks = rawAsks.map((ask, index) => {
      const price = parseFloat(ask.price)
      const size = parseFloat(ask.size)
      // Get cumulative from reversed calculation (high→low index maps to low→high cumulative)
      const cumulativeIndex = rawAsks.length - 1 - index
      const cumulative = askCumulatives[cumulativeIndex]
    
      
      return { 
        price, 
        size, 
        cumulative: cumulative.cumulativeSize, // For depth chart
        cumulativeValue: cumulative.cumulativeValue // For Total column display
      }
    })

    const maxCumulative = Math.max(cumulativeBidSize, cumulativeAskSize)
    
    const bidsWithDepth = processedBids.map(bid => ({ ...bid, depthPercent: maxCumulative > 0 ? (bid.cumulative / maxCumulative) * 100 : 0 }))
    const asksWithDepth = processedAsks.map(ask => ({ ...ask, depthPercent: maxCumulative > 0 ? (ask.cumulative / maxCumulative) * 100 : 0 }))

    // Fix spread calculation:
    // - Bids are in high→low order: [0.975, 0.974, 0.973] → highest bid = [0]
    // - Asks are in high→low order: [0.999, 0.998, 0.997] → lowest ask = last element
    const highestBid = rawBids.length > 0 ? parseFloat(rawBids[0].price) : 0
    const lowestAsk = processedAsks.length > 0 ? processedAsks[processedAsks.length - 1].price : 1
    const spreadValue = Math.max(0, lowestAsk - highestBid) // Ensure spread is not negative
    
    return { bids: bidsWithDepth, asks: asksWithDepth, spread: (spreadValue * 100).toFixed(2) }
  }, [currentOrderBook, selectedToken, convertToNoOrderBook])

  // Handle scroll events to detect user interaction
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollArea = event.currentTarget
    const currentScrollTop = scrollArea.scrollTop
    
    // Check if this is a user-initiated scroll (not programmatic)
    if (Math.abs(currentScrollTop - lastScrollTopRef.current) > 5) {
      userHasScrolledRef.current = true
    }
    
    lastScrollTopRef.current = currentScrollTop
  }, [])

  // Handle mouse and touch events to detect user interaction with scrollbar
  const handleUserInteraction = useCallback(() => {
    userHasScrolledRef.current = true
  }, [])

  // Auto-scroll logic - only center if user hasn't manually scrolled
  const centerOnSpread = useCallback(() => {
    const scrollArea = scrollAreaRef.current
    const divider = dividerRef.current
    
    if (scrollArea && divider && !userHasScrolledRef.current) {
      // Find the actual scrollable element within ScrollArea
      const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
      const scrollableElement = viewport || scrollArea
      
      const clientHeight = scrollableElement.clientHeight
      const dividerTop = divider.offsetTop
      const targetScrollTop = Math.max(0, dividerTop - (clientHeight / 2))
      
      // Set the scroll position programmatically
      lastScrollTopRef.current = targetScrollTop
      scrollableElement.scrollTop = targetScrollTop
      
      // Also try using scrollTo for better browser compatibility
      if (scrollableElement.scrollTo) {
        scrollableElement.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        })
      }
    }
  }, [])

  // Reset user scroll flag when market changes
  useEffect(() => {
    userHasScrolledRef.current = false
  }, [selectedMarket?.conditionId])

  // Auto-scroll when data changes (only if user hasn't scrolled)
  useEffect(() => {
    if (bids.length > 0 || asks.length > 0) {
      // Multiple attempts with increasing delays to ensure DOM is ready
      const timeouts = [100, 300, 500, 1000] // Try at 100ms, 300ms, 500ms, and 1s
      
      timeouts.forEach((delay, index) => {
        setTimeout(() => {
          // Only proceed if user hasn't scrolled and refs are available
          if (!userHasScrolledRef.current && scrollAreaRef.current && dividerRef.current) {
            centerOnSpread()
          }
        }, delay)
      })
      
      // Cleanup function to prevent memory leaks
      return () => {
        // Note: setTimeout IDs are not stored, so we can't clear them
        // This is acceptable since the callbacks check conditions before executing
      }
    }
  }, [bids, asks, centerOnSpread])

  // Additional effect to center when component first mounts with data
  useEffect(() => {
    if (!loading && (bids.length > 0 || asks.length > 0)) {
      // Extra delay for initial mount
      const timeoutId = setTimeout(() => {
        if (!userHasScrolledRef.current) {
          centerOnSpread()
        }
      }, 1500) // Longer delay for initial mount
      
      return () => clearTimeout(timeoutId)
    }
  }, [loading, bids.length, asks.length, centerOnSpread])

  const statusDisplay = getConnectionStatusDisplay()

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b flex justify-between items-center">
        <h3 className="flex items-center gap-2 font-semibold text-sm">
          Order Book
          <span className="text-xs flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${statusDisplay.bgColor}`} />
            <span className={`font-medium ${statusDisplay.color}`}>
              Websocket: {statusDisplay.text}
            </span>
          </span>
        </h3>
      </div>
      <div className="flex-1 p-3 overflow-hidden flex flex-col">
        {connectionStatus === 'error' && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>WebSocket connection failed. Order book may not update.</AlertDescription>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={handleManualReconnect}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reconnect
            </Button>
          </Alert>
        )}
        {!isCurrentMarketActive ? (
          <div className="text-center py-8 text-muted-foreground">
            Order book not available for inactive markets
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <Button 
                variant={selectedToken === 'yes' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => onTokenChange('yes')}
              >
                YES
              </Button>
              <Button 
                variant={selectedToken === 'no' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => onTokenChange('no')}
              >
                NO
              </Button>
            </div>

            <div className="relative flex-1 flex flex-col">
              <div className="bg-background border-b sticky top-0 z-10">
                <div className="grid grid-cols-3 gap-2 px-2 py-2 text-xs font-medium text-muted-foreground">
                  <div>Price</div>
                  <div>Size</div>
                  <div>Total</div>
                </div>
              </div>
              <ScrollArea 
                ref={scrollAreaRef} 
                className="flex-1 max-h-[400px] relative"
                onScroll={handleScroll}
                onMouseDown={handleUserInteraction}
                onTouchStart={handleUserInteraction}
                onWheel={handleUserInteraction}
              >
                <div className="px-2">
                  {asks.length === 0 && bids.length === 0 && (
                    <div className="text-center text-muted-foreground py-8 text-sm">
                      No order book data for this market.
                    </div>
                  )}
                  <div className="mb-2">
                    {asks.map((lvl, i) => (
                      <div key={lvl.price + '-ask-' + i} className="grid grid-cols-3 gap-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
                        <div className="font-mono">{lvl.price.toFixed(4)}</div>
                        <div className="font-mono text-stone-200">{lvl.size.toFixed(2)}</div>
                        <div className="font-mono text-stone-200">{lvl.cumulativeValue.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>

                  {(asks.length > 0 || bids.length > 0) && (
                    <div ref={dividerRef} className="border-t border-muted my-2 relative">
                      <div className="absolute inset-x-0 -top-2 flex justify-center">
                        <div className="bg-background px-2 text-xs text-muted-foreground">
                          Spread: {spread}¢
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-2">
                    {bids.map((lvl, i) => (
                      <div key={lvl.price + '-bid-' + i} className="grid grid-cols-3 gap-2 py-1 text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20">
                        <div className="font-mono">{lvl.price.toFixed(4)}</div>
                        <div className="font-mono text-stone-200">{lvl.size.toFixed(2)}</div>
                        <div className="font-mono text-stone-200">{lvl.cumulativeValue.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 