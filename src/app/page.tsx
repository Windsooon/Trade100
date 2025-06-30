'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/ui/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RefreshCw, TrendingUp, Clock, DollarSign, Flame } from 'lucide-react'
import { Event } from '@/lib/stores'
import Link from 'next/link'

interface HomeCardProps {
  title: string
  icon: React.ReactNode
  events: Event[]
  loading: boolean
  error: string | null
}

function HomeCard({ title, icon, events, loading, error }: HomeCardProps) {
  return (
    <Card className="bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm">
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No events available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <Link key={event.id} href={`/events/${event.slug}`} target="_blank" rel="noopener noreferrer">
                <div className="flex cursor-pointer items-stretch justify-between rounded-md p-2 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {/* Event Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {event.icon ? (
                        <img
                          src={event.icon}
                          alt={`${event.title} icon`}
                          className="w-4 h-4 rounded-full"
                          onError={(e) => {
                            // Hide image if it fails to load
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-muted flex-shrink-0" />
                      )}
                    </div>
                    
                    {/* Event Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">{event.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Vol: {formatVolume(event.volume24hr)}</span>
                        <span>Liq: {formatVolume(event.liquidity)}</span>
                        <span>Ends: {formatDate(event.endDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Market display interface
interface MarketDisplay {
  marketId: string
  question: string  
  conditionId: string
  eventSlug: string
  icon: string
  yesPrice: number
  noPrice: number  
  priceChange: number
  endDate: string
}

// Market Card Component
function MarketCard({ market }: { market: MarketDisplay }) {
  const formatPrice = (price: number): string => {
    return price.toFixed(3)
  }
  
  const formatPriceChange = (change: number): string => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${(change * 100).toFixed(2)}%`
  }
  
  const getPriceChangeColor = (change: number): string => {
    return change >= 0 ? 'text-price-positive' : 'text-price-negative'
  }
  
  return (
    <Link href={`/events/${market.eventSlug}?market=${market.conditionId}`} target="_blank" rel="noopener noreferrer">
      <div className="flex cursor-pointer items-center justify-between rounded-md p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3 w-96">
          {/* Market Icon */}
          <div className="flex-shrink-0">
            {market.icon ? (
              <img
                src={market.icon}
                alt={`${market.question} icon`}
                className="w-6 h-6 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-muted flex-shrink-0" />
            )}
          </div>
          
          {/* Market Question */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">{market.question}</h3>
            <div className="text-xs text-muted-foreground">
              Ends: {formatDate(market.endDate)}
            </div>
          </div>
        </div>
        
        {/* Prices and Change */}
        <div className="flex items-center gap-6 text-sm">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Yes</div>
            <div className="font-medium">{formatPrice(market.yesPrice)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">No</div>
            <div className="font-medium">{formatPrice(market.noPrice)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">24h</div>
            <div className={`font-medium ${getPriceChangeColor(market.priceChange)}`}>
              {formatPriceChange(market.priceChange)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// Helper functions
const formatVolume = (volume: number | undefined): string => {
  if (typeof volume !== 'number' || volume === 0) return 'N/A'
  if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`
  if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`
  return `$${volume.toFixed(0)}`
}

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = date.getTime() - now.getTime()
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInDays < 1) return 'Today'
    if (diffInDays === 1) return '1 day'
    if (diffInDays < 7) return `${diffInDays} days`
    if (diffInDays < 30) return `${Math.ceil(diffInDays / 7)} weeks`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return 'Invalid date'
  }
}

export default function HomePage() {
  // Store full event data for both cards and market processing
  const [allNewest, setAllNewest] = useState<any[]>([])
  const [allTopVolume, setAllTopVolume] = useState<any[]>([])
  const [allEndingSoon, setAllEndingSoon] = useState<any[]>([])
  const [allLiquidity, setAllLiquidity] = useState<any[]>([])
  
  // Display data for cards (top 3)
  const [newest, setNewest] = useState<Event[]>([])
  const [topVolume, setTopVolume] = useState<Event[]>([])
  const [endingSoon, setEndingSoon] = useState<Event[]>([])
  const [liquidity, setLiquidity] = useState<Event[]>([])
  
  // Market data for tabs
  const [marketData, setMarketData] = useState({
    newest: [] as MarketDisplay[],
    volume: [] as MarketDisplay[],
    liquidity: [] as MarketDisplay[],
    endingSoon: [] as MarketDisplay[],
  })
  
  const [loading, setLoading] = useState({
    newest: true,
    topVolume: true,
    endingSoon: true,
    liquidity: true,
  })
  
  const [errors, setErrors] = useState({
    newest: null as string | null,
    topVolume: null as string | null,
    endingSoon: null as string | null,
    liquidity: null as string | null,
  })

  useEffect(() => {
    // Fetch all data in parallel
    Promise.all([
      fetchNewest(),
      fetchTopVolume(),
      fetchEndingSoon(),
      fetchLiquidity(),
    ])
  }, [])

  // Market processing functions
  const processMarketsFromEvents = (events: any[], type: 'newest' | 'volume' | 'liquidity' | 'endingSoon'): MarketDisplay[] => {
    const markets: MarketDisplay[] = []
    
    for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
      const event = events[eventIndex]
      
      if (!event.markets || event.markets.length === 0) {
        continue
      }
      
      // Filter active markets
      const activeMarkets = event.markets.filter((market: any) => 
        market.active === true && market.archived === false && market.closed === false
      )
      
      if (activeMarkets.length === 0) {
        continue
      }
      
      // Select best market based on type with proper fallback handling
      let selectedMarket: any = null
      
      switch (type) {
        case 'volume':
          // Filter markets that have volume24hr data
          const marketsWithVolume = activeMarkets.filter((market: any) => 
            market.volume24hr !== undefined && market.volume24hr !== null && market.volume24hr > 0
          )
          if (marketsWithVolume.length === 0) {
            continue // Skip event if no volume data
          }
          
          selectedMarket = marketsWithVolume.reduce((best: any, current: any) => 
            current.volume24hr > best.volume24hr ? current : best
          )
          break
          
        case 'liquidity':
          // Filter markets that have liquidity data
          const marketsWithLiquidity = activeMarkets.filter((market: any) => {
            const liquidity = market.liquidityNum || market.liquidity || 0
            return liquidity > 0
          })
          if (marketsWithLiquidity.length === 0) {
            continue // Skip event if no liquidity data
          }
          
          selectedMarket = marketsWithLiquidity.reduce((best: any, current: any) => {
            const currentLiquidity = current.liquidityNum || current.liquidity || 0
            const bestLiquidity = best.liquidityNum || best.liquidity || 0
            return currentLiquidity > bestLiquidity ? current : best
          })
          break
          
        case 'newest':
          // Filter markets that have startDate data
          const marketsWithStartDate = activeMarkets.filter((market: any) => 
            market.startDate
          )
          if (marketsWithStartDate.length === 0) {
            continue // Skip event if no startDate data
          }
          
          selectedMarket = marketsWithStartDate.reduce((best: any, current: any) => 
            new Date(current.startDate) > new Date(best.startDate) ? current : best
          )
          break
          
        case 'endingSoon':
          // Filter markets that have endDate in the future
          const now = new Date()
          const yesterday = new Date(now);
          yesterday.setDate(yesterday.getDate() - 1);
          const marketsWithFutureEndDate = activeMarkets.filter((market: any) => 
            market.endDate && new Date(market.endDate) > yesterday
          )
          if (marketsWithFutureEndDate.length === 0) {
            continue // Skip event if no future endDate
          }
          
          selectedMarket = marketsWithFutureEndDate.reduce((best: any, current: any) => 
            new Date(current.endDate) < new Date(best.endDate) ? current : best
          )
          break
      }
      
      // Skip if no market selected or missing required data
      if (!selectedMarket || !selectedMarket.outcomePrices || selectedMarket.oneDayPriceChange === undefined) {
        continue
      }
      
      try {
        // Parse outcome prices
        const outcomePrices = JSON.parse(selectedMarket.outcomePrices)
        if (!Array.isArray(outcomePrices) || outcomePrices.length < 2) {
          continue
        }
        
        const marketDisplay: MarketDisplay = {
          marketId: selectedMarket.id || selectedMarket.conditionId,
          question: selectedMarket.question || event.title,
          conditionId: selectedMarket.conditionId,
          eventSlug: event.slug,
          icon: selectedMarket.icon || event.icon || '',
          yesPrice: parseFloat(outcomePrices[0]),
          noPrice: parseFloat(outcomePrices[1]),
          priceChange: selectedMarket.oneDayPriceChange,
          endDate: selectedMarket.endDate || event.endDate,
        }
        
        markets.push(marketDisplay)
        
        // Stop at 10 markets (one per event)
        if (markets.length >= 10) break
        
      } catch (error) {
        continue
      }
    }
    
    return markets
  }

  const fetchNewest = async () => {
    try {
      const response = await fetch('/api/newest')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data.success) {
        // 1. Get all events from API
        const allEvents = data.data || []
        
        // 2. Filter events to exclude crypto tags (id="21" and id="100639")
        const filteredEvents = []
        for (const event of allEvents) {
          const hasExcludedTag = event.tags && event.tags.some((tag: any) => 
            tag.id === "21" || tag.id === "100639"
          )
          
          if (!hasExcludedTag) {
            filteredEvents.push(event)
          }
        }
        setAllNewest(filteredEvents)
        
        // 3. Display top 3 events in cards (regardless of markets)
        const top3Events = filteredEvents.slice(0, 3)
        setNewest(transformApiEvents(top3Events))
        
        // 4. Process ALL filtered events to find 10 markets
        const markets = processMarketsFromEvents(filteredEvents, 'newest')
        setMarketData(prev => ({ ...prev, newest: markets }))
      } else {
        throw new Error(data.error || 'Failed to fetch newest events')
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, newest: 'Failed to load newest events' }))
    } finally {
      setLoading(prev => ({ ...prev, newest: false }))
    }
  }

  const fetchTopVolume = async () => {
    try {
      const response = await fetch('/api/top-volume')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data.success) {
        // 1. Get all events from API (already sorted by volume24hr desc)
        const allEvents = data.data || []
        
        // 2. No tag filtering needed for volume tab
        setAllTopVolume(allEvents)
        
        // 3. Display top 3 events in cards (regardless of markets)
        const top3Events = allEvents.slice(0, 3)
        setTopVolume(transformApiEvents(top3Events))
        
        // 4. Process ALL events to find 10 markets
        const markets = processMarketsFromEvents(allEvents, 'volume')
        setMarketData(prev => ({ ...prev, volume: markets }))
      } else {
        throw new Error(data.error || 'Failed to fetch top volume events')
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, topVolume: 'Failed to load top volume events' }))
    } finally {
      setLoading(prev => ({ ...prev, topVolume: false }))
    }
  }

  const fetchEndingSoon = async () => {
    try {
      const response = await fetch('/api/ending-soon')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data.success) {
        // 1. Get all events from API, already filtered for endDate > now
        const allEvents = data.data || []
        
        // 2. Filter events to exclude crypto tags (id="21" and id="100639")
        const filteredEvents = []
        for (const event of allEvents) {
          const hasExcludedTag = event.tags && event.tags.some((tag: any) => 
            tag.id === "21" || tag.id === "100639"
          )
          
          if (!hasExcludedTag) {
            filteredEvents.push(event)
          }
        }
        setAllEndingSoon(filteredEvents)
        
        // 3. Display top 3 events in cards (regardless of markets)
        const top3Events = filteredEvents.slice(0, 3)
        setEndingSoon(transformApiEvents(top3Events))
        
        // 4. Process ALL filtered events to find 10 markets
        const markets = processMarketsFromEvents(filteredEvents, 'endingSoon')
        setMarketData(prev => ({ ...prev, endingSoon: markets }))
      } else {
        throw new Error(data.error || 'Failed to fetch ending soon events')
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, endingSoon: 'Failed to load ending soon events' }))
    } finally {
      setLoading(prev => ({ ...prev, endingSoon: false }))
    }
  }

  const fetchLiquidity = async () => {
    try {
      const response = await fetch('/api/top-liquidity')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data.success) {
        // 1. Get all events from API (already sorted by liquidity desc)
        const allEvents = data.data || []
        
        // 2. No tag filtering needed for liquidity tab
        setAllLiquidity(allEvents)
        
        // 3. Display top 3 events in cards (regardless of markets)
        const top3Events = allEvents.slice(0, 3)
        setLiquidity(transformApiEvents(top3Events))
        
        // 4. Process ALL events to find 10 markets
        const markets = processMarketsFromEvents(allEvents, 'liquidity')
        setMarketData(prev => ({ ...prev, liquidity: markets }))
      } else {
        throw new Error(data.error || 'Failed to fetch liquidity events')
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, liquidity: 'Failed to load liquidity events' }))
    } finally {
      setLoading(prev => ({ ...prev, liquidity: false }))
    }
  }

  const transformApiEvents = (apiEvents: any[]): Event[] => {
    return apiEvents.map((apiEvent: any) => ({
      id: apiEvent.id,
      title: apiEvent.title,
      slug: apiEvent.slug || apiEvent.id,
      startDate: apiEvent.startDate || new Date().toISOString(),
      endDate: apiEvent.endDate || new Date().toISOString(),
      volume: apiEvent.volume,
      volume24hr: apiEvent.volume24hr,
      volume1wk: apiEvent.volume1wk,
      volume1mo: apiEvent.volume1mo,
      liquidity: apiEvent.liquidity,
      markets: [], // Not needed for home page display
      tags: apiEvent.tags || [],
      negRisk: apiEvent.negRisk,
      icon: apiEvent.icon,
    }))
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6">
        
        {/* Cards Grid - 2x2 on mobile, 4 columns on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <HomeCard
            title="Newest"
            icon={<Flame className="h-5 w-5" />}
            events={newest}
            loading={loading.newest}
            error={errors.newest}
          />
          
          <HomeCard
            title="24h Volume"
            icon={<TrendingUp className="h-5 w-5" />}
            events={topVolume}
            loading={loading.topVolume}
            error={errors.topVolume}
          />

          <HomeCard
            title="Liquidity"
            icon={<DollarSign className="h-5 w-5" />}
            events={liquidity}
            loading={loading.liquidity}
            error={errors.liquidity}
          />

          <HomeCard
            title="Ending Soon"
            icon={<Clock className="h-5 w-5" />}
            events={endingSoon}
            loading={loading.endingSoon}
            error={errors.endingSoon}
          />
        </div>
        
        {/* Market List with Tabs */}
        <div className="mt-8 max-w-4xl mx-auto">
          <Tabs defaultValue="volume" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-transparent">
              <TabsTrigger value="newest">Newest</TabsTrigger>
              <TabsTrigger value="volume">24h Volume</TabsTrigger>
              <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
              <TabsTrigger value="endingSoon">Ending Soon</TabsTrigger>
            </TabsList>
            
            <TabsContent value="newest" className="mt-6">
              <div className="space-y-3">
                {marketData.newest.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No markets available</p>
                  </div>
                ) : (
                  marketData.newest.map((market) => (
                    <MarketCard key={market.conditionId} market={market} />
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="volume" className="mt-6">
              <div className="space-y-3">
                {marketData.volume.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No markets available</p>
                  </div>
                ) : (
                  marketData.volume.map((market) => (
                    <MarketCard key={market.conditionId} market={market} />
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="liquidity" className="mt-6">
              <div className="space-y-3">
                {marketData.liquidity.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No markets available</p>
                  </div>
                ) : (
                  marketData.liquidity.map((market) => (
                    <MarketCard key={market.conditionId} market={market} />
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="endingSoon" className="mt-6">
              <div className="space-y-3">
                {marketData.endingSoon.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No markets available</p>
                  </div>
                ) : (
                  marketData.endingSoon.map((market) => (
                    <MarketCard key={market.conditionId} market={market} />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
                    
        {/* View All Markets Button */}
        <div className="mt-8 text-center">
          <Link href="/markets">
            <Button size="lg" className="cursor-pointer px-8">
              View All Markets
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
} 