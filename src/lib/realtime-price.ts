// Utility functions for real-time price calculations

export interface BookLevel {
  price: string
  size: string
}

export interface BookData {
  bids: BookLevel[]
  asks: BookLevel[]
  lastTradePrice?: number
  lastTradeSide?: 'BUY' | 'SELL'
  lastTradeTimestamp?: number
  lastTradePriceFromAPI?: number
  lastTradeSideFromAPI?: 'BUY' | 'SELL'
}

/**
 * Calculate Yes price from order book data
 * Uses mid-price: (highest_bid + lowest_ask) / 2
 * Fallbacks: no bids = 0, no asks = 1
 */
export function calculateYesPrice(orderBook: BookData): number {
  let highestBid = 0
  let lowestAsk = 1
  
  // Get highest bid (first in sorted array)
  if (orderBook.bids && orderBook.bids.length > 0) {
    highestBid = parseFloat(orderBook.bids[0].price)
  }
  
  // Get lowest ask (first in sorted array)  
  if (orderBook.asks && orderBook.asks.length > 0) {
    lowestAsk = parseFloat(orderBook.asks[0].price)
  }
  
  // Calculate mid-price
  const midPrice = (highestBid + lowestAsk) / 2
  
  // Ensure price is between 0 and 1
  return Math.max(0, Math.min(1, midPrice))
}

/**
 * Extract YES token ID from clobTokenIds string
 */
export function getYesTokenId(clobTokenIds: string): string | null {
  try {
    const ids = JSON.parse(clobTokenIds)
    if (Array.isArray(ids) && ids.length > 0) {
      return ids[0] // YES token is first
    }
  } catch {
    return null
  }
  return null
}

/**
 * Convert MarketDisplay to HomePageMarket format
 */
export function convertToHomePageMarket(market: any): any {
  return {
    conditionId: market.conditionId,
    clobTokenIds: market.clobTokenIds || '',
    staticPrice: market.yesPrice || 0,
  }
}