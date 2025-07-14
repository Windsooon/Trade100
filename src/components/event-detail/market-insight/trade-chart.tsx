import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Loader2, BarChart3 } from 'lucide-react'
import { createChart, IChartApi, ISeriesApi, CandlestickSeries, HistogramSeries, ColorType } from 'lightweight-charts'
import { TradeChartProps, TimePeriod, MarketHistoryResponse, MarketHistoryDataPoint } from './types'

// Trade Chart Component - Real integration with LightweightCharts
export function TradeChart({ 
  trades, 
  loading, 
  error, 
  holder, 
  selectedMarket,
  selectedPeriod = '1h'
}: TradeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const priceSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  
  const [chartLoading, setChartLoading] = useState(false)
  const [chartError, setChartError] = useState<string | null>(null)
  const [priceData, setPriceData] = useState<MarketHistoryDataPoint[]>([])

  // Fetch market history data for the chart
  const fetchMarketHistory = useCallback(async () => {
    if (!selectedMarket?.conditionId) {
      setChartError('No market selected')
      return
    }

    setChartLoading(true)
    setChartError(null)

    try {
      // Get last 14 days of 1-hour data for trade chart (increased from 7 days to capture more trades)
      const now = Math.floor(Date.now() / 1000)
      const startTs = now - (14 * 24 * 3600)
      const fidelity = 60 // 1 hour intervals

      const url = `https://trade-analyze-production.up.railway.app/api/market-history?market=${encodeURIComponent(selectedMarket.conditionId)}&startTs=${startTs}&endTs=${now}&fidelity=${fidelity}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch market history: ${response.status}`)
      }
      
      const result: MarketHistoryResponse = await response.json()
      
      if (!result.data || result.data.length === 0) {
        setChartError('No price data available for this market')
        return
      }
      
      setPriceData(result.data)
    } catch (err) {
      console.error('Market history fetch error:', err)
      setChartError('Failed to load price data')
    } finally {
      setChartLoading(false)
    }
  }, [selectedMarket?.conditionId])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

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
      height: 300,
    }
    
    try {
      const chart = createChart(chartContainerRef.current, chartOptions)
      
      // Add candlestick series for price
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

      // Add volume series
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
      })
      
      volumeSeries.priceScale().applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      })

      chartRef.current = chart
      priceSeriesRef.current = candlestickSeries
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

      const resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(chartContainerRef.current)

      return () => {
        resizeObserver.disconnect()
        chart.remove()
      }
    } catch (error) {
      console.error('Chart initialization error:', error)
      setChartError('Failed to initialize chart')
    }
  }, [])

  // Function to convert trade timestamp to chart candle timestamp
  const convertTradeTimestampToChartTime = useCallback((tradeTimestamp: number, period: TimePeriod): number => {
    // Convert milliseconds to seconds if needed
    const timestamp = tradeTimestamp > 1000000000000 ? Math.floor(tradeTimestamp / 1000) : tradeTimestamp
    
    const date = new Date(timestamp * 1000)
    
    switch (period) {
      case '1m':
        // Round down to nearest minute
        date.setSeconds(0, 0)
        break
      case '1h':
        // Round down to nearest hour
        date.setMinutes(0, 0, 0)
        break
      case '6h':
        // Round down to nearest 6-hour interval (00:00, 06:00, 12:00, 18:00)
        const hours = date.getHours()
        const roundedHours = Math.floor(hours / 6) * 6
        date.setHours(roundedHours, 0, 0, 0)
        break
      case '1d':
        // Round down to start of day
        date.setHours(0, 0, 0, 0)
        break
      default:
        // Default to hourly
        date.setMinutes(0, 0, 0)
        break
    }
    
    return Math.floor(date.getTime() / 1000)
  }, [])

  // Function to add trade markers using custom primitives
  const addTradeMarkers = useCallback((trades: any[], period: TimePeriod) => {
    console.log('🎯 addTradeMarkers called with:', {
      tradesCount: trades.length,
      period,
      priceSeriesRefExists: !!priceSeriesRef.current,
      chartRefExists: !!chartRef.current,
      firstTrade: trades[0]
    })

    if (!priceSeriesRef.current || !chartRef.current) {
      console.log('❌ Price series ref or chart ref not available')
      return
    }

    if (trades.length === 0) {
      console.log('❌ No trades to add markers for')
      return
    }

    try {
      // Convert trades to marker data
      const markerData: any[] = []
      
      console.log('🔄 Converting trades to marker data...')
      
      for (let i = 0; i < trades.length; i++) {
        const trade = trades[i]
        const chartTimestamp = convertTradeTimestampToChartTime(trade.timestamp, period)
        
        const marker = {
          time: chartTimestamp,
          side: trade.side,
          price: trade.price,
          size: trade.size
        }
        
        markerData.push(marker)
        
        console.log(`📍 Marker ${i + 1}:`, {
          originalTimestamp: trade.timestamp,
          originalDate: new Date(trade.timestamp * 1000).toISOString(),
          convertedTimestamp: chartTimestamp,
          convertedDate: new Date(chartTimestamp * 1000).toISOString(),
          side: trade.side,
          price: trade.price,
          marker
        })
      }

      console.log(`🎯 Creating custom primitive for ${markerData.length} markers`)
      
      // Create a custom primitive to draw trade markers using any to bypass TypeScript issues
      const tradeMarkerPrimitive: any = {
        draw: (target: any) => {
          try {
            const timeScale = chartRef.current!.timeScale()
            const ctx = target.getCanvasContext ? target.getCanvasContext() : target.getContext('2d')
            
            if (!ctx) return
            
            markerData.forEach(marker => {
              try {
                const x = timeScale.timeToCoordinate(marker.time)
                // For y coordinate, we'll use the series data to find the closest price point
                if (x !== null) {
                  // Get the current data from the series to find y coordinate
                  const seriesData = (priceSeriesRef.current as any).data()
                  if (seriesData && seriesData.length > 0) {
                    // Find the closest data point to our marker time
                    const closestPoint = seriesData.reduce((closest: any, point: any) => {
                      const timeDiff = Math.abs(point.time - marker.time)
                      const closestTimeDiff = Math.abs(closest.time - marker.time)
                      return timeDiff < closestTimeDiff ? point : closest
                    })
                    
                    if (closestPoint) {
                      // Use the series coordinate conversion
                      const priceScale = priceSeriesRef.current!.priceScale()
                      const y = (priceScale as any).priceToCoordinate ? 
                        (priceScale as any).priceToCoordinate(marker.price) : 
                        (priceSeriesRef.current as any).priceToCoordinate(marker.price)
                      
                      if (y !== null && y !== undefined) {
                        // Draw circle - make it much bigger and more visible
                        ctx.beginPath()
                        ctx.arc(x, y, 10, 0, 2 * Math.PI) // Increased from 6 to 10 pixels radius
                        ctx.fillStyle = marker.side === 'BUY' ? '#22c55e' : '#ef4444'
                        ctx.fill()
                        ctx.strokeStyle = '#ffffff'
                        ctx.lineWidth = 3 // Increased border width from 2 to 3
                        ctx.stroke()
                        
                        // Add a glow effect
                        ctx.shadowColor = marker.side === 'BUY' ? '#22c55e' : '#ef4444'
                        ctx.shadowBlur = 8
                        ctx.beginPath()
                        ctx.arc(x, y, 8, 0, 2 * Math.PI)
                        ctx.fill()
                        ctx.shadowBlur = 0 // Reset shadow
                        
                        console.log(`✅ Drew marker at (${x}, ${y}) for ${marker.side}`)
                      }
                    }
                  }
                }
              } catch (error) {
                console.warn('Error drawing individual marker:', error)
              }
            })
          } catch (error) {
            console.error('Error in primitive draw function:', error)
          }
        }
      }
      
      // Attach the primitive to the price series
      try {
        (priceSeriesRef.current as any).attachPrimitive(tradeMarkerPrimitive)
        console.log('✅ Trade marker primitive attached successfully')
      } catch (error) {
        console.error('❌ Failed to attach primitive:', error)
        
        // Fallback: Log the error and continue without markers
        console.log('🔄 Unable to add trade markers, continuing without them')
      }
    } catch (error) {
      console.error('❌ Error in addTradeMarkers:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      })
    }
  }, [convertTradeTimestampToChartTime])

  // Calculate valid trades in timeframe
  const validTrades = useMemo(() => {
    console.log('🔍 Calculating validTrades...')
    
    if (trades.length === 0 || priceData.length === 0) {
      console.log('❌ No trades or price data:', { tradesCount: trades.length, priceDataCount: priceData.length })
      return []
    }
    
    const minTime = Math.min(...priceData.map(p => p.timestamp))
    const maxTime = Math.max(...priceData.map(p => p.timestamp))
    
    console.log('⏱️ Price data time range:', {
      minTime,
      maxTime,
      minDate: new Date(minTime * 1000).toISOString(),
      maxDate: new Date(maxTime * 1000).toISOString()
    })
    
    const validTradesFiltered = trades.filter(trade => 
      trade.timestamp >= minTime && trade.timestamp <= maxTime
    )
    
    console.log('📊 Trade validation results:', {
      totalTrades: trades.length,
      validTrades: validTradesFiltered.length,
      firstTrade: trades[0] ? {
        timestamp: trades[0].timestamp,
        date: new Date(trades[0].timestamp * 1000).toISOString(),
        withinRange: trades[0].timestamp >= minTime && trades[0].timestamp <= maxTime
      } : null,
      lastTrade: trades[trades.length - 1] ? {
        timestamp: trades[trades.length - 1].timestamp,
        date: new Date(trades[trades.length - 1].timestamp * 1000).toISOString(),
        withinRange: trades[trades.length - 1].timestamp >= minTime && trades[trades.length - 1].timestamp <= maxTime
      } : null
    })
    
    return validTradesFiltered
  }, [trades, priceData])

  // Update chart with price data and trade markers
  useEffect(() => {
    console.log('📈 Chart update effect triggered')
    
    if (priceData.length > 0 && priceSeriesRef.current && volumeSeriesRef.current) {
      console.log('✅ Chart components ready, updating...')
      
      // Convert price data to chart format
      const chartData = priceData.map(point => ({
        time: point.timestamp as any,
        open: point.price.open,
        high: point.price.high,
        low: point.price.low,
        close: point.price.close
      }))
      
      console.log('📊 Setting price data:', {
        dataPoints: chartData.length,
        firstPoint: chartData[0],
        lastPoint: chartData[chartData.length - 1]
      })
      
      priceSeriesRef.current.setData(chartData)
      
      // Add volume data
      const volumeData = priceData.map(point => ({
        time: point.timestamp as any,
        value: point.volume.totalDollarVolume,
        color: point.price.close >= point.price.open ? '#26a69a' : '#ef5350'
      }))
      
      volumeSeriesRef.current.setData(volumeData)
      console.log('📊 Volume data set')

      // Add trade markers if we have valid trades
      if (validTrades.length > 0 && chartRef.current) {
        console.log(`🎯 Found ${validTrades.length} valid trades, processing markers...`)
        
        // If trades exist but aren't visible, adjust the chart's visible range
        if (trades.length > 0) {
          const tradeTimestamps = trades.map(trade => convertTradeTimestampToChartTime(trade.timestamp, selectedPeriod))
          const minTradeTime = Math.min(...tradeTimestamps)
          const maxTradeTime = Math.max(...tradeTimestamps)
          
          console.log('⏱️ Adjusting chart time range:', {
            minTradeTime,
            maxTradeTime,
            minTradeDate: new Date(minTradeTime * 1000).toISOString(),
            maxTradeDate: new Date(maxTradeTime * 1000).toISOString()
          })
          
          // Set visible range to show the trades with some padding
          const padding = (maxTradeTime - minTradeTime) * 0.1 || 24 * 3600 // 10% padding or 1 day minimum
          const from = Math.max(minTradeTime - padding, Math.min(...priceData.map(p => p.timestamp)))
          const to = Math.min(maxTradeTime + padding, Math.max(...priceData.map(p => p.timestamp)))
          
          console.log('📐 Setting visible range:', {
            from,
            to,
            fromDate: new Date(from * 1000).toISOString(),
            toDate: new Date(to * 1000).toISOString()
          })
          
          try {
            chartRef.current.timeScale().setVisibleRange({
              from: from as any,
              to: to as any
            })
            console.log('✅ Visible range set successfully')
          } catch (error) {
            console.warn('⚠️ Failed to set visible range:', error)
          }
        }
        
        // Add markers with a delay to ensure chart is fully rendered
        console.log('⏳ Scheduling marker addition in 700ms...')
        setTimeout(() => {
          console.log('🎯 Adding trade markers now...')
          addTradeMarkers(validTrades, selectedPeriod)
        }, 700) // Increased delay to allow for range adjustment
      } else {
        console.log(`❌ No valid trades to display: ${trades.length} total trades, ${priceData.length} price points, validTrades: ${validTrades.length}`)
      }
    } else {
      console.log('❌ Chart components not ready:', {
        priceDataLength: priceData.length,
        priceSeriesExists: !!priceSeriesRef.current,
        volumeSeriesExists: !!volumeSeriesRef.current
      })
    }
  }, [priceData, validTrades, addTradeMarkers, selectedPeriod, trades, convertTradeTimestampToChartTime])

  // Fetch data when market changes
  useEffect(() => {
    fetchMarketHistory()
  }, [fetchMarketHistory])

  // Combined loading state
  const isLoading = loading || chartLoading
  const combinedError = error || chartError

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-80 bg-muted/20 rounded border">
        <div className="text-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading chart and trades...</p>
        </div>
      </div>
    )
  }

  if (combinedError) {
    return (
      <div className="flex items-center justify-center h-80 bg-muted/20 rounded border">
        <div className="text-center space-y-2">
          <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
          <p className="text-xs text-muted-foreground">{combinedError}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div 
        ref={chartContainerRef} 
        className="w-full border rounded bg-background"
        style={{ height: '300px' }}
      />
      
      {/* Chart Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          Price data: {priceData.length} points over 14 days • Trades: {validTrades.length} visible ({trades.length} total)
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>BUY trades</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>SELL trades</span>
          </div>
        </div>
      </div>
    </div>
  )
} 