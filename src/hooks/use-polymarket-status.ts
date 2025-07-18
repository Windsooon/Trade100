import { useState, useEffect } from 'react'

interface PolymarketStatus {
  page: {
    name: string
    url: string
    status: 'UP' | 'DOWN' | 'DEGRADED'
  }
  activeIncidents?: Array<{
    id: string
    name: string
    started: string
    status: string
    impact: string
    url: string
    updatedAt: string
  }>
  activeMaintenances?: Array<{
    id: string
    name: string
    start: string
    status: string
    duration: string
    url: string
    updatedAt: string
  }>
}

interface StatusResult {
  status: PolymarketStatus | null
  responseTime: number | null
  lastChecked: Date | null
  error: string | null
  isChecking: boolean
}

// Global cache to prevent duplicate API calls
let globalCache: { result: StatusResult; timestamp: number } | null = null
let globalPromise: Promise<StatusResult> | null = null
const CACHE_DURATION = 5000 // 5 seconds

export function usePolymarketStatus() {
  console.log('🔌 usePolymarketStatus: Hook initialized', { timestamp: Date.now() })
  
  const [statusResult, setStatusResult] = useState<StatusResult>(() => {
    const now = Date.now()
    if (globalCache && (now - globalCache.timestamp) < CACHE_DURATION) {
      console.log('🔌 usePolymarketStatus: Using cached result')
      return globalCache.result
    }
    return {
      status: null,
      responseTime: null,
      lastChecked: null,
      error: null,
      isChecking: false
    }
  })

  const checkStatus = async () => {
    // Check cache first
    const now = Date.now()
    if (globalCache && (now - globalCache.timestamp) < CACHE_DURATION) {
      console.log('🔌 usePolymarketStatus: Using cached result instead of API call')
      setStatusResult(globalCache.result)
      return
    }

    // If already fetching, wait for that result
    if (globalPromise) {
      console.log('🔌 usePolymarketStatus: Waiting for existing API call')
      const result = await globalPromise
      setStatusResult(result)
      return
    }

    console.log('🔌 usePolymarketStatus: Making new API call')
    setStatusResult(prev => ({ ...prev, isChecking: true }))
    
    // Create shared promise
    globalPromise = (async (): Promise<StatusResult> => {
      const startTime = performance.now()

    try {
      const response = await fetch('/api/polymarket-status', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      })

      const endTime = performance.now()
      const responseTime = Math.round(endTime - startTime)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch status')
      }

        const data: PolymarketStatus = result.data

        const finalResult: StatusResult = {
          status: data,
          responseTime,
          lastChecked: new Date(),
          error: null,
          isChecking: false
        }

        // Cache the result
        globalCache = { result: finalResult, timestamp: Date.now() }
        return finalResult

      } catch (error) {
        const endTime = performance.now()
        const responseTime = Math.round(endTime - startTime)

        const finalResult: StatusResult = {
          status: null,
          responseTime: responseTime > 10000 ? null : responseTime,
          lastChecked: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
          isChecking: false
        }

        // Cache the error result too (for shorter time)
        globalCache = { result: finalResult, timestamp: Date.now() }
        return finalResult
      } finally {
        globalPromise = null
      }
    })()

    const result = await globalPromise
    setStatusResult(result)
  }

  // Check status on component mount and set up interval
  useEffect(() => {
    checkStatus() // Initial check

    // Set up interval to check every minute
    const interval = setInterval(checkStatus, 60 * 1000) // 60 seconds

    return () => clearInterval(interval)
  }, [])

  const getStatusDisplay = () => {
    if (statusResult.isChecking) {
      return {
        text: 'Checking...',
        color: 'text-muted-foreground'
      }
    }

    if (statusResult.error) {
      return {
        text: 'Error',
        color: 'text-destructive'
      }
    }

    if (!statusResult.status) {
      return {
        text: 'Unknown',
        color: 'text-muted-foreground'
      }
    }

    const { status } = statusResult.status.page
    const hasIncidents = statusResult.status.activeIncidents && statusResult.status.activeIncidents.length > 0
    const hasMaintenances = statusResult.status.activeMaintenances && statusResult.status.activeMaintenances.length > 0

    if (hasIncidents) {
      return {
        text: 'Issues',
        color: 'text-destructive'
      }
    }

    if (hasMaintenances) {
      return {
        text: 'Maintenance',
        color: 'text-yellow-600'
      }
    }

    switch (status) {
      case 'UP':
        return {
          text: 'Up',
          color: 'text-green-600'
        }
      case 'DEGRADED':
        return {
          text: 'Degraded',
          color: 'text-yellow-600'
        }
      case 'DOWN':
        return {
          text: 'Down',
          color: 'text-destructive'
        }
      default:
        return {
          text: 'Unknown',
          color: 'text-muted-foreground'
        }
    }
  }

  const formatResponseTime = (ms: number | null): string => {
    if (ms === null) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return {
    ...statusResult,
    statusDisplay: getStatusDisplay(),
    formattedResponseTime: formatResponseTime(statusResult.responseTime),
    refetch: checkStatus
  }
} 