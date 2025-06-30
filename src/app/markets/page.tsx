'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { RefreshCw, Filter, X, TrendingUp, Info, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Event } from '@/lib/stores'
import { Navbar } from '@/components/ui/navbar'
import { EventsDataTable } from '@/components/ui/events-data-table'
import { RapidChangesCard } from '@/components/ui/rapid-changes-card'
import { ArbitrageCard } from '@/components/ui/arbitrage-card'
import { TopVolumeCard } from '@/components/ui/top-volume-card'

interface FetchLog {
  stage: string
  message: string
  isError: boolean
}

interface EventsResponse {
  events: Event[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  logs: FetchLog[]
  cache: {
    totalEvents: number
    lastUpdated: string
  }
}

interface Tag {
  id: string
  label: string
  slug: string
}

interface TagsResponse {
  tags: Tag[]
  success: boolean
  count: number
  error?: string
  fallback?: boolean
}

// Predefined tags list
const PREDEFINED_TAGS = [
  'Politics', 'Sports', 'Crypto', 'Tech', 'Culture', 
  'World', 'Economy', 'Trump', 'Elections', 'Mentions'
]

export default function Dashboard() {
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')
  const [minBestAsk, setMinBestAsk] = useState<string>('')
  const [maxBestAsk, setMaxBestAsk] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('volume24hr')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  // Auto-refresh state - enabled by default
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Helper functions for price range
  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      if (type === 'min') {
        setMinPrice(value)
      } else {
        setMaxPrice(value)
      }
    }
  }

  const getPriceRange = (): [number, number] => {
    const min = minPrice === '' ? 0 : parseFloat(minPrice)
    const max = maxPrice === '' ? 1 : parseFloat(maxPrice)
    return [isNaN(min) ? 0 : min, isNaN(max) ? 1 : max]
  }

  const handleBestAskChange = (type: 'min' | 'max', value: string) => {
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      if (type === 'min') {
        setMinBestAsk(value)
      } else {
        setMaxBestAsk(value)
      }
    }
  }

  const getBestAskRange = (): [number, number] => {
    const min = minBestAsk === '' ? 0 : parseFloat(minBestAsk)
    const max = maxBestAsk === '' ? 1 : parseFloat(maxBestAsk)
    return [isNaN(min) ? 0 : min, isNaN(max) ? 1 : max]
  }

  // Fetch events data - no caching
  const {
    data: allEventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    error: eventsErrorDetails,
    refetch: refetchEvents,
  } = useQuery<EventsResponse>({
    queryKey: ['all-events'],
    queryFn: async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      try {
        const response = await fetch('/api/markets?limit=9999', {
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch events')
        }

        const data = await response.json()
        return data
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timed out after 30 seconds')
        }
        throw error
      }
    },
    retry: 1,
    staleTime: 30 * 1000, // 30 seconds client-side cache (matches server cache)
    gcTime: 60 * 1000, // 1 minute garbage collection time
  })

  // Fetch tags data with 1-hour caching
  const {
    data: tagsData,
    isLoading: tagsLoading,
    isError: tagsError,
    refetch: refetchTags,
  } = useQuery<TagsResponse>({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await fetch('/api/tags')
      if (!response.ok) {
        throw new Error('Failed to fetch tags')
      }
      return response.json()
    },
    retry: 1,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  })

  // Auto-refresh logic
  useEffect(() => {
    if (autoRefreshEnabled) {
      // Set up the auto-refresh interval
      autoRefreshIntervalRef.current = setInterval(() => {
        refetchEvents()
      }, 10 * 60 * 1000) // 10 minutes
    } else {
      // Clean up intervals
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
        autoRefreshIntervalRef.current = null
      }
    }

    // Cleanup on unmount
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }
  }, [autoRefreshEnabled, refetchEvents])

  const handleAutoRefreshToggle = (checked: boolean) => {
    setAutoRefreshEnabled(checked)
  }

  // Client-side filtering and sorting
  const filteredAndSortedEvents = allEventsData?.events ? [...allEventsData.events]
    .filter(event => {

      if (selectedTag !== '') {
        const eventTagLabels = event.tags.map(tag => tag.label)
        const hasMatchingTag = eventTagLabels.some(eventTag => 
          eventTag.toLowerCase().includes(selectedTag.toLowerCase())
        )
        if (!hasMatchingTag) return false
      }

      // Check if any market in the event has a Yes OR No price within the range
      if (event.markets && event.markets.length > 0) {
        const [minPriceNum, maxPriceNum] = getPriceRange()
        const [minBestAskNum, maxBestAskNum] = getBestAskRange()
        
        const hasMatchingMarket = event.markets.some(market => {
          let priceMatch = true
          let bestAskMatch = true

          // Check price range filter (if any input provided)
          if (minPrice !== '' || maxPrice !== '') {
            priceMatch = false
            if (market.outcomePrices && market.outcomePrices.length >= 2) {
              const yesPrice = parseFloat(market.outcomePrices[0])
              const noPrice = parseFloat(market.outcomePrices[1])

              // Check if either Yes or No price is within range
              const yesPriceInRange = !isNaN(yesPrice) && yesPrice >= minPriceNum && yesPrice <= maxPriceNum
              const noPriceInRange = !isNaN(noPrice) && noPrice >= minPriceNum && noPrice <= maxPriceNum

              priceMatch = yesPriceInRange || noPriceInRange
            }
          }

          // Check best ask filter (if any input provided)
          if (minBestAsk !== '' || maxBestAsk !== '') {
            bestAskMatch = false
            if (market.bestAsk) {
              const bestAskPrice = parseFloat(market.bestAsk)
              if (!isNaN(bestAskPrice)) {
                // Return false if min > max (as requested)
                if (minBestAskNum > maxBestAskNum) {
                  bestAskMatch = false
                } else {
                  bestAskMatch = bestAskPrice >= minBestAskNum && bestAskPrice <= maxBestAskNum
                }
              }
            }
          }

          return priceMatch && bestAskMatch
        })
        // If no markets match the filters, exclude this event
        if (!hasMatchingMarket) return false
      }

      return true
    })
    .sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'volume24hr':
          comparison = (a.volume24hr || 0) - (b.volume24hr || 0)
          break
        case 'volume1wk':
          comparison = (a.volume1wk || 0) - (b.volume1wk || 0)
          break
        case 'volume':
          comparison = (a.liquidity || 0) - (b.liquidity || 0)
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'endDate':
          comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
          break
        default:
          return 0
      }
      return sortDirection === 'desc' ? -comparison : comparison
    }) : []

  const hasActiveFilters = selectedTag !== '' || minPrice !== '' || maxPrice !== '' || minBestAsk !== '' || maxBestAsk !== '' || sortBy !== 'volume24hr' || sortDirection !== 'desc'

  // Overall loading state
  const isLoading = eventsLoading || tagsLoading
  const isError = eventsError || tagsError

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Top Row: Rapid Changes + Arbitrage + Top Volume Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rapid Changes Card */}
          {allEventsData?.events ? (
            <RapidChangesCard 
              events={allEventsData.events} 
              availableTags={tagsData?.tags || []}
              tagsLoading={tagsLoading}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Rapid Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  {eventsLoading ? 'Loading market data...' : 'No data available'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Volume Markets Card */}
          {allEventsData?.events ? (
            <TopVolumeCard 
              events={allEventsData.events} 
              availableTags={tagsData?.tags || []}
              tagsLoading={tagsLoading}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Volume Markets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  {eventsLoading ? 'Loading market data...' : 'No data available'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Arbitrage Events Card */}
          {allEventsData?.events ? (
            <ArbitrageCard
              events={allEventsData.events}
              availableTags={tagsData?.tags || []}
              tagsLoading={tagsLoading}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Arbitrage Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  {eventsLoading ? 'Loading market data...' : 'No data available'}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filters and Table */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Active Filters Display - Always visible with fixed height to prevent layout shifts */}
              <div className="space-y-2 min-h-[4.5rem]">
                <div className="flex items-center justify-between min-h-[2rem]">
                  <div className="text-sm font-medium">
                    {hasActiveFilters ? 'Active Filters:' : 'No active filters'}
                  </div>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTag('')
                        setMinPrice('')
                        setMaxPrice('')
                        setMinBestAsk('')
                        setMaxBestAsk('')
                        setSortBy('volume24hr')
                        setSortDirection('desc')
                      }}
                      className="h-8 px-2"
                    >
                      <X className="h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-1 min-h-[1.5rem]">
                    {selectedTag !== '' && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedTag}
                      </Badge>
                    )}
                    {(minPrice !== '' || maxPrice !== '') && (
                      <Badge variant="secondary" className="text-xs">
                        Price Range: {minPrice || '0'}-{maxPrice || '1'}
                      </Badge>
                    )}
                    {(minBestAsk !== '' || maxBestAsk !== '') && (
                      <Badge variant="secondary" className="text-xs">
                        Best Ask Range: {minBestAsk || '0'}-{maxBestAsk || '1'}
                      </Badge>
                    )}
                    {(sortBy !== 'volume24hr' || sortDirection !== 'desc') && (
                      <Badge variant="secondary" className="text-xs">
                        Sort: {sortBy} ({sortDirection})
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Tags Filter - one per row */}
              <div className="space-y-4">
                <label className="text-sm font-medium mb-4 block">Tags</label>
                <div className="space-y-2">
                  {PREDEFINED_TAGS.map((tag) => (
                    <Button
                      key={tag}
                      variant={selectedTag === tag ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setSelectedTag(tag)}
                      className="w-full justify-start text-left h-8 cursor-pointer"
                    >
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Price Range */}
              <div className="space-y-4">
                <label className="text-sm font-medium mb-4 block">Price Range (Yes or No)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={minPrice}
                    onChange={(e) => handlePriceChange('min', e.target.value)}
                    className="w-20"
                    placeholder="0.00"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="text"
                    value={maxPrice}
                    onChange={(e) => handlePriceChange('max', e.target.value)}
                    className="w-20"
                    placeholder="1.00"
                  />
                </div>
              </div>

              <Separator />

              {/* Best Asks Price Range */}
              <div className="space-y-4">
                <label className="text-sm font-medium mb-4 block">Best Asks Price Range</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={minBestAsk}
                    onChange={(e) => handleBestAskChange('min', e.target.value)}
                    className="w-20"
                    placeholder="0.00"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="text"
                    value={maxBestAsk}
                    onChange={(e) => handleBestAskChange('max', e.target.value)}
                    className="w-20"
                    placeholder="1.00"
                  />
                </div>
              </div>

              <Separator />

              {/* Sort By with Direction Toggle */}
              <div className="space-y-4">
                <label className="text-sm font-medium mb-4 block">Sort By</label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value) => {
                    setSortBy(value)
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volume24hr">Volume (24h)</SelectItem>
                      <SelectItem value="volume1wk">Volume (1 week)</SelectItem>
                      <SelectItem value="volume">Liquidity</SelectItem>
                      <SelectItem value="title">Title (A-Z)</SelectItem>
                      <SelectItem value="endDate">End Date</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Compact Sort Direction Toggle */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                    className="px-2 h-9 flex-shrink-0"
                    title={sortDirection === 'desc' ? 'Descending (High to Low)' : 'Ascending (Low to High)'}
                  >
                    {sortDirection === 'desc' ? (
                      <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUp className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Results Summary */}
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {filteredAndSortedEvents.length} events
                  {allEventsData && ` (${allEventsData.cache.totalEvents} total)`}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events DataTable */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Events</CardTitle>
                <div className="flex items-center gap-4">
                  {/* Data Latency Notice */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <span>30 seconds latency in Market data</span>
                  </div>
                  {/* Auto-refresh controls */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="auto-refresh"
                      checked={autoRefreshEnabled}
                      onCheckedChange={handleAutoRefreshToggle}
                    />
                    <label
                      htmlFor="auto-refresh"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Auto-refresh (10min)
                    </label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center space-y-2">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground">To improve performance for sorting and filtering, it may take about 30s to load all events.</p>
                  </div>
                </div>
              ) : isError ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center space-y-4">
                    <p className="text-destructive">Failed to load events</p>
                    <p className="text-sm text-muted-foreground">
                      {eventsErrorDetails instanceof Error ? eventsErrorDetails.message : 'Unknown error'}
                    </p>
                  </div>
                </div>
              ) : filteredAndSortedEvents.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground">No events found</p>
                </div>
              ) : (
                <EventsDataTable data={filteredAndSortedEvents} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
