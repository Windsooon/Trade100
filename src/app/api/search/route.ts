import { NextRequest, NextResponse } from 'next/server';
import { proxyFetch } from '@/lib/fetch';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const eventsStatus = searchParams.get('events_status') || 'active';
    
    if (!query || query.trim() === '') {
      return NextResponse.json({ events: [], tags: [], hasMore: false });
    }

    // Construct the Polymarket API URL
    const polymarketUrl = new URL('https://polymarket.com/api/events/global');
    polymarketUrl.searchParams.set('q', query.trim());
    polymarketUrl.searchParams.set('events_status', eventsStatus);

    const response = await proxyFetch(polymarketUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Polymarket API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Return the full response from Polymarket API
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search events', events: [], tags: [], hasMore: false },
      { status: 500 }
    );
  }
} 