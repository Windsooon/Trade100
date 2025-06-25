import { NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

export async function GET() {
  try {
    const response = await proxyFetch('https://status.polymarket.com/summary.json', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Trade100-Dashboard/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Polymarket Status] Error fetching status:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch status',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 