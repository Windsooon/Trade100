import { NextRequest, NextResponse } from 'next/server'

// Import the cache from the markets route
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Temporary import - we'll need to export these from the markets route
let eventsCache: any[] = []
let cacheTimestamp = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params

    // Check if we need to fetch fresh data by calling the markets API
    const now = Date.now()
    if (!eventsCache.length || (now - cacheTimestamp) > CACHE_DURATION) {
      try {
        // Fetch from our own markets API to use the same cache
        const response = await fetch(`${request.nextUrl.origin}/api/markets?limit=9999`)
        if (response.ok) {
          const data = await response.json()
          eventsCache = data.events || []
          cacheTimestamp = now
        }
      } catch (error) {
        console.error('Failed to fetch fresh data:', error)
      }
    }

    // Find the specific event
    const event = eventsCache.find(e => e.id === eventId)

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      event,
      cache: {
        lastUpdated: new Date(cacheTimestamp).toISOString(),
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 