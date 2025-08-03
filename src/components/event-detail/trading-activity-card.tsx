"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowDown, ArrowUp, ExternalLink, Bell, X } from 'lucide-react'
import { Market, Event, Trade } from '@/lib/types'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { useWallet } from '@/lib/hooks/use-wallet'

interface TradingActivityCardProps {
  selectedMarket: Market | null
  event: Event
}

interface ProcessedTrade {
  id: string
  side: 'YES' | 'NO'
  displaySide: string
  price: number
  displayPrice: string
  size: number
  timestamp: number
  displayTimestamp: string
  user: string
  displayUser: string
}

// Global pagination state to persist across component mounts
const globalPaginationState = new Map<string, {
  market: {
    currentPage: number
    hasMorePages: boolean
    pageData: Map<number, ProcessedTrade[]>
  }
  user: {
    currentPage: number
    hasMorePages: boolean
    pageData: Map<number, ProcessedTrade[]>
  }
}>()

// Global data cache to share between component instances
const globalDataCache = new Map<string, {
  marketTrades: ProcessedTrade[]
  userTrades: ProcessedTrade[]
  marketPagination: { currentPage: number, hasMorePages: boolean }
  userPagination: { currentPage: number, hasMorePages: boolean }
  timestamp: number
}>()

// Global active API requests to prevent duplicate concurrent calls
const globalActiveRequests = new Set<string>()

// Global callbacks for components waiting for the same data
const globalWaitingCallbacks = new Map<string, Array<(data: ProcessedTrade[]) => void>>()

export function TradingActivityCard({ selectedMarket, event }: TradingActivityCardProps) {
  const [marketTrades, setMarketTrades] = useState<ProcessedTrade[]>([])
  const [userTrades, setUserTrades] = useState<ProcessedTrade[]>([])
  const [marketLoading, setMarketLoading] = useState(false)
  const [userLoading, setUserLoading] = useState(false)
  const [marketError, setMarketError] = useState<string | null>(null)
  const [userError, setUserError] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  
  // Create a unique ID for this component instance
  const componentId = useRef(Math.random().toString(36).substr(2, 9))
  
  
  // Pagination state
  const [marketCurrentPage, setMarketCurrentPage] = useState(1)
  const [userCurrentPage, setUserCurrentPage] = useState(1)
  const [marketHasMorePages, setMarketHasMorePages] = useState(false)
  const [userHasMorePages, setUserHasMorePages] = useState(false)
  
  // New data notifications
  const [marketHasNewData, setMarketHasNewData] = useState(false)
  const [userHasNewData, setUserHasNewData] = useState(false)
  
  // Ref to track the last processed market to avoid unnecessary re-fetches
  const lastMarketRef = useRef<string | null>(null)
  
  // Ref to track if component is mounted
  const isMountedRef = useRef(true)
  
  // Set mounted state
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const { address } = useWallet()

  useEffect(() => {
    setWalletAddress(address)
  }, [address])

  // Helper to generate pagination state keys
  const getPaginationStateKey = useCallback((conditionId: string) => {
    return `${conditionId}`
  }, [])

  // Initialize pagination state for a market
  const initializePaginationState = useCallback((conditionId: string) => {
    const key = getPaginationStateKey(conditionId)
    
    if (!globalPaginationState.has(key)) {
      globalPaginationState.set(key, {
        market: {
          currentPage: 1,
          hasMorePages: false,
          pageData: new Map()
        },
        user: {
          currentPage: 1,
          hasMorePages: false,
          pageData: new Map()
        }
      })
    }
    
    return globalPaginationState.get(key)!
  }, [getPaginationStateKey])

  const loadPaginationState = useCallback((conditionId: string) => {
    const state = initializePaginationState(conditionId)
    setMarketCurrentPage(state.market.currentPage)
    setUserCurrentPage(state.user.currentPage)
    setMarketHasMorePages(state.market.hasMorePages)
    setUserHasMorePages(state.user.hasMorePages)
    
    // Load current page data if available, otherwise clear the trades
    const marketData = state.market.pageData.get(state.market.currentPage)
    const userData = state.user.pageData.get(state.user.currentPage)
    
    // Always set the market trades - either with cached data or empty array
    setMarketTrades(marketData || [])
    
    // Always set the user trades - either with cached data or empty array
    setUserTrades(userData || [])
  }, [initializePaginationState])

  const savePaginationState = useCallback((conditionId: string, type: 'market' | 'user', page: number, data: ProcessedTrade[], hasMore: boolean) => {
    const key = getPaginationStateKey(conditionId)
    const state = globalPaginationState.get(key)
    
    if (state) {
      state[type].currentPage = page
      state[type].hasMorePages = hasMore
      state[type].pageData.set(page, data)
    }
  }, [getPaginationStateKey])

  // Fetch market trades with pagination
  const fetchMarketTrades = useCallback(async (conditionId: string, page: number = 1) => {
    const requestKey = `market-${conditionId}-${page}`
    
    // Check if this request is already in progress
    if (globalActiveRequests.has(requestKey)) {
      
      // Register a callback to be notified when the data arrives
      if (!globalWaitingCallbacks.has(requestKey)) {
        globalWaitingCallbacks.set(requestKey, [])
      }
      
      globalWaitingCallbacks.get(requestKey)!.push((data: ProcessedTrade[]) => {
        if (isMountedRef.current) {
          setMarketTrades(data)
          setMarketCurrentPage(page)
        }
      })
      
      return
    }
    
    setMarketLoading(true)
    setMarketError(null)
    globalActiveRequests.add(requestKey)

    try {
      const offset = (page - 1) * 10
      const apiUrl = `/api/trades?market=${conditionId}&offset=${offset}`
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error('Failed to fetch market trades')
      }

      const trades: Trade[] = await response.json()
      const processedTrades = trades.map(processTrade)
      
      // Determine if there are more pages (if we got exactly 10 trades, assume more exist)
      const hasMorePages = trades.length === 10
      
      if (isMountedRef.current) {
        setMarketTrades(processedTrades)
        setMarketCurrentPage(page)
        setMarketHasMorePages(hasMorePages)
        
        // Save to pagination state
        savePaginationState(conditionId, 'market', page, processedTrades, hasMorePages)
        
        // Update global cache to share data between component instances
        globalDataCache.set(conditionId, {
          marketTrades: processedTrades,
          userTrades: [],
          marketPagination: { currentPage: page, hasMorePages },
          userPagination: { currentPage: 1, hasMorePages: false },
          timestamp: Date.now()
        })
        
        // Notify any components waiting for this data
        const waitingCallbacks = globalWaitingCallbacks.get(requestKey) || []
        waitingCallbacks.forEach(callback => {
          try {
            callback(processedTrades)
          } catch (error) {
            console.error('Error in waiting callback:', error)
          }
        })
        globalWaitingCallbacks.delete(requestKey)
      } else {
        console.log('[TradingActivityCard] Component unmounted, not updating state')
      }
    } catch (error) {
      console.error('[TradingActivityCard] Error fetching market trades:', error)
      if (isMountedRef.current) {
        setMarketError('Failed to load market trades')
        setMarketTrades([])
        
        // Notify waiting components about the error
        const waitingCallbacks = globalWaitingCallbacks.get(requestKey) || []
        waitingCallbacks.forEach(callback => {
          try {
            callback([]) // Send empty array on error
          } catch (error) {
            console.error('Error in waiting callback:', error)
          }
        })
        globalWaitingCallbacks.delete(requestKey)
      }
    } finally {
      if (isMountedRef.current) {
        setMarketLoading(false)
      }
      globalActiveRequests.delete(requestKey)
    }
  }, [savePaginationState, isMountedRef])

  // Fetch user trades with pagination
  const fetchUserTrades = useCallback(async (conditionId: string, userAddress: string, page: number = 1) => {
    const requestKey = `user-${conditionId}-${userAddress}-${page}`
    
    if (globalActiveRequests.has(requestKey)) {
      return
    }
    
    setUserLoading(true)
    setUserError(null)
    globalActiveRequests.add(requestKey)

    try {
      const offset = (page - 1) * 10
      const response = await fetch(`/api/trades?market=${conditionId}&trader=${userAddress}&offset=${offset}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch user trades')
      }

      const trades: Trade[] = await response.json()
      const processedTrades = trades.map(processTrade)
      
      // Determine if there are more pages
      const hasMorePages = trades.length === 10
      
      if (isMountedRef.current) {
        setUserTrades(processedTrades)
        setUserCurrentPage(page)
        setUserHasMorePages(hasMorePages)
        
        // Save to pagination state
        savePaginationState(conditionId, 'user', page, processedTrades, hasMorePages)
      }
    } catch (error) {
      console.error('Error fetching user trades:', error)
      if (isMountedRef.current) {
        setUserError('Failed to load your trades')
        setUserTrades([])
      }
    } finally {
      if (isMountedRef.current) {
        setUserLoading(false)
      }
      globalActiveRequests.delete(requestKey)
    }
  }, [savePaginationState, isMountedRef])

  // Process raw trade data
  const processTrade = (trade: Trade): ProcessedTrade => {
    const isYes = trade.outcome === 0
    const displaySide = isYes ? 'YES' : 'NO'
    
    return {
      id: trade.id,
      side: isYes ? 'YES' : 'NO',
      displaySide,
      price: trade.price,
      displayPrice: formatCurrency(trade.price),
      size: trade.collateralAmount,
      timestamp: trade.timestamp,
      displayTimestamp: new Date(trade.timestamp * 1000).toLocaleString(),
      user: trade.trader,
      displayUser: `${trade.trader.slice(0, 6)}...${trade.trader.slice(-4)}`
    }
  }

  // Handle market page changes
  const handleMarketPageChange = useCallback((newPage: number) => {
    if (!selectedMarket?.conditionId) return
    
    const conditionId = selectedMarket.conditionId
    const state = initializePaginationState(conditionId)
    const cachedData = state.market.pageData.get(newPage)
    
    if (cachedData) {
      // Use cached data
      setMarketTrades(cachedData)
      setMarketCurrentPage(newPage)
      
      // Update pagination state
      const updatedState = globalPaginationState.get(getPaginationStateKey(conditionId))!
      updatedState.market.currentPage = newPage
    } else {
      // Fetch new data
      fetchMarketTrades(conditionId, newPage)
    }
  }, [selectedMarket, initializePaginationState, getPaginationStateKey, fetchMarketTrades])

  // Handle user page changes
  const handleUserPageChange = useCallback((newPage: number) => {
    if (!selectedMarket?.conditionId || !walletAddress) return
    
    const conditionId = selectedMarket.conditionId
    const state = initializePaginationState(conditionId)
    const cachedData = state.user.pageData.get(newPage)
    
    if (cachedData) {
      // Use cached data
      setUserTrades(cachedData)
      setUserCurrentPage(newPage)
      
      // Update pagination state
      const updatedState = globalPaginationState.get(getPaginationStateKey(conditionId))!
      updatedState.user.currentPage = newPage
    } else {
      // Fetch new data
      fetchUserTrades(conditionId, walletAddress, newPage)
    }
  }, [selectedMarket, walletAddress, initializePaginationState, getPaginationStateKey, fetchUserTrades])

  // Handle "Go to Page 1" for market trades
  const handleGoToMarketPage1 = useCallback(() => {
    if (marketCurrentPage !== 1) {
      handleMarketPageChange(1)
    }
    setMarketHasNewData(false)
  }, [marketCurrentPage, handleMarketPageChange])

  // Handle "Go to Page 1" for user trades  
  const handleGoToUserPage1 = useCallback(() => {
    if (userCurrentPage !== 1) {
      handleUserPageChange(1)
    }
    setUserHasNewData(false)
  }, [userCurrentPage, handleUserPageChange])

  // Dismiss notifications
  const dismissMarketNotification = useCallback(() => {
    setMarketHasNewData(false)
  }, [])

  const dismissUserNotification = useCallback(() => {
    setUserHasNewData(false)
  }, [])

  // Effect for market changes - load pagination state and fetch if needed
  useEffect(() => {
    if (!selectedMarket?.conditionId) {
      return
    }

    const conditionId = selectedMarket.conditionId
    
    // Only process if market actually changed
    if (lastMarketRef.current !== conditionId) {
      lastMarketRef.current = conditionId
      
      // Load pagination state
      loadPaginationState(conditionId)
      
      // Check if we have cached data for current page
      const state = initializePaginationState(conditionId)
      const marketData = state.market.pageData.get(state.market.currentPage)
      
      // Check global cache first before making API call
      if (!marketData) {
        const globalCache = globalDataCache.get(conditionId)
        if (globalCache && globalCache.marketTrades.length > 0) {
          setMarketTrades(globalCache.marketTrades)
          setMarketCurrentPage(globalCache.marketPagination.currentPage)
          setMarketHasMorePages(globalCache.marketPagination.hasMorePages)
        } else {
          fetchMarketTrades(conditionId, state.market.currentPage)
        }
      }
      
      // Clear new data notifications
      setMarketHasNewData(false)
      setUserHasNewData(false)
    }
  }, [selectedMarket?.conditionId, loadPaginationState, initializePaginationState, fetchMarketTrades])

  // Effect for user trades when wallet connects/disconnects
  useEffect(() => {
    if (!selectedMarket?.conditionId || !walletAddress) {
      setUserTrades([])
      setUserCurrentPage(1)
      setUserHasMorePages(false)
      return
    }

    const conditionId = selectedMarket.conditionId
    
    // Load user pagination state
    const state = initializePaginationState(conditionId)
    const userData = state.user.pageData.get(state.user.currentPage)
    
    if (!userData) {
      // Fetch user trades if not cached
      fetchUserTrades(conditionId, walletAddress, state.user.currentPage)
    } else {
      // Use cached data
      setUserTrades(userData)
      setUserCurrentPage(state.user.currentPage)
      setUserHasMorePages(state.user.hasMorePages)
    }
  }, [selectedMarket?.conditionId, walletAddress, initializePaginationState, fetchUserTrades])

  const renderTradesList = (
    trades: ProcessedTrade[], 
    loading: boolean, 
    error: string | null, 
    emptyMessage: string,
    currentPage: number,
    hasMorePages: boolean,
    onPageChange: (page: number) => void,
    hasNewData: boolean,
    onGoToPage1: () => void,
    onDismissNotification: () => void
  ) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">Loading trades...</div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      )
    }

    if (trades.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-muted-foreground">{emptyMessage}</div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {/* New data notification */}
        {hasNewData && currentPage > 1 && (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">New trades available</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onGoToPage1}
                className="text-blue-600 border-blue-300 hover:bg-blue-100"
              >
                Go to Page 1
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismissNotification}
                className="text-blue-600 hover:bg-blue-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Trades list */}
        <div className="space-y-2">
          {trades.map((trade) => (
            <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {trade.side === 'YES' ? (
                    <ArrowUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-red-600" />
                  )}
                  <Badge 
                    variant={trade.side === 'YES' ? 'default' : 'secondary'}
                    className={trade.side === 'YES' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                  >
                    {trade.displaySide}
                  </Badge>
                </div>
                <div className="text-sm">
                  <div className="font-medium">{trade.displayPrice}</div>
                  <div className="text-muted-foreground">{formatNumber(trade.size)} shares</div>
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-mono text-muted-foreground">{trade.displayUser}</div>
                <div className="text-muted-foreground">{trade.displayTimestamp}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {(hasMorePages || currentPage > 1) && (
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMorePages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (!selectedMarket) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Trading Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Select a market to view trading activity</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Trading Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="market" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="market">All Trades</TabsTrigger>
            <TabsTrigger value="user" disabled={!walletAddress}>
              Your Trades {!walletAddress && '(Connect Wallet)'}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="market" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Market Activity</h3>
              <Badge variant="outline">{selectedMarket.question}</Badge>
            </div>
            
            {(() => {
              return renderTradesList(
                marketTrades, 
                marketLoading, 
                marketError, 
                "No trades available for this market",
                marketCurrentPage,
                marketHasMorePages,
                handleMarketPageChange,
                marketHasNewData,
                handleGoToMarketPage1,
                dismissMarketNotification
              )
            })()}
          </TabsContent>
          
          <TabsContent value="user" className="space-y-4">
            {walletAddress ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Your Trading History</h3>
                  <Badge variant="outline" className="font-mono">
                    {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
                  </Badge>
                </div>
                
                {renderTradesList(
                  userTrades, 
                  userLoading, 
                  userError, 
                  "You haven't made any trades in this market yet",
                  userCurrentPage,
                  userHasMorePages,
                  handleUserPageChange,
                  userHasNewData,
                  handleGoToUserPage1,
                  dismissUserNotification
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-muted-foreground">Connect your wallet to view your trading history</div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 