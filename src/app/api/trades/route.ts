import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

// Global cache for trades data
const globalTradesCache = new Map<string, { data: any; timestamp: number }>()
const globalTradesPromises = new Map<string, Promise<any>>()
const CACHE_DURATION = 10 * 1000 // 10 seconds

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
  try {
    // Build query parameters for Polymarket Data API
    const params = new URLSearchParams()
    params.append('limit', '40')
    params.append('offset', '0')
    params.append('market', market)
    
    if (user) {
      params.append('user', user)
    }

    const url = `https://data-api.polymarket.com/trades?takerOnly=false&${params.toString()}`
    
    console.log(`[TRADES API] Fetching from: ${url}`)
    
    const response = await proxyFetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Polymarket Dashboard'
      }
    })

    if (!response.ok) {
      throw new Error(`Polymarket Data API responded with status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[TRADES API] Successfully fetched ${data.length} trades`)
    
    return data
  } catch (error) {
    console.error('Error fetching trades data:', error)
    throw error
  }
} 