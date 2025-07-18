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

export function usePolymarketStatus() {
  console.log('🔌 usePolymarketStatus: Hook initialized', { timestamp: Date.now() })
  
  const [statusResult, setStatusResult] = useState<StatusResult>({
    status: null,
    responseTime: null,
    lastChecked: null,
    error: null,
    isChecking: false
  })

  const checkStatus = async () => {
    setStatusResult(prev => ({ ...prev, isChecking: true }))
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

      setStatusResult({
        status: data,
        responseTime,
        lastChecked: new Date(),
        error: null,
        isChecking: false
      })

    } catch (error) {
      const endTime = performance.now()
      const responseTime = Math.round(endTime - startTime)

      setStatusResult({
        status: null,
        responseTime: responseTime > 10000 ? null : responseTime,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
        isChecking: false
      })
    }
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