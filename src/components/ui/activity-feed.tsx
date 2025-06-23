'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { ScrollArea } from './scroll-area'
import { Alert, AlertDescription } from './alert'
import { Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

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

interface ActivityFeedProps {
  onTradeReceived?: (trade: TradeActivity) => void
}

export function ActivityFeed({ onTradeReceived }: ActivityFeedProps) {
  console.log('🎬 ActivityFeed component rendering...')
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [trades, setTrades] = useState<TradeActivity[]>([])
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isUnmountingRef = useRef(false)

  const maxTrades = 500
  const maxReconnectAttempts = 5
  const reconnectDelay = 5000

  const subscriptionMessage = {
    action: "subscribe",
    subscriptions: [{
      topic: "activity",
      type: "orders_matched"
    }]
  }

  const addTrade = useCallback((rawMessage: any) => {
    try {
      const payload = rawMessage.payload
      if (!payload) return

      // Create a more unique ID that includes the WebSocket timestamp to prevent duplicates
      const uniqueId = `${payload.transactionHash}-${payload.timestamp}-${rawMessage.timestamp || Date.now()}`

      const trade: TradeActivity = {
        id: uniqueId,
        timestamp: payload.timestamp * 1000, // Convert to milliseconds
        user: {
          name: payload.name || '',
          pseudonym: payload.pseudonym || 'Anonymous',
          profileImage: payload.profileImage
        },
        market: {
          title: payload.title || '',
          slug: payload.slug || '',
          eventSlug: payload.eventSlug || '',
          conditionId: payload.conditionId || '',
          icon: payload.icon
        },
        trade: {
          outcome: payload.outcome || '',
          outcomeIndex: payload.outcomeIndex || 0,
          side: payload.side as 'BUY' | 'SELL',
          price: payload.price || 0,
          size: payload.size || 0,
          totalValue: (payload.price || 0) * (payload.size || 0)
        },
        transactionHash: payload.transactionHash || ''
      }

      setTrades(prev => {
        // Check if trade already exists to avoid duplicates
        const exists = prev.some(t => 
          t.transactionHash === trade.transactionHash && 
          t.timestamp === trade.timestamp &&
          t.trade.side === trade.trade.side &&
          t.trade.outcome === trade.trade.outcome
        )
        
        if (exists) {
          console.log('🔄 Duplicate trade detected, skipping:', trade.id)
          return prev
        }
        
        const newTrades = [trade, ...prev].slice(0, maxTrades)
        console.log('✅ Added new trade:', trade.id, 'Total trades:', newTrades.length)
        return newTrades
      })

      // Notify parent component only if it's a new trade
      onTradeReceived?.(trade)
    } catch (error) {
      console.error('Error processing trade message:', error)
    }
  }, [onTradeReceived])

  const connect = () => {
    if (isUnmountingRef.current) return
    
    console.log('🔌 Starting WebSocket connection...')
    setConnectionStatus('connecting')

    try {
      const ws = new WebSocket('wss://ws-live-data.polymarket.com/')
      wsRef.current = ws

      ws.onopen = () => {
        if (isUnmountingRef.current) return
        console.log('✅ WebSocket connected successfully')
        setConnectionStatus('connected')
        setReconnectAttempts(0)
        
        // Send subscription message
        const message = JSON.stringify(subscriptionMessage)
        console.log('📤 Sending subscription message:', message)
        
        try {
          ws.send(message)
          console.log('📤 Subscription message sent successfully')
        } catch (sendError) {
          console.error('❌ Failed to send subscription message:', sendError)
        }
      }

      ws.onmessage = (event) => {
        if (isUnmountingRef.current) return
        
        try {
          // Skip empty messages
          if (!event.data || event.data.trim() === '') return
          
          console.log('📥 Received WebSocket message:', event.data)
          const data = JSON.parse(event.data)
          
          // Check if it's a trading activity message
          if (data.topic === 'activity' && data.type === 'orders_matched' && data.payload) {
            console.log('🎯 Processing trading activity message')
            addTrade(data)
          } else {
            console.log('📋 Received non-trading message:', data.topic || 'unknown topic')
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error, 'Raw data:', event.data)
        }
      }

      ws.onerror = (error) => {
        if (isUnmountingRef.current) return
        
        // Enhanced error logging
        console.error('❌ WebSocket error details:', {
          error,
          readyState: ws.readyState,
          url: ws.url,
          timestamp: new Date().toISOString(),
          reconnectAttempts: reconnectAttempts
        })
        
        // Try to extract more error details
        if (error instanceof Event) {
          console.error('❌ WebSocket Event error type:', error.type)
          if (error.target && 'readyState' in error.target) {
            console.error('❌ WebSocket target readyState:', (error.target as any).readyState)
          }
        }
        
        setConnectionStatus('error')
      }

      ws.onclose = (event) => {
        if (isUnmountingRef.current) return
        
        console.log('🔌 WebSocket closed details:', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
          timestamp: new Date().toISOString()
        })
        
        setConnectionStatus('disconnected')
        
        // Auto-reconnect with exponential backoff
        setReconnectAttempts(prev => {
          const currentAttempts = prev
          if (currentAttempts < maxReconnectAttempts) {
            const delay = reconnectDelay * Math.pow(2, currentAttempts)
            console.log(`🔄 Scheduling reconnect attempt ${currentAttempts + 1} in ${delay}ms`)
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (!isUnmountingRef.current) {
                connect()
              }
            }, delay)
            
            return currentAttempts + 1
          } else {
            console.log('❌ Max reconnect attempts reached, giving up')
          }
          return currentAttempts
        })
      }

    } catch (error) {
      setConnectionStatus('error')
      console.error('❌ Failed to create WebSocket connection:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      })
    }
  }

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setConnectionStatus('disconnected')
    setReconnectAttempts(0)
  }, [])

  const manualReconnect = useCallback(() => {
    disconnect()
    setReconnectAttempts(0)
    setTimeout(() => {
      if (!isUnmountingRef.current) {
        connect()
      }
    }, 1000)
  }, [disconnect])

  // Auto-connect on mount - simplified dependencies
  useEffect(() => {
    console.log('🚀 ActivityFeed component mounted, starting connection process...')
    
    // Reset the unmounting flag in case component was previously unmounted
    isUnmountingRef.current = false
    
    // Connect immediately without delay to avoid race conditions
    if (!isUnmountingRef.current) {
      console.log('⚡ Connecting immediately...')
      connect()
    } else {
      console.log('❌ Component was unmounted before connect could be called')
    }
    
    return () => {
      console.log('🧹 ActivityFeed component unmounting, cleaning up...')
      isUnmountingRef.current = true
      disconnect()
    }
  }, []) // Remove connect from dependencies to avoid recreating the effect

  // Log connection status changes
  useEffect(() => {
    console.log(`📡 Connection status changed to: ${connectionStatus}`)
  }, [connectionStatus])

  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return { 
          icon: <Wifi className="h-4 w-4" />, 
          text: 'Connected', 
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
        }
      case 'connecting':
        return { 
          icon: <RefreshCw className="h-4 w-4 animate-spin" />, 
          text: 'Connecting', 
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
        }
      case 'error':
        return { 
          icon: <WifiOff className="h-4 w-4" />, 
          text: 'Error', 
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
        }
      case 'disconnected':
        return { 
          icon: <WifiOff className="h-4 w-4" />, 
          text: 'Disconnected', 
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' 
        }
    }
  }

  const formatTimeAgo = (timestamp: number): string => {
    const now = Date.now()
    const diffInSeconds = Math.floor((now - timestamp) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(3)}`
  }

  const formatSize = (size: number): string => {
    if (size >= 1000) return `${(size / 1000).toFixed(1)}K`
    return size.toFixed(0)
  }

  const formatTotalValue = (value: number): string => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(2)}`
  }

  const statusDisplay = getStatusDisplay()

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Live Trading Activity
          </CardTitle>
          <Badge className={statusDisplay.color}>
            {statusDisplay.icon}
            <span className="ml-1">{statusDisplay.text}</span>
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          Real-time trades • {trades.length} trades loaded
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        {connectionStatus === 'error' && reconnectAttempts >= maxReconnectAttempts && (
          <div className="p-3">
            <Alert variant="destructive">
              <WifiOff className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Connection failed after {maxReconnectAttempts} attempts</span>
                <button 
                  onClick={manualReconnect}
                  className="text-xs underline hover:no-underline"
                >
                  Retry
                </button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <ScrollArea className="h-[600px]">
          <div className="p-3 space-y-3">
            {trades.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {connectionStatus === 'connected' 
                    ? 'Waiting for trading activity...' 
                    : 'Connect to see live trading activity'
                  }
                </p>
              </div>
            ) : (
              trades.map((trade) => (
                <div
                  key={trade.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => window.open(`/events/${trade.market.eventSlug}?market=${trade.market.conditionId}`, '_blank')}
                >
                  {/* Header: User and timestamp */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{trade.user.pseudonym}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(trade.timestamp)}
                    </span>
                  </div>

                  {/* Market title */}
                  <div className="text-sm font-medium mb-2 line-clamp-2">
                    {trade.market.title}
                  </div>

                  {/* Trade details */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs">
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
                      <span className="text-muted-foreground">
                        {formatPrice(trade.trade.price)}
                      </span>
                      <span className="text-muted-foreground">
                        Size: {formatSize(trade.trade.size)}
                      </span>
                    </div>
                    <div className="text-sm font-medium">
                      {formatTotalValue(trade.trade.totalValue)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
} 