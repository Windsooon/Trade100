import { useState, useRef, useCallback, useEffect } from 'react'
import { IChartApi, ISeriesApi, LineSeries, CandlestickSeries, LineData } from 'lightweight-charts'
import { useSharedOrderBook } from './shared-order-book-provider'

interface RawPricePoint {
  t: number // timestamp
  p: number // price
}

interface UseLiveModeOptions {
  isCurrentMarketActive: boolean
  selectedMarket: {
    conditionId: string
    clobTokenIds?: string
  } | null
  selectedToken: 'yes' | 'no'
  rawDataRef: React.MutableRefObject<RawPricePoint[]>
  chartRef: React.MutableRefObject<IChartApi | null>
  seriesRef: React.MutableRefObject<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>
  volumeSeriesRef: React.MutableRefObject<ISeriesApi<'Histogram'> | null>
}

interface LiveDataPoint {
  time: number
  price: number
}

export function useLiveMode({
  isCurrentMarketActive,
  selectedMarket,
  selectedToken,
  rawDataRef,
  chartRef,
  seriesRef,
  volumeSeriesRef
}: UseLiveModeOptions) {
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [liveDataCount, setLiveDataCount] = useState(0)
  
  // Get orderbook data from SharedOrderBookProvider
  const { orderBooks, connectionStatus } = useSharedOrderBook()
  
  // Live data management
  const liveDataRef = useRef<LiveDataPoint[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<number>(0)
  
  // Constants
  const LIVE_DATA_LIMIT = 3600 // 1 hour in seconds
  const UPDATE_INTERVAL = 1000 // 1 second in milliseconds

  // Calculate mid price from orderbook
  const calculateMidPrice = useCallback(() => {
    if (!selectedMarket?.conditionId || !selectedToken) return null
    
    const orderBookKey = `${selectedMarket.conditionId}_${selectedToken}`
    const orderBook = orderBooks[orderBookKey]
    
    if (!orderBook) return null
    
    const { bids, asks } = orderBook
    
    // Get highest bid and lowest ask
    const highestBid = bids.length > 0 ? parseFloat(bids[0].price) : 0.0
    const lowestAsk = asks.length > 0 ? parseFloat(asks[0].price) : 1.0
    
    // Calculate mid price
    const midPrice = (highestBid + lowestAsk) / 2
    
    return midPrice
  }, [orderBooks, selectedMarket?.conditionId, selectedToken])

  // Add new live data point
  const addLiveDataPoint = useCallback((timestamp: number, price: number) => {
    const newPoint: LiveDataPoint = { time: timestamp, price }
    
    // Add to live data array
    liveDataRef.current.push(newPoint)
    
    // Remove old data points (keep only last 3600 seconds)
    const cutoffTime = timestamp - LIVE_DATA_LIMIT
    liveDataRef.current = liveDataRef.current.filter(point => point.time >= cutoffTime)
    
    // Update data count
    setLiveDataCount(liveDataRef.current.length)
    
    // Update chart
    if (seriesRef.current && isLiveMode) {
      const chartData: LineData[] = liveDataRef.current.map(point => ({
        time: point.time as any,
        value: point.price
      }))
      
      seriesRef.current.setData(chartData)
      
      // Auto-scroll to show latest data
      if (chartRef.current) {
        chartRef.current.timeScale().scrollToRealTime()
      }
    }
  }, [isLiveMode])

  // Start live updates
  const startLiveUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    intervalRef.current = setInterval(() => {
      if (!isLiveMode) return
      
      // Check connection status
      if (connectionStatus !== 'connected') {
        setLiveError('WebSocket disconnected')
        return
      }
      
      // Calculate mid price
      const midPrice = calculateMidPrice()
      
      if (midPrice === null) {
        // Check if we have orderbook data at all
        const orderBookKey = `${selectedMarket?.conditionId}_${selectedToken}`
        const orderBook = orderBooks[orderBookKey]
        
        if (!orderBook) {
          setLiveError('No orderbook data for this market')
        } else if (orderBook.bids.length === 0 && orderBook.asks.length === 0) {
          setLiveError('Orderbook is empty')
        } else {
          setLiveError('No live data available')
        }
        return
      }
      
      // Clear any previous errors
      setLiveError(null)
      
      // Add data point
      const timestamp = Math.floor(Date.now() / 1000)
      if (timestamp > lastUpdateRef.current) {
        addLiveDataPoint(timestamp, midPrice)
        lastUpdateRef.current = timestamp
      }
    }, UPDATE_INTERVAL)
  }, [isLiveMode, connectionStatus, calculateMidPrice, selectedMarket?.conditionId, selectedToken, orderBooks, addLiveDataPoint])

  // Stop live updates
  const stopLiveUpdates = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Clear live data
  const clearLiveData = useCallback(() => {
    liveDataRef.current = []
    setLiveDataCount(0)
    lastUpdateRef.current = 0
    setLiveError(null)
  }, [])

  // Handle switching to live mode
  const switchToLiveMode = useCallback(() => {
    // Only allow live mode for active markets
    if (!isCurrentMarketActive) {
      setLiveError('Market is not active')
      return
    }
    
    // Check if we have orderbook data
    if (connectionStatus !== 'connected') {
      setLiveError('WebSocket disconnected - waiting for connection')
      return
    }
    
    setIsLiveMode(true)
    setLiveError(null)
    
    // Clear existing data
    clearLiveData()
    
    if (chartRef.current && seriesRef.current) {
      // Remove candlestick series
      chartRef.current.removeSeries(seriesRef.current)
      
      // Hide volume series
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.applyOptions({ visible: false })
      }
      
      // Create line series for live data
      const lineSeries = chartRef.current.addSeries(LineSeries, {
        color: '#2196F3',
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
      })
      
      // Position line series to take full chart height
      lineSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      })
      
      seriesRef.current = lineSeries
      
      // Reset chart scale and scroll to real time
      chartRef.current.timeScale().fitContent()
      chartRef.current.timeScale().scrollToRealTime()
    }
    
    // Start live updates
    startLiveUpdates()
  }, [isCurrentMarketActive, connectionStatus, clearLiveData, chartRef, seriesRef, volumeSeriesRef, startLiveUpdates])

  // Handle switching to historical mode
  const switchToHistoricalMode = useCallback((period: string) => {
    setIsLiveMode(false)
    setLiveError(null)
    
    // Stop live updates
    stopLiveUpdates()
    
    // Clear live data
    clearLiveData()
    
    if (chartRef.current && seriesRef.current) {
      // Remove line series
      chartRef.current.removeSeries(seriesRef.current)
      
      // Show volume series
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.applyOptions({ visible: true })
      }
      
      // Create candlestick series for historical data
      const candlestickSeries = chartRef.current.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      })
      
      // Position price series to take 70% of chart height (leave room for volume)
      candlestickSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.1,
          bottom: 0.4,
        },
      })
      
      seriesRef.current = candlestickSeries
    }
  }, [stopLiveUpdates, clearLiveData, chartRef, seriesRef, volumeSeriesRef])

  // Get chart title with live mode indicator
  const getChartTitle = useCallback((selectedToken: 'yes' | 'no') => {
    return `${selectedToken.toUpperCase()} Token Price Chart ${isLiveMode ? '(Live)' : '(Historical)'}`
  }, [isLiveMode])

  // Get data point count for display
  const getDataPointCount = useCallback(() => {
    if (isLiveMode) {
      return `${liveDataCount} live data points`
    } else {
      return `${rawDataRef.current.length} raw data points loaded`
    }
  }, [isLiveMode, liveDataCount, rawDataRef])

  // Get live mode status
  const getLiveModeStatus = useCallback(() => {
    if (!isLiveMode) return null
    
    if (liveError) {
      return { type: 'error', message: liveError }
    }
    
    if (connectionStatus !== 'connected') {
      return { type: 'warning', message: 'WebSocket disconnected' }
    }
    
    return { type: 'success', message: `Live updates active (${liveDataCount} points)` }
  }, [isLiveMode, liveError, connectionStatus, liveDataCount])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLiveUpdates()
    }
  }, [stopLiveUpdates])

  // Monitor connection status changes
  useEffect(() => {
    if (isLiveMode && connectionStatus === 'connected' && !intervalRef.current) {
      // Restart live updates if connection is restored
      startLiveUpdates()
    }
  }, [isLiveMode, connectionStatus, startLiveUpdates])

  return {
    isLiveMode,
    liveError,
    liveDataCount,
    connectionStatus,
    switchToLiveMode,
    switchToHistoricalMode,
    getChartTitle,
    getDataPointCount,
    getLiveModeStatus,
    clearLiveData
  }
} 