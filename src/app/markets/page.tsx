'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { RefreshCw, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, ChevronsUpDown, Search } from 'lucide-react'
import { Event, Market } from '@/lib/stores'
import { Navbar } from '@/components/ui/navbar'
import { Footer } from '@/components/ui/footer'
import { BottomNavigation } from '@/components/ui/bottom-navigation'
import Link from 'next/link'

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

// Predefined tags list (matching the navigation style)
const PREDEFINED_TAGS = [
  'Politics', 'Middle East', 'Sports', 'Crypto',
  'Tech', 'Culture', 'World', 'Economy', 'Trump', 'Elections', 'Mentions'
]

// Market Card Component (for inside event cards)
function MarketCard({ market, eventSlug }: { market: Market & { eventTitle?: string; eventIcon?: string }; eventSlug: string }) {
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

  const formatVolume = (volume: number | null): string => {
    if (!volume || volume === 0) return 'N/A'
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

  let yesPrice = 0
  
  try {
    if (market.outcomePrices && market.outcomePrices.length >= 2) {
      yesPrice = parseFloat(market.outcomePrices[0])
    }
  } catch (error) {
    // Skip invalid markets
    return null
  }
  
  return (
    <Link href={`/events/${eventSlug}?market=${market.conditionId}`} target="_blank" rel="noopener noreferrer">
      <div className="flex cursor-pointer items-center justify-between rounded-md p-3 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Market Icon */}
          <div className="flex-shrink-0">
            {(market.eventIcon || market.icon) ? (
              <img
                src={market.eventIcon || market.icon}
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
          
          {/* Market Question and Event Title */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium leading-tight">{market.groupItemTitle || market.question}</h4>
            {market.eventTitle && (
              <div className="text-xs text-muted-foreground">
                {market.eventTitle}
              </div>
            )}
          </div>
        </div>
        
        {/* Prices and Metrics - Responsive Layout */}
        {/* Desktop Layout (md and up) */}
        <div className="hidden md:flex items-center gap-6 text-sm ml-4 flex-shrink-0">
          <div className="w-20 text-left">
            <div className="text-xs text-muted-foreground mb-1">Yes</div>
            <div className="font-medium">{formatPrice(yesPrice)}</div>
          </div>
          <div className="w-24 text-center">
            <div className="text-xs text-muted-foreground mb-1">1h</div>
            <div className={`font-medium ${getPriceChangeColor(market.oneHourPriceChange || null)}`}>
              {formatPriceChange(market.oneHourPriceChange || null)}
            </div>
          </div>
          <div className="w-24 text-center">
            <div className="text-xs text-muted-foreground mb-1">24h</div>
            <div className={`font-medium ${getPriceChangeColor(market.oneDayPriceChange || null)}`}>
              {formatPriceChange(market.oneDayPriceChange || null)}
            </div>
          </div>
          <div className="w-24 text-right">
            <div className="text-xs text-muted-foreground mb-1">24h Volume</div>
            <div className="font-medium">{formatVolume(market.volume24hr || null)}</div>
          </div>
        </div>

        {/* Mobile Layout (below md) */}
        <div className="flex md:hidden items-center gap-3 text-sm ml-4 flex-shrink-0">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Yes</div>
            <div className="font-medium">{formatPrice(yesPrice)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">24h</div>
            <div className={`font-medium ${getPriceChangeColor(market.oneDayPriceChange || null)}`}>
              {formatPriceChange(market.oneDayPriceChange || null)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// Event Card Component (main cards with collapsible markets)
function EventCard({ event }: { event: Event }) {
  const [isOpen, setIsOpen] = useState(false)

  const formatVolume = (volume: number | null): string => {
    if (!volume || volume === 0) return 'N/A'
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

  // Filter active markets
  const activeMarkets = event.markets.filter(market => 
    market.active && !market.archived && !market.closed
  )

  const totalVolume = activeMarkets.reduce((sum, market) => 
    sum + (market.volume24hr || 0), 0
  )

  const totalLiquidity = activeMarkets.reduce((sum, market) => 
    sum + (market.liquidityNum || market.liquidity || 0), 0
  )
  
  return (
    <Card className="bg-card text-card-foreground">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-2.5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              {/* Event Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {event.icon ? (
                  <>
                    <img
                      src={event.icon}
                      alt={`${event.title} icon`}
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = 'flex'
                      }}
                    />
                    <div 
                      className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0" 
                      style={{ display: 'none' }}
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        {event.title.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">
                      {event.title.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Event Info */}
              <div className="flex-1 min-w-0">
                {/* Event Title and Collapsible Trigger */}
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <h2 className="text-base font-bold leading-tight text-foreground flex-1">{event.title}</h2>
                    {/* Collapsible Trigger right next to title */}
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                        <ChevronsUpDown className="h-4 w-4" />
                        <span className="sr-only">Toggle markets</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                    {/* Metrics on the right - Responsive */}
                    {/* Desktop Layout (md and up) */}
                    <div className="hidden md:flex items-center gap-4 text-sm ml-4 flex-shrink-0">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">24h Volume</div>
                      <div className="font-medium">{formatVolume(totalVolume)}</div>
                    </div>

                    <div className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">Ends</div>
                      <div className="font-medium">{formatDate(event.endDate)}</div>
                    </div>
                  </div>

                    {/* Mobile Layout (below md) - Only show volume */}
                    <div className="flex md:hidden items-center text-sm ml-2 flex-shrink-0">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Volume</div>
                        <div className="font-medium">{formatVolume(totalVolume)}</div>
                      </div>
                    </div>
                </div>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-1">
                  {event.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-xs py-0 px-1.5 h-5">
                      {tag.label}
                    </Badge>
                  ))}
                  {event.tags.length > 4 && (
                    <Badge variant="secondary" className="text-xs py-0 px-1.5 h-5">
                      +{event.tags.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Markets */}
          <CollapsibleContent className="mt-4">
            <div className="space-y-2 border-t pt-4">
              <div className="text-sm font-medium text-muted-foreground mb-3">
                Markets ({activeMarkets.length})
              </div>
              {activeMarkets.map((market) => (
                <MarketCard key={market.conditionId} market={market} eventSlug={event.slug} />
              ))}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  )
}

export default function MarketsPage() {
  const [viewMode, setViewMode] = useState<'markets' | 'events'>('markets')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedTag, setSelectedTag] = useState<string>('all')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')
  const [minBestAsk, setMinBestAsk] = useState<string>('')
  const [maxBestAsk, setMaxBestAsk] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('priceChange24h') // Markets mode default
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 20

  // Get default sort option for each view mode
  const getDefaultSort = (mode: 'markets' | 'events'): string => {
    return mode === 'markets' ? 'priceChange24h' : 'volume24hr'
  }

  // Update sort when view mode changes
  useEffect(() => {
    const validSortOptions = {
      markets: ['volume24hr', 'volume1wk', 'liquidity', 'priceChange24h', 'priceChange1h'],
      events: ['volume24hr', 'volume1wk', 'liquidity', 'endDate']
    }
    
    // If current sort option is not valid for the new mode, reset to default
    if (!validSortOptions[viewMode].includes(sortBy)) {
      setSortBy(getDefaultSort(viewMode))
    }
  }, [viewMode, sortBy])

  // Helper functions for price range
  const handlePriceChange = (type: 'min' | 'max', value: string) => {
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

  // Fetch events data
  const {
    data: allEventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    error: eventsErrorDetails,
  } = useQuery<EventsResponse>({
    queryKey: ['all-events', searchTerm],
    queryFn: async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      try {
        const url = new URL('/api/markets', window.location.origin)
        url.searchParams.set('limit', '9999')
        if (searchTerm.trim()) {
          url.searchParams.set('search', searchTerm.trim())
        }
        
        const response = await fetch(url.toString(), {
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
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
  })

  // Process markets from events for Markets view mode
  const processMarketsFromEvents = (events: Event[]) => {
    const markets: Array<Market & { eventTitle: string; eventSlug: string; eventIcon?: string }> = []
    
    events.forEach(event => {
      event.markets
        .filter(market => market.active && !market.archived && !market.closed)
        .forEach(market => {
          markets.push({
            ...market,
            eventTitle: event.title,
            eventSlug: event.slug,
            eventIcon: event.icon
          })
        })
    })
    
    return markets
  }

  // Client-side filtering and sorting for events
  const filteredAndSortedEvents = allEventsData?.events ? 
    allEventsData.events
      .filter(event => {
        // Only include events with active markets
        const activeMarkets = event.markets.filter(market => 
          market.active && !market.archived && !market.closed
        )
        if (activeMarkets.length === 0) return false

        // Tag filter
        if (selectedTag !== 'all') {
          const eventTagLabels = event.tags.map(tag => tag.label)
          const hasMatchingTag = eventTagLabels.some(eventTag => 
            eventTag.toLowerCase().includes(selectedTag.toLowerCase())
          )
          if (!hasMatchingTag) return false
        }

        // Price range filter - check if any market has prices in range
        if (minPrice !== '' || maxPrice !== '') {
          const [minPriceNum, maxPriceNum] = getPriceRange()
          const hasMatchingMarket = activeMarkets.some(market => {
            let yesPrice = 0
            let noPrice = 0
            
            try {
              if (market.outcomePrices && market.outcomePrices.length >= 2) {
                yesPrice = parseFloat(market.outcomePrices[0])
                noPrice = parseFloat(market.outcomePrices[1])
              }
            } catch (error) {
              return false
            }
            
            const yesPriceInRange = yesPrice >= minPriceNum && yesPrice <= maxPriceNum
            const noPriceInRange = noPrice >= minPriceNum && noPrice <= maxPriceNum
            return yesPriceInRange || noPriceInRange
          })
          if (!hasMatchingMarket) return false
        }

        // Best ask filter - using yes price as proxy
        if (minBestAsk !== '' || maxBestAsk !== '') {
          const [minBestAskNum, maxBestAskNum] = getBestAskRange()
          if (minBestAskNum > maxBestAskNum) return false
          
          const hasMatchingMarket = activeMarkets.some(market => {
            let yesPrice = 0
            
            try {
              if (market.outcomePrices && market.outcomePrices.length >= 2) {
                yesPrice = parseFloat(market.outcomePrices[0])
              }
            } catch (error) {
              return false
            }
            
            return yesPrice >= minBestAskNum && yesPrice <= maxBestAskNum
          })
          if (!hasMatchingMarket) return false
        }

        return true
      })
      .sort((a, b) => {
        let comparison = 0

        // Calculate aggregate values for sorting
        const getEventVolume24hr = (event: Event) => {
          const activeMarkets = event.markets.filter(market => 
            market.active && !market.archived && !market.closed
          )
          return activeMarkets.reduce((sum, market) => sum + (market.volume24hr || 0), 0)
        }

        const getEventVolume1wk = (event: Event) => {
          const activeMarkets = event.markets.filter(market => 
            market.active && !market.archived && !market.closed
          )
          return activeMarkets.reduce((sum, market) => sum + (market.volume1wk || 0), 0)
        }

        const getEventLiquidity = (event: Event) => {
          const activeMarkets = event.markets.filter(market => 
            market.active && !market.archived && !market.closed
          )
          return activeMarkets.reduce((sum, market) => sum + (market.liquidityNum || market.liquidity || 0), 0)
        }

        switch (sortBy) {
          case 'volume24hr':
            comparison = getEventVolume24hr(a) - getEventVolume24hr(b)
            break
          case 'volume1wk':
            comparison = getEventVolume1wk(a) - getEventVolume1wk(b)
            break
          case 'liquidity':
            comparison = getEventLiquidity(a) - getEventLiquidity(b)
            break
          case 'question':
            comparison = a.title.localeCompare(b.title)
            break
          case 'endDate':
              const aEndDate = a.endDate || '2099-12-31'
              const bEndDate = b.endDate || '2099-12-31'
              comparison = new Date(aEndDate).getTime() - new Date(bEndDate).getTime()
            break
          default:
            return 0
        }
        return sortDirection === 'desc' ? -comparison : comparison
      })
    : []

  // Process and filter markets for Markets view mode
  const filteredAndSortedMarkets = viewMode === 'markets' && allEventsData?.events ? 
    (() => {
      // First filter events (same as events mode)
      const filteredEvents = allEventsData.events.filter(event => {
        // Only include events with active markets
        const activeMarkets = event.markets.filter(market => 
          market.active && !market.archived && !market.closed
        )
        if (activeMarkets.length === 0) return false

        // Tag filter
        if (selectedTag !== 'all') {
          const eventTagLabels = event.tags.map(tag => tag.label)
          if (!eventTagLabels.some(label => 
            label.toLowerCase() === selectedTag.toLowerCase()
          )) {
            return false
          }
        }

        return true
      })

      // Extract markets from filtered events
      const allMarkets = processMarketsFromEvents(filteredEvents)

      // Filter markets
      return allMarkets
        .filter(market => {
          // Search filter (market question + event title)
          if (searchTerm) {
            const searchLower = searchTerm.toLowerCase()
            if (!market.question.toLowerCase().includes(searchLower) && 
                !market.eventTitle.toLowerCase().includes(searchLower)) {
              return false
            }
          }

          // Price filter
          const [minPriceNum, maxPriceNum] = getPriceRange()
          const yesPrice = market.outcomePrices?.[0] ? parseFloat(market.outcomePrices[0]) : 0
          if (yesPrice < minPriceNum || yesPrice > maxPriceNum) {
            return false
          }

          // Best ask filter
          const [minAskNum, maxAskNum] = getBestAskRange()
          const bestAsk = market.bestAsk ? parseFloat(market.bestAsk) : 0
          if (bestAsk < minAskNum || bestAsk > maxAskNum) {
            return false
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
            case 'liquidity':
              const aLiquidity = a.liquidityNum || a.liquidity || 0
              const bLiquidity = b.liquidityNum || b.liquidity || 0
              comparison = aLiquidity - bLiquidity
              break
            case 'question':
              comparison = a.question.localeCompare(b.question)
              break
            case 'endDate':
              // For markets, we can't sort by endDate since it's not available on market level
              comparison = 0
              break
            case 'priceChange24h':
              comparison = (a.oneDayPriceChange || 0) - (b.oneDayPriceChange || 0)
              break
            case 'priceChange1h':
              comparison = (a.oneHourPriceChange || 0) - (b.oneHourPriceChange || 0)
              break
            default:
              return 0
          }
          return sortDirection === 'desc' ? -comparison : comparison
        })
    })()
    : []

  // Determine current data and pagination
  const currentData = viewMode === 'markets' ? filteredAndSortedMarkets : filteredAndSortedEvents
  const totalPages = Math.ceil(currentData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = currentData.slice(startIndex, endIndex)

  const hasActiveFilters = searchTerm !== '' || minPrice !== '' || maxPrice !== '' || minBestAsk !== '' || maxBestAsk !== '' || sortBy !== getDefaultSort(viewMode) || sortDirection !== 'desc'

  const clearAllFilters = () => {
    setSearchTerm('')
    setSelectedTag('all')
    setMinPrice('')
    setMaxPrice('')
    setMinBestAsk('')
    setMaxBestAsk('')
    setSortBy(getDefaultSort(viewMode))
    setSortDirection('desc')
    setCurrentPage(1)
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedTag, minPrice, maxPrice, minBestAsk, maxBestAsk, sortBy, sortDirection])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Page Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 max-w-[1200px]">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{viewMode === 'markets' ? 'Markets' : 'Events'}</h1>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <button
                onClick={() => setViewMode('markets')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'markets'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Markets
              </button>
              <button
                onClick={() => setViewMode('events')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'events'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Events
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Tag Navigation */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <div className="flex items-center gap-6 py-3 overflow-x-auto scrollbar-hide">
            <Button
              variant={selectedTag === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTag('all')}
              className="whitespace-nowrap"
            >
              All
            </Button>
            {PREDEFINED_TAGS.map((tag) => (
              <Button
                key={tag}
                variant={selectedTag === tag ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedTag(tag)}
                className="whitespace-nowrap"
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6 max-w-[1200px]">
        {/* Top Filter Bar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Sorting
              </CardTitle>
              {/* Mobile collapse trigger */}
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="hidden sm:flex"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                )}
                <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="sm:hidden">
                      {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              </div>
            </div>
          </CardHeader>
          
          {/* Always visible on desktop, collapsible on mobile */}
          <div className="hidden sm:block">
            <CardContent className="space-y-4">
              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">Active:</span>
                  {searchTerm && <Badge variant="secondary">Search: "{searchTerm}"</Badge>}
                  {(minPrice || maxPrice) && <Badge variant="secondary">Price: {minPrice || '0'}-{maxPrice || '1'}</Badge>}
                  {(minBestAsk || maxBestAsk) && <Badge variant="secondary">Ask: {minBestAsk || '0'}-{maxBestAsk || '1'}</Badge>}
                  {(sortBy !== getDefaultSort(viewMode) || sortDirection !== 'desc') && <Badge variant="secondary">Sort: {sortBy} ({sortDirection})</Badge>}
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Filter Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Price Filters Group */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">PRICE FILTERS</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={minPrice}
                        onChange={(e) => handlePriceChange('min', e.target.value)}
                        className="w-full"
                        placeholder="Min price (0.00)"
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="text"
                        value={maxPrice}
                        onChange={(e) => handlePriceChange('max', e.target.value)}
                        className="w-full"
                        placeholder="Max price (1.00)"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={minBestAsk}
                        onChange={(e) => handleBestAskChange('min', e.target.value)}
                        className="w-full"
                        placeholder="Min ask (0.00)"
                      />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input
                        type="text"
                        value={maxBestAsk}
                        onChange={(e) => handleBestAskChange('max', e.target.value)}
                        className="w-full"
                        placeholder="Max ask (1.00)"
                      />
                    </div>
                  </div>
                </div>

                {/* Sort Options Group */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">SORT OPTIONS</h3>
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="volume24hr">24h Volume</SelectItem>
                        <SelectItem value="volume1wk">Volume (1 week)</SelectItem>
                        <SelectItem value="liquidity">Liquidity</SelectItem>
                        {viewMode === 'events' && (
                          <SelectItem value="endDate">End Date</SelectItem>
                        )}
                        {viewMode === 'markets' && (
                          <>
                            <SelectItem value="priceChange24h">24h Price Change</SelectItem>
                            <SelectItem value="priceChange1h">1h Price Change</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                      className="px-3"
                    >
                      {sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">SEARCH</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search events by title..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Results Summary */}
              <div className="text-sm text-muted-foreground pt-2 border-t">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedEvents.length)} of {filteredAndSortedEvents.length} events
                {allEventsData && ` (${allEventsData.events.length} total)`}
              </div>
            </CardContent>
          </div>

          {/* Mobile collapsible content */}
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleContent className="sm:hidden">
              <CardContent className="space-y-4">
                {/* Mobile filters - simplified */}
                <div className="space-y-4">
                  {/* Search */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">SEARCH</h3>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search events by title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10"
                      />
                    </div>
                  </div>

                  {/* Price Filters */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">PRICE FILTERS</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={minPrice}
                          onChange={(e) => handlePriceChange('min', e.target.value)}
                          className="w-full"
                          placeholder="Min price (0.00)"
                        />
                        <span className="text-sm text-muted-foreground">to</span>
                        <Input
                          type="text"
                          value={maxPrice}
                          onChange={(e) => handlePriceChange('max', e.target.value)}
                          className="w-full"
                          placeholder="Max price (1.00)"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={minBestAsk}
                          onChange={(e) => handleBestAskChange('min', e.target.value)}
                          className="w-full"
                          placeholder="Min ask (0.00)"
                        />
                        <span className="text-sm text-muted-foreground">to</span>
                        <Input
                          type="text"
                          value={maxBestAsk}
                          onChange={(e) => handleBestAskChange('max', e.target.value)}
                          className="w-full"
                          placeholder="Max ask (1.00)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sort */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">SORT</h3>
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="volume24hr">24h Volume</SelectItem>
                        <SelectItem value="volume1wk">Volume (1 week)</SelectItem>
                        <SelectItem value="liquidity">Liquidity</SelectItem>
                        {viewMode === 'events' && (
                          <SelectItem value="endDate">End Date</SelectItem>
                        )}
                        {viewMode === 'markets' && (
                          <>
                            <SelectItem value="priceChange24h">24h Price Change</SelectItem>
                            <SelectItem value="priceChange1h">1h Price Change</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                      className="px-3"
                    >
                      {sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                    </Button>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={clearAllFilters} className="w-full">
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Events List */}
        <div className="space-y-4">
          {eventsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-2">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-muted-foreground">Loading events...</p>
              </div>
            </div>
          ) : eventsError ? (
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
            viewMode === 'events' 
              ? (paginatedData as Event[]).map((event) => (
              <EventCard key={event.id} event={event} />
                ))
                              : (paginatedData as (Market & { eventTitle: string; eventSlug: string; eventIcon?: string })[]).map((market) => (
                  <MarketCard key={market.conditionId} market={market} eventSlug={market.eventSlug} />
            ))
          )}
        </div>

        {/* Pagination */}
        {!eventsLoading && !eventsError && filteredAndSortedEvents.length > 0 && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                  if (pageNum > totalPages) return null
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
      
      <Footer />
      <BottomNavigation />
    </div>
  )
}
