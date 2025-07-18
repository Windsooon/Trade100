import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Build query parameters
    const params = new URLSearchParams()
    
    // Add default limit and offset
    params.append('limit', '40')
    params.append('offset', '0')
    
    // Add market (conditionId) if provided
    const market = searchParams.get('market')
    if (market) {
      params.append('market', market)
    }
    
    // Add user wallet address if provided
    const user = searchParams.get('user')
    if (user) {
      params.append('user', user)
    }
    
    const url = `https://clob.polymarket.com/trades?${params.toString()}`
    
    const response = await proxyFetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Polymarket API responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching trades:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trades data' },
      { status: 500 }
    )
  }
} 