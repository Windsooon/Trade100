import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

const POLYMARKET_API_URL = process.env.NEXT_PUBLIC_POLYMARKET_API_URL || 'https://gamma-api.polymarket.com'

export async function GET(request: NextRequest) {
  try {
    const url = `${POLYMARKET_API_URL}/events/pagination?limit=200&active=true&archived=false&closed=false&order=endDate&ascending=true&offset=0`
    
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
    
    
    // Filter events where endDate > two days before now (2 days ago)
    const now = new Date()
    const twoDaysAgo = new Date(now)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const filteredEvents = []
    const allEvents = data.data || []
    
    
    for (const event of allEvents) {
      if (!event.endDate) continue
      const endDate = new Date(event.endDate)
      
      if (endDate > twoDaysAgo) {
        filteredEvents.push(event)
      }
    }
    
    return NextResponse.json({
      success: true,
      data: filteredEvents,
      total: filteredEvents.length
    })
  } catch (error) {
    console.error('Ending soon events API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch ending soon events',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 