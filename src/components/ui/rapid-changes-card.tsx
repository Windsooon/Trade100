"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Event, Market, getMarketDisplayTitle } from '@/lib/stores'
import { useRouter } from 'next/navigation'

interface RapidChangesCardProps {
  events: Event[]
  availableTags: Tag[]
  tagsLoading: boolean
}

type TimePeriod = '1H' | '1D' | '1W' | '1M'

interface MarketChange {
  marketName: string
  eventId: string
  eventSlug: string
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
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1H')
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
          case '1H':
            priceChange = market.oneHourPriceChange
            break
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
          eventSlug: event.slug,
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

  const handleMarketClick = (eventSlug: string, conditionId: string) => {
    window.open(`/events/${eventSlug}?market=${conditionId}`, '_blank')
  }

  const handleTagChange = (value: string) => {
    setSelectedTag(value === 'all' ? undefined : value)
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Changes Markets
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
            <Select value={selectedTag || 'all'} onValueChange={handleTagChange} disabled={tagsLoading}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder={tagsLoading ? "Loading..." : "All tags"} />
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
            <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as TimePeriod)}>
              <SelectTrigger className="w-full sm:w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1H">1H</SelectItem>
                <SelectItem value="1D">1D</SelectItem>
                <SelectItem value="1W">1W</SelectItem>
                <SelectItem value="1M">1M</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {topChanges.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm px-4">
              {selectedTag
                ? `No markets found for selected tag "${selectedTag}"`
                : "No price change data available for this period"
              }
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[240px] w-full">
            <div className="space-y-3 pr-4 w-full">
              {topChanges.map((change, index) => (
                <div
                  key={`${change.eventId}-${change.marketName}-${index}`}
                  className="flex flex-col gap-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors sm:flex-row sm:items-start sm:justify-between w-full max-w-full"
                  onClick={() => handleMarketClick(change.eventSlug, change.conditionId)}
                >
                  <div className="flex-1 min-w-0 max-w-[18rem] overflow-hidden">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground mt-0.5 flex-shrink-0">
                        #{index + 1}
                      </span>
                      <div className="flex-1 min-w-0 max-w-[18rem] overflow-hidden">
                        <h4 className="font-medium text-sm leading-tight line-clamp-2 break-words">
                          {change.marketName}
                        </h4>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-2 sm:mb-0 max-w-[18rem]">
                      {change.eventTitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs max-w-full">
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-muted-foreground">YES:</span>
                        <span className="font-medium">{formatPrice(change.yesPrice)}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-muted-foreground">NO:</span>
                        <span className="font-medium">{formatPrice(change.noPrice)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end sm:flex-col sm:items-end sm:gap-1 sm:flex-shrink-0">
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
      </CardContent>
    </Card>
  )
} 