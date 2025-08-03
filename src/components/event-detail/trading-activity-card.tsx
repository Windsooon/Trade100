"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, User, Users, Loader2, RefreshCw, Bell, X } from 'lucide-react'
import { Market, Event } from '@/lib/stores'
import { PaginationControls } from './pagination-controls'

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

// Global synchronized refresh timer
let globalRefreshInterval: NodeJS.Timeout | null = null
const globalRefreshCallbacks = new Map<string, () => void>()

// Global data cache to prevent duplicate API calls from multiple component instances
const globalDataCache = new Map<string, {
  marketTrades: ProcessedTrade[]
  userTrades: ProcessedTrade[]
  marketPagination: any
  userPagination: any
  timestamp: number
}>()

// Global active API requests to prevent duplicate concurrent calls
const globalActiveRequests = new Set<string>()

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
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
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

// Pagination state type
interface PaginationState {
  currentPage: number
  hasMorePages: boolean
  pageData: Map<number, ProcessedTrade[]>
}

// State per market+tab combination
const globalPaginationState = new Map<string, {
  market: PaginationState
  user: PaginationState
}>()

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
  
  console.log(`[TradingActivityCard:${componentId.current}] Render`, {
    selectedMarketId: selectedMarket?.conditionId,
    selectedMarketTitle: selectedMarket?.question?.substring(0, 50),
    marketTradesLength: marketTrades.length,
    marketLoading,
    marketError,
    userTradesLength: userTrades.length,
    userLoading,
    userError
  })
  
  // Pagination state
  const [marketCurrentPage, setMarketCurrentPage] = useState(1)
  const [userCurrentPage, setUserCurrentPage] = useState(1)
  const [marketHasMorePages, setMarketHasMorePages] = useState(false)
  const [userHasMorePages, setUserHasMorePages] = useState(false)
  
  // New data notification state
  const [marketHasNewData, setMarketHasNewData] = useState(false)
  const [userHasNewData, setUserHasNewData] = useState(false)
  
  // Refs to track component lifecycle and prevent duplicate requests
  const isMountedRef = useRef(true)
  const lastMarketRef = useRef<string | null>(null)
  const lastUserRef = useRef<string | null>(null)

  // Get wallet address from localStorage
  useEffect(() => {
    const savedWalletAddress = localStorage.getItem("polymarket_wallet_address") || ""
    setWalletAddress(savedWalletAddress || null)
  }, [])

  // Helper functions for pagination state management
  const getPaginationStateKey = useCallback((conditionId: string) => conditionId, [])

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
    console.log('[TradingActivityCard] loadPaginationState called for', conditionId)
    
    const state = initializePaginationState(conditionId)
    setMarketCurrentPage(state.market.currentPage)
    setUserCurrentPage(state.user.currentPage)
    setMarketHasMorePages(state.market.hasMorePages)
    setUserHasMorePages(state.user.hasMorePages)
    
    // Load current page data if available, otherwise clear the trades
    const marketData = state.market.pageData.get(state.market.currentPage)
    const userData = state.user.pageData.get(state.user.currentPage)
    
    console.log('[TradingActivityCard] loadPaginationState data', {
      conditionId,
      marketCurrentPage: state.market.currentPage,
      userCurrentPage: state.user.currentPage,
      marketDataLength: marketData?.length || 0,
      userDataLength: userData?.length || 0,
      willSetMarketTrades: marketData?.length || 0,
      willSetUserTrades: userData?.length || 0
    })
    
    // Always set the market trades - either with cached data or empty array
    setMarketTrades(marketData || [])
    
    // Always set the user trades - either with cached data or empty array
    setUserTrades(userData || [])
    
    console.log('[TradingActivityCard] State updated after loadPaginationState')
  }, [initializePaginationState])

  const savePaginationState = useCallback((conditionId: string, type: 'market' | 'user', page: number, data: ProcessedTrade[], hasMore: boolean) => {
    const state = initializePaginationState(conditionId)
    state[type].currentPage = page
    state[type].hasMorePages = hasMore
    state[type].pageData.set(page, data)
  }, [initializePaginationState])

  // Fetch market trades with pagination
  const fetchMarketTrades = useCallback(async (conditionId: string, page: number = 1) => {
    const requestKey = `market-${conditionId}-${page}`
    
    console.log('[TradingActivityCard] fetchMarketTrades called', {
      conditionId,
      page,
      requestKey,
      isAlreadyInProgress: globalActiveRequests.has(requestKey)
    })
    
    // Check if this request is already in progress
    if (globalActiveRequests.has(requestKey)) {
      console.log('[TradingActivityCard] Request already in progress, skipping', requestKey)
      return
    }
    
    console.log('[TradingActivityCard] Starting fetch request')
    setMarketLoading(true)
    setMarketError(null)
    globalActiveRequests.add(requestKey)

    try {
      const offset = (page - 1) * 10
      const apiUrl = `/api/trades?market=${conditionId}&offset=${offset}`
      console.log('[TradingActivityCard] Fetching from', apiUrl)
      
      const response = await fetch(apiUrl)
      
      console.log('[TradingActivityCard] API response', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch market trades')
      }

      const trades: Trade[] = await response.json()
      const processedTrades = trades.map(processTrade)
      
      console.log('[TradingActivityCard] API data received', {
        rawTradesCount: trades.length,
        processedTradesCount: processedTrades.length,
        firstTrade: trades[0] ? {
          side: trades[0].side,
          price: trades[0].price,
          size: trades[0].size,
          timestamp: trades[0].timestamp
        } : null
      })
      
      // Determine if there are more pages (if we got exactly 10 trades, assume more exist)
      const hasMorePages = trades.length === 10
      
      if (isMountedRef.current) {
        console.log('[TradingActivityCard] Updating state with trades', {
          tradesCount: processedTrades.length,
          page,
          hasMorePages
        })
        
        setMarketTrades(processedTrades)
        setMarketCurrentPage(page)
        setMarketHasMorePages(hasMorePages)
        
        // Save to pagination state
        savePaginationState(conditionId, 'market', page, processedTrades, hasMorePages)
      } else {
        console.log('[TradingActivityCard] Component unmounted, not updating state')
      }
    } catch (error) {
      console.error('[TradingActivityCard] Error fetching market trades:', error)
      if (isMountedRef.current) {
        setMarketError('Failed to load market trades')
        setMarketTrades([])
      }
    } finally {
      if (isMountedRef.current) {
        console.log('[TradingActivityCard] Setting loading to false')
        setMarketLoading(false)
      }
      globalActiveRequests.delete(requestKey)
    }
  }, [savePaginationState])

  // Fetch user trades with pagination
  const fetchUserTrades = useCallback(async (conditionId: string, userAddress: string, page: number = 1) => {
    const requestKey = `user-${conditionId}-${userAddress}-${page}`
    
    // Check if this request is already in progress
    if (globalActiveRequests.has(requestKey)) {
      return
    }
    
    setUserLoading(true)
    setUserError(null)
    globalActiveRequests.add(requestKey)

    try {
      const offset = (page - 1) * 10
      const response = await fetch(`/api/trades?market=${conditionId}&user=${userAddress}&takerOnly=false&offset=${offset}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch user trades')
      }

      const trades: Trade[] = await response.json()
      const processedTrades = trades.map(processTrade)
      
      // Determine if there are more pages (if we got exactly 10 trades, assume more exist)
      const hasMorePages = trades.length === 10
      
      if (isMountedRef.current) {
        setUserTrades(processedTrades)
        setUserCurrentPage(page)
        setUserHasMorePages(hasMorePages)
        
        // Save to pagination state
        savePaginationState(conditionId, 'user', page, processedTrades, hasMorePages)
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
      globalActiveRequests.delete(requestKey)
    }
  }, [savePaginationState])

  // Synchronized refresh function - only refresh page 1 and check for new data
  const synchronizedRefresh = useCallback(() => {
    if (!selectedMarket?.conditionId) return
    
    const conditionId = selectedMarket.conditionId
    
    // If user is on page 1, just refresh normally using existing functions
    if (marketCurrentPage === 1) {
      fetchMarketTrades(conditionId, 1)
    } else {
      // Check for new data on page 1 without updating UI
      const checkForNewMarketData = async () => {
        try {
          const response = await fetch(`/api/trades?market=${conditionId}&offset=0`)
          if (response.ok) {
            const trades: Trade[] = await response.json()
            const processedTrades = trades.map(processTrade)
            
            // Check if new data is different from cached page 1
            const state = globalPaginationState.get(conditionId)
            const cachedPage1 = state?.market.pageData.get(1)
            if (!cachedPage1 || JSON.stringify(cachedPage1) !== JSON.stringify(processedTrades)) {
              setMarketHasNewData(true)
            }
          }
        } catch (error) {
          console.error('Error checking for new market data:', error)
        }
      }
      checkForNewMarketData()
    }
    
    // Same logic for user trades
    if (walletAddress) {
      if (userCurrentPage === 1) {
        fetchUserTrades(conditionId, walletAddress, 1)
      } else {
        // Check for new data on page 1 without updating UI
        const checkForNewUserData = async () => {
          try {
            const response = await fetch(`/api/trades?market=${conditionId}&user=${walletAddress}&takerOnly=false&offset=0`)
            if (response.ok) {
              const trades: Trade[] = await response.json()
              const processedTrades = trades.map(processTrade)
              
              // Check if new data is different from cached page 1
              const state = globalPaginationState.get(conditionId)
              const cachedPage1 = state?.user.pageData.get(1)
              if (!cachedPage1 || JSON.stringify(cachedPage1) !== JSON.stringify(processedTrades)) {
                setUserHasNewData(true)
              }
            }
          } catch (error) {
            console.error('Error checking for new user data:', error)
          }
        }
        checkForNewUserData()
      }
    }
  }, [selectedMarket?.conditionId, walletAddress, marketCurrentPage, userCurrentPage, fetchMarketTrades, fetchUserTrades])

  // Effect for market changes - load pagination state and fetch if needed
  useEffect(() => {
    console.log(`[TradingActivityCard:${componentId.current}] Market change effect triggered`, {
      selectedMarket: selectedMarket?.conditionId,
      selectedMarketTitle: selectedMarket?.question
    })
    
    if (!selectedMarket?.conditionId) {
      console.log(`[TradingActivityCard:${componentId.current}] No selectedMarket conditionId, returning`)
      return
    }

    const conditionId = selectedMarket.conditionId
    
    // Only process if market actually changed
    if (lastMarketRef.current !== conditionId) {
      console.log(`[TradingActivityCard:${componentId.current}] Market changed`, {
         from: lastMarketRef.current,
         to: conditionId,
         selectedMarketTitle: selectedMarket?.question
       })
      
      lastMarketRef.current = conditionId
      
      // Load pagination state
      console.log('[TradingActivityCard] Loading pagination state for', conditionId)
      loadPaginationState(conditionId)
      
      // Check if we have cached data for current page
      const state = initializePaginationState(conditionId)
      const marketData = state.market.pageData.get(state.market.currentPage)
      
      console.log('[TradingActivityCard] Checking cached data', {
        conditionId,
        currentPage: state.market.currentPage,
        hasCachedData: !!marketData,
        cachedDataLength: marketData?.length || 0,
        currentMarketTrades: marketTrades.length
      })
      
      // Fetch if no cached data
      if (!marketData) {
        console.log('[TradingActivityCard] No cached data, fetching trades for', conditionId, 'page', state.market.currentPage)
        fetchMarketTrades(conditionId, state.market.currentPage)
      } else {
        console.log('[TradingActivityCard] Using cached data', marketData.length, 'trades')
      }
      
      // Clear new data notifications
      setMarketHasNewData(false)
      setUserHasNewData(false)
    } else {
      console.log('[TradingActivityCard] Market not changed, skipping', {
        lastMarket: lastMarketRef.current,
        currentMarket: conditionId
      })
    }
  }, [selectedMarket?.conditionId])

  // Effect for user trades - load pagination state and fetch if needed
  useEffect(() => {
    if (!selectedMarket?.conditionId || !walletAddress) {
      setUserTrades([])
      setUserError(null)
      return
    }

    const conditionId = selectedMarket.conditionId
    const userKey = `${conditionId}_${walletAddress}`
    
    // Only process if market or user actually changed
    if (lastUserRef.current !== userKey) {
      lastUserRef.current = userKey
      
      // Check if we have cached data for current page
      const state = initializePaginationState(conditionId)
      const userData = state.user.pageData.get(state.user.currentPage)
      
      // Fetch if no cached data
      if (!userData) {
        fetchUserTrades(conditionId, walletAddress, state.user.currentPage)
      }
    }
  }, [selectedMarket?.conditionId, walletAddress])

  // Helper function to check if market is resolved
  const isMarketResolved = useCallback((market: any): boolean => {
    if (!market) return false
    return market.active === false || market.archived === true || market.closed === true
  }, [])

  // Global synchronized refresh timer - exactly every 10 seconds
  useEffect(() => {
    if (!selectedMarket?.conditionId) return

    // Skip auto-refresh for resolved markets
    if (isMarketResolved(selectedMarket)) {
      return
    }

    // Use market ID as key to prevent duplicates for the same market
    const refreshKey = selectedMarket.conditionId
    globalRefreshCallbacks.set(refreshKey, synchronizedRefresh)

    // Start global timer if it doesn't exist
    if (!globalRefreshInterval) {
      globalRefreshInterval = setInterval(() => {
        // Execute all registered refresh callbacks simultaneously
        globalRefreshCallbacks.forEach((callback) => {
          callback()
        })
      }, 10000) // 10 seconds
    }

          return () => {
        // Remove this component's callback using market ID as key
        const refreshKey = selectedMarket.conditionId
        globalRefreshCallbacks.delete(refreshKey)
        
        // Clean up global timer if no components are using it
        if (globalRefreshCallbacks.size === 0 && globalRefreshInterval) {
          clearInterval(globalRefreshInterval)
          globalRefreshInterval = null
        }
      }
  }, [selectedMarket?.conditionId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Pagination handlers
  const handleMarketPageChange = useCallback((page: number) => {
    if (!selectedMarket?.conditionId) return
    
    const conditionId = selectedMarket.conditionId
    const state = initializePaginationState(conditionId)
    
    // Check if we have cached data for this page
    const cachedData = state.market.pageData.get(page)
    if (cachedData) {
      setMarketTrades(cachedData)
      setMarketCurrentPage(page)
      state.market.currentPage = page
    } else {
      // Fetch new page
      fetchMarketTrades(conditionId, page)
    }
  }, [selectedMarket?.conditionId, initializePaginationState, fetchMarketTrades])

  const handleUserPageChange = useCallback((page: number) => {
    if (!selectedMarket?.conditionId || !walletAddress) return
    
    const conditionId = selectedMarket.conditionId
    const state = initializePaginationState(conditionId)
    
    // Check if we have cached data for this page
    const cachedData = state.user.pageData.get(page)
    if (cachedData) {
      setUserTrades(cachedData)
      setUserCurrentPage(page)
      state.user.currentPage = page
    } else {
      // Fetch new page
      fetchUserTrades(conditionId, walletAddress, page)
    }
  }, [selectedMarket?.conditionId, walletAddress, initializePaginationState, fetchUserTrades])

  // New data notification handlers
  const handleGoToMarketPage1 = useCallback(() => {
    setMarketHasNewData(false)
    handleMarketPageChange(1)
  }, [handleMarketPageChange])

  const handleGoToUserPage1 = useCallback(() => {
    setUserHasNewData(false)
    handleUserPageChange(1)
  }, [handleUserPageChange])

  const dismissMarketNotification = useCallback(() => {
    setMarketHasNewData(false)
  }, [])

  const dismissUserNotification = useCallback(() => {
    setUserHasNewData(false)
  }, [])

  // Retry function
  const handleRetry = useCallback(() => {
    if (!selectedMarket?.conditionId) return
    
    const conditionId = selectedMarket.conditionId
    
    // Fetch fresh data for current pages
    fetchMarketTrades(conditionId, marketCurrentPage)
    if (walletAddress) {
      fetchUserTrades(conditionId, walletAddress, userCurrentPage)
    }
  }, [selectedMarket?.conditionId, walletAddress, marketCurrentPage, userCurrentPage, fetchMarketTrades, fetchUserTrades])

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
    console.log('[TradingActivityCard] renderTradesList called', {
      tradesLength: trades.length,
      loading,
      error,
      emptyMessage,
      currentPage,
      hasMorePages,
      firstTrade: trades[0] ? {
        side: trades[0].displaySide,
        price: trades[0].displayPrice,
        size: trades[0].size
      } : null,
      timestamp: Date.now()
    })
    
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
      <div className="flex flex-col h-full">
        {/* New data notification */}
        {hasNewData && (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-gray-100">
                  New trades available
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onGoToPage1}
                  className="h-6 text-xs border-gray-600 text-gray-100 hover:bg-gray-800"
                >
                  View Latest
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismissNotification}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-100 hover:bg-gray-800"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="grid grid-cols-3 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
          <div>Side</div>
          <div>Price / Share</div>
          <div>Time</div>
        </div>
        
        {/* Trades list */}
        <div className="flex-1 overflow-y-auto">
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

        {/* Pagination controls */}
        <PaginationControls
          currentPage={currentPage}
          hasMorePages={hasMorePages}
          loading={loading}
          onPageChange={onPageChange}
        />
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
          {isMarketResolved(selectedMarket) && (
            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
              Resolved
            </span>
          )}
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
                (() => {
                  console.log(`[TradingActivityCard:${componentId.current}] About to render trades list`, {
                    marketTradesLength: marketTrades.length,
                    marketTrades: marketTrades.slice(0, 2), // First 2 trades for debugging
                    marketLoading,
                    marketError,
                    selectedMarketId: selectedMarket?.conditionId,
                    timestamp: Date.now()
                  })
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
                })()
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
                  "You haven't made any trades for this market",
                  userCurrentPage,
                  userHasMorePages,
                  handleUserPageChange,
                  userHasNewData,
                  handleGoToUserPage1,
                  dismissUserNotification
                )
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 