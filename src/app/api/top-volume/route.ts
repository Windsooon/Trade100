import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

const POLYMARKET_API_URL = process.env.NEXT_PUBLIC_POLYMARKET_API_URL || 'https://gamma-api.polymarket.com'

export async function GET(request: NextRequest) {
  try {
    const url = `${POLYMARKET_API_URL}/events/pagination?limit=30&active=true&archived=false&closed=false&order=volume24hr&ascending=false&offset=0`
    
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
      data: data.data || [],
      total: data.pagination?.total || 0
    })
  } catch (error) {
    console.error('Top volume events API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch top volume events',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 