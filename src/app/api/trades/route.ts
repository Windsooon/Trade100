import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user = searchParams.get('user')
    const market = searchParams.get('market')
    const limit = searchParams.get('limit') || '10'
    const offset = searchParams.get('offset') || '0'
    const takerOnly = searchParams.get('takerOnly') || 'false'
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User parameter is required' 
      }, { status: 400 })
    }

    if (!market) {
      return NextResponse.json({ 
        error: 'Market parameter is required' 
      }, { status: 400 })
    }

    const url = `https://data-api.polymarket.com/trades?user=${encodeURIComponent(user)}&market=${encodeURIComponent(market)}&limit=${limit}&offset=${offset}&takerOnly=${takerOnly}`
    
    const response = await proxyFetch(url, {
      headers: {
        'User-Agent': 'Polymarket Dashboard',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      data: data
    })
  } catch (error) {
    console.error('Trades API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch trade data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 