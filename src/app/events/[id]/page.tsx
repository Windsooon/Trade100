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
    volume: rawEvent.volume || 0,
    volume24hr: rawEvent.volume24hr || 0,
    volume1wk: rawEvent.volume1wk || 0,
    volume1mo: rawEvent.volume1mo || 0,
    liquidity: rawEvent.liquidity || 0,
    markets: rawEvent.markets?.map((market: any) => ({
      question: market.question || '',
      conditionId: market.conditionId || '',
      bestBid: market.bestBid,
      bestAsk: market.bestAsk,
      outcomePrices: Array.isArray(market.outcomePrices) ? market.outcomePrices : [],
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
    })) || [],
    tags: rawEvent.tags?.map((tag: any) => ({
      id: tag.id || '',
      label: tag.label || tag.name || ''
    })) || []
  }
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
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
        <EventDetailClient event={eventData} />
      </div>
    </div>
  )
} 