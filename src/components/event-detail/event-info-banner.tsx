import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, DollarSign, TrendingUp, ExternalLink } from 'lucide-react'
import { Event } from '@/lib/stores'
import { format } from 'date-fns'

interface EventInfoBannerProps {
  event: Event
}

const formatVolume = (volume: number | undefined | null): string => {
  if (volume === undefined || volume === null || isNaN(volume)) {
    return 'None'
  }
  
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(2)}M`
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(2)}K`
  }
  return `${volume.toFixed(2)}`
}

const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'MMM d, yyyy')
  } catch {
    return 'Invalid Date'
  }
}

export function EventInfoBanner({ event }: EventInfoBannerProps) {
  const polymarketUrl = `https://polymarket.com/event/${event.slug}`

  return (
    <Card>
      <CardContent className="px-4 py-2">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Event Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{event.title}</h1>
            {event.slug && (
              <div
                className="h-5 w-5 text-muted-foreground hover:text-foreground cursor-pointer flex-shrink-0"
                onClick={() => window.open(polymarketUrl, '_blank')}
                title="View on Polymarket"
              >
                <ExternalLink className="h-5 w-5" />
              </div>
            )}
          </div>

          {/* Right: Key Metrics */}
          <div className="flex items-center gap-6 flex-shrink-0">
            {/* Volume 24h */}
            <div className="text-center">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" />
                Volume (24h)
              </div>
              <div className="font-bold text-sm">${formatVolume(event.volume24hr)}</div>
            </div>

            {/* Volume 1w */}
            <div className="text-center">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" />
                Volume (1w)
              </div>
              <div className="font-bold text-sm">${formatVolume(event.volume1wk)}</div>
            </div>

            {/* Liquidity */}
            <div className="text-center">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" />
                Liquidity
              </div>
              <div className="font-bold text-sm">${formatVolume(event.liquidity)}</div>
            </div>

            {/* End Date */}
            <div className="text-center">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" />
                End Date
              </div>
              <div className="font-bold text-sm">{formatDate(event.endDate)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 