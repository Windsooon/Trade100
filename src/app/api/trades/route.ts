import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const user = searchParams.get('user')
    const market = searchParams.get('market')
    
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

    // Use the new activity endpoint with limit=100 and no type filter
    const url = `http://data-api.polymarket.com/activity?user=${encodeURIComponent(user)}&market=${encodeURIComponent(market)}&limit=100`
    
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
    console.error('Activity API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch activity data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 