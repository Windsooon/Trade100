"use client"

import { useEffect, useCallback } from 'react'
import { useSharedOrderBook } from '../components/event-detail/shared-order-book-provider'
import { useHomePageMarketStore } from '../lib/stores'
import { calculateYesPrice, getYesTokenId } from '../lib/realtime-price'

export function useHomePageRealtime() {
  const { orderBooks } = useSharedOrderBook()
  const { 
    activeTab, 
    marketsByTab, 
    updateRealtimePrice, 
    getRealtimePrice 
  } = useHomePageMarketStore()

  // Calculate and update real-time prices when order books change
  const updatePricesFromOrderBooks = useCallback(() => {
    const activeMarkets = marketsByTab[activeTab] || []
    
    activeMarkets.forEach(market => {
      if (!market.clobTokenIds) return
      
      const yesTokenId = getYesTokenId(market.clobTokenIds)
      if (!yesTokenId) return
      
      // Find order book for YES token
      const orderBookKey = `${market.conditionId}_yes`
      const orderBook = orderBooks[orderBookKey]
      
      if (!orderBook) return
      
      // Calculate real-time price
      const realtimePrice = calculateYesPrice(orderBook)
      
      // Update store with throttling
      updateRealtimePrice(market.conditionId, realtimePrice)
    })
  }, [orderBooks, activeTab, marketsByTab, updateRealtimePrice])

  // Update prices when order books change
  useEffect(() => {
    updatePricesFromOrderBooks()
  }, [updatePricesFromOrderBooks])

  // Return function to get current price (real-time or static fallback)
  const getCurrentPrice = useCallback((conditionId: string, staticPrice: number): number => {
    const realtimePrice = getRealtimePrice(conditionId)
    return realtimePrice !== undefined ? realtimePrice : staticPrice
  }, [getRealtimePrice])

  return {
    getCurrentPrice,
    updatePricesFromOrderBooks
  }
}