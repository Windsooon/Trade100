import { Navbar } from '@/components/ui/navbar'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertCircleIcon } from 'lucide-react'
import EventDetailClient from '@/components/event-detail/event-detail-client'
import { proxyFetch } from '@/lib/fetch'
import { Event } from '@/lib/stores'

interface RawEventData {
  id: string
  title: string
  slug?: string
  startDate: string
  endDate: string
  volume?: number
  volume24hr?: number
  volume1wk?: number
  volume1mo?: number
  liquidity?: number
  markets?: any[]
  tags?: any[]
  // Add other properties as needed
  [key: string]: unknown
}

// Transform raw API event data to match our Event interface
function transformEventData(rawEvent: RawEventData): Event {
  return {
    id: rawEvent.id,
    title: rawEvent.title,
    slug: rawEvent.slug || '',
    startDate: rawEvent.startDate,
    endDate: rawEvent.endDate,
    // Only set volume fields if they exist and are valid numbers, otherwise leave undefined
    volume: (typeof rawEvent.volume === 'number' && rawEvent.volume > 0) ? rawEvent.volume : undefined,
    volume24hr: (typeof rawEvent.volume24hr === 'number' && rawEvent.volume24hr > 0) ? rawEvent.volume24hr : undefined,
    volume1wk: (typeof rawEvent.volume1wk === 'number' && rawEvent.volume1wk > 0) ? rawEvent.volume1wk : undefined,
    volume1mo: (typeof rawEvent.volume1mo === 'number' && rawEvent.volume1mo > 0) ? rawEvent.volume1mo : undefined,
    liquidity: (typeof rawEvent.liquidity === 'number' && rawEvent.liquidity > 0) ? rawEvent.liquidity : undefined,
    markets: rawEvent.markets?.map((market: any) => {
      let parsedOutcomePrices: string[] = []
      try {
        if (typeof market.outcomePrices === 'string') {
          parsedOutcomePrices = JSON.parse(market.outcomePrices)
        } else if (Array.isArray(market.outcomePrices)) {
          parsedOutcomePrices = market.outcomePrices
        }
      } catch (e) {
        console.error(`Failed to parse outcomePrices for market "${market.question}"`, e)
      }

      return {
        question: market.question || '',
        conditionId: market.conditionId || '',
        bestBid: market.bestBid,
        bestAsk: market.bestAsk,
        outcomePrices: parsedOutcomePrices,
        oneHourPriceChange: market.oneHourPriceChange,
        oneDayPriceChange: market.oneDayPriceChange,
        oneWeekPriceChange: market.oneWeekPriceChange,
        oneMonthPriceChange: market.oneMonthPriceChange,
        volume24hr: market.volume24hr,
        volume1wk: market.volume1wk,
        volume1mo: market.volume1mo,
        active: market.active,
        archived: market.archived,
        closed: market.closed,
        clobTokenIds: market.clobTokenIds
      }
    }) || [],
    tags: rawEvent.tags?.map((tag: any) => ({
      id: tag.id || '',
      label: tag.label || tag.name || ''
    })) || []
  }
}

export default async function EventDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ market?: string }>
}) {
  const { id: eventId } = await params
  const { market: selectedMarketId } = await searchParams
  let eventData: Event | null = null
  let error: string | null = null

  try {
    // Use proxyFetch to handle proxy configuration properly
    const url = `https://gamma-api.polymarket.com/events/${eventId}`
    
    const res = await proxyFetch(url, { 
      headers: {
        'User-Agent': 'Polymarket Dashboard',
        'Accept': 'application/json',
      }
    })
    
    if (!res.ok) {
      error = `Polymarket API error: ${res.status} ${res.statusText}`
    } else {
      const rawEventData = await res.json() as RawEventData
      eventData = transformEventData(rawEventData)
    }
  } catch (e: unknown) {
    console.error('[SSR] Fetch error:', e)
    error = e instanceof Error ? e.message : 'Unknown error occurred while fetching event data.'
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Alert variant="destructive" className="max-w-xl w-full">
            <AlertCircleIcon className="h-5 w-5" />
            <AlertTitle>Unable to load event data</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-6 flex-1">
        <EventDetailClient event={eventData} selectedMarketId={selectedMarketId} />
      </div>
    </div>
  )
} 