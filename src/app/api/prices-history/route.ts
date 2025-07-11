import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const market = searchParams.get('market')
    
    if (!market) {
      return NextResponse.json({ 
        success: false, 
        error: 'Market parameter is required' 
      }, { status: 400 })
    }

    // Calculate timestamps using the new approach
    const currentTimestamp = Math.floor(Date.now() / 1000)
    // Round down to nearest 10 seconds (make last digit 0)
    const endTs = Math.floor(currentTimestamp / 10) * 10
    // Calculate 14 days ago (14 * 24 * 60 * 60 = 1,209,600 seconds)
    const startTs = endTs - (14 * 24 * 60 * 60)

    // Always use fidelity=1 (1 minute intervals)
    const fidelity = 1

    // Build the API URL for clob.polymarket.com
    const url = `https://clob.polymarket.com/prices-history?startTs=${startTs}&endTs=${endTs}&market=${encodeURIComponent(market)}&fidelity=${fidelity}`
    
    const response = await proxyFetch(url, {
      headers: {
        'User-Agent': 'Trade100 Dashboard',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Return the raw price history data
    return NextResponse.json({
      success: true,
      data: data.history || [],
      metadata: {
        startTs,
        endTs,
        fidelity,
        market,
        totalPoints: data.history?.length || 0
      }
    })
    
  } catch (error) {
    console.error('Prices history API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch price history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 