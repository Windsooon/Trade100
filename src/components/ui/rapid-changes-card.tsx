"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react'
import { Event, Market, getMarketDisplayTitle } from '@/lib/stores'
import { useRouter } from 'next/navigation'

interface RapidChangesCardProps {
  events: Event[]
  availableTags: Tag[]
  tagsLoading: boolean
}

type TimePeriod = '1D' | '1W' | '1M'

interface MarketChange {
  marketName: string
  eventId: string
  eventTitle: string
  yesPrice: number
  noPrice: number
  priceChange: number
  absPriceChange: number
  conditionId: string
}

interface Tag {
  id: string
  label: string
  slug: string
}

export function RapidChangesCard({ events, availableTags, tagsLoading }: RapidChangesCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1D')
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined)
  const router = useRouter()

  const topChanges = useMemo(() => {
    const allMarkets: MarketChange[] = []

    // Filter events by selected tag first, if any
    const filteredEvents = selectedTag
      ? events.filter(event => {
          const hasTag = event.tags?.some(tag => tag.label === selectedTag)
          return hasTag
        })
      : events

    // Collect all active markets from filtered events
    filteredEvents.forEach(event => {
      if (!event.markets) return

      event.markets.forEach(market => {
        // Only include active markets
        if (market.active !== true || market.archived === true || market.closed === true) {
          return
        }

        // Get price change based on selected period
        let priceChange: number | undefined
        switch (selectedPeriod) {
          case '1D':
            priceChange = market.oneDayPriceChange
            break
          case '1W':
            priceChange = market.oneWeekPriceChange
            break
          case '1M':
            priceChange = market.oneMonthPriceChange
            break
        }

        // Skip if no price change data
        if (typeof priceChange !== 'number') return

        // Get current prices
        const yesPrice = market.outcomePrices?.[0] ? parseFloat(market.outcomePrices[0]) : 0
        const noPrice = market.outcomePrices?.[1] ? parseFloat(market.outcomePrices[1]) : 0

        // Skip if invalid prices
        if (isNaN(yesPrice) || isNaN(noPrice)) return

        allMarkets.push({
          marketName: getMarketDisplayTitle(market),
          eventId: event.id,
          eventTitle: event.title,
          yesPrice,
          noPrice,
          priceChange,
          absPriceChange: Math.abs(priceChange),
          conditionId: market.conditionId
        })
      })
    })

    // Sort by absolute price change (biggest changes first) and take top 30
    return allMarkets
      .sort((a, b) => b.absPriceChange - a.absPriceChange)
      .slice(0, 30)
  }, [events, selectedPeriod, selectedTag])

  const formatPercentage = (change: number): string => {
    const percentage = (change * 100).toFixed(1)
    return `${change >= 0 ? '+' : ''}${percentage}%`
  }

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(3)}`
  }

  const handleMarketClick = (eventId: string, conditionId: string) => {
    window.open(`/events/${eventId}?market=${conditionId}`, '_blank')
  }

  const handleTagChange = (value: string) => {
    setSelectedTag(value === 'all' ? undefined : value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Top Changes Markets
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as TimePeriod)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="1D">1D</TabsTrigger>
            <TabsTrigger value="1W">1W</TabsTrigger>
            <TabsTrigger value="1M">1M</TabsTrigger>
          </TabsList>

          {/* Tag Filter */}
          <div className="mt-4 mb-4">
            <Select value={selectedTag || 'all'} onValueChange={handleTagChange} disabled={tagsLoading}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={tagsLoading ? "Loading tags..." : "Filter by tag"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {availableTags.map(tag => (
                  <SelectItem key={tag.id} value={tag.label}>
                    {tag.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value={selectedPeriod} className="mt-0">
            {topChanges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {selectedTag
                    ? `No markets found for selected tag "${selectedTag}"`
                    : "No price change data available for this period"
                  }
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[240px]">
                <div className="space-y-3 pr-4">
                  {topChanges.map((change, index) => (
                    <div
                      key={`${change.eventId}-${change.marketName}-${index}`}
                      className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleMarketClick(change.eventId, change.conditionId)}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground mt-0.5 flex-shrink-0">
                            #{index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm leading-tight line-clamp-2">
                              {change.marketName}
                            </h4>
                          </div>
                          <ArrowUpRight className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {change.eventTitle}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="text-xs">
                            <span className="text-muted-foreground">YES:</span>
                            <span className="ml-1 font-medium">{formatPrice(change.yesPrice)}</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">NO:</span>
                            <span className="ml-1 font-medium">{formatPrice(change.noPrice)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge
                          variant={change.priceChange >= 0 ? "default" : "destructive"}
                          className={`text-xs ${
                            change.priceChange >= 0 
                              ? "bg-green-600 hover:bg-green-700 text-white" 
                              : "bg-red-600 hover:bg-red-700 text-white"
                          }`}
                        >
                          {change.priceChange >= 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {formatPercentage(change.priceChange)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 