import { useCallback, useRef } from 'react'
import { MarketHistoryResponse, MarketHistoryDataPoint, TimePeriod } from '../types'
import { calculateTimeRange, calculateLatestDataRange } from '../utils/dataProcessing'

// Global cache for market history to prevent duplicate API calls
const globalMarketHistoryCache = new Map<string, { data: MarketHistoryResponse; timestamp: number }>()
const globalMarketHistoryPromises = new Map<string, Promise<MarketHistoryResponse>>()
const MARKET_HISTORY_CACHE_DURATION = 30000 // 30 seconds

// Local cache
const CACHE_DURATION = 60 * 1000 // 1 minute cache

interface UseMarketDataOptions {
  onError?: (error: string) => void
  onSuccess?: (data: MarketHistoryDataPoint[]) => void
}

export function useMarketData(options: UseMarketDataOptions = {}) {
  const cacheRef = useRef<Map<string, { data: MarketHistoryDataPoint[]; timestamp: number }>>(new Map())
  const activeRequestsRef = useRef<Set<string>>(new Set())

  // Check if we have valid cached data
  const getCachedData = useCallback((cacheKey: string): MarketHistoryDataPoint[] | null => {
    const cached = cacheRef.current.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data
    }
    return null
  }, [])

  // Store data in cache
  const setCachedData = useCallback((cacheKey: string, data: MarketHistoryDataPoint[]) => {
    cacheRef.current.set(cacheKey, {
      data,
      timestamp: Date.now()
    })
  }, [])

  // Fetch market history data
  const fetchMarketHistory = useCallback(async (
    marketId: string,
    period: TimePeriod
  ): Promise<MarketHistoryDataPoint[]> => {
    const { startTs, endTs, fidelity } = calculateTimeRange(period)
    const requestKey = `${marketId}-${period}-${fidelity}`

    console.log('📈 fetchMarketHistory called:', {
      marketId,
      period,
      requestKey,
      activeRequests: Array.from(activeRequestsRef.current),
      globalPromises: Array.from(globalMarketHistoryPromises.keys())
    })

    // Check global cache first
    const now = Date.now()
    const cachedData = globalMarketHistoryCache.get(requestKey)
    if (cachedData && (now - cachedData.timestamp) < MARKET_HISTORY_CACHE_DURATION) {
      console.log('💾 Using cached fetchMarketHistory data:', requestKey)
      const result = cachedData.data.data
      options.onSuccess?.(result)
      return result
    }

    // Check if request is already in progress globally
    const existingPromise = globalMarketHistoryPromises.get(requestKey)
    if (existingPromise) {
      try {
        const result = await existingPromise
        options.onSuccess?.(result.data)
        return result.data
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load market data'
        options.onError?.(errorMessage)
        throw error
      }
    }

    // Check if this exact request is already active locally
    if (activeRequestsRef.current.has(requestKey)) {
      throw new Error('Request already in progress')
    }

    // Mark this request as active immediately
    activeRequestsRef.current.add(requestKey)

    try {
      // Check local cache first
      const cacheKey = requestKey
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        options.onSuccess?.(cachedData)
        return cachedData
      }

      // Create API promise
      const apiPromise = (async (): Promise<MarketHistoryResponse> => {
        const url = `https://trade-analyze-production.up.railway.app/api/market-history?market=${encodeURIComponent(marketId)}&startTs=${startTs}&endTs=${endTs}&fidelity=${fidelity}`
        
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch market history: ${response.status}`)
        }
        
        const result: MarketHistoryResponse = await response.json()
        
        if (!result.data || result.data.length === 0) {
          throw new Error('No market history data available for this period.')
        }
        
        // Store in global cache
        globalMarketHistoryCache.set(requestKey, { data: result, timestamp: Date.now() })
        
        return result
      })()

      // Register the global promise
      globalMarketHistoryPromises.set(requestKey, apiPromise)

      const result = await apiPromise
      
      // Store raw data and cache it locally
      setCachedData(cacheKey, result.data)
      options.onSuccess?.(result.data)
      
      return result.data

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      options.onError?.(`Error loading market history: ${errorMessage}`)
      throw error
    } finally {
      // Always clean up the active request marker
      activeRequestsRef.current.delete(requestKey)
      globalMarketHistoryPromises.delete(requestKey)
    }
  }, [getCachedData, setCachedData, options])

  // Fetch latest data point for real-time updates
  const fetchLatestDataPoint = useCallback(async (
    marketId: string,
    period: TimePeriod
  ): Promise<MarketHistoryDataPoint | null> => {
    const { startTs, endTs, fidelity } = calculateLatestDataRange(period)
    const requestKey = `latest-${marketId}-${period}-${fidelity}-${startTs}-${endTs}`
    
    console.log('🔄 fetchLatestDataPoint called:', {
      marketId,
      period,
      requestKey,
      activeRequests: Array.from(activeRequestsRef.current),
      globalPromises: Array.from(globalMarketHistoryPromises.keys())
    })

    // Check if this exact request is already active
    if (activeRequestsRef.current.has(requestKey)) {
      console.log('⚠️ Duplicate fetchLatestDataPoint request blocked:', requestKey)
      throw new Error('Latest data request already in progress')
    }

    // Check if request is already in progress globally
    const existingPromise = globalMarketHistoryPromises.get(requestKey)
    if (existingPromise) {
      console.log('🔄 Using existing fetchLatestDataPoint promise:', requestKey)
      try {
        const result = await existingPromise
        return result.data[result.data.length - 1] || null
      } catch (error) {
        console.error('❌ Existing fetchLatestDataPoint promise failed:', error)
        throw error
      }
    }

    // Mark this request as active
    activeRequestsRef.current.add(requestKey)
    console.log('✅ Starting new fetchLatestDataPoint request:', requestKey)

    try {
      const url = `https://trade-analyze-production.up.railway.app/api/market-history?market=${encodeURIComponent(marketId)}&startTs=${startTs}&endTs=${endTs}&fidelity=${fidelity}`
      
      console.log('🌐 Making fetchLatestDataPoint API call:', url)
      
      // Create and register the promise
      const apiPromise = (async (): Promise<MarketHistoryResponse> => {
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch latest data: ${response.status}`)
        }
        
        const result: MarketHistoryResponse = await response.json()
        
        if (!result.data || result.data.length === 0) {
          throw new Error('No latest data available')
        }
        
        return result
      })()

      // Register the global promise
      globalMarketHistoryPromises.set(requestKey, apiPromise)
      
      const result = await apiPromise
      
      console.log('✅ fetchLatestDataPoint completed:', {
        requestKey,
        dataPoints: result.data.length,
        latestTimestamp: result.data[result.data.length - 1]?.timestamp
      })
      
      // Return the latest data point (last in array)
      return result.data[result.data.length - 1]
      
    } catch (error) {
      console.error('❌ fetchLatestDataPoint error:', error)
      throw error
    } finally {
      // Clean up
      activeRequestsRef.current.delete(requestKey)
      globalMarketHistoryPromises.delete(requestKey)
      console.log('🧹 Cleaned up fetchLatestDataPoint request:', requestKey)
    }
  }, [])

  const clearActiveRequests = useCallback(() => {
    activeRequestsRef.current.clear()
  }, [])

  return {
    fetchMarketHistory,
    fetchLatestDataPoint,
    clearActiveRequests,
    getCachedData,
    setCachedData
  }
}