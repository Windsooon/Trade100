import { NextRequest, NextResponse } from 'next/server'
import { Event } from '@/lib/stores'

// Import the cache from the markets route
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Temporary import - we'll need to export these from the markets route
let eventsCache: Event[] = []
let cacheTimestamp = 0

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: eventSlug } = await params

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
        console.error('Failed to refresh cache:', error)
      }
    }

    // Find event by slug in the cached data
    const event = eventsCache.find(e => e.slug === eventSlug)
    
    if (!event) {
      return NextResponse.json(
        { error: `Event not found for slug: ${eventSlug}` },
        { status: 404 }
      )
    }

    return NextResponse.json(event)

  } catch (error) {
    console.error('[API] Error fetching event by slug:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch event data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 