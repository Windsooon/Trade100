import { NextRequest, NextResponse } from 'next/server'
import { Event } from '@/lib/stores'
import { proxyFetch } from '@/lib/fetch'

const POLYMARKET_API_URL = 'https://gamma-api.polymarket.com'

// Cache for storing filtered events data
let eventsCache: Event[] = []
let cacheTimestamp: number = 0
const CACHE_DURATION = 30 * 1000 // 30 seconds

// Define interfaces for API response types
interface ApiEvent {
  id: string
  title: string
  slug?: string
  startDate: string
  endDate: string
  volume?: number
  volume24hr?: number
  volume1wk?: number
  volume1mo?: number
  liquidity?: number
  markets?: ApiMarket[]
  tags?: ApiTag[]
  negRisk?: boolean
  icon?: string
  image?: string
}

interface ApiMarket {
  id?: string
  question: string
  conditionId: string
  groupItemTitle?: string
  bestBid?: string
  bestAsk?: string
  outcomePrices: string | string[]
  oneHourPriceChange?: number
  oneDayPriceChange?: number
  oneWeekPriceChange?: number
  oneMonthPriceChange?: number
  volume24hr?: number
  volume1wk?: number
  volume1mo?: number
  active?: boolean
  archived?: boolean
  closed?: boolean
  clobTokenIds?: string
  lastTradePrice?: number
  endDateIso?: string
  endDate?: string
  startDate?: string
  icon?: string
  image?: string
  description?: string
  liquidity?: number
}

interface ApiTag {
  id: string
  label: string
}

// Function to filter and transform API response to our simplified Event structure
function transformEvent(apiEvent: ApiEvent): Event {
  return {
    id: apiEvent.id,
    title: apiEvent.title,
    slug: apiEvent.slug || apiEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    startDate: apiEvent.startDate,
    endDate: apiEvent.endDate,
    // Only set volume fields if they exist and are valid numbers, otherwise leave undefined
    volume: (typeof apiEvent.volume === 'number' && apiEvent.volume > 0) ? apiEvent.volume : undefined,
    volume24hr: (typeof apiEvent.volume24hr === 'number' && apiEvent.volume24hr > 0) ? apiEvent.volume24hr : undefined,
    volume1wk: (typeof apiEvent.volume1wk === 'number' && apiEvent.volume1wk > 0) ? apiEvent.volume1wk : undefined,
    volume1mo: (typeof apiEvent.volume1mo === 'number' && apiEvent.volume1mo > 0) ? apiEvent.volume1mo : undefined,
    liquidity: (typeof apiEvent.liquidity === 'number' && apiEvent.liquidity > 0) ? apiEvent.liquidity : undefined,
    negRisk: apiEvent.negRisk,
    icon: apiEvent.icon || apiEvent.image,
    markets: apiEvent.markets?.map((market: ApiMarket) => {
      // Function to safely parse the nested JSON string format
      function parseOutcomePrices(outcomePricesData: string | string[]): string[] {
        try {
          // If it's already an array, return it
          if (Array.isArray(outcomePricesData)) {
            return outcomePricesData
          }
          
          // If it's a string, try to parse the JSON
          if (typeof outcomePricesData === 'string') {
            // Handle the nested format: "[\"0.9765\", \"0.0235\"]"
            const parsed = JSON.parse(outcomePricesData)
            if (Array.isArray(parsed)) {
              return parsed
            }
          }
          
          return []
        } catch (error) {
          console.warn('Failed to parse outcomePrices:', {
            question: market.question,
            outcomePrices: outcomePricesData,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          return []
        }
      }
      
      const parsedOutcomePrices = parseOutcomePrices(market.outcomePrices)
      
      const transformedMarket = {
        id: market.id,
        question: market.question,
        conditionId: market.conditionId,
        groupItemTitle: market.groupItemTitle,
        bestBid: market.bestBid,
        bestAsk: market.bestAsk,
        outcomePrices: parsedOutcomePrices,
        oneHourPriceChange: market.oneHourPriceChange,
        oneDayPriceChange: market.oneDayPriceChange,
        oneWeekPriceChange: market.oneWeekPriceChange,
        oneMonthPriceChange: market.oneMonthPriceChange,
        volume24hr: market.volume24hr,
        volume1wk: market.volume1wk,
        volume1mo: market.volume1mo,
        active: market.active,
        archived: market.archived,
        closed: market.closed,
        clobTokenIds: market.clobTokenIds,
        lastTradePrice: market.lastTradePrice,
        endDateIso: market.endDateIso,
        endDate: market.endDate,
        startDate: market.startDate,
        icon: market.icon || market.image,
        image: market.image || market.icon,
        description: market.description,
        liquidity: market.liquidity
      }
      

      
      return transformedMarket
    }) || [],
    tags: apiEvent.tags?.map((tag: ApiTag) => ({
      id: tag.id,
      label: tag.label
    })) || []
  }
}

// Store for detailed fetch logs to send to frontend
let fetchLogs: Array<{stage: string, message: string, isError: boolean}> = []

function addFetchLog(stage: string, message: string, isError: boolean = false) {
  fetchLogs.push({ stage, message, isError })
  console.log(message)
  // Keep only last 10 logs
  if (fetchLogs.length > 10) {
    fetchLogs = fetchLogs.slice(-10)
  }
}

async function fetchAllEvents() {
  // Reset logs for new fetch
  fetchLogs = []
  
  // Define the 3 parallel requests with different offsets
  const offsets = [0, 500, 1000]
  const limit = 500
  
  addFetchLog('request', `Sending 3 parallel requests to Polymarket API with offsets: ${offsets.join(', ')}`)
  
  // Define the result type
  type FetchResult = {
    offset: number
    events: ApiEvent[]
    hasMore: boolean
    error?: string
  }
  
  try {
    // Create all 3 requests simultaneously
    const requests = offsets.map(offset => {
      const url = `${POLYMARKET_API_URL}/events/pagination?limit=${limit}&offset=${offset}&active=true&archived=false&closed=false&order=volume24hr&ascending=false`
      addFetchLog('request', `Creating request for offset ${offset}`)
      
      return proxyFetch(url, {
        headers: {
          'User-Agent': 'Polymarket Dashboard',
          'Accept': 'application/json',
        },
      }).then(async response => {
        if (!response.ok) {
          throw new Error(`Polymarket API error at offset ${offset}: ${response.status} ${response.statusText}`)
        }
        
        const data: { data?: ApiEvent[], pagination?: { hasMore?: boolean } } = await response.json()
        const events = data.data || []
        
        addFetchLog('success', `✅ Offset ${offset}: Got ${events.length} events`)
        
        return {
          offset,
          events,
          hasMore: data.pagination?.hasMore || false
        } as FetchResult
      }).catch(error => {
        addFetchLog('error', `❌ Offset ${offset}: ${error instanceof Error ? error.message : 'Unknown error'}`, true)
        return {
          offset,
          events: [],
          hasMore: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        } as FetchResult
      })
    })
    
    // Wait for all requests to complete
    addFetchLog('request', 'Waiting for all parallel requests to complete...')
    const results = await Promise.all(requests)
    
    // Combine all results
    const allEvents: Event[] = []
    let totalFetched = 0
    let hasErrors = false
    
    // Sort results by offset to maintain order
    results.sort((a, b) => a.offset - b.offset)
    
    for (const result of results) {
      if (result.error) {
        hasErrors = true
        continue
      }
      
      if (result.events.length > 0) {
        const transformedEvents = result.events.map(transformEvent)
        allEvents.push(...transformedEvents)
        totalFetched += result.events.length
      }
    }
    
    if (hasErrors && allEvents.length === 0) {
      throw new Error('All parallel requests failed')
    }
    
    addFetchLog('complete', `🎉 Parallel fetch complete! Total: ${allEvents.length} events from ${totalFetched} raw records`)
    
    // Log summary of each batch
    results.forEach(result => {
      if (!result.error && result.events.length > 0) {
        addFetchLog('summary', `Batch ${result.offset}-${result.offset + result.events.length - 1}: ${result.events.length} events`)
      }
    })
    
    return allEvents
    
  } catch (error) {
    addFetchLog('error', `Parallel fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`, true)
    throw error
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const category = searchParams.get('category')
  const minPrice = searchParams.get('minPrice')
  const maxPrice = searchParams.get('maxPrice')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    // Check if cache is valid
    const now = Date.now()
    if (!eventsCache.length || (now - cacheTimestamp) > CACHE_DURATION) {
      try {
        eventsCache = await fetchAllEvents()
        cacheTimestamp = now
      } catch (error) {
        console.error('Failed to fetch fresh data:', error)
        
        // If we have cached data, use it even if expired
        if (eventsCache.length > 0) {
          console.log('Using expired cache data due to fetch error')
        } else {
          // No cached data and fetch failed
          return NextResponse.json({
            error: 'Unable to fetch market data. Please try again later.',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 503 })
        }
      }
    }

    // Filter events based on search parameters
    let filteredEvents = [...eventsCache]

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredEvents = filteredEvents.filter(event => 
        event.title?.toLowerCase().includes(searchLower)
      )
    }

    // Apply category filter
    if (category) {
      filteredEvents = filteredEvents.filter(event => 
        event.tags?.some((tag) => tag.id === category || tag.label.toLowerCase().includes(category.toLowerCase()))
      )
    }

    // Apply price filters (based on first market's first outcome price)
    if (minPrice || maxPrice) {
      filteredEvents = filteredEvents.filter(event => {
        const firstMarket = event.markets?.[0]
        if (!firstMarket?.outcomePrices) return true
        
        const price = parseFloat(firstMarket.outcomePrices[0])
        if (minPrice && price < parseFloat(minPrice)) return false
        if (maxPrice && price > parseFloat(maxPrice)) return false
        return true
      })
    }

    // Apply pagination
    const total = filteredEvents.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex)

    return NextResponse.json({
      events: paginatedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      logs: fetchLogs,
      cache: {
        totalEvents: eventsCache.length,
        lastUpdated: new Date(cacheTimestamp).toISOString(),
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 