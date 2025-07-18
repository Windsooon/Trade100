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
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'retrying'

interface SharedOrderBookContextType {
  orderBooks: Record<string, BookData>
  connectionStatus: ConnectionStatus
  retryCount: number
  retryAttempt: number
  maxRetryAttempts: number
  manualRetry: () => void
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
  const wsRef = useRef<WebSocket | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isUnmountingRef = useRef(false)
  const retryAttemptRef = useRef(0)

  // Retry configuration
  const MAX_RETRY_ATTEMPTS = 5
  const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000] // Exponential backoff
  const CONNECTION_TIMEOUT = 30000 // 30 seconds (increased from 10)

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

  // WebSocket connection
  const connect = useCallback(() => {
    if (!allActiveTokenIds.length || isUnmountingRef.current) {
      console.log('❌ WebSocket connection aborted: no tokens or unmounting')
      return
    }
    
    cleanup() // Clean up any existing connections
    setConnectionStatus('connecting')
    
    console.log('🔌 Attempting WebSocket connection...', {
      tokenCount: allActiveTokenIds.length,
      retryAttempt: retryAttemptRef.current
    })

    // Helper function to handle retries
    const handleRetry = (reason: string) => {
      console.log(`🔄 Retry needed: ${reason}`, {
        currentAttempt: retryAttemptRef.current,
        maxAttempts: MAX_RETRY_ATTEMPTS
      })
      
      if (!isUnmountingRef.current && retryAttemptRef.current < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_DELAYS[retryAttemptRef.current] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
        setConnectionStatus('retrying')
        console.log(`⏳ Retrying in ${delay}ms...`)
        retryTimeoutRef.current = setTimeout(() => {
          if (!isUnmountingRef.current) {
            retryAttemptRef.current += 1
            setRetryAttempt(retryAttemptRef.current)
            connect()
          }
        }, delay)
      } else {
        console.log('❌ Max retry attempts reached or component unmounting')
        setConnectionStatus('error')
      }
    }

    try {
      const ws = new WebSocket('wss://ws-subscriptions-clob.polymarket.com/ws/market')
      wsRef.current = ws

      // Connection timeout - increased to 30 seconds
      const connectionTimeout = setTimeout(() => {
        console.log('⏰ WebSocket connection timeout')
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('🔌 Closing connection due to timeout')
          ws.close()
          handleRetry('Connection timeout')
        }
      }, CONNECTION_TIMEOUT)

      ws.onopen = () => {
        console.log('✅ WebSocket connection opened successfully')
        clearTimeout(connectionTimeout)
        if (isUnmountingRef.current) {
          console.log('⚠️ Component unmounting, closing WebSocket')
          ws.close()
          return
        }
        
        setConnectionStatus('connected')
        retryAttemptRef.current = 0 // Reset retry count on successful connection
        setRetryAttempt(0)
        setRetryCount(prev => prev + 1)
        
        // Enhanced subscription message with initial_dump like the example
        const subscribeMessage = {
          assets_ids: allActiveTokenIds,
          type: 'market',
          initial_dump: true,  // Request initial orderbook snapshot
          markets: []          // Empty markets array for market type
        }
        
        console.log('📤 Sending subscription message:', {
          tokenCount: allActiveTokenIds.length,
          message: subscribeMessage
        })
        
        // Send subscription with error handling
        try {
          ws.send(JSON.stringify(subscribeMessage))
          console.log('✅ Subscription message sent successfully')
        } catch (error) {
          console.error('❌ Failed to send subscription message:', error)
          handleRetry('Failed to send subscription')
          return
        }
        
        // Setup ping interval (using 50 seconds like the example, but keeping shorter for responsiveness)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log('🏓 Sending PING')
            ws.send('PING')
          } else {
            console.log('⚠️ WebSocket not open, clearing ping interval')
            if (pingIntervalRef.current) {
              clearInterval(pingIntervalRef.current)
              pingIntervalRef.current = null
            }
          }
        }, 30000) // Keep 30 seconds for better responsiveness
      }

      ws.onmessage = (event) => {
        if (isUnmountingRef.current) return
        
        try {
          if (event.data === 'PONG') {
            console.log('🏓 Received PONG')
            return
          }
          
          const data = JSON.parse(event.data)
          
          console.log('📨 Received WebSocket message:', {
            type: Array.isArray(data) ? 'array' : typeof data,
            length: Array.isArray(data) ? data.length : 'N/A',
            sample: Array.isArray(data) && data.length > 0 ? {
              event_type: data[0].event_type,
              asset_id: data[0].asset_id
            } : data
          })
          
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
          console.error('❌ Error parsing WebSocket message:', {
            error,
            rawData: event.data,
            dataLength: event.data?.length
          })
        }
      }

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        clearTimeout(connectionTimeout)
        if (isUnmountingRef.current) {
          console.log('⚠️ Component unmounting, ignoring error')
          return
        }
        
        console.log('🔌 WebSocket readyState on error:', ws.readyState)
        handleRetry(`WebSocket error: ${error}`)
      }

      ws.onclose = (event) => {
        console.log('🔌 WebSocket connection closed', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        })
        clearTimeout(connectionTimeout)
        if (isUnmountingRef.current) {
          console.log('⚠️ Component unmounting, not retrying')
          cleanup()
          return
        }
        
        cleanup()
        
        // Only retry if it wasn't a normal closure (1000 = normal closure)
        if (event.code !== 1000) {
          console.log('🔄 WebSocket closed abnormally, attempting retry')
          handleRetry(`Connection closed: ${event.code} - ${event.reason}`)
        } else {
          console.log('✅ WebSocket closed normally')
          setConnectionStatus('disconnected')
        }
      }
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error)
      handleRetry(`Connection creation failed: ${error}`)
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
    manualRetry
  }), [orderBooks, connectionStatus, retryCount, retryAttempt, manualRetry])

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