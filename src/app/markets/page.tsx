'use client'

import { useState, useEffect, startTransition, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { RefreshCw, Filter, X, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, ChevronsUpDown, Search, Check, X as XIcon } from 'lucide-react'
import { Event, Market } from '@/lib/stores'
import { Navbar } from '@/components/ui/navbar'
import { Footer } from '@/components/ui/footer'
import { BottomNavigation } from '@/components/ui/bottom-navigation'
import { API_CONFIG } from '@/lib/config'
import Link from 'next/link'

interface FetchLog {
  stage: string
  message: string
  isError: boolean
}

interface EventsResponse {
  events?: Event[]
  markets?: Array<Market & { eventTitle: string; eventSlug: string; eventIcon?: string }>
  pagination: {
    page: number
    limit: number
    hasMore?: boolean
    total?: number
    totalPages?: number
  }
  metadata?: {
    status?: string
    dataSource?: string
    filters?: any
  }
  logs?: FetchLog[]
  cache?: {
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
  'Politics', 'Middle East', 'Sports', 'Esports', 'Crypto',
  'Tech', 'Culture', 'World', 'Economy', 'Trump', 'Elections', 'Mentions'
]

// Tag mapping for closed APIs (label to ID)
const TAG_LABEL_TO_ID_MAP: Record<string, string> = {
  'Politics': '2',
  'Middle East': '154',
  'Sports': '1',
  'Esports': '64',
  'Crypto': '21',
  'Tech': '1401',
  'Culture': '596',
  'World': '101970',
  'Economy': '100328',
  'Trump': '126',
  'Elections': '144',
  'Mentions': '100343'
}

// Helper function to get tag ID from label
const getTagId = (label: string): string | undefined => {
  return TAG_LABEL_TO_ID_MAP[label]
}

// Multi-Select Tags Dropdown Component
function MultiSelectTagsDropdown({ 
  value, 
  onValueChange, 
  placeholder = "Select tags...",
  label 
}: { 
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  label?: string
}) {
  const [open, setOpen] = useState(false)
  
  const toggleTag = (tag: string) => {
    onValueChange(
      value.includes(tag) 
        ? value.filter(t => t !== tag)
        : [...value, tag]
    )
  }

  const displayValue = value.length === 0 
    ? placeholder 
    : value.length === 1 
      ? value[0] 
      : `${value.length} tags selected`

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between text-left font-normal"
          role="combobox"
          aria-expanded={open}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full p-0" align="start">
        <div className="max-h-60 overflow-y-auto p-1">
          {value.length > 0 && (
            <>
              <div className="px-2 py-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onValueChange([])}
                  className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </Button>
              </div>
              <div className="h-px bg-border mx-1 my-1" />
            </>
          )}
          {PREDEFINED_TAGS.map((tag) => (
            <DropdownMenuItem
              key={tag}
              className="cursor-pointer px-2 py-1.5"
              onSelect={(e) => {
                e.preventDefault()
                toggleTag(tag)
              }}
            >
              <div className="flex items-center space-x-2 w-full">
                <Checkbox
                  checked={value.includes(tag)}
                  onChange={() => toggleTag(tag)}
                  className="shrink-0"
                />
                <span className="flex-1">{tag}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Market Card Component (for inside event cards)
function MarketCard({ market, eventSlug, sortBy, isClosed = false }: { market: Market & { eventTitle?: string; eventIcon?: string }; eventSlug: string; sortBy: string; isClosed?: boolean }) {
  const formatPrice = (price: number): string => {
    return (price * 100).toFixed(2)
  }
  
  const formatPriceChange = (change: number | null): string => {
    if (change === null) return '+0.00'
    const sign = change >= 0 ? '+' : ''
    return `${sign}${(change * 100).toFixed(2)}`
  }

  const formatPercentagePrice = (change: number | null): string => {
    if (change === null) return '+0.00%'
    const sign = change >= 0 ? '+' : ''
    return `${sign}${(change * 100).toFixed(2)}%`
  }

  const formatAbsoluteChange = (change: number | null): string => {
    if (change === null) return '-'
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(3)}`
  }
  
  const getPriceChangeColor = (change: number | null): string => {
    if (change === null) return 'text-muted-foreground'
    return change >= 0 ? 'text-price-positive' : 'text-price-negative'
  }
  
  const formatVolume = (volume: number | null): string => {
    if (volume === null || volume === 0) return '$0'
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
      
      // For past dates (closed events), always show the actual date
      if (diffInMs < 0) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
      
      // For future dates (active events)
      if (diffInDays < 1) return 'Today'
      if (diffInDays === 1) return '1 day'
      if (diffInDays < 7) return `${diffInDays} days`
      if (diffInDays < 30) return `${Math.ceil(diffInDays / 7)} weeks`
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return 'Invalid date'
    }
  }

  // Calculate percentage change for display
  const calculatePercentageChange = (currentPrice: number, priceChange: number): number => {
    if (currentPrice === 0) return 0
    return (priceChange / currentPrice) * 100
  }

  // Calculate percentage price using the same method as home page
  const calculate1hPercentagePrice = (): number | null => {
    if (market.oneHourPriceChange === null || market.oneHourPriceChange === undefined) return null
    
    // old_price = current_price - price_change
    const prices = isClosed ? parseOutcomePrices(market.outcomePrices) : market.outcomePrices
    const currentPrice = prices?.[0] ? parseFloat(prices[0]) : 0
    const oldPrice = currentPrice - market.oneHourPriceChange
    if (oldPrice <= 0) return null
    
    // percentage = price_change / old_price
    return market.oneHourPriceChange / oldPrice
  }

  const calculate24hPercentagePrice = (): number | null => {
    if (market.oneDayPriceChange === null || market.oneDayPriceChange === undefined) return null
    
    // old_price = current_price - price_change
    const prices = isClosed ? parseOutcomePrices(market.outcomePrices) : market.outcomePrices
    const currentPrice = prices?.[0] ? parseFloat(prices[0]) : 0
    const oldPrice = currentPrice - market.oneDayPriceChange
    if (oldPrice <= 0) return null
    
    // percentage = price_change / old_price
    return market.oneDayPriceChange / oldPrice
  }

  const get1hPercentageChange = (): number => {
    const prices = isClosed ? parseOutcomePrices(market.outcomePrices) : market.outcomePrices
    if (!prices || prices.length === 0) return 0
    const currentPrice = parseFloat(prices[0])
    const priceChange = market.oneHourPriceChange || 0
    return calculatePercentageChange(currentPrice, priceChange)
  }

  const get24hPercentageChange = (): number => {
    const prices = isClosed ? parseOutcomePrices(market.outcomePrices) : market.outcomePrices
    if (!prices || prices.length === 0) return 0
    const currentPrice = parseFloat(prices[0])
    const priceChange = market.oneDayPriceChange || 0
    return calculatePercentageChange(currentPrice, priceChange)
  }

  // Parse outcome prices only for closed events (which return JSON strings)
  const parseOutcomePrices = (outcomePrices: string | string[]): string[] => {
    try {
      if (Array.isArray(outcomePrices)) {
        return outcomePrices
      }
      if (typeof outcomePrices === 'string') {
        // Handle JSON string format like "[\"0\", \"1\"]" for closed events
        const parsed = JSON.parse(outcomePrices)
        if (Array.isArray(parsed)) {
          return parsed
        }
      }
      return []
    } catch (error) {
      console.warn('Failed to parse outcomePrices:', outcomePrices)
      return []
    }
  }

  // Dynamic price display logic based on sort option
  const getDisplayPrice = (): { price: string; label: string } => {
    if (sortBy === 'bestBid') {
      const bestBid = market.bestBid ? parseFloat(market.bestBid) : null
      return {
        price: bestBid !== null ? formatPrice(bestBid) : '-',
        label: 'Best Bid (%)'
      }
    } else if (sortBy === 'bestAsk') {
      const bestAsk = market.bestAsk ? parseFloat(market.bestAsk) : null
      return {
        price: bestAsk !== null ? formatPrice(bestAsk) : '-',
        label: 'Best Ask (%)'
      }
    } else {
      // Default: show Yes price
      // For closed events, parse JSON string; for active events, use array directly
      const prices = isClosed ? parseOutcomePrices(market.outcomePrices) : market.outcomePrices
      const yesPrice = prices?.[0] ? parseFloat(prices[0]) : 0
      return {
        price: formatPrice(yesPrice),
        label: 'Yes (%)'
      }
    }
  }

  const displayPrice = getDisplayPrice()
  
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
            <div className="text-xs text-muted-foreground mb-1">{displayPrice.label}</div>
            <div className="font-medium">{displayPrice.price}</div>
          </div>
          {!isClosed && (
            <>
              <div className="w-24 text-center">
                <div className="text-xs text-muted-foreground mb-1">1h</div>
                <div className={`font-medium ${getPriceChangeColor(market.oneHourPriceChange || null)}`}>
                  <div>{formatPriceChange(market.oneHourPriceChange || null)}</div>
                  <div className="text-xs">{formatPercentagePrice(calculate1hPercentagePrice())}</div>
                </div>
              </div>
              <div className="w-24 text-center">
                <div className="text-xs text-muted-foreground mb-1">24h</div>
                <div className={`font-medium ${getPriceChangeColor(market.oneDayPriceChange || null)}`}>
                  <div>{formatPriceChange(market.oneDayPriceChange || null)}</div>
                  <div className="text-xs">{formatPercentagePrice(calculate24hPercentagePrice())}</div>
                </div>
              </div>
            </>
          )}
          <div className="w-24 text-right">
            <div className="text-xs text-muted-foreground mb-1">{isClosed ? 'Volume' : '24h Volume'}</div>
            <div className="font-medium">{formatVolume(isClosed ? (market.volume || market.volume24hr || null) : (market.volume24hr || null))}</div>
          </div>
        </div>

        {/* Mobile Layout (below md) */}
        <div className="flex md:hidden items-center gap-3 text-sm ml-4 flex-shrink-0">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">{displayPrice.label}</div>
            <div className="font-medium">{displayPrice.price}</div>
          </div>
          {isClosed ? (
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Volume</div>
              <div className="font-medium">{formatVolume(market.volume || market.volume24hr || null)}</div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">24h</div>
              <div className={`font-medium ${getPriceChangeColor(market.oneDayPriceChange || null)}`}>
                <div>{formatPriceChange(market.oneDayPriceChange || null)}</div>
                <div className="text-xs">{formatPercentagePrice(calculate24hPercentagePrice())}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

// Event Card Component (main cards with collapsible markets)
function EventCard({ event, sortBy, isClosed = false }: { event: Event; sortBy: string; isClosed?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)

  const formatVolume = (volume: number | null): string => {
    if (!volume || volume === 0) return '$0'
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
      
      // For past dates (closed events), always show the actual date
      if (diffInMs < 0) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
      
      // For future dates (active events)
      if (diffInDays < 1) return 'Today'
      if (diffInDays === 1) return '1 day'
      if (diffInDays < 7) return `${diffInDays} days`
      if (diffInDays < 30) return `${Math.ceil(diffInDays / 7)} weeks`
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return 'Invalid date'
    }
  }

  // Filter markets based on event status
  const displayMarkets = isClosed 
    ? event.markets // Show all markets for closed events
    : event.markets.filter(market => 
        market.active && !market.archived && !market.closed
      )

  // Calculate volume based on event status
  const displayVolume = isClosed 
    ? (event.volume || 0) // Use event.volume for closed events
    : displayMarkets.reduce((sum, market) => sum + (market.volume24hr || 0), 0) // Calculate from markets for active events

  const totalLiquidity = displayMarkets.reduce((sum, market) => 
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
                      <div className="text-xs text-muted-foreground mb-1">{isClosed ? 'Volume' : '24h Volume'}</div>
                      <div className="font-medium">{formatVolume(displayVolume)}</div>
                    </div>

                    {!isClosed ? (
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Ends</div>
                        <div className="font-medium">{formatDate(event.endDate)}</div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Closed</div>
                        <div className="font-medium">{formatDate(event.closedTime || event.closed_time || event.endDate)}</div>
                      </div>
                    )}
                  </div>

                    {/* Mobile Layout (below md) - Only show volume */}
                    <div className="flex md:hidden items-center text-sm ml-2 flex-shrink-0">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Volume</div>
                        <div className="font-medium">{formatVolume(displayVolume)}</div>
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
                Markets ({displayMarkets.length})
              </div>
                              {displayMarkets.map((market) => (
                  <MarketCard key={market.conditionId} market={market} eventSlug={event.slug} sortBy={sortBy} isClosed={isClosed} />
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
  const [eventStatus, setEventStatus] = useState<'active' | 'closed'>('active')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [excludedTags, setExcludedTags] = useState<string[]>([])
  const [minVolume, setMinVolume] = useState<string>('100') // Default to >$100
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')
  const [minBestAsk, setMinBestAsk] = useState<string>('')
  const [maxBestAsk, setMaxBestAsk] = useState<string>('')
  const [sortBy, setSortBy] = useState<string>('volume24hr') // Markets mode default - changed to volume
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [isResettingForStatusChange, setIsResettingForStatusChange] = useState(false)
  const isResettingRef = useRef(false)
  
  // Debug: Log when isResettingForStatusChange changes
  useEffect(() => {
    console.log('🚩 isResettingForStatusChange changed to:', isResettingForStatusChange)
  }, [isResettingForStatusChange])
  
  // Debug: Log when sortBy changes
  useEffect(() => {
    console.log('🎯 sortBy changed to:', sortBy)
  }, [sortBy])
  
  // Debug: Log when eventStatus changes
  useEffect(() => {
    console.log('📋 eventStatus state changed to:', eventStatus)
  }, [eventStatus])

  const itemsPerPage = 20

  // Debounce the search term (same pattern as navbar search)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Get default sort option for each view mode and status
  const getDefaultSort = (mode: 'markets' | 'events', status: 'active' | 'closed' = 'active'): string => {
    if (status === 'closed') {
      return 'endDate' // Default to closed_time for closed events/markets
    }
    return mode === 'markets' ? 'volume24hr' : 'volume24hr'
  }

  // Update sort when view mode or event status changes
  useEffect(() => {
    const validSortOptions = {
      // Active events/markets support all sort options
      active: {
        markets: ['volume24hr', 'volume1wk', 'liquidity', 'priceChange24h', 'priceChange1h', 'priceChangePercent24h', 'priceChangePercent1h', 'bestBid', 'bestAsk'],
        events: ['volume24hr', 'volume1wk', 'liquidity', 'endDate']
      },
      // Closed events/markets only support limited sort options
      closed: {
        markets: ['volume', 'endDate'],
        events: ['volume', 'endDate']
      }
    }
    
    // Get valid options for current view mode and event status
    const currentValidOptions = validSortOptions[eventStatus][viewMode]
    
    // If current sort option is not valid for the current mode/status, reset to default
    if (!currentValidOptions.includes(sortBy)) {
      setSortBy(getDefaultSort(viewMode, eventStatus))
    }
  }, [viewMode, eventStatus])

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

  // Helper function to handle excluding tags and auto-removing from include list
  const handleExcludeTags = (newExcludedTags: string[]) => {
    setExcludedTags(newExcludedTags)
    
    // Auto-remove excluded tags from selected tags
    setSelectedTags(prev => prev.filter(tag => !newExcludedTags.includes(tag)))
  }

  // Helper function to handle including tags and auto-removing from exclude list
  const handleIncludeTags = (newSelectedTags: string[]) => {
    setSelectedTags(newSelectedTags)
    
    // Auto-remove included tags from excluded tags
    setExcludedTags(prev => prev.filter(tag => !newSelectedTags.includes(tag)))
  }

  // Fetch events data
  const queryKey = eventStatus === 'active' 
    ? ['all-events', debouncedSearchTerm, eventStatus, viewMode, selectedTags, excludedTags] // Active mode: only essential params that require new data
    : ['all-events', eventStatus, viewMode, debouncedSearchTerm, selectedTags, excludedTags, sortBy, sortDirection, currentPage] // Closed mode: stable order, excluding price filters since they're not supported
  
  console.log('🔑 Query key:', JSON.stringify(queryKey), 'enabled:', !isResettingForStatusChange && !isResettingRef.current, 'isResettingForStatusChange:', isResettingForStatusChange, 'isResettingRef:', isResettingRef.current)
  
  const {
    data: allEventsData,
    isLoading: eventsLoading,
    isError: eventsError,
    error: eventsErrorDetails,
  } = useQuery<EventsResponse>({
    queryKey: queryKey,
    queryFn: async () => {
      console.log('🌐 API Request STARTED for eventStatus:', eventStatus, 'sortBy:', sortBy, 'viewMode:', viewMode, 'isResettingForStatusChange:', isResettingForStatusChange, 'isResettingRef:', isResettingRef.current)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUTS.DEFAULT)
      
      try {
        let url: URL
        
        if (eventStatus === 'active') {
          // Use existing endpoint for active events (client-side processing)
          url = new URL(API_CONFIG.ENDPOINTS.ACTIVE_MARKETS, API_CONFIG.ACTIVE_EVENTS_BASE_URL || window.location.origin)
          url.searchParams.set('limit', '9999')
          if (debouncedSearchTerm.trim()) {
            url.searchParams.set('search', debouncedSearchTerm.trim())
          }
        } else {
          // Use new endpoints for closed events (server-side processing)
          if (viewMode === 'events') {
            url = new URL(API_CONFIG.ENDPOINTS.CLOSED_EVENTS, API_CONFIG.CLOSED_EVENTS_BASE_URL)
          } else {
            url = new URL(API_CONFIG.ENDPOINTS.CLOSED_MARKETS, API_CONFIG.CLOSED_EVENTS_BASE_URL)
          }
          
          // Add server-side filtering parameters
          url.searchParams.set('limit', itemsPerPage.toString())
          url.searchParams.set('offset', ((currentPage - 1) * itemsPerPage).toString())
          
          // Map frontend sort options to API sort parameters
          const getApiSortParams = (sortBy: string, sortDirection: string) => {
            let order = 'closed_time' // Default order for closed events
            
            if (sortBy === 'volume24hr' || sortBy === 'volume1wk' || sortBy === 'liquidity' || sortBy === 'volume') {
              order = 'volume'
            } else if (sortBy === 'endDate') {
              order = 'closed_time'
            }
            
            return {
              order,
              ascending: sortDirection === 'asc'
            }
          }
          
          const { order, ascending } = getApiSortParams(sortBy, sortDirection)
          url.searchParams.set('order', order)
          url.searchParams.set('ascending', ascending.toString())
          
          if (debouncedSearchTerm.trim()) {
            url.searchParams.set('search', debouncedSearchTerm.trim())
          }
          if (selectedTags.length > 0) {
            const tagIds = selectedTags.map(tag => getTagId(tag)).filter(Boolean)
            if (tagIds.length > 0) {
              url.searchParams.set('category', tagIds.join(','))
            }
          }
          if (excludedTags.length > 0) {
            const excludeTagIds = excludedTags.map(tag => getTagId(tag)).filter(Boolean)
            if (excludeTagIds.length > 0) {
              url.searchParams.set('excludeCategory', excludeTagIds.join(','))
            }
          }
          // Note: Price filters are not supported for closed events
        }
        
        const response = await fetch(url.toString(), {
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to fetch ${eventStatus} events`)
        }

        const data = await response.json()
        return data
      } catch (error) {
        clearTimeout(timeoutId)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request timed out after ${API_CONFIG.TIMEOUTS.DEFAULT / 1000} seconds`)
        }
        throw error
      }
    },
    retry: 1,
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
    enabled: !isResettingForStatusChange && !isResettingRef.current,
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

  // Helper function to calculate percentage change
  const calculatePercentageChange = (currentPrice: number, priceChange: number): number => {
    if (!currentPrice || !priceChange) return 0
    const oldPrice = currentPrice - priceChange // oldPrice = currentPrice - changeFromOldToCurrent
    if (oldPrice <= 0) return 0
    return (priceChange / oldPrice) * 100
  }

  // Client-side filtering and sorting for events (only for active events)
  const filteredAndSortedEvents = eventStatus === 'active' && allEventsData?.events ? 
    allEventsData.events
      .filter(event => {
        // Only include events with active markets
        const activeMarkets = event.markets.filter(market => 
          market.active && !market.archived && !market.closed
        )
        if (activeMarkets.length === 0) return false

        // Tag filter - show events that have ANY of the selected tags
        if (selectedTags.length > 0) {
          const eventTagLabels = event.tags.map(tag => tag.label)
          const hasMatchingTag = selectedTags.some(selectedTag =>
            eventTagLabels.some(eventTag => 
              eventTag.toLowerCase().includes(selectedTag.toLowerCase())
            )
          )
          if (!hasMatchingTag) return false
        }

        // Exclude tags filter - exclude events that have ANY of the excluded tags
        if (excludedTags.length > 0) {
          const eventTagLabels = event.tags.map(tag => tag.label)
          const hasExcludedTag = excludedTags.some(excludedTag =>
            eventTagLabels.some(eventTag => 
              eventTag.toLowerCase().includes(excludedTag.toLowerCase())
            )
          )
          if (hasExcludedTag) return false
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

        // Volume filter - check if event meets minimum volume requirement
        if (minVolume && minVolume !== '0') {
          const minVolumeNum = parseFloat(minVolume)
          const eventVolume = activeMarkets.reduce((sum, market) => sum + (market.volume24hr || 0), 0)
          if (eventVolume < minVolumeNum) return false
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
              const aEndDate = a.closedTime || a.closed_time || a.endDate || '2099-12-31'
              const bEndDate = b.closedTime || b.closed_time || b.endDate || '2099-12-31'
              comparison = new Date(aEndDate).getTime() - new Date(bEndDate).getTime()
            break
          default:
            return 0
        }
        return sortDirection === 'desc' ? -comparison : comparison
      })
    : allEventsData?.events || [] // For closed events, use server-filtered data as-is

  // Process and filter markets for Markets view mode (only for active events)
  const filteredAndSortedMarkets = eventStatus === 'active' && viewMode === 'markets' && allEventsData?.events ? 
    (() => {
      // First filter events (same as events mode)
      const filteredEvents = allEventsData.events.filter(event => {
        // Only include events with active markets
        const activeMarkets = event.markets.filter(market => 
          market.active && !market.archived && !market.closed
        )
        if (activeMarkets.length === 0) return false

        // Tag filter - show events that have ANY of the selected tags
        if (selectedTags.length > 0) {
          const eventTagLabels = event.tags.map(tag => tag.label)
          const hasMatchingTag = selectedTags.some(selectedTag =>
            eventTagLabels.some(eventTag => 
              eventTag.toLowerCase().includes(selectedTag.toLowerCase())
            )
          )
          if (!hasMatchingTag) return false
        }

        // Exclude tags filter - exclude events that have ANY of the excluded tags
        if (excludedTags.length > 0) {
          const eventTagLabels = event.tags.map(tag => tag.label)
          const hasExcludedTag = excludedTags.some(excludedTag =>
            eventTagLabels.some(eventTag => 
              eventTag.toLowerCase().includes(excludedTag.toLowerCase())
            )
          )
          if (hasExcludedTag) return false
        }

        return true
      })

      // Extract markets from filtered events
      const allMarkets = processMarketsFromEvents(filteredEvents)

      // Filter markets
      return allMarkets
        .filter(market => {
          // Search filter (market question + event title)
          if (debouncedSearchTerm) {
            const searchLower = debouncedSearchTerm.toLowerCase()
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

          // Volume filter - check if market meets minimum volume requirement
          if (minVolume && minVolume !== '0') {
            const minVolumeNum = parseFloat(minVolume)
            // Use volume24hr for active markets, volume for closed markets
            const marketVolume = market.volume24hr || market.volume || 0
            if (marketVolume < minVolumeNum) return false
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
            case 'priceChangePercent24h':
              const aCurrentPrice24h = a.outcomePrices?.[0] ? parseFloat(a.outcomePrices[0]) : 0
              const bCurrentPrice24h = b.outcomePrices?.[0] ? parseFloat(b.outcomePrices[0]) : 0
              const aPercent24h = calculatePercentageChange(aCurrentPrice24h, a.oneDayPriceChange || 0)
              const bPercent24h = calculatePercentageChange(bCurrentPrice24h, b.oneDayPriceChange || 0)
              comparison = aPercent24h - bPercent24h
              break
            case 'priceChangePercent1h':
              const aCurrentPrice1h = a.outcomePrices?.[0] ? parseFloat(a.outcomePrices[0]) : 0
              const bCurrentPrice1h = b.outcomePrices?.[0] ? parseFloat(b.outcomePrices[0]) : 0
              const aPercent1h = calculatePercentageChange(aCurrentPrice1h, a.oneHourPriceChange || 0)
              const bPercent1h = calculatePercentageChange(bCurrentPrice1h, b.oneHourPriceChange || 0)
              comparison = aPercent1h - bPercent1h
              break
            case 'bestBid':
              const aBestBid = a.bestBid ? parseFloat(a.bestBid) : 0
              const bBestBid = b.bestBid ? parseFloat(b.bestBid) : 0
              comparison = aBestBid - bBestBid
              break
            case 'bestAsk':
              const aBestAsk = a.bestAsk ? parseFloat(a.bestAsk) : 0
              const bBestAsk = b.bestAsk ? parseFloat(b.bestAsk) : 0
              comparison = aBestAsk - bBestAsk
              break
            default:
              return 0
          }
          return sortDirection === 'desc' ? -comparison : comparison
        })
    })()
    : allEventsData?.markets || [] // For closed markets, use server-filtered data as-is

  // Determine current data and pagination
  const currentData = eventStatus === 'closed' && viewMode === 'markets' 
    ? allEventsData?.markets || []
    : viewMode === 'markets' 
      ? filteredAndSortedMarkets 
      : filteredAndSortedEvents
  
  // Calculate pagination variables based on event status
  const currentPagination = allEventsData?.pagination
  const hasMore = eventStatus === 'closed' ? (currentPagination?.hasMore || false) : false
  
  const totalPages = eventStatus === 'closed' 
    ? currentPage + (hasMore ? 1 : 0) // Show current page + potential next page
    : Math.ceil(currentData.length / itemsPerPage)
    
  const total = eventStatus === 'closed'
    ? currentData.length // Show current page items count
    : currentData.length
    
  const startIndex = eventStatus === 'closed'
    ? ((currentPagination?.page || 1) - 1) * (currentPagination?.limit || itemsPerPage) + 1
    : (currentPage - 1) * itemsPerPage + 1
    
  const endIndex = eventStatus === 'closed'
    ? startIndex + currentData.length - 1
    : Math.min(startIndex + itemsPerPage - 1, currentData.length)
    
  const paginatedData = eventStatus === 'closed'
    ? currentData // Already paginated by server
    : currentData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const hasActiveFilters = searchTerm !== '' || selectedTags.length > 0 || excludedTags.length > 0 || minVolume !== '100' || minPrice !== '' || maxPrice !== '' || minBestAsk !== '' || maxBestAsk !== '' || sortBy !== getDefaultSort(viewMode, eventStatus) || sortDirection !== 'desc'

  const clearAllFilters = () => {
    setSearchTerm('')
    setSelectedTags([])
    setExcludedTags([])
    setMinVolume('100')
    setMinPrice('')
    setMaxPrice('')
    setMinBestAsk('')
    setMaxBestAsk('')
    setSortBy(getDefaultSort(viewMode, 'active'))
    setSortDirection('desc')
    setEventStatus('active')
    setCurrentPage(1)
  }

  // Reset filters when switching between active/closed status
  const resetFiltersForStatusChange = () => {
    console.log('🧹 resetFiltersForStatusChange called for eventStatus:', eventStatus, 'viewMode:', viewMode)
    console.log('🧹 Current sortBy before reset:', sortBy)
    setSearchTerm('')
    setSelectedTags([])
    setExcludedTags([])
    setMinVolume('100')
    setMinPrice('')
    setMaxPrice('')
    setMinBestAsk('')
    setMaxBestAsk('')
    const newSort = getDefaultSort(viewMode, eventStatus)
    console.log('📊 Setting sortBy from', sortBy, 'to:', newSort)
    setSortBy(newSort)
    console.log('📊 Setting sortDirection to: desc')
    setSortDirection('desc')
    console.log('📊 Setting currentPage to: 1')
    setCurrentPage(1)
    console.log('🧹 resetFiltersForStatusChange completed')
    // Note: viewMode and eventStatus are preserved
  }

  // Reset filters when switching between active/closed status  
  useEffect(() => {
    console.log('🔄 eventStatus changed to:', eventStatus)
    
    // Set ref immediately to prevent React Query from running
    isResettingRef.current = true
    
    // Use startTransition to batch all state updates together
    startTransition(() => {
      console.log('🔄 Setting isResettingForStatusChange to TRUE and resetting all filter states')
      
      // Set the flag first
      setIsResettingForStatusChange(true)
      
      // Then update all other states in the same batch
      setSearchTerm('')
      setSelectedTags([])
      setExcludedTags([])
      setMinVolume('100')
      setMinPrice('')
      setMaxPrice('')
      setMinBestAsk('')
      setMaxBestAsk('')
      setSortBy(getDefaultSort(viewMode, eventStatus))
      setSortDirection('desc')
      setCurrentPage(1)
    })
    
    // Reset flags after React has processed all updates
    const timer = setTimeout(() => {
      console.log('🔄 Setting isResettingForStatusChange to FALSE')
      isResettingRef.current = false
      setIsResettingForStatusChange(false)
    }, 0)
    
    return () => clearTimeout(timer)
  }, [eventStatus])

  // Reset to page 1 when filters change
  useEffect(() => {
    // Skip if we're currently resetting due to status change
    if (isResettingForStatusChange || isResettingRef.current) {
      console.log('📄 Skipping currentPage reset - status change in progress')
      return
    }
    console.log('📄 Resetting currentPage to 1 due to filter changes')
    setCurrentPage(1)
  }, [debouncedSearchTerm, selectedTags, excludedTags, minVolume, minPrice, maxPrice, minBestAsk, maxBestAsk, sortBy, sortDirection])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Page Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 max-w-[1200px]">
          <h1 className="text-2xl font-bold">Prediction Markets</h1>
        </div>
      </div>

      {/* Horizontal Tag Navigation */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 max-w-[1200px]">
          <div className="flex items-center gap-6 py-3 overflow-x-auto scrollbar-hide">
            <Button
              variant={selectedTags.length === 0 ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleIncludeTags([])}
              className="whitespace-nowrap"
            >
              All
            </Button>
            {/* Multiple Select Indicator */}
            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
              Select Multi Tags
            </span>
            {PREDEFINED_TAGS.map((tag) => (
              <Button
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  const newTags = selectedTags.includes(tag) 
                    ? selectedTags.filter(t => t !== tag)
                    : [...selectedTags, tag]
                  handleIncludeTags(newTags)
                }}
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
                  {selectedTags.length > 0 && <Badge variant="secondary">Tags: {selectedTags.join(', ')}</Badge>}
                  {excludedTags.length > 0 && <Badge variant="secondary">Exclude: {excludedTags.join(', ')}</Badge>}
                  {minVolume !== '100' && <Badge variant="secondary">Min Volume: ${minVolume === '1000' ? '1K' : minVolume === '1000000' ? '1M' : minVolume}</Badge>}
                  {(minPrice || maxPrice) && <Badge variant="secondary">Price: {minPrice || '0'}-{maxPrice || '1'}</Badge>}
                  {(minBestAsk || maxBestAsk) && <Badge variant="secondary">Ask: {minBestAsk || '0'}-{maxBestAsk || '1'}</Badge>}
                  {(sortBy !== getDefaultSort(viewMode) || sortDirection !== 'desc') && <Badge variant="secondary">Sort: {sortBy} ({sortDirection})</Badge>}
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Filter Controls */}
              <div className="space-y-6">
                {/* View Mode and Status Tabs */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">VIEW & STATUS</h3>
                  <div className="flex gap-2">
                    {/* View Mode Tabs - 50% width */}
                    <div className="flex items-center gap-1 border rounded-lg p-1 flex-1">
                      <button
                        onClick={() => setViewMode('markets')}
                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          viewMode === 'markets'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Markets
                      </button>
                      <button
                        onClick={() => setViewMode('events')}
                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          viewMode === 'events'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Events
                      </button>
                    </div>
                    
                    {/* Status Tabs - 50% width */}
                    <div className="flex items-center gap-1 border rounded-lg p-1 flex-1">
                      <button
                        onClick={() => setEventStatus('active')}
                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          eventStatus === 'active'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Active
                      </button>
                      <button
                        onClick={() => setEventStatus('closed')}
                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          eventStatus === 'closed'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Closed
                      </button>
                    </div>
                  </div>
                </div>

                {/* Other Filter Controls */}
                <div className={`grid grid-cols-1 gap-6 ${eventStatus === 'closed' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>

                {/* Price Filters Group - Only show for active events */}
                {eventStatus === 'active' && (
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
                )}

                {/* Advanced Filters Group - Only show for active events */}
                {eventStatus === 'active' && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">VOLUME FILTERS</h3>
                    <div className="space-y-2">
                      <Select value={minVolume} onValueChange={setMinVolume}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Minimum Volume" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="100">Above $100</SelectItem>
                          <SelectItem value="1000">Above $1K</SelectItem>
                          <SelectItem value="1000000">Above $1M</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Sort Options Group */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">SORT OPTIONS</h3>
                  {eventStatus === 'closed' ? (
                    <div className="flex gap-2">
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="volume">Volume</SelectItem>
                          <SelectItem value="endDate">Closed Time</SelectItem>
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
                  ) : (
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
                              <SelectItem value="priceChangePercent24h">24h Price Change %</SelectItem>
                              <SelectItem value="priceChangePercent1h">1h Price Change %</SelectItem>
                              <SelectItem value="bestBid">Best Bid</SelectItem>
                              <SelectItem value="bestAsk">Best Ask</SelectItem>
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
                  )}

                </div>

                {/* Exclude Tags Filter Group */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">EXCLUDE TAGS</h3>
                  <MultiSelectTagsDropdown
                    value={excludedTags}
                    onValueChange={handleExcludeTags}
                    placeholder="Select tags to exclude..."
                  />
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
              </div>

              {/* Results Summary */}
              <div className="text-sm text-muted-foreground pt-2 border-t">
                {eventStatus === 'closed' ? (
                  `${total} ${viewMode === 'events' ? 'events' : 'markets'}`
                ) : (
                  <>
                    Showing {startIndex + 1}-{Math.min(endIndex, total)} of {total} {eventStatus} events
                    {allEventsData?.events && ` (${allEventsData.events.length} total)`}
                  </>
                )}
              </div>
            </CardContent>
          </div>

          {/* Mobile collapsible content */}
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleContent className="sm:hidden">
              <CardContent className="space-y-4">
                {/* Mobile filters - simplified */}
                <div className="space-y-4">
                  {/* View Mode and Status Tabs */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">VIEW & STATUS</h3>
                                         <div className="flex gap-2">
                       {/* View Mode Tabs - 50% width */}
                       <div className="flex items-center gap-1 border rounded-lg p-1 flex-1">
                         <button
                           onClick={() => setViewMode('markets')}
                           className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                             viewMode === 'markets'
                               ? 'bg-background text-foreground shadow-sm'
                               : 'text-muted-foreground hover:text-foreground'
                           }`}
                         >
                           Markets
                         </button>
                         <button
                           onClick={() => setViewMode('events')}
                           className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                             viewMode === 'events'
                               ? 'bg-background text-foreground shadow-sm'
                               : 'text-muted-foreground hover:text-foreground'
                           }`}
                         >
                           Events
                         </button>
                       </div>
                       
                       {/* Status Tabs - 50% width */}
                       <div className="flex items-center gap-1 border rounded-lg p-1 flex-1">
                         <button
                           onClick={() => setEventStatus('active')}
                           className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                             eventStatus === 'active'
                               ? 'bg-background text-foreground shadow-sm'
                               : 'text-muted-foreground hover:text-foreground'
                           }`}
                         >
                           Active
                         </button>
                         <button
                           onClick={() => setEventStatus('closed')}
                           className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                             eventStatus === 'closed'
                               ? 'bg-background text-foreground shadow-sm'
                               : 'text-muted-foreground hover:text-foreground'
                           }`}
                         >
                           Closed
                         </button>
                       </div>
                     </div>
                  </div>

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

                  {/* Price Filters - Only show for active events */}
                  {eventStatus === 'active' && (
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
                  )}

                  {/* Advanced Filters - Only show for active events */}
                  {eventStatus === 'active' && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-muted-foreground">VOLUME FILTERS</h3>
                      <div className="space-y-2">
                        <Select value={minVolume} onValueChange={setMinVolume}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Minimum Volume" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="100">Above $100</SelectItem>
                            <SelectItem value="1000">Above $1K</SelectItem>
                            <SelectItem value="1000000">Above $1M</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Sort */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">SORT</h3>
                    {eventStatus === 'closed' ? (
                      <div className="flex gap-2">
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="volume">Volume</SelectItem>
                            <SelectItem value="endDate">Closed Time</SelectItem>
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
                    ) : (
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
                                <SelectItem value="priceChangePercent24h">24h Price Change %</SelectItem>
                                <SelectItem value="priceChangePercent1h">1h Price Change %</SelectItem>
                                <SelectItem value="bestBid">Best Bid</SelectItem>
                                <SelectItem value="bestAsk">Best Ask</SelectItem>
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
                    )}

                  </div>

                  {/* Exclude Tags */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">EXCLUDE TAGS</h3>
                    <MultiSelectTagsDropdown
                      value={excludedTags}
                      onValueChange={handleExcludeTags}
                      placeholder="Select tags to exclude..."
                    />
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
                <p className="text-muted-foreground">
                  Loading {eventStatus} events...
                </p>
              </div>
            </div>
          ) : eventsError ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <p className="text-destructive">
                  Failed to load {eventStatus} events
                </p>
                <p className="text-sm text-muted-foreground">
                  {eventsErrorDetails instanceof Error ? eventsErrorDetails.message : 'Unknown error'}
                </p>
                {eventStatus === 'closed' && (
                  <p className="text-xs text-muted-foreground">
                    This might be a database connectivity issue. Please try again or switch to active events.
                  </p>
                )}
              </div>
            </div>
          ) : total === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">No events found</p>
            </div>
          ) : (
            viewMode === 'events' 
              ? (paginatedData as Event[]).map((event) => (
                  <EventCard key={event.id} event={event} sortBy={sortBy} isClosed={eventStatus === 'closed'} />
                ))
              : (paginatedData as (Market & { eventTitle: string; eventSlug: string; eventIcon?: string })[]).map((market) => (
                  <MarketCard key={market.conditionId} market={market} eventSlug={market.eventSlug || ''} sortBy={sortBy} isClosed={eventStatus === 'closed'} />
                ))
          )}
        </div>

        {/* Pagination */}
        {!eventsLoading && !eventsError && total > 0 && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground">
              {eventStatus === 'closed' ? `Page ${currentPage}` : `Page ${currentPage} of ${totalPages}`}
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
              {eventStatus === 'active' && (
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
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={eventStatus === 'closed' ? !hasMore : currentPage === totalPages}
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
