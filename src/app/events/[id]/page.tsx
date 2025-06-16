import { Navbar } from '@/components/ui/navbar'
import { EventInfoCard } from '@/components/event-detail/event-info-card'
import { MarketListCard } from '@/components/event-detail/market-list-card'
import { TradingChartCard } from '@/components/event-detail/trading-chart-card'
import { TradingOperationsCard } from '@/components/event-detail/trading-operations-card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { AlertCircleIcon } from 'lucide-react'
import EventDetailClient from '@/components/event-detail/event-detail-client'
import { proxyFetch } from '@/lib/fetch'

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params
  let eventData: any = null
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
      eventData = await res.json()
    }
  } catch (e: any) {
    console.error('[SSR] Fetch error:', e)
    error = e?.message || 'Unknown error occurred while fetching event data.'
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

  const event = eventData

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-6 flex-1">
        <EventDetailClient event={event} />
      </div>
    </div>
  )
} 