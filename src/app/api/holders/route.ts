import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const market = searchParams.get('market')
    const limit = searchParams.get('limit') || '10'
    
    if (!market) {
      return NextResponse.json({ 
        error: 'Market parameter is required' 
      }, { status: 400 })
    }

    const url = `https://data-api.polymarket.com/holders?market=${encodeURIComponent(market)}&limit=${limit}`
    
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
    console.error('Holders API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch holders data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 