'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Filter, X, TrendingUp } from 'lucide-react'
import { Event } from '@/lib/stores'
import { Navbar } from '@/components/ui/navbar'
import { EventsDataTable } from '@/components/ui/events-data-table'
import { RapidChangesCard } from '@/components/ui/rapid-changes-card'
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

// Predefined tags list
const PREDEFINED_TAGS = [
  'Politics', 'Sports', 'Crypto', 'Tech', 'Culture', 
  'World', 'Economy', 'Trump', 'Elections', 'Mentions'
]

export default function Dashboard() {
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1])
  const [sortBy, setSortBy] = useState<string>('volume24hr')

  const {
    data: allEventsData,
    isLoading,
    isError,
    error,
    refetch,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  const handleRefresh = () => {
    refetch()
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTag(prev => prev === tag ? '' : tag)
  }

  const clearAllFilters = () => {
    setSelectedTag('')
    setPriceRange([0, 1])
    setSortBy('volume24hr')
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

      const firstMarket = event.markets?.[0]
      if (firstMarket?.outcomePrices && firstMarket.outcomePrices.length >= 1) {
        const yesPrice = parseFloat(firstMarket.outcomePrices[0])
        if (isNaN(yesPrice)) return true
        if (yesPrice < priceRange[0] || yesPrice > priceRange[1]) return false
      }

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'volume24hr':
          return b.volume24hr - a.volume24hr
        case 'volume1wk':
          return b.volume1wk - a.volume1wk
        case 'volume':
          return b.volume - a.volume
        case 'title':
          return a.title.localeCompare(b.title)
        case 'endDate':
          return new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
        default:
          return 0
      }
    }) : []

  const hasActiveFilters = selectedTag !== '' || priceRange[0] > 0 || priceRange[1] < 1 || sortBy !== 'volume24hr'

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Top Row: Rapid Changes + Top Volume Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rapid Changes Card */}
          {allEventsData?.events ? (
            <RapidChangesCard events={allEventsData.events} />
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
                  {isLoading ? 'Loading market data...' : 'No data available'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Volume Markets Card */}
          {allEventsData?.events ? (
            <TopVolumeCard events={allEventsData.events} />
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
                  {isLoading ? 'Loading market data...' : 'No data available'}
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
                      onClick={clearAllFilters}
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
                    {(priceRange[0] > 0 || priceRange[1] < 1) && (
                      <Badge variant="secondary" className="text-xs">
                        Yes Price: {priceRange[0].toFixed(2)}-{priceRange[1].toFixed(2)}
                      </Badge>
                    )}
                    {sortBy !== 'volume24hr' && (
                      <Badge variant="secondary" className="text-xs">
                        Sort: {sortBy}
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
                      onClick={() => handleTagToggle(tag)}
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
                <label className="text-sm font-medium mb-4 block">Yes Price Range</label>
                <div className="px-3">
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => {
                      setPriceRange(value as [number, number])
                    }}
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{priceRange[0].toFixed(2)}</span>
                    <span>{priceRange[1].toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Sort By with Select */}
              <div className="space-y-4">
                <label className="text-sm font-medium mb-4 block">Sort By</label>
                <Select value={sortBy} onValueChange={(value) => {
                  setSortBy(value)
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="volume24hr">Volume (24h)</SelectItem>
                    <SelectItem value="volume1wk">Volume (1 week)</SelectItem>
                    <SelectItem value="volume">Total Volume</SelectItem>
                    <SelectItem value="title">Title (A-Z)</SelectItem>
                    <SelectItem value="endDate">End Date</SelectItem>
                  </SelectContent>
                </Select>
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
              <CardTitle>Events</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center space-y-2">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground">Loading all active Markets, it may take some times</p>
                  </div>
                </div>
              ) : isError ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center space-y-4">
                    <p className="text-destructive">Failed to load events</p>
                    <p className="text-sm text-muted-foreground">
                      {error instanceof Error ? error.message : 'Unknown error'}
                    </p>
                    <Button onClick={handleRefresh} variant="outline">
                      Try Again
                    </Button>
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
