import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DollarSign } from 'lucide-react'
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
        console.log(`\n📊 ARBITRAGE FOUND: ${event.title} (ID: ${event.id})`)
        console.log(`   Valid markets: ${validMarkets.length}`)
        
        // Log each market's details
        let detailedRunningSum = 0
        validMarkets.forEach((market, index) => {
          const askPrice = parseFloat(market.bestAsk || '0')
          detailedRunningSum += askPrice
          console.log(`   Market ${index + 1}: "${market.question.substring(0, 50)}..." | bestAsk: ${askPrice} | Running Sum: ${detailedRunningSum.toFixed(4)}`)
        })
        
        console.log(`   Final askSum: ${askSum.toFixed(4)} | Profit: ${((1 - askSum) * 100).toFixed(2)}%`)
        console.log(`   🎯 Adding to arbitrage opportunities!`)
        
        // Step 5: Opportunity Creation
        opportunities.push({
          eventId: event.id,
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

  const handleEventClick = (eventId: string) => {
    window.open(`/events/${eventId}`, '_blank')
  }

  return (
    <Card className="bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4" />
          Top Arbitrage Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-3">
            {arbitrageOpportunities.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No arbitrage events found
              </div>
            ) : (
              arbitrageOpportunities.map((opportunity) => (
                <div
                  key={opportunity.eventId}
                  className="p-3 border rounded cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50"
                  onClick={() => handleEventClick(opportunity.eventId)}
                >
                  {/* Event title */}
                  <div className="text-sm font-medium leading-tight mb-2 line-clamp-2">
                    {opportunity.eventTitle}
                  </div>
                  
                  {/* Arbitrage metrics */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Sum:</span>
                        <span className="font-medium">
                          {formatPrice(opportunity.askSum)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Markets:</span>
                        <span className="font-medium">
                          {opportunity.marketCount}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="default"
                      className="text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      {formatPercentage(opportunity.profitPotential)}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
} 