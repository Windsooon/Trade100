"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { Market, Event } from '@/lib/stores'
import { createChart, IChartApi, ISeriesApi, CandlestickData, ColorType, CandlestickSeries, LogicalRange, LineSeries, LineData, HistogramSeries, HistogramData } from 'lightweight-charts'
import { processRawPriceData, TimePeriod } from '@/lib/price-processing'

interface TradingChartCardProps {
  selectedMarket: Market | null
  selectedToken: 'yes' | 'no'
  event: Event
}

interface RawPricePoint {
  t: number // timestamp
  p: number // price
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
  const [volumeType, setVolumeType] = useState<VolumeType>('totalDollarVolume')
  const [volumeError, setVolumeError] = useState<string | null>(null)
  
  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  
  // Data refs - store raw data and processed data
  const rawDataRef = useRef<RawPricePoint[]>([])
  const realTimeDataRef = useRef<LineData[]>([])
  const volumeDataRef = useRef<VolumeData[]>([])
  
  // Ref to track current token for tooltip (since tooltip effect has no dependencies)
  const selectedTokenRef = useRef<'yes' | 'no'>(selectedToken)
  
  // Update token ref when token changes
  useEffect(() => {
    selectedTokenRef.current = selectedToken
  }, [selectedToken])
  
  const isCurrentMarketActive = useMemo(() => {
    return selectedMarket?.active === true && selectedMarket?.archived === false && selectedMarket?.closed === false
  }, [selectedMarket])

  const formatVolume = useCallback((value: number, isDollar: boolean = false): string => {
    const prefix = isDollar ? '$' : ''
    if (value >= 1000000) {
      return `${prefix}${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${prefix}${(value / 1000).toFixed(1)}K`
    }
    return `${prefix}${value.toFixed(0)}`
  }, [])

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
        lineSeries.setData(realTimeDataRef.current)
      }
    }
  }, [isCurrentMarketActive])

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
      
      // Process and display data for the new period
      if (rawDataRef.current.length > 0) {
        const processedData = processRawPriceData(rawDataRef.current, period)
        if (processedData.length > 0) {
          candlestickSeries.setData(processedData)
        }
      }
    }
  }, [])

  // Initialize chart
  useEffect(() => {
    let chart: IChartApi | null = null
    let resizeObserver: ResizeObserver | null = null
    
    const initChart = () => {
      if (!chartContainerRef.current) {
        setTimeout(initChart, 100)
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
      seriesRef.current = candlestickSeries
      volumeSeriesRef.current = volumeSeries

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
    }
  }, [])

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
      width: ${toolTipWidth}px; 
      height: auto; 
      position: absolute; 
      display: none; 
      padding: 8px; 
      box-sizing: border-box; 
      font-size: 12px; 
      text-align: left; 
      z-index: 1001; 
      pointer-events: none; 
      border: 1px solid; 
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif; 
      -webkit-font-smoothing: antialiased; 
      -moz-osx-font-smoothing: grayscale;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border-color: #26a69a;
    `
    container.appendChild(volumeToolTip)

    // Format volume values
    const formatVolume = (value: number, isDollar: boolean = false): string => {
      const prefix = isDollar ? '$' : ''
      if (value >= 1000000) {
        return `${prefix}${(value / 1000000).toFixed(1)}M`
      } else if (value >= 1000) {
        return `${prefix}${(value / 1000).toFixed(1)}K`
      }
      return `${prefix}${value.toFixed(0)}`
    }

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
        const volumeAreaStart = container.clientHeight * 0.7 // Volume area starts at 70% of chart height
        const isInVolumeArea = param.point.y >= volumeAreaStart
        
        if (isInVolumeArea) {
          // Show volume tooltip, hide price tooltip
          toolTip.style.display = 'none'
          
          // Get volume data for this timestamp
          const currentVolumeData = volumeDataRef.current
          if (currentVolumeData && currentVolumeData.length > 0) {
            const targetTime = param.time as number
            const volumeEntry = currentVolumeData.find(vol => vol.timestamp === targetTime)
            
            if (volumeEntry) {
              const timestamp = param.time as number
              const date = new Date(timestamp * 1000)
              const dateStr = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
              
              volumeToolTip.innerHTML = `
                <div style="color: #26a69a; font-weight: 500;">
                  Volume Data
                </div>
                <div style="margin: 4px 0px;">
                  <div style="font-size: 11px; color: white;">
                    Size: <span style="color: #26a69a;">${formatVolume(volumeEntry.totalSize)}</span>
                  </div>
                  <div style="font-size: 11px; color: white;">
                    Dollar Volume: <span style="color: #26a69a;">${formatVolume(volumeEntry.totalDollarVolume, true)}</span>
                  </div>
                </div>
                <div style="color: #ccc; font-size: 10px;">
                  ${dateStr}
                </div>
              `
              
              volumeToolTip.style.display = 'block'
              
              // Position volume tooltip
              let left = param.point.x + toolTipMargin
              if (left > container.clientWidth - toolTipWidth) {
                left = param.point.x - toolTipMargin - toolTipWidth
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
          
          // Get current series reference (it may change between live/historical)
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
              const lineData = data as LineData
              price = lineData.value
              openPrice = closePrice = highPrice = lowPrice = price
              isLineData = true
            } else {
              // Candlestick data (historical mode) - OHLC data
              const candleData = data as CandlestickData
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
  }, []) // Remove dependencies to prevent recreation

  // Fetch chart data - one API call per market/token combination
  // Note: selectedPeriod is NOT in dependencies to avoid unnecessary API calls
  // Period changes are handled by the separate effect below that re-processes cached data
  const fetchChartData = useCallback(async () => {
    console.log(`🚀 fetchChartData called for market: ${selectedMarket?.conditionId}, token: ${selectedToken}`)
    
    if (!selectedMarket?.clobTokenIds) {
      console.log(`❌ No market or clobTokenIds available`)
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
        throw new Error('Invalid token IDs format')
      }
      tokenId = selectedToken === 'yes' ? ids[0] : ids[1]
      if (!tokenId || typeof tokenId !== 'string') {
        throw new Error(`Invalid ${selectedToken} token ID`)
      }
      console.log(`✅ Parsed token ID: ${tokenId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error'
      console.log(`❌ Token parsing error: ${errorMessage}`)
      setError(`Failed to parse market token IDs: ${errorMessage}`)
      return
    }
    
    setLoading(true)
    setError(null)
    setVolumeError(null)
    
    try {
      // Fetch raw price data (14 days, fidelity=1)
      const priceUrl = `/api/prices-history?market=${encodeURIComponent(tokenId)}`
      console.log(`📈 Fetching price data from: ${priceUrl}`)
      const priceResponse = await fetch(priceUrl)
      
      if (!priceResponse.ok) {
        throw new Error(`Failed to fetch price data: ${priceResponse.status}`)
      }
      
      const priceResult = await priceResponse.json()
      console.log(`📈 Price response:`, priceResult)
      
      if (!priceResult.success || !priceResult.data?.length) {
        console.log(`❌ No price data available`)
        setError('No price data available for this market.')
        setLoading(false)
        return
      }
      
      // Store raw data
      rawDataRef.current = priceResult.data
      console.log(`📈 Stored ${priceResult.data.length} raw price data points`)
      
      // Process data for current period and display
      const processedData = processRawPriceData(priceResult.data, selectedPeriod)
      console.log(`📈 Processed ${processedData.length} data points for period: ${selectedPeriod}`)
      
      if (processedData.length === 0) {
        console.log(`❌ No processed data available`)
        setError('No valid price data found.')
        setLoading(false)
        return
      }
      
      // Update chart with processed data
      if (seriesRef.current && !isLiveMode) {
        seriesRef.current.setData(processedData)
        console.log(`📈 Updated chart with processed data`)
      }
      
      setLoading(false)
      console.log(`📈 About to start volume fetching...`)
      
      // Fetch volume data using timestamps from processed price data
      try {
        // Extract oldest and newest timestamps from processed price data (after normalization)
        const timestamps = processedData.map(d => d.time as number).sort((a, b) => a - b)
        const oldestTimestamp = timestamps[0]
        const newestTimestamp = timestamps[timestamps.length - 1]
        
        console.log(`📊 About to fetch volume data:`)
        console.log(`📊 Processed data points: ${processedData.length}`)
        console.log(`📊 Timestamp range: ${oldestTimestamp} to ${newestTimestamp}`)
        console.log(`📊 Token ID: ${tokenId}`)
        
        const volumeUrl = `https://poly-trade-edge.vercel.app/api/volumes-history?market=${encodeURIComponent(tokenId)}&startTs=${oldestTimestamp}&endTs=${newestTimestamp}&fidelity=1`
        console.log(`📊 Volume URL: ${volumeUrl}`)
        
        const volumeResponse = await fetch(volumeUrl)
        console.log(`📊 Volume response status: ${volumeResponse.status}`)
        
        if (volumeResponse.ok) {
          const volumeResult = await volumeResponse.json()
          console.log(`📊 Volume result:`, volumeResult)
          if (volumeResult && Array.isArray(volumeResult)) {
            volumeDataRef.current = volumeResult
            console.log(`📊 Stored ${volumeResult.length} volume data points`)
            updateVolumeDisplay(processedData, volumeResult)
          } else {
            console.log(`📊 Invalid volume data format:`, volumeResult)
            setVolumeError('Invalid volume data format')
          }
        } else {
          console.log(`📊 Volume API error: ${volumeResponse.status}`)
          setVolumeError(`Volume API error: ${volumeResponse.status}`)
        }
      } catch (volumeErr) {
        console.log(`📊 Volume fetch error:`, volumeErr)
        const volumeErrorMessage = volumeErr instanceof Error ? volumeErr.message : 'Unknown volume error'
        setVolumeError(`Volume data unavailable: ${volumeErrorMessage}`)
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Error loading chart: ${errorMessage}`)
      setLoading(false)
    }
  }, [selectedMarket?.clobTokenIds, selectedToken, isLiveMode])

  // Update volume display - matches volume data by timestamp instead of index
  const updateVolumeDisplay = useCallback((processedData: CandlestickData[], volumeData: VolumeData[]) => {
    if (!volumeSeriesRef.current || volumeData.length === 0) return
    
    try {
      const volumeHistogramData = processedData.map((priceCandle) => {
        const targetTime = priceCandle.time as number
        
        // Find volume entry with matching timestamp (volume timestamps should already be correct)
        const volumeEntry = volumeData.find(vol => vol.timestamp === targetTime)
        
        const isGreen = priceCandle.close >= priceCandle.open
        const color = isGreen ? '#26a69a' : '#ef5350'
        const volumeValue = volumeEntry ? 
          (volumeType === 'totalDollarVolume' ? volumeEntry.totalDollarVolume : volumeEntry.totalSize) : 0
        
        return {
          time: priceCandle.time,
          value: volumeValue || 0,
          color: color
        }
      })
      
      volumeSeriesRef.current.setData(volumeHistogramData)
    } catch (error) {
      console.error('Error updating volume display:', error)
      setVolumeError('Error processing volume data')
    }
  }, [volumeType, setVolumeError])

  // Fetch data when dependencies change
  useEffect(() => {
    if (selectedMarket?.conditionId && !isLiveMode) {
      fetchChartData()
    }
  }, [selectedMarket?.conditionId, selectedToken, fetchChartData])

  // Update chart when period changes - uses cached raw data (no API call)
  useEffect(() => {
    if (!isLiveMode && rawDataRef.current.length > 0 && seriesRef.current) {
      const processedData = processRawPriceData(rawDataRef.current, selectedPeriod)
      if (processedData.length > 0) {
        seriesRef.current.setData(processedData)
        // Update volume display too
        if (volumeDataRef.current.length > 0) {
          updateVolumeDisplay(processedData, volumeDataRef.current)
        }
      }
    }
  }, [selectedPeriod, isLiveMode, updateVolumeDisplay])

  // Update volume series when volume type changes
  useEffect(() => {
    if (!isLiveMode && rawDataRef.current.length > 0 && volumeDataRef.current.length > 0) {
      const processedData = processRawPriceData(rawDataRef.current, selectedPeriod)
      updateVolumeDisplay(processedData, volumeDataRef.current)
    }
  }, [volumeType, selectedPeriod, isLiveMode, updateVolumeDisplay])

  const chartTitle = `${selectedToken.toUpperCase()} Token Price Chart ${isLiveMode ? '(Live)' : '(Historical)'}`

  return (
    <Card className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            {chartTitle}
          </CardTitle>
        </div>
        <div className="space-y-3 mt-2">
          <div>
            <div className="text-xs text-muted-foreground mb-2 font-medium">Time Period</div>
            <div className="flex gap-1">
              {/* Only show Live button for active markets */}
              {isCurrentMarketActive && (
                <Button
                  variant={isLiveMode ? 'default' : 'outline'}
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
                  variant={!isLiveMode && selectedPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => switchToHistoricalMode(period)}
                  disabled={loading}
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
          {volumeError && (
            <Alert className="mt-2 py-2">
              <AlertCircle className="h-3 w-3" />
              <AlertDescription className="text-xs">
                {volumeError}
              </AlertDescription>
            </Alert>
          )}
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
          <div className="text-xs text-muted-foreground mt-2">
            Chart: {isLiveMode ? 
              `${realTimeDataRef.current.length} live data points` : 
              `${rawDataRef.current.length} raw data points loaded, displaying ${selectedPeriod} view`
            }
            {volumeDataRef.current.length > 0 && ` • ${volumeDataRef.current.length} volume data points`}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 