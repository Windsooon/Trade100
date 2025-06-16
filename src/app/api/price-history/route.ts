import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const market = searchParams.get('market') // token ID
  const startTs = searchParams.get('startTs') // Unix timestamp
  const fidelity = searchParams.get('fidelity') || '60'

  if (!market) {
    return NextResponse.json(
      { error: 'Market token ID is required' },
      { status: 400 }
    )
  }

  try {
    // Build URL with startTs if provided, otherwise use 'all' interval for backward compatibility
    let url: string
    if (startTs) {
      url = `https://clob.polymarket.com/prices-history?market=${market}&startTs=${startTs}&fidelity=${fidelity}`
    } else {
      // Fallback to 'all' interval if no startTs provided
      url = `https://clob.polymarket.com/prices-history?interval=all&market=${market}&fidelity=${fidelity}`
    }
    
    const response = await proxyFetch(url, {
      headers: {
        'User-Agent': 'Polymarket Dashboard',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`CLOB API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Transform the data to include both timestamp and price
    const history = data.history || []
    
    return NextResponse.json({
      success: true,
      data: history,
      meta: {
        market,
        startTs,
        fidelity,
        count: history.length
      }
    })

  } catch (error) {
    console.error('[Price History] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch price history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 