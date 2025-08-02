import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Get parameters
    const market = searchParams.get('market')
    const user = searchParams.get('user')
    const takerOnly = searchParams.get('takerOnly')
    const offset = searchParams.get('offset') || '0'
    
    if (!market) {
      return NextResponse.json(
        { error: 'Market parameter is required' },
        { status: 400 }
      )
    }

    const data = await fetchTradesData(market, user, takerOnly, offset)
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error in trades API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trades data' },
      { status: 500 }
    )
  }
}

async function fetchTradesData(market: string, user?: string, takerOnly?: string, offset: string = '0') {
  try {
    // Build query parameters for Polymarket Data API
    const params = new URLSearchParams()
    params.append('limit', '10')
    params.append('offset', offset)
    params.append('market', market)
    
    // Add takerOnly parameter if provided
    if (takerOnly !== null && takerOnly !== undefined) {
      params.append('takerOnly', takerOnly)
    }
    
    // Add user parameter if provided
    if (user && user.trim() !== '') {
      params.append('user', user)
    }

    const url = `https://data-api.polymarket.com/trades?${params.toString()}`
    
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