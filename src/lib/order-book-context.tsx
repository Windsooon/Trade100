"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'

export interface OrderBookData {
  bids: Array<[number, number]> // [price, size]
  asks: Array<[number, number]> // [price, size]
  lastUpdated: number
}

interface OrderBookContextType {
  orderBooks: Record<string, OrderBookData> // conditionId -> OrderBookData
  updateOrderBook: (conditionId: string, data: OrderBookData) => void
  getOrderBook: (conditionId: string) => OrderBookData | null
  getMidpointPrice: (conditionId: string, selectedToken: 'yes' | 'no') => number | null
}

const OrderBookContext = createContext<OrderBookContextType | null>(null)

export function OrderBookProvider({ children }: { children: React.ReactNode }) {
  const [orderBooks, setOrderBooks] = useState<Record<string, OrderBookData>>({})

  const updateOrderBook = useCallback((conditionId: string, data: OrderBookData) => {
    setOrderBooks(prev => ({
      ...prev,
      [conditionId]: data
    }))
  }, [])

  const getOrderBook = useCallback((conditionId: string): OrderBookData | null => {
    return orderBooks[conditionId] || null
  }, [orderBooks])

  const getMidpointPrice = useCallback((conditionId: string, selectedToken: 'yes' | 'no'): number | null => {
    const orderBook = orderBooks[conditionId]
    
    if (!orderBook) {
      return null
    }
    
    // Get highest bid and lowest ask for YES token
    const yesHighestBid = orderBook.bids.length > 0 ? orderBook.bids[0][0] : 0
    const yesLowestAsk = orderBook.asks.length > 0 ? orderBook.asks[orderBook.asks.length - 1][0] : 1
    
    // Calculate YES midpoint
    const yesMidpoint = (yesHighestBid + yesLowestAsk) / 2
    
    if (selectedToken === 'yes') {
      return yesMidpoint
    } else {
      // For NO token, convert YES midpoint to NO price
      const noPrice = 1 - yesMidpoint
      return noPrice
    }
  }, [orderBooks])

  const value: OrderBookContextType = {
    orderBooks,
    updateOrderBook,
    getOrderBook,
    getMidpointPrice
  }

  return (
    <OrderBookContext.Provider value={value}>
      {children}
    </OrderBookContext.Provider>
  )
}

export function useOrderBook() {
  const context = useContext(OrderBookContext)
  if (!context) {
    throw new Error('useOrderBook must be used within an OrderBookProvider')
  }
  return context
} 