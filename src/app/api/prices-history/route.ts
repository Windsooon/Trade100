import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

interface PriceHistoryPoint {
  t: number // timestamp
  p: number // price
}

interface CandlestickData {
  time: number
  open: number
  high: number
  low: number
  close: number
}

function transformToCandlesticks(history: PriceHistoryPoint[]): CandlestickData[] {
  if (!history || history.length === 0) return []
  
  const candlesticks: CandlestickData[] = []
  
  for (let i = 0; i < history.length; i++) {
    const current = history[i]
    const previous = i > 0 ? history[i - 1] : current
    
    const open = previous.p
    const close = current.p
    const high = Math.max(open, close)
    const low = Math.min(open, close)
    
    candlesticks.push({
      time: current.t,
      open,
      high,
      low,
      close
    })
  }
  
  return candlesticks
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const market = searchParams.get('market') // token ID
  const startTs = searchParams.get('startTs') // Unix timestamp
  const endTs = searchParams.get('endTs') // Unix timestamp
  const fidelity = searchParams.get('fidelity') || '60'

  if (!market) {
    return NextResponse.json(
      { error: 'Market token ID is required' },
      { status: 400 }
    )
  }

  try {
    // Build URL with parameters
    let url: string
    if (startTs && endTs) {
      url = `https://clob.polymarket.com/prices-history?market=${market}&startTs=${startTs}&endTs=${endTs}&fidelity=${fidelity}`
    } else if (startTs) {
      url = `https://clob.polymarket.com/prices-history?market=${market}&startTs=${startTs}&fidelity=${fidelity}`
    } else {
      // Fallback to 'all' interval if no timestamps provided
      url = `https://clob.polymarket.com/prices-history?interval=all&market=${market}&fidelity=${fidelity}`
    }
    
    const response = await proxyFetch(url, {
      headers: {
        'User-Agent': 'Polymarket Dashboard',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`CLOB API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Transform the data to include both timestamp and price
    const history: PriceHistoryPoint[] = data.history || []
    
    // Convert to candlestick format
    const candlesticks = transformToCandlesticks(history)
    
    return NextResponse.json({
      success: true,
      data: candlesticks,
      raw: history, // Keep raw data for debugging
      meta: {
        market,
        startTs,
        endTs,
        fidelity,
        count: candlesticks.length
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