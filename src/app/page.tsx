'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navbar } from '@/components/ui/navbar'
import { Footer } from '@/components/ui/footer'
import { BottomNavigation } from '@/components/ui/bottom-navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, Clock, DollarSign, BarChart3, Activity, RefreshCw } from 'lucide-react'
import { Event } from '@/lib/stores'
import Link from 'next/link'
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// Interface for Trade API response
interface TradeApiResponse {
  hour_start: number
  trade_count: number
  total_volume: number
}

// Transform API data for chart
const transformTradeData = (apiData: TradeApiResponse[]) => {
  return apiData.map(item => ({
    hour: new Date(item.hour_start * 1000).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }),
    trades: item.trade_count
  }))
}

// Transform API data for volume chart
const transformVolumeData = (apiData: TradeApiResponse[]) => {
  return apiData.map(item => ({
    hour: new Date(item.hour_start * 1000).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }),
    volume: item.total_volume
  }))
}

// Format volume for display
const formatVolumeDisplay = (volume: number): string => {
  if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`
  if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`
  return `$${volume.toFixed(0)}`
}

const chartConfig = {
  trades: {
    label: "Trades",
    color: "var(--chart-1)",
  },
  volume: {
    label: "Volume",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

function TradeCountCard() {
  // Fetch trade data from API
  const { data: tradeData, isLoading, isError } = useQuery<TradeApiResponse[]>({
    queryKey: ['trade-stats'],
    queryFn: async () => {
      const response = await fetch('https://trade-analyze-production.up.railway.app/api/trade?hours=24')
      if (!response.ok) {
        throw new Error('Failed to fetch trade data')
      }
      return response.json()
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  const transformedData = tradeData ? transformTradeData(tradeData) : []
  const totalTrades = tradeData ? tradeData.reduce((sum, item) => sum + item.trade_count, 0) : 0
  
  return (
    <Card className="bg-card text-card-foreground rounded-xl border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          Last 24h Trade Count
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : isError ? 'Error loading data' : 'All Markets'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-3xl font-bold">
            {isLoading ? '--' : isError ? 'Error' : totalTrades.toLocaleString()}
          </div>
        </div>
        <div className="h-[120px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-sm text-muted-foreground">Failed to load chart</span>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={transformedData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => value.slice(0, 2)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[150px]"
                      labelFormatter={(value) => `${value}`}
                    />
                  }
                />
                <Bar dataKey="trades" fill="var(--color-trades)" />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TradingVolumeCard() {
  // Fetch trade data from API
  const { data: tradeData, isLoading, isError } = useQuery<TradeApiResponse[]>({
    queryKey: ['trade-stats'],
    queryFn: async () => {
      const response = await fetch('https://trade-analyze-production.up.railway.app/api/trade?hours=24')
      if (!response.ok) {
        throw new Error('Failed to fetch trade data')
      }
      return response.json()
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  })

  const transformedVolumeData = tradeData ? transformVolumeData(tradeData) : []
  const totalVolume = tradeData ? tradeData.reduce((sum, item) => sum + item.total_volume, 0) : 0
  
  return (
    <Card className="bg-card text-card-foreground rounded-xl border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5" />
          Last 24h Volume
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {isLoading ? 'Loading...' : isError ? 'Error loading data' : 'All Markets'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-3xl font-bold">
            {isLoading ? '--' : isError ? 'Error' : formatVolumeDisplay(totalVolume)}
          </div>
        </div>
        <div className="h-[120px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-sm text-muted-foreground">Failed to load chart</span>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={transformedVolumeData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => value.slice(0, 2)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[150px]"
                      labelFormatter={(value) => `${value}`}
                      formatter={(value) => [formatVolumeDisplay(Number(value)), "Volume"]}
                    />
                  }
                />
                <Bar dataKey="volume" fill="var(--color-volume)" />
              </BarChart>
            </ChartContainer>
          )}
        </div>
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
  priceChange: number | null
  endDate: string
}

// Market Card Component
function MarketCard({ market }: { market: MarketDisplay }) {
  const formatPrice = (price: number): string => {
    return price.toFixed(3)
  }
  
  const formatPriceChange = (change: number | null): string => {
    if (change === null) return '-'
    const sign = change >= 0 ? '+' : ''
    return `${sign}${(change * 100).toFixed(2)}%`
  }
  
  const getPriceChangeColor = (change: number | null): string => {
    if (change === null) return ''
    return change >= 0 ? 'text-price-positive' : 'text-price-negative'
  }
  
  return (
    <Link href={`/events/${market.eventSlug}?market=${market.conditionId}`} target="_blank" rel="noopener noreferrer">
      <div className="flex cursor-pointer items-center justify-between rounded-md p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
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
        <div className="flex items-center gap-6 text-sm ml-4 flex-shrink-0">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Yes</div>
            <div className="font-medium">{formatPrice(market.yesPrice)}</div>
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

  
  // Loading states for market tabs
  const [isLoading, setIsLoading] = useState({
    newest: true,
    volume: true,
    liquidity: true,
    endingSoon: true,
  })
  
  // Market data for tabs (cards now use mock data)
  const [marketData, setMarketData] = useState({
    newest: [] as MarketDisplay[],
    volume: [] as MarketDisplay[],
    liquidity: [] as MarketDisplay[],
    endingSoon: [] as MarketDisplay[],
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
            continue
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
            continue
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
            continue
          }
          
          selectedMarket = marketsWithStartDate.reduce((best: any, current: any) => 
            new Date(current.startDate) > new Date(best.startDate) ? current : best
          )
          break
          
        case 'endingSoon':
          // Filter markets that have endDate in the future (2 days ago threshold)
          const now = new Date()
          const twoDaysAgo = new Date(now);
          twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
          
          const marketsWithFutureEndDate = activeMarkets.filter((market: any) => {
            return market.endDate && new Date(market.endDate) > twoDaysAgo
          })
          
          if (marketsWithFutureEndDate.length === 0) {
            continue
          }
          
          selectedMarket = marketsWithFutureEndDate.reduce((best: any, current: any) => 
            new Date(current.endDate) < new Date(best.endDate) ? current : best
          )
          break
      }
      
      // Skip if no market selected
      if (!selectedMarket) {
        continue
      }
      
      // For non-newest markets, require oneDayPriceChange
      if (type !== 'newest' && selectedMarket.oneDayPriceChange === undefined) {
        continue
      }
      
      // Always require outcomePrices
      if (!selectedMarket.outcomePrices) {
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
          priceChange: type === 'newest' ? (selectedMarket.oneDayPriceChange ?? null) : selectedMarket.oneDayPriceChange,
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
      setIsLoading(prev => ({ ...prev, newest: true }))
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
        
        // 3. Process ALL filtered events to find 10 markets for tabs
        const markets = processMarketsFromEvents(filteredEvents, 'newest')
        setMarketData(prev => ({ ...prev, newest: markets }))
      } else {
        throw new Error(data.error || 'Failed to fetch newest events')
      }
    } catch (error) {
      console.error('Failed to load newest events:', error)
    } finally {
      setIsLoading(prev => ({ ...prev, newest: false }))
    }
  }

  const fetchTopVolume = async () => {
    try {
      setIsLoading(prev => ({ ...prev, volume: true }))
      const response = await fetch('/api/top-volume')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data.success) {
        // 1. Get all events from API (already sorted by volume24hr desc)
        const allEvents = data.data || []
        
        // 2. No tag filtering needed for volume tab
        setAllTopVolume(allEvents)
        
        // 3. Process ALL events to find 10 markets for tabs
        const markets = processMarketsFromEvents(allEvents, 'volume')
        setMarketData(prev => ({ ...prev, volume: markets }))
      } else {
        throw new Error(data.error || 'Failed to fetch top volume events')
      }
    } catch (error) {
      console.error('Failed to load top volume events:', error)
    } finally {
      setIsLoading(prev => ({ ...prev, volume: false }))
    }
  }

  const fetchEndingSoon = async () => {
    try {
      setIsLoading(prev => ({ ...prev, endingSoon: true }))
      const response = await fetch('/api/ending-soon')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data.success) {
        // 1. Get all events from API, already filtered for endDate > now
        const allEvents = data.data || []
        
        // 2. Filter events to exclude crypto tags (id="21" and id="100639")
        const filteredEvents = []
        for (const event of allEvents) {
          const eventTags = event.tags || []
          
          const hasExcludedTag = eventTags.some((tag: any) => 
            tag.id === "21" || tag.id === "100639"
          )
          
          if (!hasExcludedTag) {
            filteredEvents.push(event)
          }
        }
        
        setAllEndingSoon(filteredEvents)
        
        // 3. Process ALL filtered events to find 10 markets for tabs
        const markets = processMarketsFromEvents(filteredEvents, 'endingSoon')
        setMarketData(prev => ({ ...prev, endingSoon: markets }))
      } else {
        throw new Error(data.error || 'Failed to fetch ending soon events')
      }
    } catch (error) {
      console.error('Failed to load ending soon events:', error)
    } finally {
      setIsLoading(prev => ({ ...prev, endingSoon: false }))
    }
  }

  const fetchLiquidity = async () => {
    try {
      setIsLoading(prev => ({ ...prev, liquidity: true }))
      const response = await fetch('/api/top-liquidity')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data.success) {
        // 1. Get all events from API (already sorted by liquidity desc)
        const allEvents = data.data || []
        
        // 2. No tag filtering needed for liquidity tab
        setAllLiquidity(allEvents)
        
        // 3. Process ALL events to find 10 markets for tabs
        const markets = processMarketsFromEvents(allEvents, 'liquidity')
        setMarketData(prev => ({ ...prev, liquidity: markets }))
      } else {
        throw new Error(data.error || 'Failed to fetch liquidity events')
      }
    } catch (error) {
      console.error('Failed to load liquidity events:', error)
    } finally {
      setIsLoading(prev => ({ ...prev, liquidity: false }))
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
      
      <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* Cards Grid - Mobile: 2 cards side by side, Desktop: centered with margins */}
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-4">
          <div className="hidden sm:block sm:col-span-2"></div>
          <div className="col-span-1 sm:col-span-4">
            <TradeCountCard />
          </div>
          <div className="col-span-1 sm:col-span-4">
            <TradingVolumeCard />
          </div>
          <div className="hidden sm:block sm:col-span-2"></div>
        </div>
        
        {/* Market List with Tabs */}
        <div className="mt-8 max-w-[1200px] mx-auto">
          <Tabs defaultValue="volume" className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-transparent">
              <TabsTrigger value="recommend">Recommend (Soon)</TabsTrigger>
              <TabsTrigger value="newest">Newest</TabsTrigger>
              <TabsTrigger value="volume">24h Volume</TabsTrigger>
              <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
              <TabsTrigger value="endingSoon">Ending Soon</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recommend" className="mt-6">
              <div className="space-y-3">
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Personalized Recommendations</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    We're working on smart market recommendations based on your trading history and interests.
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-lg">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground font-medium">Coming Soon</span>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="newest" className="mt-6">
              <div className="space-y-3">
                {isLoading.newest ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading markets...</p>
                  </div>
                ) : marketData.newest.length === 0 ? (
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
                {isLoading.volume ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading markets...</p>
                  </div>
                ) : marketData.volume.length === 0 ? (
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
                {isLoading.liquidity ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading markets...</p>
                  </div>
                ) : marketData.liquidity.length === 0 ? (
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
                {isLoading.endingSoon ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading markets...</p>
                  </div>
                ) : marketData.endingSoon.length === 0 ? (
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
            <Button variant="outline" className="bg-muted/50 hover:bg-muted border-border/50">
              View All Markets
            </Button>
          </Link>
        </div>
      </div>
      
      <Footer />
      <BottomNavigation />
    </div>
  )
} 
