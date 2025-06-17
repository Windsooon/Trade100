"use client"

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, ArrowUpRight } from 'lucide-react'
import { Event } from '@/lib/stores'
import { useRouter } from 'next/navigation'

interface TopVolumeCardProps {
  events: Event[]
}

type TimePeriod = '1D' | '1W' | '1M'

interface VolumeMarket {
  marketName: string
  eventId: string
  eventTitle: string
  yesPrice: number
  noPrice: number
  volume: number
}

interface Tag {
  id: string
  label: string
  slug: string
}

export function TopVolumeCard({ events }: TopVolumeCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1D')
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined)
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [tagsLoading, setTagsLoading] = useState(true)
  const router = useRouter()

  // Fetch tags from API
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setTagsLoading(true)
        const response = await fetch('/api/tags')
        const data = await response.json()
        if (data.success && data.tags) {
          setAvailableTags(data.tags)
        } else {
          setAvailableTags(data.tags || [])
        }
      } catch (error) {
        // Use basic fallback if everything fails
        setAvailableTags([
          { id: 'politics', label: 'Politics', slug: 'politics' },
          { id: 'sports', label: 'Sports', slug: 'sports' },
          { id: 'crypto', label: 'Crypto', slug: 'crypto' }
        ])
      } finally {
        setTagsLoading(false)
      }
    }

    fetchTags()
  }, [])

  const topVolumeMarkets = useMemo(() => {
    const allMarkets: VolumeMarket[] = []

    // Filter events by selected tag first, if any
    const filteredEvents = selectedTag
      ? events.filter(event => 
          event.tags?.some(tag => tag.label === selectedTag)
        )
      : events

    // Collect all active markets from filtered events
    filteredEvents.forEach(event => {
      if (!event.markets) return

      event.markets.forEach(market => {
        // Only include active markets
        if (market.active !== true || market.archived === true || market.closed === true) {
          return
        }

        // Get volume based on selected period
        let volume: number | undefined
        switch (selectedPeriod) {
          case '1D':
            volume = market.volume24hr
            break
          case '1W':
            volume = market.volume1wk
            break
          case '1M':
            volume = market.volume1mo
            break
        }

        // Skip if no volume data or volume is 0
        if (typeof volume !== 'number' || volume <= 0) return

        // Get current prices
        const yesPrice = market.outcomePrices?.[0] ? parseFloat(market.outcomePrices[0]) : 0
        const noPrice = market.outcomePrices?.[1] ? parseFloat(market.outcomePrices[1]) : 0

        // Skip if invalid prices
        if (isNaN(yesPrice) || isNaN(noPrice)) return

        allMarkets.push({
          marketName: market.question,
          eventId: event.id,
          eventTitle: event.title,
          yesPrice,
          noPrice,
          volume
        })
      })
    })

    // Sort by volume (highest first) and take top 30
    return allMarkets
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 30)
  }, [events, selectedPeriod, selectedTag])

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(0)}K`
    } else {
      return `$${volume.toFixed(0)}`
    }
  }

  const formatPrice = (price: number): string => {
    return `$${price.toFixed(3)}`
  }

  const handleMarketClick = (eventId: string) => {
    router.push(`/events/${eventId}`)
  }

  const handleTagChange = (value: string) => {
    setSelectedTag(value === 'all' ? undefined : value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Top Volume Markets
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
            {topVolumeMarkets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {selectedTag
                    ? `No markets found for selected tag "${selectedTag}"`
                    : "No volume data available for this period"
                  }
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[240px]">
                <div className="space-y-3 pr-4">
                  {topVolumeMarkets.map((market, index) => (
                    <div
                      key={`${market.eventId}-${market.marketName}-${index}`}
                      className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleMarketClick(market.eventId)}
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground mt-0.5 flex-shrink-0">
                            #{index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm leading-tight line-clamp-2">
                              {market.marketName}
                            </h4>
                          </div>
                          <ArrowUpRight className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {market.eventTitle}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="text-xs">
                            <span className="text-muted-foreground">YES:</span>
                            <span className="ml-1 font-medium">{formatPrice(market.yesPrice)}</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-muted-foreground">NO:</span>
                            <span className="ml-1 font-medium">{formatPrice(market.noPrice)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {formatVolume(market.volume)}
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