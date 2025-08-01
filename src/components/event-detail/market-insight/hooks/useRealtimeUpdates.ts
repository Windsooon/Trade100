import { useCallback, useRef, useState } from 'react'
import { ISeriesApi } from 'lightweight-charts'
import { MarketHistoryDataPoint, VolumeType, TimePeriod } from '../types'
import { useMarketData } from './useMarketData'

// Global registry to prevent multiple realtime intervals for the same market
const activeRealtimeIntervals = new Map<string, string>() // marketId -> hookId

interface UseRealtimeUpdatesOptions {
  chartType: 'candle' | 'line'
  volumeType: VolumeType
  selectedPeriod: TimePeriod
  marketId?: string
  seriesRef: React.RefObject<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>
  volumeSeriesRef: React.RefObject<ISeriesApi<'Histogram'> | null>
  rawDataRef: React.RefObject<MarketHistoryDataPoint[]>
  volumeDataRef: React.RefObject<MarketHistoryDataPoint[]>
  onNewData?: () => void
}

export function useRealtimeUpdates({
  chartType,
  volumeType,
  selectedPeriod,
  marketId,
  seriesRef,
  volumeSeriesRef,
  rawDataRef,
  volumeDataRef,
  onNewData
}: UseRealtimeUpdatesOptions) {
  // Log hook initialization
  const hookId = useRef(Math.random().toString(36).substr(2, 6))
  console.log('🏗️ useRealtimeUpdates hook created:', hookId.current, { marketId, selectedPeriod })
  
  const [realtimeActive, setRealtimeActive] = useState(false)
  const [realtimeError, setRealtimeError] = useState<string | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [newDataHighlight, setNewDataHighlight] = useState(false)
  
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const latestTimestampRef = useRef<number | null>(null)
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const { fetchLatestDataPoint } = useMarketData({
    onError: (error) => setRealtimeError(error)
  })

  // Update or insert data point based on timestamp comparison
  const updateChartWithLatestData = useCallback((newDataPoint: MarketHistoryDataPoint) => {
    if (!seriesRef.current || !volumeSeriesRef.current) {
      return
    }

    const newTimestamp = newDataPoint.timestamp
    const currentLatest = latestTimestampRef.current

    // Prepare new chart data point based on chart type
    const newChartPoint = chartType === 'candle' ? {
      time: newTimestamp as any,
      open: newDataPoint.price.open,
      high: newDataPoint.price.high,
      low: newDataPoint.price.low,
      close: newDataPoint.price.close
    } : {
      time: newTimestamp as any,
      value: newDataPoint.price.close
    }

    // Prepare new volume data point
    const newVolumePoint = {
      time: newTimestamp as any,
      value: volumeType === 'totalDollarVolume' ? newDataPoint.volume.totalDollarVolume : newDataPoint.volume.totalSize,
      color: newDataPoint.price.close >= newDataPoint.price.open ? '#26a69a' : '#ef5350'
    }

    if (currentLatest === newTimestamp) {
      // Same timestamp - update existing data point
      seriesRef.current.update(newChartPoint)
      volumeSeriesRef.current.update(newVolumePoint)
      
      // Update the data in our refs
      const rawData = rawDataRef.current
      const lastIndex = rawData.length - 1
      if (lastIndex >= 0 && rawData[lastIndex].timestamp === newTimestamp) {
        rawData[lastIndex] = newDataPoint
        volumeDataRef.current[lastIndex] = newDataPoint
      }
    } else if (newTimestamp > (currentLatest || 0)) {
      // New timestamp - insert new data point
      seriesRef.current.update(newChartPoint)
      volumeSeriesRef.current.update(newVolumePoint)
      
      // Add to our data refs
      rawDataRef.current.push(newDataPoint)
      volumeDataRef.current.push(newDataPoint)
      
      // Update latest timestamp
      latestTimestampRef.current = newTimestamp
      
      // Trigger highlight effect
      setNewDataHighlight(true)
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
      highlightTimeoutRef.current = setTimeout(() => {
        setNewDataHighlight(false)
      }, 2000) // Highlight for 2 seconds
      
      onNewData?.()
    }
    // If newTimestamp < currentLatest, ignore (out-of-order data)
    
    setLastUpdateTime(new Date())
  }, [chartType, volumeType, seriesRef, volumeSeriesRef, rawDataRef, volumeDataRef, onNewData])

  // Start real-time updates
  const startRealtimeUpdates = useCallback(() => {
    console.log('🚀 startRealtimeUpdates called:', {
      hookId: hookId.current,
      marketId,
      selectedPeriod,
      hasExistingInterval: !!realtimeIntervalRef.current,
      isActive: realtimeActive,
      globalActiveIntervals: Array.from(activeRealtimeIntervals.entries())
    })

    if (!marketId) {
      console.log('❌ No marketId provided, aborting realtime updates')
      return
    }

    // Check if another hook is already handling this market
    const existingHookId = activeRealtimeIntervals.get(marketId)
    if (existingHookId && existingHookId !== hookId.current) {
      console.log('⚠️ Another hook is already handling realtime updates for this market:', existingHookId)
      return
    }

    // Prevent multiple intervals from being created in this hook
    if (realtimeIntervalRef.current || realtimeActive) {
      console.log('⚠️ Real-time updates already active or interval exists in this hook, skipping')
      return
    }

    // Register this hook as the active handler for this market
    activeRealtimeIntervals.set(marketId, hookId.current)
    
    setRealtimeActive(true)
    setRealtimeError(null)

    console.log('⏰ Setting up realtime interval (10s) for hook:', hookId.current, 'market:', marketId)
    realtimeIntervalRef.current = setInterval(async () => {
      console.log('⏰ Realtime interval tick - fetching latest data (hook:', hookId.current, ')')
      try {
        const latestData = await fetchLatestDataPoint(marketId, selectedPeriod)
        if (latestData) {
          console.log('✅ Got latest data, updating chart:', latestData.timestamp, '(hook:', hookId.current, ')')
          updateChartWithLatestData(latestData)
          setRealtimeError(null) // Clear any previous errors
        } else {
          console.log('⚠️ No latest data received (hook:', hookId.current, ')')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch real-time data'
        console.error('❌ Real-time update error (hook:', hookId.current, '):', error)
        setRealtimeError(errorMessage)
      }
    }, 10000) // 10 seconds interval
  }, [marketId, selectedPeriod, fetchLatestDataPoint, updateChartWithLatestData, realtimeActive])

  // Stop real-time updates
  const stopRealtimeUpdates = useCallback(() => {
    console.log('🛑 stopRealtimeUpdates called for hook:', hookId.current, {
      marketId,
      hasInterval: !!realtimeIntervalRef.current,
      isActive: realtimeActive
    })
    
    if (realtimeIntervalRef.current) {
      console.log('🗑️ Clearing interval for hook:', hookId.current, 'market:', marketId)
      clearInterval(realtimeIntervalRef.current)
      realtimeIntervalRef.current = null
    }
    
    // Remove this hook from the global registry if it was the active one
    if (marketId && activeRealtimeIntervals.get(marketId) === hookId.current) {
      console.log('🗑️ Removing hook from global registry:', hookId.current, 'market:', marketId)
      activeRealtimeIntervals.delete(marketId)
    }
    
    setRealtimeActive(false)
    setRealtimeError(null)
  }, [realtimeActive, marketId])

  // Set latest timestamp (used when initial data is loaded)
  const setLatestTimestamp = useCallback((timestamp: number) => {
    latestTimestampRef.current = timestamp
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 Cleanup called for hook:', hookId.current)
    stopRealtimeUpdates()
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
    }
  }, [stopRealtimeUpdates])

  return {
    realtimeActive,
    realtimeError,
    lastUpdateTime,
    newDataHighlight,
    startRealtimeUpdates,
    stopRealtimeUpdates,
    setLatestTimestamp,
    updateChartWithLatestData,
    cleanup
  }
}