import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DollarSign, TrendingUp } from 'lucide-react'
import { Event, Market } from '@/lib/stores'
import { useRouter } from 'next/navigation'

interface ArbitrageCardProps {
  events: Event[]
  availableTags: Tag[]
  tagsLoading: boolean
}

interface Tag {
  id: string
  label: string
  slug: string
}

interface ArbitrageOpportunity {
  eventId: string
  eventSlug: string
  eventTitle: string
  markets: Market[]
  askSum: number
  profitPotential: number
  marketCount: number
}

export function ArbitrageCard({ events, availableTags, tagsLoading }: ArbitrageCardProps) {
  const router = useRouter()

  // Calculate arbitrage opportunities
  const arbitrageOpportunities = useMemo(() => {
    const opportunities: ArbitrageOpportunity[] = []

    events.forEach(event => {
      // Step 1: Initial Event Filtering
      if (!event.markets || event.markets.length < 2 || event.negRisk !== true) return

      // Step 2: Market Validation Filter
      const validMarkets = event.markets.filter(market => 
        market.active === true && 
        market.archived === false && 
        market.bestAsk && 
        parseFloat(market.bestAsk) > 0 &&
        market.outcomePrices && 
        market.outcomePrices.length >= 2
      )

      if (validMarkets.length < 2) return

      // Step 3: Skip grouping by resolution date - calculate across ALL markets in event

      // Step 4: Arbitrage Calculation
      let runningSum = 0
      const askSum = validMarkets.reduce((sum, market, index) => {
        const askPrice = parseFloat(market.bestAsk || '0')
        runningSum += askPrice
        return sum + askPrice
      }, 0)

      // Only include if sum < 1 (arbitrage opportunity exists)
      if (askSum < 1) {
        // Step 5: Opportunity Creation
        opportunities.push({
          eventId: event.id,
          eventSlug: event.slug,
          eventTitle: event.title,
          markets: validMarkets,
          askSum,
          profitPotential: 1 - askSum,
          marketCount: validMarkets.length
        })
      }
    })

    // Sort by profit potential (highest first) and limit to top 50
    return opportunities
      .sort((a, b) => b.profitPotential - a.profitPotential)
      .slice(0, 50)
  }, [events])

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`
  }

  const formatPrice = (price: number): string => {
    return price.toFixed(3)
  }

  const handleEventClick = (eventSlug: string) => {
    window.open(`/events/${eventSlug}`, '_blank')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Arbitrage Events
          </CardTitle>
          {/* Empty space to match other cards' header structure */}
          <div></div>
        </div>
      </CardHeader>
      <CardContent>
        {arbitrageOpportunities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No arbitrage opportunities found</p>
          </div>
        ) : (
          <ScrollArea className="h-[240px]">
            <div className="space-y-3 pr-4">
              {arbitrageOpportunities.map((opportunity, index) => (
                <div
                  key={opportunity.eventId}
                  className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleEventClick(opportunity.eventSlug)}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground mt-0.5 flex-shrink-0">
                        #{index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm leading-tight line-clamp-2">
                          {opportunity.eventTitle}
                        </h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Sum:</span>
                        <span className="ml-1 font-medium">{formatPrice(opportunity.askSum)}</span>
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">Markets:</span>
                        <span className="ml-1 font-medium">{opportunity.marketCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge
                      variant="default"
                      className="text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      {formatPercentage(opportunity.profitPotential)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
} 