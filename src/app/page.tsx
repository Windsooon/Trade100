'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navbar } from '@/components/ui/navbar'
import { Footer } from '@/components/ui/footer'
import { BottomNavigation } from '@/components/ui/bottom-navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { TrendingUp, Clock, DollarSign, BarChart3, Activity, RefreshCw, AlertCircle } from 'lucide-react'
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

// Interface for Recommend API response
interface RecommendApiResponse {
  success: boolean
  data: {
    whale_markets: Array<{
      market_id: string
      title: string
      icon: string
      whale_trades_count: number
      average_whale_value: string
      total_whale_volume: string
      unique_whale_traders: number
      event_slug: string
    }>
    popular_markets: Array<{
      market_id: string
      title: string
      icon: string
      total_trades: number
      total_volume: string
      unique_traders: number
      event_slug: string
    }>
    high_probability_markets: Array<{
      market_id: string
      title: string
      icon: string
      trade_count: number
      total_volume: string
      price_range: string
      event_slug: string
    }>
  }
  meta: {
    hour_range: number
    generated_at: string
  }
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

// Skeleton component for cards
function CardSkeleton() {
  return (
    <Card className="bg-card text-card-foreground rounded-xl border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-[140px]" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-[80px]" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Skeleton className="h-9 w-[120px]" />
        </div>
        <div className="h-[120px]">
          <Skeleton className="h-full w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton component for market list
function MarketCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-md p-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Market Icon */}
        <div className="flex-shrink-0">
          <Skeleton className="w-6 h-6 rounded-full" />
        </div>
        
        {/* Market Question */}
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-[250px]" />
        </div>
      </div>
      
      {/* Prices and Change - Desktop Layout */}
      <div className="hidden md:flex items-center gap-4 text-sm ml-4 flex-shrink-0">
        <div className="w-16 text-left space-y-1">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="w-20 text-center space-y-1">
          <Skeleton className="h-3 w-6 mx-auto" />
          <Skeleton className="h-4 w-12 mx-auto" />
        </div>
      </div>
      
      {/* Mobile Layout */}
      <div className="flex md:hidden items-center gap-3 text-sm ml-4 flex-shrink-0">
        <div className="text-center space-y-1">
          <Skeleton className="h-3 w-6 mx-auto" />
          <Skeleton className="h-4 w-8 mx-auto" />
        </div>
        <div className="text-center space-y-1">
          <Skeleton className="h-3 w-6 mx-auto" />
          <Skeleton className="h-4 w-8 mx-auto" />
        </div>
      </div>
    </div>
  )
}

// Skeleton for multiple market cards
function MarketListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <MarketCardSkeleton key={index} />
      ))}
    </div>
  )
}

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
  
  if (isLoading) {
    return <CardSkeleton />
  }
  
  return (
    <Card className="bg-card text-card-foreground rounded-xl border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          Last 24h Trade Count
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {isError ? 'Error loading data' : 'All Markets'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-3xl font-bold">
            {isError ? 'Error' : totalTrades.toLocaleString()}
          </div>
        </div>
        <div className="h-[120px]">
          {isError ? (
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
  
  if (isLoading) {
    return <CardSkeleton />
  }
  
  return (
    <Card className="bg-card text-card-foreground rounded-xl border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5" />
          Last 24h Volume
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {isError ? 'Error loading data' : 'All Markets'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="text-3xl font-bold">
            {isError ? 'Error' : formatVolumeDisplay(totalVolume)}
          </div>
        </div>
        <div className="h-[120px]">
          {isError ? (
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
          </div>
        </div>
        
        {/* Prices and Change - Responsive Layout */}
        {/* Desktop Layout (md and up) */}
        <div className="hidden md:flex items-center gap-4 text-sm ml-4 flex-shrink-0">
          <div className="w-16 text-left">
            <div className="text-xs text-muted-foreground mb-1">Yes</div>
            <div className="font-medium">{formatPrice(market.yesPrice)}</div>
          </div>
          <div className="w-20 text-center">
            <div className="text-xs text-muted-foreground mb-1">24h</div>
            <div className={`font-medium ${getPriceChangeColor(market.priceChange)}`}>
              {formatPriceChange(market.priceChange)}
            </div>
          </div>
        </div>
        
        {/* Mobile Layout (below md) */}
        <div className="flex md:hidden items-center gap-3 text-sm ml-4 flex-shrink-0">
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

// Recommend Market Card Components
function PopularMarketCard({ market }: { market: any }) {
  const formatVolume = (volume: string): string => {
    const num = parseFloat(volume)
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`
    return `$${num.toFixed(0)}`
  }

  return (
    <Link href={`/events/${market.event_slug}?market=${market.market_id}`} target="_blank" rel="noopener noreferrer">
      <div className="flex cursor-pointer items-center justify-between rounded-md p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Market Icon */}
          <div className="flex-shrink-0">
            {market.icon ? (
              <img
                src={market.icon}
                alt={`${market.title} icon`}
                className="w-6 h-6 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-muted flex-shrink-0" />
            )}
          </div>
          
          {/* Market Title */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">{market.title}</h3>
          </div>
        </div>
        
        {/* Volume and Trade Count - Responsive Layout */}
        {/* Desktop Layout (md and up) */}
        <div className="hidden md:flex items-center gap-4 text-sm ml-4 flex-shrink-0">
          <div className="w-20 text-left">
            <div className="text-xs text-muted-foreground mb-1">Volume</div>
            <div className="font-medium">{formatVolume(market.total_volume)}</div>
          </div>
          <div className="w-20 text-center">
            <div className="text-xs text-muted-foreground mb-1">Traders</div>
            <div className="font-medium">{market.unique_traders}</div>
          </div>
        </div>
        
        {/* Mobile Layout (below md) */}
        <div className="flex md:hidden items-center gap-3 text-sm ml-4 flex-shrink-0">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Volume</div>
            <div className="font-medium">{formatVolume(market.total_volume)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Trades</div>
            <div className="font-medium">{market.total_trades}</div>
          </div>
        </div>
      </div>
    </Link>
  )
}

function WhaleMarketCard({ market }: { market: any }) {
  const formatVolume = (volume: string): string => {
    const num = parseFloat(volume)
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`
    return `$${num.toFixed(0)}`
  }

  return (
    <Link href={`/events/${market.event_slug}?market=${market.market_id}`} target="_blank" rel="noopener noreferrer">
      <div className="flex cursor-pointer items-center justify-between rounded-md p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Market Icon */}
          <div className="flex-shrink-0">
            {market.icon ? (
              <img
                src={market.icon}
                alt={`${market.title} icon`}
                className="w-6 h-6 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-muted flex-shrink-0" />
            )}
          </div>
          
          {/* Market Title */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">{market.title}</h3>
          </div>
        </div>
        
        {/* Whale Volume and Avg/Trades - Responsive Layout */}
        {/* Desktop Layout (md and up) */}
        <div className="hidden md:flex items-center gap-4 text-sm ml-4 flex-shrink-0">
          <div className="w-20 text-left">
            <div className="text-xs text-muted-foreground mb-1">Whale Vol</div>
            <div className="font-medium">{formatVolume(market.total_whale_volume)}</div>
          </div>
          <div className="w-20 text-center">
            <div className="text-xs text-muted-foreground mb-1">Avg/Trades</div>
            <div className="font-medium">
              <div className="text-xs leading-tight">{formatVolume(market.average_whale_value)} avg</div>
              <div className="text-xs leading-tight">{market.whale_trades_count} trades</div>
            </div>
          </div>
        </div>
        
        {/* Mobile Layout (below md) */}
        <div className="flex md:hidden items-center gap-3 text-sm ml-4 flex-shrink-0">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Whale Vol</div>
            <div className="font-medium">{formatVolume(market.total_whale_volume)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Avg/Trades</div>
            <div className="font-medium">
              <div className="text-xs leading-tight">{formatVolume(market.average_whale_value)} avg</div>
              <div className="text-xs leading-tight">{market.whale_trades_count} trades</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

function HighProbabilityMarketCard({ market }: { market: any }) {
  const formatVolume = (volume: string): string => {
    const num = parseFloat(volume)
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`
    return `$${num.toFixed(0)}`
  }

  const formatPriceRange = (priceRange: string): string => {
    // Return raw price range
    return priceRange
  }

  return (
    <Link href={`/events/${market.event_slug}?market=${market.market_id}`} target="_blank" rel="noopener noreferrer">
      <div className="flex cursor-pointer items-center justify-between rounded-md p-3 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Market Icon */}
          <div className="flex-shrink-0">
            {market.icon ? (
              <img
                src={market.icon}
                alt={`${market.title} icon`}
                className="w-6 h-6 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-muted flex-shrink-0" />
            )}
          </div>
          
          {/* Market Title */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate">{market.title}</h3>
          </div>
        </div>
        
        {/* Volume and Price Range - Responsive Layout */}
        {/* Desktop Layout (md and up) */}
        <div className="hidden md:flex items-center gap-4 text-sm ml-4 flex-shrink-0">
          <div className="w-20 text-left">
            <div className="text-xs text-muted-foreground mb-1">Volume</div>
            <div className="font-medium">{formatVolume(market.total_volume)}</div>
          </div>
          <div className="w-24 text-center">
            <div className="text-xs text-muted-foreground mb-1">Price Range</div>
            <div className="font-medium text-xs">{formatPriceRange(market.price_range)}</div>
          </div>
        </div>
        
        {/* Mobile Layout (below md) */}
        <div className="flex md:hidden items-center gap-3 text-sm ml-4 flex-shrink-0">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Volume</div>
            <div className="font-medium">{formatVolume(market.total_volume)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Range</div>
            <div className="font-medium text-xs">{formatPriceRange(market.price_range)}</div>
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

  
  // Tag navigation
  const [selectedTag, setSelectedTag] = useState('volume')
  
  // Recommend nested tabs
  const [selectedRecommendTab, setSelectedRecommendTab] = useState('popular')
  
  // Time filter for recommend tabs
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('1h')
  
  const RECOMMEND_TABS = [
    { id: 'popular', label: 'Popular' },
    { id: 'whale', label: 'Whale' },
    { id: 'highProbability', label: 'High Probability' }
  ]
  
  const TIME_FILTER_OPTIONS = [
    { id: '1h', label: '1h' },
    { id: '12h', label: '12h' },
    { id: '24h', label: '24h' }
  ]
  
  // Tag list for navigation
  const MARKET_TAGS = [
    { id: 'recommend', label: 'Recommend' },
    { id: 'newest', label: 'Newest' },
    { id: 'volume', label: '24h Volume' },
    { id: 'liquidity', label: 'Liquidity' },
    { id: 'endingSoon', label: 'Ending Soon' }
  ]
  
  // Loading states for market tabs
  const [isLoading, setIsLoading] = useState({
    newest: true,
    volume: true,
    liquidity: true,
    endingSoon: true,
    recommend: true,
  })
  
  // Market data for tabs (cards now use mock data)
  const [marketData, setMarketData] = useState({
    newest: [] as MarketDisplay[],
    volume: [] as MarketDisplay[],
    liquidity: [] as MarketDisplay[],
    endingSoon: [] as MarketDisplay[],
  })
  
  // Recommend data state
  const [recommendData, setRecommendData] = useState<{
    popular: any[],
    whale: any[],
    highProbability: any[]
  }>({
    popular: [],
    whale: [],
    highProbability: []
  })
  
  const [recommendError, setRecommendError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch all data in parallel
    Promise.all([
      fetchNewest(),
      fetchTopVolume(),
      fetchEndingSoon(),
      fetchLiquidity(),
      fetchRecommend(),
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

  const fetchRecommend = async (timeFilter: string = selectedTimeFilter) => {
    try {
      setIsLoading(prev => ({ ...prev, recommend: true }))
      setRecommendError(null)
      
      // Extract numeric value from time filter (e.g., '1h' -> '1', '12h' -> '12')
      const hourValue = timeFilter.replace('h', '')
      const response = await fetch(`https://trade-analyze-production.up.railway.app/api/recommend?hour=${hourValue}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const data: RecommendApiResponse = await response.json()
      if (data.success) {
        setRecommendData({
          popular: data.data.popular_markets || [],
          whale: data.data.whale_markets || [],
          highProbability: data.data.high_probability_markets || []
        })
      } else {
        throw new Error('Failed to fetch recommend data')
      }
    } catch (error) {
      console.error('Failed to load recommend data:', error)
      setRecommendError('Unable to load recommended markets. Please try again later.')
    } finally {
      setIsLoading(prev => ({ ...prev, recommend: false }))
    }
  }

  const handleTimeFilterChange = async (timeFilter: string) => {
    setSelectedTimeFilter(timeFilter)
    await fetchRecommend(timeFilter)
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
        
        {/* Market List with Tag Navigation */}
        <div className="mt-8 max-w-[1200px] mx-auto">
          {/* Horizontal Tag Navigation */}
          <div className="border-b bg-background mb-6">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-4 py-3 overflow-x-auto scrollbar-hide justify-center">
              {MARKET_TAGS.map((tag) => (
                <Button
                  key={tag.id}
                  variant={selectedTag === tag.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedTag(tag.id)}
                  className="whitespace-nowrap"
                >
                  {tag.label}
                </Button>
              ))}
              </div>
            </div>
          </div>
          
          {/* Content based on selected tag */}
          <div className="space-y-3 max-w-[800px] mx-auto">
            {selectedTag === 'recommend' && (
              <div className="space-y-6">
                {/* Nested Recommend Tabs with Time Filter */}
                <div className="border-b bg-background">
                  <div className="flex items-center justify-center gap-4 sm:gap-6 py-3 overflow-x-auto scrollbar-hide">
                    {/* Time Filter Buttons */}
                    <div className="flex items-center gap-1 border rounded-lg p-1 flex-shrink-0">
                      {TIME_FILTER_OPTIONS.map((option) => (
                        <Button
                          key={option.id}
                          variant={selectedTimeFilter === option.id ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => handleTimeFilterChange(option.id)}
                          className="h-7 px-2 sm:px-3 text-xs whitespace-nowrap"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Recommend Tabs */}
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                      {RECOMMEND_TABS.map((tab) => (
                        <Button
                          key={tab.id}
                          variant={selectedRecommendTab === tab.id ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setSelectedRecommendTab(tab.id)}
                          className="whitespace-nowrap text-xs sm:text-sm"
                        >
                          {tab.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Error State */}
                {recommendError && (
                  <Alert className="max-w-[600px] mx-auto">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{recommendError}</AlertDescription>
                  </Alert>
                )}

                {/* Loading State */}
                {isLoading.recommend && !recommendError && (
                  <MarketListSkeleton count={6} />
                )}

                {/* Recommend Content */}
                {!isLoading.recommend && !recommendError && (
                  <>
                    {/* Popular Tab */}
                    {selectedRecommendTab === 'popular' && (
                      <>
                        {recommendData.popular.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground">No popular markets available</p>
                          </div>
                        ) : (
                          recommendData.popular.slice(0, 30).map((market) => (
                            <PopularMarketCard key={market.market_id} market={market} />
                          ))
                        )}
                      </>
                    )}

                    {/* Whale Tab */}
                    {selectedRecommendTab === 'whale' && (
                      <>
                        {recommendData.whale.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground">No whale markets available</p>
                          </div>
                        ) : (
                          recommendData.whale.slice(0, 30).map((market) => (
                            <WhaleMarketCard key={market.market_id} market={market} />
                          ))
                        )}
                      </>
                    )}

                    {/* High Probability Tab */}
                    {selectedRecommendTab === 'highProbability' && (
                      <>
                        {recommendData.highProbability.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground">No high probability markets available</p>
                          </div>
                        ) : (
                          recommendData.highProbability.slice(0, 30).map((market) => (
                            <HighProbabilityMarketCard key={market.market_id} market={market} />
                          ))
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {selectedTag === 'newest' && (
              <>
                {isLoading.newest ? (
                  <MarketListSkeleton count={6} />
                ) : marketData.newest.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No markets available</p>
                  </div>
                ) : (
                  marketData.newest.map((market) => (
                    <MarketCard key={market.conditionId} market={market} />
                  ))
                )}
              </>
            )}
            
            {selectedTag === 'volume' && (
              <>
                {isLoading.volume ? (
                  <MarketListSkeleton count={6} />
                ) : marketData.volume.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No markets available</p>
                  </div>
                ) : (
                  marketData.volume.map((market) => (
                    <MarketCard key={market.conditionId} market={market} />
                  ))
                )}
              </>
            )}
            
            {selectedTag === 'liquidity' && (
              <>
                {isLoading.liquidity ? (
                  <MarketListSkeleton count={6} />
                ) : marketData.liquidity.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No markets available</p>
                  </div>
                ) : (
                  marketData.liquidity.map((market) => (
                    <MarketCard key={market.conditionId} market={market} />
                  ))
                )}
              </>
            )}
            
            {selectedTag === 'endingSoon' && (
              <>
                {isLoading.endingSoon ? (
                  <MarketListSkeleton count={6} />
                ) : marketData.endingSoon.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No markets available</p>
                  </div>
                ) : (
                  marketData.endingSoon.map((market) => (
                    <MarketCard key={market.conditionId} market={market} />
                  ))
                )}
              </>
                )}
              </div>
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
