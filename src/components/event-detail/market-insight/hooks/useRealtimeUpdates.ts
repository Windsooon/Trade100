import { useCallback, useRef, useState } from 'react'
import { ISeriesApi } from 'lightweight-charts'
import { MarketHistoryDataPoint, VolumeType, TimePeriod } from '../types'
import { useMarketData } from './useMarketData'

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
      marketId,
      selectedPeriod,
      hasExistingInterval: !!realtimeIntervalRef.current
    })

    if (realtimeIntervalRef.current) {
      console.log('🛑 Clearing existing realtime interval')
      clearInterval(realtimeIntervalRef.current)
    }

    if (!marketId) {
      console.log('❌ No marketId provided, aborting realtime updates')
      return
    }

    setRealtimeActive(true)
    setRealtimeError(null)

    console.log('⏰ Setting up realtime interval (10s)')
    realtimeIntervalRef.current = setInterval(async () => {
      console.log('⏰ Realtime interval tick - fetching latest data')
      try {
        const latestData = await fetchLatestDataPoint(marketId, selectedPeriod)
        if (latestData) {
          console.log('✅ Got latest data, updating chart:', latestData.timestamp)
          updateChartWithLatestData(latestData)
          setRealtimeError(null) // Clear any previous errors
        } else {
          console.log('⚠️ No latest data received')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch real-time data'
        console.error('❌ Real-time update error:', error)
        setRealtimeError(errorMessage)
      }
    }, 10000) // 10 seconds interval
  }, [marketId, selectedPeriod, fetchLatestDataPoint, updateChartWithLatestData])

  // Stop real-time updates
  const stopRealtimeUpdates = useCallback(() => {
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current)
      realtimeIntervalRef.current = null
    }
    setRealtimeActive(false)
    setRealtimeError(null)
  }, [])

  // Set latest timestamp (used when initial data is loaded)
  const setLatestTimestamp = useCallback((timestamp: number) => {
    latestTimestampRef.current = timestamp
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
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