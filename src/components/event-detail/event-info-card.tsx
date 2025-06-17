import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, DollarSign, TrendingUp, Info, ExternalLink } from 'lucide-react'
import { Event } from '@/lib/stores'
import { format } from 'date-fns'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface EventInfoCardProps {
  event: Event
}

const formatVolume = (volume: number | undefined | null): string => {
  // Handle undefined, null, or invalid values - show "None" for missing data
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
    return format(new Date(dateString), 'M/d/yyyy')
  } catch {
    return 'Invalid Date'
  }
}

export function EventInfoCard({ event }: EventInfoCardProps) {
  const polymarketUrl = `https://polymarket.com/event/${event.slug}`

  return (
    <Card>
      <CardContent className="pt-6">
        <Accordion type="single" collapsible className="w-full" defaultValue="details">
          <AccordionItem value="details">
            <AccordionTrigger className="text-base font-semibold text-left">
              <div className="flex items-center gap-2 flex-1">
                <span className="flex-1">{event.title}</span>
                {event.slug && (
                  <ExternalLink 
                    className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer flex-shrink-0" 
                    onClick={(e) => {
                      e.stopPropagation() // Prevent accordion toggle
                      window.open(polymarketUrl, '_blank')
                    }}
                  />
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Volume Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Volume (24h)
                  </div>
                  <div className="text-lg font-bold">${formatVolume(event.volume24hr)}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Volume (1w)
                  </div>
                  <div className="text-lg font-bold">${formatVolume(event.volume1wk)}</div>
                </div>
              </div>

              {/* Liquidity and Total Volume */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Liquidity
                  </div>
                  <div className="text-lg font-bold">${formatVolume(event.liquidity)}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Total Volume
                  </div>
                  <div className="text-lg font-bold">${formatVolume(event.volume)}</div>
                </div>
              </div>

              {/* End Date */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Start Date
                  </div>
                  <div className="font-medium text-sm">{formatDate(event.startDate)}</div>
                </div>
              </div>

              {/* End Date */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    End Date
                  </div>
                  <div className="font-medium text-sm">{formatDate(event.endDate)}</div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  )
} 