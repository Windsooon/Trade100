"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Activity, User, Users, Loader2, RefreshCw } from 'lucide-react'
import { Market, Event } from '@/lib/stores'

interface Trade {
  proxyWallet: string
  side: "BUY" | "SELL"
  asset: string
  conditionId: string
  size: number
  price: number
  timestamp: number
  title: string
  slug: string
  icon: string
  eventSlug: string
  outcome: string
  outcomeIndex: number
  name: string
  pseudonym: string
  bio: string
  profileImage: string
  profileImageOptimized: string
  transactionHash: string
}

interface ProcessedTrade {
  originalTrade: Trade
  displaySide: "BUY" | "SELL"
  displayPrice: number
  size: number
  timestamp: number
  name: string
  transactionHash: string
}

interface TradingActivityCardProps {
  selectedMarket: Market | null
  event: Event
}

// Global cache for client-side deduplication
const globalRequestCache = new Map<string, { data: ProcessedTrade[]; timestamp: number }>()
const globalActiveRequests = new Map<string, Promise<ProcessedTrade[]>>()
const CLIENT_CACHE_DURATION = 10 * 1000 // 10 seconds

// Global synchronized refresh timer
let globalRefreshInterval: NodeJS.Timeout | null = null
const globalRefreshCallbacks = new Set<() => void>()

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  })
}

const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })
}

const processTrade = (trade: Trade): ProcessedTrade => {
  let displaySide = trade.side
  let displayPrice = trade.price

  // Convert NO token trades to YES equivalent
  if (trade.outcomeIndex === 1) {
    // Convert side: BUY NO -> SELL YES, SELL NO -> BUY YES
    displaySide = trade.side === "BUY" ? "SELL" : "BUY"
    // Convert price: 1 - original_price
    displayPrice = 1 - trade.price
  }

  return {
    originalTrade: trade,
    displaySide,
    displayPrice,
    size: trade.size,
    timestamp: trade.timestamp,
    name: trade.name || trade.pseudonym || 'Anonymous',
    transactionHash: trade.transactionHash
  }
}

export function TradingActivityCard({ selectedMarket, event }: TradingActivityCardProps) {
  const [marketTrades, setMarketTrades] = useState<ProcessedTrade[]>([])
  const [userTrades, setUserTrades] = useState<ProcessedTrade[]>([])
  const [marketLoading, setMarketLoading] = useState(false)
  const [userLoading, setUserLoading] = useState(false)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [userError, setUserError] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  
  // Refs to track component lifecycle and prevent duplicate requests
  const isMountedRef = useRef(true)
  const lastMarketRef = useRef<string | null>(null)
  const lastUserRef = useRef<string | null>(null)

  // Get wallet address from localStorage
  useEffect(() => {
    const savedWalletAddress = localStorage.getItem("polymarket_wallet_address") || ""
    setWalletAddress(savedWalletAddress || null)
  }, [])

  // Fetch market trades with caching and deduplication (default takerOnly behavior)
  const fetchMarketTrades = useCallback(async (conditionId: string) => {
    const cacheKey = `market_trades_${conditionId}`
    
    // Check cache first
    const cached = globalRequestCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CLIENT_CACHE_DURATION) {
      setMarketTrades(cached.data)
      setMarketLoading(false)
      setMarketError(null)
      return
    }

    // Check if request is already in progress
    const activeRequest = globalActiveRequests.get(cacheKey)
    if (activeRequest) {
      try {
        const trades = await activeRequest
        if (isMountedRef.current) {
          setMarketTrades(trades)
          setMarketLoading(false)
          setMarketError(null)
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error('Error from cached market trades request:', error)
          setMarketError('Failed to load market trades')
          setMarketLoading(false)
        }
      }
      return
    }

    setMarketLoading(true)
    setMarketError(null)

    const requestPromise = (async (): Promise<ProcessedTrade[]> => {
      try {
        // Market trades: default API behavior (no takerOnly parameter)
        const response = await fetch(`/api/trades?market=${conditionId}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch market trades')
        }

        const trades: Trade[] = await response.json()
        const processedTrades = trades.map(processTrade)
        
        // Cache the result
        globalRequestCache.set(cacheKey, {
          data: processedTrades,
          timestamp: Date.now()
        })
        
        return processedTrades
      } finally {
        globalActiveRequests.delete(cacheKey)
      }
    })()

    globalActiveRequests.set(cacheKey, requestPromise)

    try {
      const trades = await requestPromise
      if (isMountedRef.current) {
        setMarketTrades(trades)
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Error fetching market trades:', error)
        setMarketError('Failed to load market trades')
        setMarketTrades([])
      }
    } finally {
      if (isMountedRef.current) {
        setMarketLoading(false)
      }
    }
  }, [])

  // Fetch user trades with caching and deduplication (takerOnly=false)
  const fetchUserTrades = useCallback(async (conditionId: string, userAddress: string) => {
    const cacheKey = `my_trades_${conditionId}_${userAddress}`
    
    // Check cache first
    const cached = globalRequestCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CLIENT_CACHE_DURATION) {
      setUserTrades(cached.data)
      setUserLoading(false)
      setUserError(null)
      return
    }

    // Check if request is already in progress
    const activeRequest = globalActiveRequests.get(cacheKey)
    if (activeRequest) {
      try {
        const trades = await activeRequest
        if (isMountedRef.current) {
          setUserTrades(trades)
          setUserLoading(false)
          setUserError(null)
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error('Error from cached user trades request:', error)
          setUserError('Failed to load trades. Please check your wallet address.')
          setUserLoading(false)
        }
      }
      return
    }

    setUserLoading(true)
    setUserError(null)

    const requestPromise = (async (): Promise<ProcessedTrade[]> => {
      try {
        // My trades: include both maker and taker orders (takerOnly=false)
        const response = await fetch(`/api/trades?market=${conditionId}&user=${userAddress}&takerOnly=false`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch user trades')
        }

        const trades: Trade[] = await response.json()
        const processedTrades = trades.map(processTrade)
        
        // Cache the result
        globalRequestCache.set(cacheKey, {
          data: processedTrades,
          timestamp: Date.now()
        })
        
        return processedTrades
      } finally {
        globalActiveRequests.delete(cacheKey)
      }
    })()

    globalActiveRequests.set(cacheKey, requestPromise)

    try {
      const trades = await requestPromise
      if (isMountedRef.current) {
        setUserTrades(trades)
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Error fetching user trades:', error)
        setUserError('Failed to load trades. Please check your wallet address.')
        setUserTrades([])
      }
    } finally {
      if (isMountedRef.current) {
        setUserLoading(false)
      }
    }
  }, [])

  // Synchronized refresh function
  const synchronizedRefresh = useCallback(() => {
    if (!selectedMarket?.conditionId) return
    
    const conditionId = selectedMarket.conditionId
    
    // Clear cache for both tabs to ensure fresh data
    globalRequestCache.delete(`market_trades_${conditionId}`)
    if (walletAddress) {
      globalRequestCache.delete(`my_trades_${conditionId}_${walletAddress}`)
    }
    
    // Fetch fresh data for both tabs
    fetchMarketTrades(conditionId)
    if (walletAddress) {
      fetchUserTrades(conditionId, walletAddress)
    }
  }, [selectedMarket?.conditionId, walletAddress, fetchMarketTrades, fetchUserTrades])

  // Effect for market changes - only fetch when market actually changes
  useEffect(() => {
    if (!selectedMarket?.conditionId) {
      return
    }

    const conditionId = selectedMarket.conditionId
    
    // Only fetch if market actually changed
    if (lastMarketRef.current !== conditionId) {
      lastMarketRef.current = conditionId
      fetchMarketTrades(conditionId)
    }
  }, [selectedMarket?.conditionId, fetchMarketTrades])

  // Effect for user trades - only fetch when market or user changes
  useEffect(() => {
    if (!selectedMarket?.conditionId || !walletAddress) {
      setUserTrades([])
      setUserError(null)
      return
    }

    const conditionId = selectedMarket.conditionId
    const userKey = `${conditionId}_${walletAddress}`
    
    // Only fetch if market or user actually changed
    if (lastUserRef.current !== userKey) {
      lastUserRef.current = userKey
      fetchUserTrades(conditionId, walletAddress)
    }
  }, [selectedMarket?.conditionId, walletAddress, fetchUserTrades])

  // Global synchronized refresh timer - exactly every 10 seconds
  useEffect(() => {
    if (!selectedMarket?.conditionId) return

    // Add this component's refresh function to the global set
    globalRefreshCallbacks.add(synchronizedRefresh)

    // Start global timer if it doesn't exist
    if (!globalRefreshInterval) {
      globalRefreshInterval = setInterval(() => {
        // Execute all registered refresh callbacks simultaneously
        globalRefreshCallbacks.forEach(callback => callback())
      }, 10000) // 10 seconds
    }

    return () => {
      // Remove this component's callback
      globalRefreshCallbacks.delete(synchronizedRefresh)
      
      // Clean up global timer if no components are using it
      if (globalRefreshCallbacks.size === 0 && globalRefreshInterval) {
        clearInterval(globalRefreshInterval)
        globalRefreshInterval = null
      }
    }
  }, [synchronizedRefresh])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Retry function
  const handleRetry = useCallback(() => {
    if (!selectedMarket?.conditionId) return
    
    const conditionId = selectedMarket.conditionId
    
    // Clear cache to force fresh requests
    globalRequestCache.delete(`market_trades_${conditionId}`)
    if (walletAddress) {
      globalRequestCache.delete(`my_trades_${conditionId}_${walletAddress}`)
    }
    
    // Fetch fresh data
    fetchMarketTrades(conditionId)
    if (walletAddress) {
      fetchUserTrades(conditionId, walletAddress)
    }
  }, [selectedMarket?.conditionId, walletAddress, fetchMarketTrades, fetchUserTrades])

  const renderTradesList = (trades: ProcessedTrade[], loading: boolean, error: string | null, emptyMessage: string) => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading trades...</span>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center text-center">
          <div className="space-y-3">
            <Activity className="h-12 w-12 mx-auto opacity-50 text-muted-foreground" />
            <p className="text-sm text-red-500">{error}</p>
            <button 
              onClick={handleRetry}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
            >
              <RefreshCw className="h-3 w-3" />
              Try again
            </button>
          </div>
        </div>
      )
    }

    if (trades.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-center">
          <div className="space-y-3">
            <Activity className="h-12 w-12 mx-auto opacity-50 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {/* Header */}
        <div className="grid grid-cols-3 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
          <div>Side</div>
          <div>Price / Share</div>
          <div>Time</div>
        </div>
        
        {/* Trades list */}
        <div className="max-h-128 overflow-y-auto">
          {trades.map((trade, index) => (
            <div 
              key={`${trade.transactionHash}-${index}`} 
              className="grid grid-cols-3 gap-4 px-4 py-2 text-sm hover:bg-muted/50 group"
              title={`Trader: ${trade.name}`}
            >
              <div>
                <span 
                  className={`text-xs font-medium ${
                    trade.displaySide === "BUY" 
                      ? "text-price-positive" 
                      : "text-price-negative"
                  }`}
                >
                  {trade.displaySide}
                </span>
              </div>
              <div className="font-mono text-sm">
                <div>${formatNumber(trade.displayPrice)}</div>
                <div className="text-xs text-muted-foreground">{formatNumber(trade.size)}</div>
              </div>
              <div className="text-muted-foreground font-mono text-xs">
                {formatTime(trade.timestamp)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          <span className="hidden sm:inline">Trading Activity</span>
          <span className="sm:hidden">Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        <Tabs defaultValue="market" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 bg-transparent">
            <TabsTrigger value="market" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Market Trades</span>
              <span className="sm:hidden text-xs">Market</span>
            </TabsTrigger>
            <TabsTrigger value="user" className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">My Trades</span>
              <span className="sm:hidden text-xs">My</span>
            </TabsTrigger>
          </TabsList>

          {/* Market Trades Tab */}
          <TabsContent value="market" className="flex-1 mt-4 sm:mt-6">
            <div className="h-full flex flex-col">
              {!selectedMarket ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div className="space-y-3">
                    <Users className="h-12 w-12 mx-auto opacity-50 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Select a market to view trading activity
                    </p>
                  </div>
                </div>
              ) : (
                renderTradesList(
                  marketTrades, 
                  marketLoading, 
                  marketError, 
                  "No trades available for this market"
                )
              )}
            </div>
          </TabsContent>

          {/* My Trades Tab */}
          <TabsContent value="user" className="flex-1 mt-4 sm:mt-6">
            <div className="h-full flex flex-col">
              {!selectedMarket ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div className="space-y-3">
                    <User className="h-12 w-12 mx-auto opacity-50 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Select a market to view your trades
                    </p>
                  </div>
                </div>
              ) : !walletAddress ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div className="space-y-3">
                    <User className="h-12 w-12 mx-auto opacity-50 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Connect your wallet to view your trades
                    </p>
                  </div>
                </div>
              ) : (
                renderTradesList(
                  userTrades, 
                  userLoading, 
                  userError, 
                  "You haven't made any trades for this market"
                )
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 