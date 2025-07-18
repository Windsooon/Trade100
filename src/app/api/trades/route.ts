import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

// Global cache for trades data
const globalTradesCache = new Map<string, { data: any; timestamp: number }>()
const globalTradesPromises = new Map<string, Promise<any>>()
const CACHE_DURATION = 30 * 1000 // 30 seconds

// Mock trade data for demonstration (remove when authentication is available)
const generateMockTrades = (market: string, user?: string): any[] => {
  const now = Date.now()
  const trades = []
  
  for (let i = 0; i < 10; i++) {
    const timestamp = now - (i * 60000) // 1 minute apart
    const isYes = Math.random() > 0.5
    const side = Math.random() > 0.5 ? 'BUY' : 'SELL'
    const price = 0.3 + (Math.random() * 0.4) // 0.3 to 0.7
    const size = 10 + (Math.random() * 190) // 10 to 200
    
    trades.push({
      id: `mock_${i}_${timestamp}`,
      side,
      price: price.toString(),
      size: size.toString(),
      timestamp: Math.floor(timestamp / 1000),
      outcomeIndex: isYes ? 0 : 1,
      market,
      user: user || `0x${'1234567890abcdef'.repeat(2).slice(0, 40)}`
    })
  }
  
  return trades
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Get parameters
    const market = searchParams.get('market')
    const user = searchParams.get('user')
    
    if (!market) {
      return NextResponse.json(
        { error: 'Market parameter is required' },
        { status: 400 }
      )
    }

    // Create cache key
    const cacheKey = `trades_${market}_${user || 'all'}`
    
    // Check cache first
    const cached = globalTradesCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return NextResponse.json(cached.data)
    }

    // Check for ongoing request
    const existingPromise = globalTradesPromises.get(cacheKey)
    if (existingPromise) {
      const data = await existingPromise
      return NextResponse.json(data)
    }

    // Create new request promise
    const requestPromise = fetchTradesData(market, user)
    globalTradesPromises.set(cacheKey, requestPromise)

    try {
      const data = await requestPromise
      
      // Cache the result
      globalTradesCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      })
      
      return NextResponse.json(data)
    } finally {
      // Clean up promise
      globalTradesPromises.delete(cacheKey)
    }

  } catch (error) {
    console.error('Error in trades API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trades data' },
      { status: 500 }
    )
  }
}

async function fetchTradesData(market: string, user?: string) {
  // TODO: Replace this mock implementation with real API calls when authentication is available
  // 
  // AUTHENTICATION REQUIRED:
  // The Polymarket CLOB trades endpoint requires either L1 or L2 authentication headers:
  // - L1: POLY_ADDRESS, POLY_SIGNATURE, POLY_TIMESTAMP, POLY_NONCE
  // - L2: POLY_ADDRESS, POLY_SIGNATURE, POLY_TIMESTAMP, POLY_API_KEY, POLY_PASSPHRASE
  //
  // For now, we return mock data to demonstrate the functionality.
  // When implementing authentication, use this structure:
  //
  // const params = new URLSearchParams()
  // params.append('limit', '40')
  // params.append('offset', '0')
  // params.append('market', market)
  // if (user) params.append('user', user)
  //
  // const response = await proxyFetch(`https://clob.polymarket.com/trades?${params.toString()}`, {
  //   method: 'GET',
  //   headers: {
  //     'Accept': 'application/json',
  //     'Content-Type': 'application/json',
  //     // Add authentication headers here
  //   }
  // })
  //
  // if (!response.ok) {
  //   throw new Error(`Polymarket API responded with status: ${response.status}`)
  // }
  //
  // return await response.json()

  // Mock implementation for demonstration
  console.log(`[TRADES API] Returning mock data for market: ${market}, user: ${user || 'all'}`)
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100))
  
  return generateMockTrades(market, user)
} 