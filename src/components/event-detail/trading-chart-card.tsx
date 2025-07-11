"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { Market, Event } from '@/lib/stores'
import { createChart, IChartApi, ISeriesApi, CandlestickData, ColorType, CandlestickSeries, LogicalRange, LineSeries, LineData, HistogramSeries, HistogramData } from 'lightweight-charts'

interface TradingChartCardProps {
  selectedMarket: Market | null
  selectedToken: 'yes' | 'no'
  event: Event
}

type TimePeriod = '1m' | '1h' | '6h' | '1d'

interface ApiCandlestickData {
  time: number
  open: number
  high: number
  low: number
  close: number
}

interface VolumeData {
  timestamp: number
  totalSize: number
  totalDollarVolume: number
}

type VolumeType = 'totalSize' | 'totalDollarVolume'

export function TradingChartCard({ selectedMarket, selectedToken, event }: TradingChartCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1h')
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingHistorical, setLoadingHistorical] = useState(false)
  const [volumeType, setVolumeType] = useState<VolumeType>('totalDollarVolume')
  const [volumeError, setVolumeError] = useState<string | null>(null)
  
  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  
  // Data refs
  const allDataRef = useRef<CandlestickData[]>([])
  const realTimeDataRef = useRef<LineData[]>([])
  const volumeDataRef = useRef<VolumeData[]>([])
  
  // State tracking refs - simplified into single state object
  const stateRef = useRef({
    selectedMarket: selectedMarket,
    selectedToken: selectedToken,
    selectedPeriod: selectedPeriod,
    isLiveMode: isLiveMode,
    loadingHistorical: false,
    oldestLoadedTimestamp: null as number | null,
    currentTime: Math.floor(Date.now() / 1000),
    requestedTimestamps: new Set<number>(),
    lastRequestTime: 0
  })
  
  // Update state ref when props/state change
  stateRef.current.selectedMarket = selectedMarket
  stateRef.current.selectedToken = selectedToken
  stateRef.current.selectedPeriod = selectedPeriod
  stateRef.current.isLiveMode = isLiveMode
  stateRef.current.loadingHistorical = loadingHistorical

  const getFidelity = useCallback((period: TimePeriod): number => {
    switch (period) {
      case '1m': return 1
      case '1h': return 60
      case '6h': return 360
      case '1d': return 1440
      default: return 1440
    }
  }, [])

  const formatVolume = useCallback((value: number, isDollar: boolean = false): string => {
    const prefix = isDollar ? '$' : ''
    if (value >= 1000000) {
      return `${prefix}${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${prefix}${(value / 1000).toFixed(1)}K`
    }
    return `${prefix}${value.toFixed(0)}`
  }, [])

  // Calculate time range with period-specific candle counts
  const getTimeRange = useCallback((period: TimePeriod, endTs?: number) => {
    const now = endTs || Math.floor(Date.now() / 1000)
    const fidelity = getFidelity(period)
    
    // Use very small candle counts to avoid "interval too long" error from Polymarket API
    const candleCount = {
      '1m': 200,  
      '1h': 200,  
      '6h': 60,   // 60 * 6 hours = 360 hours (15 days)
      '1d': 14,   // 14 days = 2 weeks
    }[period] || 50
    
    const secondsPerCandle = fidelity * 60 // Convert minutes to seconds
    const totalSeconds = candleCount * secondsPerCandle
    const startTs = now - totalSeconds
    
    return { startTs, endTs: now }
  }, [getFidelity])

  // Calculate if a period should be disabled based on event duration
  const isPeriodDisabled = useCallback((period: TimePeriod): boolean => {
    const now = Date.now()
    const eventStartTime = new Date(event.startDate).getTime()
    const eventDurationMs = now - eventStartTime
    
    // Convert period to milliseconds
    const periodMs = {
      '1m': 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    }[period] || 0
    
    // Disable if the period is longer than the event duration
    return periodMs > eventDurationMs
  }, [event.startDate])
  
  const isCurrentMarketActive = useMemo(() => {
    return selectedMarket?.active === true && selectedMarket?.archived === false && selectedMarket?.closed === false
  }, [selectedMarket])

  // Clean up and deduplicate real-time data with sliding window approach
  const cleanupRealTimeData = useCallback(() => {
    // Only cleanup when we reach the limit
    if (realTimeDataRef.current.length < 1000) return
    
    try {
      // Use map to deduplicate by timestamp (keeps last occurrence)
      const timestampMap = new Map<number, LineData>()
      realTimeDataRef.current.forEach(point => {
        if (typeof point.time === 'number' && typeof point.value === 'number' && !isNaN(point.value)) {
          timestampMap.set(point.time as number, point)
        }
      })
      
      // Convert back to sorted array
      const sortedData = Array.from(timestampMap.values())
        .sort((a, b) => (a.time as number) - (b.time as number))
      
      // Sliding window: Remove oldest 100 points, keep 900 most recent
      // This leaves space for 100 new points before next cleanup
      const cleanData = sortedData.slice(-900)
      
      realTimeDataRef.current = cleanData
      
    } catch (error) {
      console.error('[Real-time] Error during cleanup:', error)
      // Fallback: remove oldest 100 points using simple slice
      realTimeDataRef.current = realTimeDataRef.current.slice(-900)
    }
  }, [])

  // Handle real-time price updates
  const updateRealTimePrice = useCallback((price: number) => {
    // Validate price input
    if (typeof price !== 'number' || isNaN(price) || price < 0 || price > 1) {
      return
    }
    
    try {
      const timestamp = Math.floor(Date.now() / 1000)
      const newDataPoint: LineData = {
        time: timestamp as any,
        value: price
      }
      
      // Check if we already have a data point for this timestamp
      const existingIndex = realTimeDataRef.current.findIndex(point => point.time === timestamp)
      
      if (existingIndex !== -1) {
        // Update existing data point instead of adding duplicate
        realTimeDataRef.current[existingIndex] = newDataPoint
      } else {
        // Add new data point
        realTimeDataRef.current.push(newDataPoint)
      }
      
      // Clean up data when we reach exactly 1000 points (sliding window)
      if (realTimeDataRef.current.length >= 1000) {
        cleanupRealTimeData()
      }
      
      // Update chart if in live mode
      if (stateRef.current.isLiveMode && seriesRef.current) {
        seriesRef.current.update(newDataPoint)
      }
    } catch (error) {
      console.error('[Real-time] Error updating real-time price:', error)
    }
  }, [cleanupRealTimeData])

  // Watch for order book changes in live mode
  useEffect(() => {
    // The orderBookData prop was removed, so this effect is no longer relevant.
    // If live mode is enabled, we'll rely on the midpoint price from the market data.
    // For now, we'll keep the logic but it will always be null.
    // If orderBookData were available, this would update the real-time price.
  }, [isLiveMode])

  // Handle mode switching
  const switchToLiveMode = useCallback(() => {
    // Only allow live mode for active markets
    if (!isCurrentMarketActive) {
      return
    }
    
    setIsLiveMode(true)
    
    if (chartRef.current && seriesRef.current) {
      // Remove candlestick series
      chartRef.current.removeSeries(seriesRef.current)
      
      // Create line series for real-time data
      const lineSeries = chartRef.current.addSeries(LineSeries, {
        color: '#2196F3',
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
      })
      
      seriesRef.current = lineSeries
      
      // Set existing real-time data if any
      if (realTimeDataRef.current.length > 0) {
        // Deduplicate and sort real-time data before setting
        const timestampMap = new Map<number, LineData>()
        
        // Use map to automatically handle duplicates (keeps last occurrence)
        realTimeDataRef.current.forEach(point => {
          timestampMap.set(point.time as number, point)
        })
        
        // Convert back to array and sort
        const sortedData = Array.from(timestampMap.values()).sort((a, b) => (a.time as number) - (b.time as number))
        
        // Update the ref with clean data
        realTimeDataRef.current = sortedData
        
        lineSeries.setData(sortedData)
        
        // Show most recent data on right edge
        const totalBars = sortedData.length
        const visibleBars = Math.min(totalBars, 100)
        
        chartRef.current.timeScale().setVisibleLogicalRange({
          from: Math.max(0, totalBars - visibleBars),
          to: totalBars - 1
        })
      }
    }
  }, [isCurrentMarketActive]) // Add dependency to check market status

  const switchToHistoricalMode = useCallback((period: TimePeriod) => {
    setIsLiveMode(false)
    setSelectedPeriod(period)
    
    if (chartRef.current && seriesRef.current) {
      // Remove line series
      chartRef.current.removeSeries(seriesRef.current)
      
      // Create candlestick series for historical data
      const candlestickSeries = chartRef.current.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      })
      
      seriesRef.current = candlestickSeries
      
      // Clear historical data and trigger fetch
      allDataRef.current = []
      stateRef.current.oldestLoadedTimestamp = null
      stateRef.current.requestedTimestamps.clear()
      stateRef.current.lastRequestTime = 0
    }
  }, []) // No dependencies needed - all refs and state setters are stable

  // Load historical data when panning left
  const loadHistoricalData = useCallback(async (beforeTimestamp: number) => {
    
    // Validate input
    if (typeof beforeTimestamp !== 'number' || beforeTimestamp <= 0) {
      console.error('[Historical Data] Invalid beforeTimestamp:', beforeTimestamp)
      return
    }
    
    // Use state ref to get current values
    const state = stateRef.current
    
    // Add request deduplication and throttling
    const now = Date.now()
    const MIN_REQUEST_INTERVAL = 1000 // 1 second minimum between requests
    const timeSinceLastRequest = now - state.lastRequestTime
    
    // Prevent duplicate requests
    if (state.requestedTimestamps.has(beforeTimestamp)) {
      return
    }
    
    // Throttle requests
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      return
    }
    
    if (!state.selectedMarket?.clobTokenIds) {
      setError('No market token information available')
      return
    }
    
    if (state.loadingHistorical) {
      return
    }

    let tokenId: string | null = null
    try {
      const clobTokenIds = state.selectedMarket.clobTokenIds.trim()
      if (!clobTokenIds) {
        throw new Error('Empty token IDs string')
      }
      
      const ids = JSON.parse(clobTokenIds)
      if (!Array.isArray(ids) || ids.length < 2) {
        throw new Error('Invalid token IDs format - expected array with at least 2 elements')
      }
      
      tokenId = state.selectedToken === 'yes' ? ids[0] : ids[1]
      
      if (!tokenId || typeof tokenId !== 'string') {
        throw new Error(`Invalid ${state.selectedToken} token ID`)
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error'
      console.error('[Historical Data] Failed to parse token IDs:', errorMessage)
      setError(`Failed to parse market token IDs: ${errorMessage}`)
      return
    }

    // Mark as requested and update timing
    state.requestedTimestamps.add(beforeTimestamp)
    state.lastRequestTime = now
    
    setLoadingHistorical(true)

    try {
      // Use helper functions with current values from refs
      const fidelityValue = getFidelity(state.selectedPeriod)
      
      // Calculate time range manually to avoid dependency
      const candleCount = {
        '1m': 200,  
        '1h': 200,  
        '6h': 60,   
        '1d': 14,   
      }[state.selectedPeriod] || 50
      
      const secondsPerCandle = fidelityValue * 60
      const totalSeconds = candleCount * secondsPerCandle
      const startTs = beforeTimestamp - totalSeconds
      
      // Validate time range
      if (startTs >= beforeTimestamp) {
        throw new Error('Invalid time range: start time is not before end time')
      }
      
      const url = `/api/prices-history?market=${encodeURIComponent(tokenId)}&startTs=${startTs}&endTs=${beforeTimestamp}&fidelity=${fidelityValue}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(`Failed to fetch historical data: ${errorMessage}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        const errorMessage = result.error || 'Unknown API error'
        throw new Error(`API error: ${errorMessage}`)
      }
      
      if (!result.data?.length) {
        return
      }

      const newData: ApiCandlestickData[] = result.data

      // Validate and transform data
      let chartData: CandlestickData[] = []
      let invalidDataCount = 0
      
      newData.forEach((item: ApiCandlestickData, index: number) => {
        try {
          // Validate required fields
          if (typeof item.time !== 'number' || item.time <= 0) {
            throw new Error(`Invalid time at index ${index}: ${item.time}`)
          }
          
          const ohlc = [item.open, item.high, item.low, item.close]
          if (ohlc.some(val => typeof val !== 'number' || isNaN(val) || val < 0 || val > 1)) {
            throw new Error(`Invalid OHLC values at index ${index}`)
          }
          
          // Basic OHLC validation
          if (item.high < Math.max(item.open, item.close) || item.low > Math.min(item.open, item.close)) {
            throw new Error(`Invalid OHLC relationship at index ${index}`)
          }
          
          chartData.push({
            time: item.time as any,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close
          })
        } catch (error) {
          invalidDataCount++
          if (invalidDataCount === 1) {
          }
        }
      })
      
      if (invalidDataCount > 0) {
      }
      
      if (chartData.length === 0) {
        return
      }

      // Filter out any data that overlaps with existing data
      const existingTimestamps = new Set(allDataRef.current.map(d => d.time as number))
      chartData = chartData.filter((d) => {
        if (existingTimestamps.has(d.time as number)) return false
        return true
      })

      if (chartData.length > 0) {
        // Merge and sort all data
        const mergedData = [...chartData, ...allDataRef.current]
        mergedData.sort((a, b) => (a.time as number) - (b.time as number))
        
        allDataRef.current = mergedData
        state.oldestLoadedTimestamp = Math.min(
          state.oldestLoadedTimestamp || Infinity,
          ...chartData.map(d => d.time as number)
        )

        // Update the series with all data - but only if we're still in historical mode
        if (seriesRef.current && !state.isLiveMode) {
          seriesRef.current.setData(allDataRef.current)
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('[Historical Data] Error loading historical data:', errorMessage)
      
      // Set user-friendly error message
      if (errorMessage.includes('Failed to fetch')) {
        setError('Network error: Unable to load historical data. Please check your connection.')
      } else if (errorMessage.includes('HTTP 4')) {
        setError('Data not available for the selected period and market.')
      } else if (errorMessage.includes('HTTP 5')) {
        setError('Server error: Please try again later.')
      } else {
        setError(`Error loading data: ${errorMessage}`)
      }
      
      // Remove from requested set on error so it can be retried
      state.requestedTimestamps.delete(beforeTimestamp)
    } finally {
      setLoadingHistorical(false)
    }
  }, []) // Removed all dependencies

  // Initialize chart
  useEffect(() => {
    let chart: IChartApi | null = null
    let resizeObserver: ResizeObserver | null = null
    
    const initChart = () => {
      if (!chartContainerRef.current) {
        setTimeout(initChart, 100)
        return
      }

      // Update current time reference
      stateRef.current.currentTime = Math.floor(Date.now() / 1000)

      const chartOptions = { 
        layout: { 
          textColor: 'rgba(255, 255, 255, 0.9)', 
          background: { type: ColorType.Solid, color: 'transparent' },
          attributionLogo: false
        },
        grid: {
          vertLines: { color: 'rgba(197, 203, 206, 0.1)' },
          horzLines: { color: 'rgba(197, 203, 206, 0.1)' },
        },
        crosshair: {
          mode: 1,
        },
        rightPriceScale: {
          borderColor: 'rgba(197, 203, 206, 0.8)',
        },
        timeScale: {
          borderColor: 'rgba(197, 203, 206, 0.8)',
          timeVisible: true,
          secondsVisible: false,
          // Set time scale restrictions
          rightOffset: 20, // Show some space on the right edge
          barSpacing: 6,
          minBarSpacing: 2,
        },
        height: 384, // h-96 equivalent
      }
      
      chart = createChart(chartContainerRef.current, chartOptions)
      
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      })
      
      // Position price series to take 70% of chart height
      candlestickSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.1,
          bottom: 0.4,
        },
      })

      // Add volume series (histogram)
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '', // overlay
      })
      
      // Configure volume price scale
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.7, // volume takes bottom 30%
          bottom: 0,
        },
      })

      chartRef.current = chart
      seriesRef.current = candlestickSeries
      volumeSeriesRef.current = volumeSeries

      // Set up time scale restrictions and panning behavior
      const timeScale = chart.timeScale()
      
      // Prevent panning beyond current time (right boundary)
      timeScale.subscribeVisibleLogicalRangeChange((logicalRange: LogicalRange | null) => {
        if (!logicalRange) return
        
        // Get the last bar time (most recent data)
        const lastBarIndex = (allDataRef.current?.length || 0) - 1
        if (lastBarIndex < 0) return

        const lastBarTime = allDataRef.current[lastBarIndex]?.time as number
        if (!lastBarTime) return

        // If trying to pan beyond current time, restrict the range
        const currentTime = stateRef.current.currentTime
        const currentPeriod = selectedPeriod
        const fidelity = getFidelity(currentPeriod)
        const maxAllowedTime = currentTime + (60 * fidelity) // Allow small buffer
        
        if (lastBarTime <= maxAllowedTime) {
          // Check if we're panning too far to the right (future)
          const visibleBarsCount = logicalRange.to - logicalRange.from
          const maxLogicalRange = lastBarIndex + 5 // Allow minimal space on the right
          
          if (logicalRange.to > maxLogicalRange) {
            const newTo = maxLogicalRange
            const newFrom = newTo - visibleBarsCount
            
            timeScale.setVisibleLogicalRange({
              from: Math.max(0, newFrom),
              to: newTo
            })
            return
          }
        }

        // Check if we need to load more historical data (panning left)
        const LOAD_THRESHOLD = 50
        
        // Trigger historical load if conditions are met
        if (!stateRef.current.isLiveMode && 
            (logicalRange.from <= LOAD_THRESHOLD || logicalRange.from < 0) && 
            stateRef.current.oldestLoadedTimestamp && 
            !stateRef.current.loadingHistorical) {
          loadHistoricalData(stateRef.current.oldestLoadedTimestamp)
        }
      })

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          })
        }
      }

      resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(chartContainerRef.current)
    }

    // Start initialization with small delay
    setTimeout(initChart, 50)
    
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      if (chart) {
        chart.remove()
      }
      chartRef.current = null
      seriesRef.current = null
      volumeSeriesRef.current = null
      allDataRef.current = []
      volumeDataRef.current = []
      stateRef.current.oldestLoadedTimestamp = null
    }
  }, []) // Remove all dependencies to prevent re-initialization

  // Setup tooltip after chart is initialized and mode changes
  useEffect(() => {
    if (!chartRef.current || !chartContainerRef.current) return

    const container = chartContainerRef.current
    const toolTipWidth = 160
    const toolTipHeight = 80
    const toolTipMargin = 15

    // Remove existing tooltip if any
    const existingTooltip = container.querySelector('.chart-tooltip')
    if (existingTooltip) {
      existingTooltip.remove()
    }

    // Create and style the tooltip html element (following the demo pattern exactly)
    const toolTip = document.createElement('div')
    toolTip.className = 'chart-tooltip'
    toolTip.style.cssText = `
      width: ${toolTipWidth}px; 
      height: auto; 
      position: absolute; 
      display: none; 
      padding: 8px; 
      box-sizing: border-box; 
      font-size: 12px; 
      text-align: left; 
      z-index: 1000; 
      pointer-events: none; 
      border: 1px solid; 
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif; 
      -webkit-font-smoothing: antialiased; 
      -moz-osx-font-smoothing: grayscale;
      background: white;
      color: black;
      border-color: #26a69a;
    `
    container.appendChild(toolTip)

    // Update tooltip following the demo pattern exactly
    const crosshairHandler = (param: any) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > container.clientWidth ||
        param.point.y < 0 ||
        param.point.y > container.clientHeight
      ) {
        toolTip.style.display = 'none'
      } else {
        toolTip.style.display = 'block'
        const data = param.seriesData.get(seriesRef.current)
        
        if (data) {
          // Format timestamp to readable date
          const timestamp = param.time as number
          const date = new Date(timestamp * 1000)
          const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
          
          // Get price data - handle both line and candlestick data
          let price, openPrice, closePrice
          
          if (isLiveMode) {
            // Line data (live mode) - show current price as both open and close
            const lineData = data as LineData
            price = lineData.value
            openPrice = closePrice = price
          } else {
            // Candlestick data (historical mode)
            const candleData = data as CandlestickData
            openPrice = candleData.open
            closePrice = candleData.close
            price = closePrice // Use close price as main price
          }
          
          // Determine color based on price change
          const priceChangeColor = closePrice >= openPrice ? '#26a69a' : '#ef5350'
          
          // Format prices to 4 decimal places
          const formatPrice = (price: number) => price.toFixed(4)
          
          toolTip.innerHTML = `
            <div style="color: #26a69a; font-weight: 500;">
              ${selectedToken.toUpperCase()} Token
            </div>
            <div style="margin: 4px 0px;">
              <div style="font-size: 11px; color: black;">
                Open: <span style="color: ${priceChangeColor};">${formatPrice(openPrice)}</span>
              </div>
              <div style="font-size: 11px; color: black;">
                Close: <span style="color: ${priceChangeColor};">${formatPrice(closePrice)}</span>
              </div>
            </div>
            <div style="color: black; font-size: 10px;">
              ${dateStr}
            </div>
          `

          // Position tooltip exactly like the demo
          const y = param.point.y
          let left = param.point.x + toolTipMargin
          if (left > container.clientWidth - toolTipWidth) {
            left = param.point.x - toolTipMargin - toolTipWidth
          }

          let top = y + toolTipMargin
          if (top > container.clientHeight - toolTipHeight) {
            top = y - toolTipHeight - toolTipMargin
          }
          
          toolTip.style.left = left + 'px'
          toolTip.style.top = top + 'px'
        }
      }
    }

    chartRef.current.subscribeCrosshairMove(crosshairHandler)

    // Cleanup function
    return () => {
      if (chartRef.current) {
        chartRef.current.unsubscribeCrosshairMove(crosshairHandler)
      }
      if (toolTip && toolTip.parentNode) {
        toolTip.parentNode.removeChild(toolTip)
      }
    }
  }, [isLiveMode, selectedToken]) // Re-setup tooltip when mode or token changes

  // Fetch and update chart data
  const fetchChartData = useCallback(async () => {
    if (!selectedMarket?.clobTokenIds) {
      setError('No market selected or market data unavailable')
      return
    }
    
    let tokenId: string | null = null
    try {
      const clobTokenIds = selectedMarket.clobTokenIds.trim()
      if (!clobTokenIds) {
        throw new Error('Empty token IDs string')
      }
      const ids = JSON.parse(clobTokenIds)
      if (!Array.isArray(ids) || ids.length < 2) {
        throw new Error('Invalid token IDs format - expected array with at least 2 elements')
      }
      tokenId = selectedToken === 'yes' ? ids[0] : ids[1]
      if (!tokenId || typeof tokenId !== 'string') {
        throw new Error(`Invalid ${selectedToken} token ID`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error'
      setError(`Failed to parse market token IDs: ${errorMessage}`)
      return
    }
    
    setLoading(true)
    setError(null)
    setVolumeError(null)
    
    // Start both fetches in parallel
    const fidelityValue = getFidelity(selectedPeriod)
    const candleCount = {
      '1m': 200,  
      '1h': 200,  
      '6h': 60,   
      '1d': 14,   
    }[selectedPeriod] || 50
    const secondsPerCandle = fidelityValue * 60
    const totalSeconds = candleCount * secondsPerCandle
    const startTs = Math.floor(Date.now() / 1000) - totalSeconds
    const endTs = Math.floor(Date.now() / 1000)
    const priceUrl = `/api/prices-history?market=${encodeURIComponent(tokenId)}&startTs=${startTs}&endTs=${endTs}&fidelity=${fidelityValue}`
    const volumeUrl = `https://poly-trade-edge.vercel.app/api/volumes-history?market=${encodeURIComponent(tokenId)}&startTs=${startTs}&endTs=${endTs}&fidelity=${fidelityValue.toString()}`
    
    // Start fetches
    const pricePromise = fetch(priceUrl).then(r => r.json()).catch(() => null)
    const volumePromise = fetch(volumeUrl).then(r => r.json()).catch(() => null)
    
    try {
      // 1. Await price data first
      const priceResult = await pricePromise
      if (!priceResult || !priceResult.success || !priceResult.data?.length) {
        setError('No price data available for this period. Try a different time range.')
        setLoading(false)
        return
      }
      
      // Validate and transform data for lightweight-charts
      let chartData: CandlestickData[] = []
      let invalidDataCount = 0
      priceResult.data.forEach((item: ApiCandlestickData, index: number) => {
        try {
          if (typeof item.time !== 'number' || item.time <= 0) throw new Error(`Invalid time at index ${index}`)
          const ohlc = [item.open, item.high, item.low, item.close]
          if (ohlc.some(val => typeof val !== 'number' || isNaN(val) || val < 0 || val > 1)) throw new Error(`Invalid OHLC values at index ${index}`)
          if (item.high < Math.max(item.open, item.close) || item.low > Math.min(item.open, item.close)) throw new Error(`Invalid OHLC relationship at index ${index}`)
          chartData.push({
            time: item.time as any,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close
          })
        } catch (error) {
          invalidDataCount++
        }
      })
      
      if (chartData.length === 0) {
        setError('All received data points were invalid. Please try a different period.')
        setLoading(false)
        return
      }
      
      // Sort and deduplicate
      chartData.sort((a, b) => (a.time as number) - (b.time as number))
      const seen = new Set<number>()
      chartData = chartData.filter((d) => {
        if (seen.has(d.time as number)) return false
        seen.add(d.time as number)
        return true
      })
      
      allDataRef.current = chartData
      stateRef.current.oldestLoadedTimestamp = chartData.length > 0 ? Math.min(...chartData.map(d => d.time as number)) as any : null
      
      // Render price chart immediately
      if (seriesRef.current && chartData.length > 0) {
        seriesRef.current.setData(chartData)
      }
      
      setLoading(false) // Price chart is ready
      
      // 2. Await volume data (may still be loading)
      const volumeResult = await volumePromise
      let volumeHistogramData = []
      if (volumeResult && Array.isArray(volumeResult)) {
        // Clean up volume data based on price history timestamps
        let cleanedVolumeData = volumeResult
        if (chartData.length > 0) {
          const t1 = chartData[0].time
          const startIndex = volumeResult.findIndex(volumeRecord => volumeRecord.timestamp > t1)
          if (startIndex !== -1) {
            cleanedVolumeData = volumeResult.slice(startIndex)
          }
          const lastPriceTimestamp = chartData[chartData.length - 1].time
          cleanedVolumeData.push({
            timestamp: lastPriceTimestamp,
            totalSize: 0,
            totalDollarVolume: 0
          })
        }
        volumeHistogramData = chartData.map((priceCandle, index) => {
          const volumeData = cleanedVolumeData[index]
          const isGreen = priceCandle.close >= priceCandle.open
          const color = isGreen ? '#26a69a' : '#ef5350'
          const volumeValue = volumeData ? (volumeType === 'totalDollarVolume' ? volumeData.totalDollarVolume : volumeData.totalSize) : 0
          return {
            time: priceCandle.time,
            value: volumeValue || 0,
            color: color
          }
        })
        volumeDataRef.current = cleanedVolumeData
        if (volumeSeriesRef.current && volumeHistogramData.length > 0) {
          volumeSeriesRef.current.setData(volumeHistogramData)
        }
      } else {
        setVolumeError('Volume data unavailable')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Error loading chart: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [selectedMarket?.clobTokenIds, selectedToken, selectedPeriod, getFidelity, volumeType])

  // Fetch data when dependencies change - removed isCurrentMarketActive check
  useEffect(() => {
    if (selectedMarket?.conditionId && !isLiveMode) {
      fetchChartData()
    }
  }, [selectedMarket?.conditionId, selectedToken, selectedPeriod, isLiveMode, fetchChartData])

  // Update volume series when volume type changes
  useEffect(() => {
    if (!volumeSeriesRef.current || !volumeDataRef.current.length || !allDataRef.current.length) return
    
    try {
      const updatedVolumeData = allDataRef.current.map((priceCandle, index) => {
        const volumeData = volumeDataRef.current[index]
        
        // Determine color based on price movement (close vs open)
        const isGreen = priceCandle.close >= priceCandle.open
        const color = isGreen ? '#26a69a' : '#ef5350'
        
        // Get volume value based on selected type
        const volumeValue = volumeData ? 
          (volumeType === 'totalDollarVolume' ? volumeData.totalDollarVolume : volumeData.totalSize) : 0
        
        return {
          time: priceCandle.time as any,
          value: volumeValue || 0,
          color: color
        }
      })
      
      volumeSeriesRef.current.setData(updatedVolumeData)
      
      // Update price format based on volume type
      volumeSeriesRef.current.applyOptions({
        priceFormat: {
          type: 'volume',
          precision: volumeType === 'totalDollarVolume' ? 2 : 0,
        },
      })
    } catch (error) {
      console.error('Error updating volume series:', error)
    }
  }, [volumeType])

  const chartTitle = `${selectedToken.toUpperCase()} Token Price Chart ${stateRef.current.isLiveMode ? '(Live)' : '(Historical)'}`

  return (
    <Card className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            {chartTitle}
            {stateRef.current.loadingHistorical && (
              <Loader2 className="h-3 w-3 animate-spin ml-2 text-muted-foreground" />
            )}
          </CardTitle>
        </div>
        <div className="space-y-3 mt-2">
          <div>
            <div className="text-xs text-muted-foreground mb-2 font-medium">Time Period</div>
            <div className="flex gap-1">
              {/* Only show Live button for active markets */}
              {isCurrentMarketActive && (
                <Button
                  variant={stateRef.current.isLiveMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={switchToLiveMode}
                  disabled={loading}
                  className="text-xs px-2 py-1 h-7"
                >
                  Live
                </Button>
              )}
              {(['1m', '1h', '6h', '1d'] as TimePeriod[]).map((period) => (
                <Button
                  key={period}
                  variant={!stateRef.current.isLiveMode && selectedPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => switchToHistoricalMode(period)}
                  disabled={loading || isPeriodDisabled(period)}
                  className="text-xs px-2 py-1 h-7"
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2 font-medium">Volume Display</div>
            <div className="flex gap-1">
              <Button
                variant={volumeType === 'totalDollarVolume' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVolumeType('totalDollarVolume')}
                disabled={loading}
                className="text-xs px-2 py-1 h-7"
              >
                Volume ($)
              </Button>
              <Button
                variant={volumeType === 'totalSize' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVolumeType('totalSize')}
                disabled={loading}
                className="text-xs px-2 py-1 h-7"
              >
                Volume (Shares)
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {volumeError && (
          <Alert variant="default" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{volumeError}</AlertDescription>
          </Alert>
        )}
        
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div 
            ref={chartContainerRef} 
            className="h-96 w-full"
          />
          {/* Debug info */}
          <div className="text-xs text-muted-foreground mt-2">
            Chart: {stateRef.current.isLiveMode ? 
              `${realTimeDataRef.current.length} live data points` : 
              `${allDataRef.current.length} historical data points loaded`
            }
            {volumeDataRef.current.length > 0 && ` • ${volumeDataRef.current.length} volume data points`}
            {stateRef.current.loadingHistorical && " • Loading historical data..."}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 