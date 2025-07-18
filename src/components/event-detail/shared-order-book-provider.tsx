"use client"

import { createContext, useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react'

interface Market {
  conditionId: string
  clobTokenIds?: string
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

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'retrying'

interface SharedOrderBookContextType {
  orderBooks: Record<string, BookData>
  connectionStatus: ConnectionStatus
  retryCount: number
  retryAttempt: number
  maxRetryAttempts: number
  manualRetry: () => void
  fetchLastTradePrices: () => Promise<void>
  lastTradePricesLoading: boolean
}

const SharedOrderBookContext = createContext<SharedOrderBookContextType | null>(null)

interface SharedOrderBookProviderProps {
  children: React.ReactNode
  allActiveMarkets: Market[]
}

export function SharedOrderBookProvider({ children, allActiveMarkets }: SharedOrderBookProviderProps) {
  const [orderBooks, setOrderBooks] = useState<Record<string, BookData>>({})
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [retryCount, setRetryCount] = useState(0)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [lastTradePricesLoading, setLastTradePricesLoading] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isUnmountingRef = useRef(false)
  const retryAttemptRef = useRef(0)
  const lastTradePricesLoadedRef = useRef(false)

  // Retry configuration
  const MAX_RETRY_ATTEMPTS = 5
  const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000] // Exponential backoff

  // Get all active market token IDs for WebSocket subscription
  const allActiveTokenIds = useMemo(() => {
    const allTokens: string[] = []
    allActiveMarkets.forEach(market => {
      if (market.clobTokenIds) {
        try {
          const ids = JSON.parse(market.clobTokenIds)
          if (ids[0]) allTokens.push(ids[0]) // YES token
          if (ids[1]) allTokens.push(ids[1]) // NO token
        } catch {
          // Skip invalid token IDs
        }
      }
    })
    return allTokens.sort()
  }, [allActiveMarkets])

  // Cleanup function
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current)
      pingIntervalRef.current = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  // Fetch initial last trade prices from API
  const fetchLastTradePrices = useCallback(async () => {
    if (!allActiveMarkets.length || isUnmountingRef.current || lastTradePricesLoadedRef.current) {
      return
    }

    setLastTradePricesLoading(true)
    lastTradePricesLoadedRef.current = true

    try {
      // Get all YES token IDs from active markets
      const yesTokenIds: string[] = []
      const tokenToMarketMap: Record<string, { conditionId: string }> = {}

      allActiveMarkets.forEach(market => {
        if (market.clobTokenIds) {
          try {
            const ids = JSON.parse(market.clobTokenIds)
            if (ids[0]) { // YES token
              yesTokenIds.push(ids[0])
              tokenToMarketMap[ids[0]] = { conditionId: market.conditionId }
            }
          } catch {
            // Skip invalid token IDs
          }
        }
      })

      if (yesTokenIds.length === 0) {
        return
      }

      // Prepare API payload
      const payload = yesTokenIds.map(tokenId => ({ token_id: tokenId }))
      console.log('🚀 Calling last-trade-prices API with payload:', payload)

      // Call our API route
      const response = await fetch('/api/last-trade-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        console.error('Failed to fetch last trade prices:', response.status, response.statusText)
        return
      }

      const tradePrices = await response.json()
      console.log('📊 Last trade prices API response:', tradePrices)

      // Process the response and update order books
      setOrderBooks(prev => {
        const newOrderBooks = { ...prev }

        tradePrices.forEach((tradeData: { price: string, side: 'BUY' | 'SELL', token_id: string }) => {
          const marketInfo = tokenToMarketMap[tradeData.token_id]
          if (!marketInfo) {
            console.log('❌ No market info found for token:', tradeData.token_id)
            return
          }

          const yesPrice = parseFloat(tradeData.price)
          const noPrice = 1 - yesPrice

          console.log('📈 Processing trade data:', {
            tokenId: tradeData.token_id,
            conditionId: marketInfo.conditionId,
            yesPrice,
            noPrice,
            side: tradeData.side
          })

          // Update YES token data
          const yesKey = `${marketInfo.conditionId}_yes`
          const existingYesBook = newOrderBooks[yesKey] || { bids: [], asks: [] }
          newOrderBooks[yesKey] = {
            ...existingYesBook,
            lastTradePriceFromAPI: yesPrice,
            lastTradeSideFromAPI: tradeData.side
          }

          // Update NO token data (calculated from YES)
          const noKey = `${marketInfo.conditionId}_no`
          const oppositeSide = tradeData.side === 'BUY' ? 'SELL' : 'BUY'
          const existingNoBook = newOrderBooks[noKey] || { bids: [], asks: [] }
          newOrderBooks[noKey] = {
            ...existingNoBook,
            lastTradePriceFromAPI: noPrice,
            lastTradeSideFromAPI: oppositeSide
          }

          console.log('✅ Updated order books for:', { yesKey, noKey })
          console.log('📋 Final yesBook:', newOrderBooks[yesKey])
          console.log('📋 Final noBook:', newOrderBooks[noKey])
        })

        console.log('🔄 Returning updated order books state')
        return newOrderBooks
      })

    } catch (error) {
      console.error('Error fetching last trade prices:', error)
    } finally {
      setLastTradePricesLoading(false)
    }
  }, [allActiveMarkets])

  // WebSocket connection
  const connect = useCallback(() => {
    if (!allActiveTokenIds.length || isUnmountingRef.current) {
      return
    }
    
    cleanup() // Clean up any existing connections
    setConnectionStatus('connecting')

    try {
      const ws = new WebSocket('wss://ws-subscriptions-clob.polymarket.com/ws/market')
      wsRef.current = ws

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close()
          if (!isUnmountingRef.current && retryAttemptRef.current < MAX_RETRY_ATTEMPTS) {
            const delay = RETRY_DELAYS[retryAttemptRef.current] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
            setConnectionStatus('retrying')
            retryTimeoutRef.current = setTimeout(() => {
              if (!isUnmountingRef.current) {
                retryAttemptRef.current += 1
                setRetryAttempt(retryAttemptRef.current)
                connect()
              }
            }, delay)
          } else {
            setConnectionStatus('error')
          }
        }
      }, 10000) // 10 second timeout

      ws.onopen = () => {
        clearTimeout(connectionTimeout)
        if (isUnmountingRef.current) return
        
        setConnectionStatus('connected')
        retryAttemptRef.current = 0 // Reset retry count on successful connection
        setRetryAttempt(0)
        setRetryCount(prev => prev + 1)
        
        const subscribeMessage = {
          assets_ids: allActiveTokenIds,
          type: 'market'
        }
        
        ws.send(JSON.stringify(subscribeMessage))
        
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('PING')
          }
        }, 30000)
      }

      ws.onmessage = (event) => {
        if (isUnmountingRef.current) return
        
        try {
          if (event.data === 'PONG') return
          
          const data = JSON.parse(event.data)
          
          // Handle array of messages (initial book snapshots and price_change events)
          if (Array.isArray(data)) {
            data.forEach(item => {
              // Handle initial order book snapshots (event_type: "book")
              if (item.asset_id && item.event_type === 'book' && item.bids && item.asks) {
                // Find which market this asset_id belongs to using conditionId = asset_id
                const market = allActiveMarkets.find(m => {
                  if (!m.clobTokenIds) return false
                  try {
                    const ids = JSON.parse(m.clobTokenIds)
                    return ids.includes(item.asset_id) // Check both YES and NO tokens
                  } catch {
                    return false
                  }
                })

                if (market) {
                  // Determine if this is YES or NO token
                  let tokenType = 'yes'
                  try {
                    const ids = JSON.parse(market.clobTokenIds!)
                    if (ids[1] === item.asset_id) {
                      tokenType = 'no'
                    }
                  } catch {
                    // Default to yes
                  }

                  // WebSocket sends:
                  // - Bids: small→big (need to reverse for display: big→small)
                  // - Asks: big→small (need to reverse for display: small→big)
                  const processedBids = (item.bids || []).slice().reverse() // Reverse bids: small→big to big→small
                  const processedAsks = (item.asks || []).slice().reverse() // Reverse asks: big→small to small→big

                  setOrderBooks(prev => ({
                    ...prev,
                    [`${market.conditionId}_${tokenType}`]: {
                      bids: processedBids,
                      asks: processedAsks,
                      lastTradePrice: prev[`${market.conditionId}_${tokenType}`]?.lastTradePrice,
                      lastTradeSide: prev[`${market.conditionId}_${tokenType}`]?.lastTradeSide,
                      lastTradeTimestamp: prev[`${market.conditionId}_${tokenType}`]?.lastTradeTimestamp
                    }
                  }))
                }
              }
              // Handle price change updates (event_type: "price_change")
              else if (item.asset_id && item.event_type === 'price_change' && item.changes) {
                // Find which market this asset_id belongs to
                const market = allActiveMarkets.find(m => {
                  if (!m.clobTokenIds) return false
                  try {
                    const ids = JSON.parse(m.clobTokenIds)
                    return ids.includes(item.asset_id) // Check both YES and NO tokens
                  } catch {
                    return false
                  }
                })

                if (market) {
                  // Determine if this is YES or NO token
                  let tokenType = 'yes'
                  try {
                    const ids = JSON.parse(market.clobTokenIds!)
                    if (ids[1] === item.asset_id) {
                      tokenType = 'no'
                    }
                  } catch {
                    // Default to yes
                  }

                  const orderBookKey = `${market.conditionId}_${tokenType}`
                  
                  // Update order book with price changes
                  setOrderBooks(prev => {
                    const currentBook = prev[orderBookKey] || { bids: [], asks: [] }
                    const updatedBook = { 
                      bids: [...currentBook.bids], 
                      asks: [...currentBook.asks],
                      // Preserve last trade price data
                      lastTradePrice: currentBook.lastTradePrice,
                      lastTradeSide: currentBook.lastTradeSide,
                      lastTradeTimestamp: currentBook.lastTradeTimestamp
                    }
                    
                    // Apply price changes
                    item.changes.forEach((change: any) => {
                      const level = { price: change.price, size: change.size }
                      
                      if (change.side === 'BUY') {
                        // Update bids
                        const existingIndex = updatedBook.bids.findIndex(bid => bid.price === change.price)
                        if (existingIndex >= 0) {
                          if (parseFloat(change.size) === 0) {
                            updatedBook.bids.splice(existingIndex, 1)
                          } else {
                            updatedBook.bids[existingIndex] = level
                          }
                        } else if (parseFloat(change.size) > 0) {
                          updatedBook.bids.push(level)
                        }
                        // Sort bids by price descending
                        updatedBook.bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
                      } else if (change.side === 'SELL') {
                        // Update asks
                        const existingIndex = updatedBook.asks.findIndex(ask => ask.price === change.price)
                        if (existingIndex >= 0) {
                          if (parseFloat(change.size) === 0) {
                            updatedBook.asks.splice(existingIndex, 1)
                          } else {
                            updatedBook.asks[existingIndex] = level
                          }
                        } else if (parseFloat(change.size) > 0) {
                          updatedBook.asks.push(level)
                        }
                        // Sort asks by price ascending (small→big for display)
                        updatedBook.asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
                      }
                    })
                    
                    return {
                      ...prev,
                      [orderBookKey]: updatedBook
                    }
                  })
                }
              }
              // Handle last trade price updates (event_type: "last_trade_price")
              else if (item.asset_id && item.event_type === 'last_trade_price' && item.price && item.side) {
                // Find which market this asset_id belongs to
                const market = allActiveMarkets.find(m => {
                  if (!m.clobTokenIds) return false
                  try {
                    const ids = JSON.parse(m.clobTokenIds)
                    return ids.includes(item.asset_id) // Check both YES and NO tokens
                  } catch {
                    return false
                  }
                })

                if (market) {
                  // Determine if this is YES or NO token
                  let tokenType = 'yes'
                  try {
                    const ids = JSON.parse(market.clobTokenIds!)
                    if (ids[1] === item.asset_id) {
                      tokenType = 'no'
                    }
                  } catch {
                    // Default to yes
                  }

                  const orderBookKey = `${market.conditionId}_${tokenType}`
                  
                  // Update order book with last trade price
                  setOrderBooks(prev => {
                    const currentBook = prev[orderBookKey] || { bids: [], asks: [] }
                    
                    return {
                      ...prev,
                      [orderBookKey]: {
                        ...currentBook,
                        lastTradePrice: parseFloat(item.price),
                        lastTradeSide: item.side,
                        lastTradeTimestamp: parseInt(item.timestamp) || Date.now()
                      }
                    }
                  })
                }
              }
            })
          }
        } catch (error) {
          // Error parsing WebSocket message
        }
      }

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout)
        if (isUnmountingRef.current) return
        
        if (retryAttemptRef.current < MAX_RETRY_ATTEMPTS) {
          const delay = RETRY_DELAYS[retryAttemptRef.current] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
          setConnectionStatus('retrying')
          retryTimeoutRef.current = setTimeout(() => {
            if (!isUnmountingRef.current) {
              retryAttemptRef.current += 1
              setRetryAttempt(retryAttemptRef.current)
              connect()
            }
          }, delay)
        } else {
          setConnectionStatus('error')
        }
      }

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout)
        if (isUnmountingRef.current) return
        
        cleanup()
        
        // Only retry if it wasn't a normal closure
        if (event.code !== 1000 && retryAttemptRef.current < MAX_RETRY_ATTEMPTS) {
          const delay = RETRY_DELAYS[retryAttemptRef.current] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
          setConnectionStatus('retrying')
          retryTimeoutRef.current = setTimeout(() => {
            if (!isUnmountingRef.current) {
              retryAttemptRef.current += 1
              setRetryAttempt(retryAttemptRef.current)
              connect()
            }
          }, delay)
        } else if (event.code !== 1000) {
          setConnectionStatus('error')
        } else {
          setConnectionStatus('disconnected')
        }
      }
    } catch (error) {
      if (retryAttemptRef.current < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_DELAYS[retryAttemptRef.current] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
        setConnectionStatus('retrying')
        retryTimeoutRef.current = setTimeout(() => {
          if (!isUnmountingRef.current) {
            retryAttemptRef.current += 1
            setRetryAttempt(retryAttemptRef.current)
            connect()
          }
        }, delay)
      } else {
        setConnectionStatus('error')
      }
    }
  }, [allActiveTokenIds, allActiveMarkets, cleanup])

  // Manual retry function
  const manualRetry = useCallback(() => {
    retryAttemptRef.current = 0
    setRetryAttempt(0)
    connect()
  }, [connect])

  // Connect on mount and when active markets change
  useEffect(() => {
    if (allActiveTokenIds.length > 0) {
      retryAttemptRef.current = 0
      setRetryAttempt(0)
      connect()
    }

    return () => {
      isUnmountingRef.current = true
      cleanup()
    }
  }, [connect, cleanup, allActiveTokenIds.join(',')]) // Use join to create stable dependency

  // Fetch initial last trade prices when markets change
  useEffect(() => {
    if (allActiveMarkets.length > 0) {
      fetchLastTradePrices()
    }
  }, [fetchLastTradePrices, allActiveMarkets.length])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true
      cleanup()
    }
  }, [cleanup])

  const contextValue = useMemo(() => ({
    orderBooks,
    connectionStatus,
    retryCount,
    retryAttempt,
    maxRetryAttempts: MAX_RETRY_ATTEMPTS,
    manualRetry,
    fetchLastTradePrices,
    lastTradePricesLoading
  }), [orderBooks, connectionStatus, retryCount, retryAttempt, manualRetry, fetchLastTradePrices, lastTradePricesLoading])

  return (
    <SharedOrderBookContext.Provider value={contextValue}>
      {children}
    </SharedOrderBookContext.Provider>
  )
}

export function useSharedOrderBook() {
  const context = useContext(SharedOrderBookContext)
  if (!context) {
    throw new Error('useSharedOrderBook must be used within a SharedOrderBookProvider')
  }
  return context
} 