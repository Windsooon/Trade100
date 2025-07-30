import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, TrendingUp, WifiOff, Activity, BarChart3, TrendingUp as LineChart } from 'lucide-react'
import { createChart, IChartApi, ISeriesApi, ColorType, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts'
import { ChartTabProps, TimePeriod, MarketHistoryResponse, MarketHistoryDataPoint, VolumeType, getAssetIdFromMarket } from './types'

// Global cache for market history to prevent duplicate API calls
let globalMarketHistoryCache: Map<string, { data: MarketHistoryResponse; timestamp: number }> = new Map()
let globalMarketHistoryPromises: Map<string, Promise<MarketHistoryResponse>> = new Map()
const MARKET_HISTORY_CACHE_DURATION = 30000 // 30 seconds

type ChartType = 'candle' | 'line'

export function ChartTab({ selectedMarket, selectedToken }: ChartTabProps) {
  
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1h')
  const [chartType, setChartType] = useState<ChartType>('candle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [volumeType, setVolumeType] = useState<VolumeType>('totalDollarVolume')
  const [volumeError, setVolumeError] = useState<string | null>(null)
  
  // Real-time update states
  const [realtimeActive, setRealtimeActive] = useState(false)
  const [realtimeError, setRealtimeError] = useState<string | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [newDataHighlight, setNewDataHighlight] = useState(false)
  
  // State for forcing chart re-initialization on tab switch
  const [chartKey, setChartKey] = useState(0)
  
  // Component instance ID to track if we get multiple instances
  const instanceId = useRef(Math.random().toString(36).substr(2, 9))
  
  // Enhanced duplicate prevention using a global registry
  const activeRequestsRef = useRef<Set<string>>(new Set())

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  
  // Data refs - store raw data from API
  const rawDataRef = useRef<MarketHistoryDataPoint[]>([])
  const volumeDataRef = useRef<MarketHistoryDataPoint[]>([])
  
  // Real-time update refs
  const realtimeIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const latestTimestampRef = useRef<number | null>(null)
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Ref to track current token for tooltip
  const selectedTokenRef = useRef<'yes' | 'no'>(selectedToken)
  
  // Update token ref when token changes
  useEffect(() => {
    selectedTokenRef.current = selectedToken
  }, [selectedToken])

  const formatVolume = useCallback((value: number, isDollar: boolean = false): string => {
    const prefix = isDollar ? '$' : ''
    if (value >= 1000000) {
      return `${prefix}${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${prefix}${(value / 1000).toFixed(1)}K`
    }
    return `${prefix}${value.toFixed(0)}`
  }, [])

  // Initialize chart
  useEffect(() => {
    let chart: IChartApi | null = null
    let resizeObserver: ResizeObserver | null = null
    
    if (!chartContainerRef.current) {
      return
    }

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
        rightOffset: 20,
        barSpacing: 6,
        minBarSpacing: 2,
      },
      height: 384,
    }
    
    try {
      chart = createChart(chartContainerRef.current, chartOptions)
      
      let priceSeries: ISeriesApi<'Candlestick'> | ISeriesApi<'Line'>
      
      if (chartType === 'candle') {
        priceSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        })
      } else {
        priceSeries = chart.addSeries(LineSeries, {
          color: '#26a69a',
          lineWidth: 2,
        })
      }
      
      // Position price series to take 70% of chart height
      priceSeries.priceScale().applyOptions({
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
        priceScaleId: '',
      })
      
      // Configure volume price scale
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      })

      chartRef.current = chart
      seriesRef.current = priceSeries
      volumeSeriesRef.current = volumeSeries

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          const newWidth = chartContainerRef.current.clientWidth
          chartRef.current.applyOptions({
            width: newWidth,
          })
        }
      }

      resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(chartContainerRef.current)
    } catch (error) {
      console.error('📈 Error during chart initialization:', error)
    }
    
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
    }
  }, [chartKey, chartType])

  // Setup tooltip - waits for chart initialization to complete
  useEffect(() => {
    const setupTooltip = () => {
      // Wait for chart and container to be fully initialized
      if (!chartRef.current || !chartContainerRef.current) {
        setTimeout(setupTooltip, 100)
        return
      }
      
      const container = chartContainerRef.current
      const toolTipWidth = 160
      const toolTipHeight = 80
      const toolTipMargin = 15

      // Remove existing tooltip if any
      const existingTooltip = container.querySelector('.chart-tooltip')
      if (existingTooltip) {
        existingTooltip.remove()
      }

      // Create tooltip
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

      // Create volume tooltip
      const volumeToolTip = document.createElement('div')
      volumeToolTip.className = 'volume-tooltip'
      volumeToolTip.style.cssText = `
        width: 180px; 
        height: auto; 
        position: absolute; 
        display: none; 
        padding: 10px; 
        box-sizing: border-box; 
        font-size: 12px; 
        text-align: left; 
        z-index: 1001; 
        pointer-events: none; 
        border: 1px solid; 
        border-radius: 6px;
        font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif; 
        -webkit-font-smoothing: antialiased; 
        -moz-osx-font-smoothing: grayscale;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        border-color: #26a69a;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      `
      container.appendChild(volumeToolTip)

      // Update tooltip
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
          volumeToolTip.style.display = 'none'
        } else {
          // Determine if mouse is in volume area (bottom 30%) or price area (top 70%)
          const volumeAreaStart = container.clientHeight * 0.7
          const isInVolumeArea = param.point.y >= volumeAreaStart
          
          if (isInVolumeArea) {
            // Show volume tooltip, hide price tooltip
            toolTip.style.display = 'none'
            
            // Get volume data for this timestamp
            const currentVolumeData = volumeDataRef.current
            if (currentVolumeData && currentVolumeData.length > 0) {
              const targetTime = param.time as number
              
              // Find the volume data for this timestamp
              const volumePoint = currentVolumeData.find(vol => vol.timestamp === targetTime)
              
              if (volumePoint) {
                const timestamp = param.time as number
                const date = new Date(timestamp * 1000)
                const dateStr = date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
                
                volumeToolTip.innerHTML = `
                  <div style="color: #26a69a; font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid rgba(38, 166, 154, 0.3); padding-bottom: 4px;">
                    📊 Volume Data
                  </div>
                  <div style="margin: 6px 0px;">
                    <div style="font-size: 11px; color: white; margin-bottom: 3px; display: flex; justify-content: space-between;">
                      <span>Total Size:</span>
                      <span style="color: #26a69a; font-weight: 500;">${formatVolume(volumePoint.volume.totalSize)}</span>
                    </div>
                    <div style="font-size: 11px; color: white; margin-bottom: 3px; display: flex; justify-content: space-between;">
                      <span>Dollar Volume:</span>
                      <span style="color: #26a69a; font-weight: 500;">${formatVolume(volumePoint.volume.totalDollarVolume, true)}</span>
                    </div>
                  </div>
                  <div style="color: #888; font-size: 10px; text-align: center; margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(136, 136, 136, 0.3);">
                    ${dateStr}
                  </div>
                `
                
                volumeToolTip.style.display = 'block'
                
                // Position volume tooltip
                const volumeTooltipWidth = 180
                let left = param.point.x + toolTipMargin
                if (left > container.clientWidth - volumeTooltipWidth) {
                  left = param.point.x - toolTipMargin - volumeTooltipWidth
                }
                
                let top = param.point.y + toolTipMargin
                if (top > container.clientHeight - toolTipHeight) {
                  top = param.point.y - toolTipHeight - toolTipMargin
                }
                
                volumeToolTip.style.left = left + 'px'
                volumeToolTip.style.top = top + 'px'
              } else {
                volumeToolTip.style.display = 'none'
              }
            } else {
              volumeToolTip.style.display = 'none'
            }
          } else {
            // Show price tooltip, hide volume tooltip
            volumeToolTip.style.display = 'none'
            
            // Get current series reference
            const currentSeries = seriesRef.current
            
            if (!currentSeries) {
              toolTip.style.display = 'none'
              return
            }

            const data = param.seriesData.get(currentSeries)
            
            if (data) {
              toolTip.style.display = 'block'
              
              const timestamp = param.time as number
              const date = new Date(timestamp * 1000)
              const dateStr = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
              
              let price, openPrice, closePrice, highPrice, lowPrice, isLineData
              
              // Check if this is line data (live mode) or candlestick data (historical)
              if ('value' in data) {
                // Line data (live mode) - single price point
                const lineData = data as any
                price = lineData.value
                openPrice = closePrice = highPrice = lowPrice = price
                isLineData = true
              } else {
                // Candlestick data (historical mode) - OHLC data
                const candleData = data as any
                openPrice = candleData.open
                closePrice = candleData.close
                highPrice = candleData.high
                lowPrice = candleData.low
                price = closePrice
                isLineData = false
              }
              
              const priceChangeColor = closePrice >= openPrice ? '#26a69a' : '#ef5350'
              const formatPrice = (price: number) => price.toFixed(4)
              
              // Build tooltip content based on data type
              let priceContent = ''
              if (isLineData) {
                // For line data (live mode), just show the current price
                priceContent = `
                  <div style="font-size: 11px; color: black;">
                    Price: <span style="color: ${priceChangeColor};">${formatPrice(price)}</span>
                  </div>
                `
              } else {
                // For candlestick data, show full OHLC
                priceContent = `
                  <div style="font-size: 11px; color: black;">
                    Open: <span style="color: ${priceChangeColor};">${formatPrice(openPrice)}</span>
                  </div>
                  <div style="font-size: 11px; color: black;">
                    High: <span style="color: #26a69a;">${formatPrice(highPrice)}</span>
                  </div>
                  <div style="font-size: 11px; color: black;">
                    Low: <span style="color: #ef5350;">${formatPrice(lowPrice)}</span>
                  </div>
                  <div style="font-size: 11px; color: black;">
                    Close: <span style="color: ${priceChangeColor};">${formatPrice(closePrice)}</span>
                  </div>
                `
              }
              
              toolTip.innerHTML = `
                <div style="color: #26a69a; font-weight: 500;">
                  ${selectedTokenRef.current.toUpperCase()} Token
                </div>
                <div style="margin: 4px 0px;">
                  ${priceContent}
                </div>
                <div style="color: black; font-size: 10px;">
                  ${dateStr}
                </div>
              `

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
            } else {
              toolTip.style.display = 'none'
            }
          }
        }
      }

      if (chartRef.current) {
        chartRef.current.subscribeCrosshairMove(crosshairHandler)
      }
    }

    // Start the setup process
    setupTooltip()

    // Cleanup function for useEffect
    return () => {
      // Clean up both tooltips
      const existingTooltip = chartContainerRef.current?.querySelector('.chart-tooltip')
      if (existingTooltip) {
        existingTooltip.remove()
      }
      const existingVolumeTooltip = chartContainerRef.current?.querySelector('.volume-tooltip')
      if (existingVolumeTooltip) {
        existingVolumeTooltip.remove()
      }
      
      if (chartRef.current) {
        try {
          chartRef.current.unsubscribeCrosshairMove(() => {})
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    }
  }, [selectedPeriod, chartKey, formatVolume])

  // Simple client-side cache for market history data
  const cacheRef = useRef<Map<string, { data: MarketHistoryDataPoint[]; timestamp: number }>>(new Map())
  const CACHE_DURATION = 60 * 1000 // 1 minute cache

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

  // Calculate timestamps for getting historical data based on period
  const calculateTimeRange = useCallback((period: TimePeriod): { startTs: number; endTs: number; fidelity: number } => {
    const now = Math.floor(Date.now() / 1000) // Current timestamp in seconds
    let startTs: number
    let fidelity: number
    
    switch (period) {
      case '1m':
        startTs = now - (48 * 3600) // Last 48 hours for 1m candles
        fidelity = 1
        break
      case '1h':
        startTs = now - (14 * 24 * 3600) // Last 14 days for 1h candles
        fidelity = 60
        break
      case '6h':
        startTs = now - (30 * 24 * 3600) // Last 30 days for 6h candles
        fidelity = 360
        break
      case '1d':
        startTs = now - (90 * 24 * 3600) // Last 90 days for 1d candles
        fidelity = 1440
        break
      default:
        startTs = now - (7 * 24 * 3600) // Default to 7 days
        fidelity = 60
    }
    
    return { startTs, endTs: now, fidelity }
  }, [])

  // Calculate timestamps for getting latest data point based on period
  const calculateLatestDataRange = useCallback((period: TimePeriod): { startTs: number; endTs: number; fidelity: number } => {
    const now = Math.floor(Date.now() / 1000)
    let fidelity: number
    let startTs: number
    
    switch (period) {
      case '1m':
        fidelity = 1
        startTs = now - (60 * 2) // Last 2 minutes to ensure we get latest candle
        break
      case '1h':
        fidelity = 60
        startTs = now - (3600 * 2) // Last 2 hours
        break
      case '6h':
        fidelity = 360
        startTs = now - (6 * 3600 * 2) // Last 12 hours
        break
      case '1d':
        fidelity = 1440
        startTs = now - (24 * 3600 * 2) // Last 2 days
        break
      default:
        fidelity = 60
        startTs = now - (3600 * 2)
    }
    
    return { startTs, endTs: now, fidelity }
  }, [])

  // Fetch latest data point for real-time updates
  const fetchLatestDataPoint = useCallback(async (): Promise<MarketHistoryDataPoint | null> => {
    const assetId = getAssetIdFromMarket(selectedMarket, selectedToken)
    if (!assetId) {
      return null
    }

    try {
      const { startTs, endTs, fidelity } = calculateLatestDataRange(selectedPeriod)
      
      const url = `https://trade-analyze-production.up.railway.app/api/market-history?asset_id=${encodeURIComponent(assetId)}&startTs=${startTs}&endTs=${endTs}&fidelity=${fidelity}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch latest data: ${response.status}`)
      }
      
      const result: MarketHistoryResponse = await response.json()
      
      if (!result.data || result.data.length === 0) {
        return null
      }
      
      // Return the latest data point (last in array)
      return result.data[result.data.length - 1]
      
    } catch (error) {
      console.error('Error fetching latest data point:', error)
      throw error
    }
  }, [selectedMarket, selectedToken, selectedPeriod, calculateLatestDataRange])

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
    }
    // If newTimestamp < currentLatest, ignore (out-of-order data)
    
    setLastUpdateTime(new Date())
  }, [volumeType, chartType])

  // Start real-time updates
  const startRealtimeUpdates = useCallback(() => {
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current)
    }

    const assetId = getAssetIdFromMarket(selectedMarket, selectedToken)
    if (!assetId) {
      return
    }

    setRealtimeActive(true)
    setRealtimeError(null)

    realtimeIntervalRef.current = setInterval(async () => {
      try {
        const latestData = await fetchLatestDataPoint()
        if (latestData) {
          updateChartWithLatestData(latestData)
          setRealtimeError(null) // Clear any previous errors
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch real-time data'
        setRealtimeError(errorMessage)
        console.error('Real-time update error:', error)
      }
    }, 10000) // 10 seconds interval
  }, [selectedMarket, selectedToken, fetchLatestDataPoint, updateChartWithLatestData])

  // Stop real-time updates (internal use only - for cleanup)
  const stopRealtimeUpdates = useCallback(() => {
    if (realtimeIntervalRef.current) {
      clearInterval(realtimeIntervalRef.current)
      realtimeIntervalRef.current = null
    }
    setRealtimeActive(false)
    setRealtimeError(null)
  }, [])

  // New fetch function for market history API
  const fetchMarketHistoryData = useCallback(async () => {
    const assetId = getAssetIdFromMarket(selectedMarket, selectedToken)
    if (!assetId) {
      setError('No market selected or asset data unavailable')
      return
    }
    
    const { startTs, endTs, fidelity } = calculateTimeRange(selectedPeriod)
    const requestKey = `${assetId}-${selectedPeriod}-${fidelity}`

    // Check global cache first
    const now = Date.now()
    const cachedData = globalMarketHistoryCache.get(requestKey)
          if (cachedData && (now - cachedData.timestamp) < MARKET_HISTORY_CACHE_DURATION) {
        // Process cached data
        const result = cachedData.data
        const processedData = result.data.map(point => chartType === 'candle' ? ({
          time: point.timestamp as any,
          open: point.price.open,
          high: point.price.high,
          low: point.price.low,
          close: point.price.close
        }) : ({
          time: point.timestamp as any,
          value: point.price.close
        }))
        
        const volumeData = result.data.map(point => ({
          time: point.timestamp as any,
          value: volumeType === 'totalDollarVolume' ? point.volume.totalDollarVolume : point.volume.totalSize,
          color: point.price.close >= point.price.open ? '#26a69a' : '#ef5350'
        }))
        
        if (seriesRef.current) {
          seriesRef.current.setData(processedData)
          
          // Update line color for line chart
          if (chartType === 'line' && 'applyOptions' in seriesRef.current) {
            const lineColor = getLineColor(result.data)
            seriesRef.current.applyOptions({ color: lineColor })
          }
        }
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(volumeData)
        }
        
        // Update latest timestamp for real-time updates
        if (result.data.length > 0) {
          latestTimestampRef.current = result.data[result.data.length - 1].timestamp
        }
        
        setLoading(false)
        return
      }

    // Check if request is already in progress globally
          const existingPromise = globalMarketHistoryPromises.get(requestKey)
    if (existingPromise) {
      try {
        const result = await existingPromise
        // Process data same as above
        const processedData = result.data.map(point => chartType === 'candle' ? ({
          time: point.timestamp as any,
          open: point.price.open,
          high: point.price.high,
          low: point.price.low,
          close: point.price.close
        }) : ({
          time: point.timestamp as any,
          value: point.price.close
        }))
        
        const volumeData = result.data.map(point => ({
          time: point.timestamp as any,
          value: volumeType === 'totalDollarVolume' ? point.volume.totalDollarVolume : point.volume.totalSize,
          color: point.price.close >= point.price.open ? '#26a69a' : '#ef5350'
        }))
        
        if (seriesRef.current) {
          seriesRef.current.setData(processedData)
          
          // Update line color for line chart
          if (chartType === 'line' && 'applyOptions' in seriesRef.current) {
            const lineColor = getLineColor(result.data)
            seriesRef.current.applyOptions({ color: lineColor })
          }
        }
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(volumeData)
        }
        
        // Update latest timestamp for real-time updates
        if (result.data.length > 0) {
          latestTimestampRef.current = result.data[result.data.length - 1].timestamp
        }
        
        setLoading(false)
      } catch (error) {
        setError('Failed to load market data')
        setLoading(false)
      }
      return
    }

    // Check if this exact request is already active locally (legacy protection)
    if (activeRequestsRef.current.has(requestKey)) {
      return
    }

    // Mark this request as active immediately
    activeRequestsRef.current.add(requestKey)
    setLoading(true)
    setError(null)
    setVolumeError(null)
    
    // Store this request in global promises
    const apiPromise = (async (): Promise<MarketHistoryResponse> => {
      try {
        const cacheKey = requestKey

        // Check local cache first (existing logic)
        const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        rawDataRef.current = cachedData
        volumeDataRef.current = cachedData // Same data contains both price and volume
        
        // Update chart with cached data
        const chartData = cachedData.map(point => chartType === 'candle' ? ({
          time: point.timestamp as any,
          open: point.price.open,
          high: point.price.high,
          low: point.price.low,
          close: point.price.close
        }) : ({
          time: point.timestamp as any,
          value: point.price.close
        }))
        
        if (seriesRef.current) {
          seriesRef.current.setData(chartData)
          
          // Update line color for line chart
          if (chartType === 'line' && 'applyOptions' in seriesRef.current) {
            const lineColor = getLineColor(cachedData)
            seriesRef.current.applyOptions({ color: lineColor })
          }
        }
        
        // Update volume display
        const volumeData = cachedData.map(point => ({
          time: point.timestamp as any,
          value: volumeType === 'totalDollarVolume' ? point.volume.totalDollarVolume : point.volume.totalSize,
          color: point.price.close >= point.price.open ? '#26a69a' : '#ef5350'
        }))
        
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(volumeData)
        }
        
        // Update latest timestamp for real-time updates
        if (cachedData.length > 0) {
          latestTimestampRef.current = cachedData[cachedData.length - 1].timestamp
        }
        
        setLoading(false)
        // Clean up active request marker for cached responses
        activeRequestsRef.current.delete(requestKey)
        return { 
          data: cachedData,
          asset_id: assetId,
          start: startTs,
          fidelity: fidelity
        }
      }

      const url = `https://trade-analyze-production.up.railway.app/api/market-history?asset_id=${encodeURIComponent(assetId)}&startTs=${startTs}&endTs=${endTs}&fidelity=${fidelity}`
      
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
      
      // Store raw data and cache it locally too
      rawDataRef.current = result.data
      volumeDataRef.current = result.data // Same data contains both price and volume
      setCachedData(cacheKey, result.data)
      
      // Update latest timestamp for real-time updates
      if (result.data.length > 0) {
        latestTimestampRef.current = result.data[result.data.length - 1].timestamp
      }
      
             return result
       
       } catch (error) {
         throw error
       } finally {
         globalMarketHistoryPromises.delete(requestKey)
       }
     })()
     
     // Register the global promise
     globalMarketHistoryPromises.set(requestKey, apiPromise)
     
     try {
       const result = await apiPromise
       
       // Convert to chart format
      const chartData = result.data.map(point => chartType === 'candle' ? ({
        time: point.timestamp as any,
        open: point.price.open,
        high: point.price.high,
        low: point.price.low,
        close: point.price.close
      }) : ({
        time: point.timestamp as any,
        value: point.price.close
      }))
      
      // Update chart with new data
      if (seriesRef.current) {
        seriesRef.current.setData(chartData)
        
        // Update line color for line chart
        if (chartType === 'line' && 'applyOptions' in seriesRef.current) {
          const lineColor = getLineColor(result.data)
          seriesRef.current.applyOptions({ color: lineColor })
        }
      }
      
      // Update volume display
      const volumeData = result.data.map(point => ({
        time: point.timestamp as any,
        value: volumeType === 'totalDollarVolume' ? point.volume.totalDollarVolume : point.volume.totalSize,
        color: point.price.close >= point.price.open ? '#26a69a' : '#ef5350'
      }))
      
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(volumeData)
      }
      
      // Update latest timestamp for real-time updates
      if (result.data.length > 0) {
        latestTimestampRef.current = result.data[result.data.length - 1].timestamp
      }
      
      setLoading(false)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Error loading market history: ${errorMessage}`)
      setLoading(false)
    } finally {
      // Always clean up the active request marker
      activeRequestsRef.current.delete(requestKey)
    }
  }, [selectedMarket, selectedToken, selectedPeriod, calculateTimeRange, volumeType, getCachedData, setCachedData, chartType])

  // Trigger chart re-initialization when chart type changes
  useEffect(() => {
    setChartKey(prev => prev + 1)
  }, [chartType])

  // Fetch data when dependencies change
  useEffect(() => {
    const assetId = getAssetIdFromMarket(selectedMarket, selectedToken)
    if (assetId) {
      // Stop any existing real-time updates
      stopRealtimeUpdates()
      
      // Use a small delay to handle StrictMode double execution
      const timeoutId = setTimeout(() => {
        fetchMarketHistoryData().then(() => {
          // Start real-time updates after initial data is loaded
          setTimeout(() => {
            startRealtimeUpdates()
          }, 1000) // Wait 1 second after initial load
        })
      }, 10) // 10ms delay to let StrictMode settle
      
      return () => {
        clearTimeout(timeoutId)
        stopRealtimeUpdates()
      }
    } else {
      // Clear all active requests when no market selected
      activeRequestsRef.current.clear()
      stopRealtimeUpdates()
    }
  }, [selectedMarket, selectedToken, selectedPeriod, fetchMarketHistoryData, startRealtimeUpdates, stopRealtimeUpdates])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRequestsRef.current.clear()
      stopRealtimeUpdates()
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [stopRealtimeUpdates])

  // Update volume display when volume type changes
  useEffect(() => {
    if (rawDataRef.current.length > 0) {
      // Update volume display with new volume type
      const volumeData = rawDataRef.current.map(point => ({
        time: point.timestamp as any,
        value: volumeType === 'totalDollarVolume' ? point.volume.totalDollarVolume : point.volume.totalSize,
        color: point.price.close >= point.price.open ? '#26a69a' : '#ef5350'
      }))
      
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(volumeData)
      }
    }
  }, [volumeType, chartKey])

  // Helper function to determine line color based on overall trend
  const getLineColor = useCallback((data: MarketHistoryDataPoint[]) => {
    if (data.length < 2) return '#26a69a'
    const firstPrice = data[0].price.close
    const lastPrice = data[data.length - 1].price.close
    return lastPrice >= firstPrice ? '#26a69a' : '#ef5350'
  }, [])

  // Restore chart data when chart is re-initialized (chartKey changes)
  useEffect(() => {
    if (rawDataRef.current.length > 0 && seriesRef.current && volumeSeriesRef.current) {
      // Restore price data
      const chartData = rawDataRef.current.map(point => chartType === 'candle' ? ({
        time: point.timestamp as any,
        open: point.price.open,
        high: point.price.high,
        low: point.price.low,
        close: point.price.close
      }) : ({
        time: point.timestamp as any,
        value: point.price.close
      }))
      
      seriesRef.current.setData(chartData)
      
      // Update line color for line chart based on overall trend
      if (chartType === 'line' && 'applyOptions' in seriesRef.current) {
        const lineColor = getLineColor(rawDataRef.current)
        seriesRef.current.applyOptions({ color: lineColor })
      }
      
      // Restore volume data
      const volumeData = rawDataRef.current.map(point => ({
        time: point.timestamp as any,
        value: volumeType === 'totalDollarVolume' ? point.volume.totalDollarVolume : point.volume.totalSize,
        color: point.price.close >= point.price.open ? '#26a69a' : '#ef5350'
      }))
      
      volumeSeriesRef.current.setData(volumeData)
    }
  }, [chartKey, volumeType, chartType, getLineColor])

  const chartTitle = `${selectedMarket?.question || 'Market'} Price Chart`

  // Add resize trigger when chart tab becomes active
  const handleTabChange = useCallback(() => {
    setChartKey(prev => prev + 1)
  }, [])

  // Call handleTabChange when this component mounts (used by parent)
  useEffect(() => {
    handleTabChange()
  }, [handleTabChange])

  return (
    <div className="space-y-4 mt-4 sm:mt-6">
      <div className="space-y-3">
        <div>
          <div className="text-xs text-muted-foreground mb-2 font-medium">Chart Type & Time Period</div>
          <div className="flex gap-2">
            {/* Chart Type Toggle */}
            <div className="flex gap-1">
              <Button
                variant={chartType === 'candle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('candle')}
                disabled={loading}
                className="text-xs px-2 py-1 h-7 flex items-center gap-1"
              >
                <BarChart3 className="h-3 w-3" />
                Candle
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
                disabled={loading}
                className="text-xs px-2 py-1 h-7 flex items-center gap-1"
              >
                <LineChart className="h-3 w-3" />
                Line
              </Button>
            </div>
            {/* Time Period Buttons */}
            <div className="flex gap-1">
              {(['1m', '1h', '6h', '1d'] as TimePeriod[]).map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                  disabled={loading}
                  className="text-xs px-2 py-1 h-7"
                >
                  {period}
                </Button>
              ))}
            </div>
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
        
        {volumeError && (
          <Alert className="mt-2 py-2">
            <AlertCircle className="h-3 w-3" />
            <AlertDescription className="text-xs">
              {volumeError}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {realtimeError && (
        <Alert variant="destructive" className="mb-4">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Real-time updates failed: {realtimeError}
          </AlertDescription>
        </Alert>
      )}

      {/* Real-time status indicator */}
      <div className="flex items-center gap-2 text-sm mb-4">
        <div className="flex items-center gap-1">
          <Activity className={`h-3 w-3 ${newDataHighlight ? 'text-green-500 animate-pulse' : 'text-green-500'}`} />
          <span className="text-green-600 dark:text-green-400">Live Updates</span>
        </div>
        {lastUpdateTime && (
          <span className="text-xs text-muted-foreground">
            Last: {lastUpdateTime.toLocaleTimeString()}
          </span>
        )}
      </div>
      
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div 
          key={chartKey}
          ref={chartContainerRef} 
          className={`w-full transition-all duration-300 ${newDataHighlight ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
          style={{ height: '384px' }}
        />

      </div>
    </div>
  )
} 