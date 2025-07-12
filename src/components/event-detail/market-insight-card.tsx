"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  AlertCircle, 
  Loader2, 
  Info,
  BarChart3,
  Brain,
  Activity
} from 'lucide-react'
import { Market, Event } from '@/lib/stores'
import { createChart, IChartApi, ISeriesApi, CandlestickData, ColorType, CandlestickSeries, LogicalRange, LineSeries, LineData, HistogramSeries, HistogramData } from 'lightweight-charts'
import { processRawPriceData, processRawVolumeData, type CandlestickData as ProcessedCandlestickData, type ProcessedVolumeData, type TimePeriod } from '@/lib/price-processing'
import { useLiveMode } from './live-mode-manager'
import { Pie, PieChart } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface MarketInsightCardProps {
  selectedMarket: Market | null
  selectedToken: 'yes' | 'no'
  event: Event
}

interface RawPricePoint {
  t: number // timestamp
  p: number // price
}

interface RawVolumeData {
  bucket_start: number
  totalSize: number
  totalDollarVolume: number
}

type VolumeType = 'totalSize' | 'totalDollarVolume'

// Add interfaces for trade analysis
interface TradeAnalysisData {
  market: string
  timeRange: string
  totalTrades: number
  yesPosition: {
    largeOrders: {
      count: number
      totalVolume: number
      totalSize: number
    }
    middleOrders: {
      count: number
      totalVolume: number
      totalSize: number
    }
    smallOrders: {
      count: number
      totalVolume: number
      totalSize: number
    }
  }
  noPosition: {
    largeOrders: {
      count: number
      totalVolume: number
      totalSize: number
    }
    middleOrders: {
      count: number
      totalVolume: number
      totalSize: number
    }
    smallOrders: {
      count: number
      totalVolume: number
      totalSize: number
    }
  }
}

interface MoneyFlowChartData {
  orderSize: string
  volume: number
  fill: string
}

export function MarketInsightCard({ selectedMarket, selectedToken, event }: MarketInsightCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1h')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [volumeType, setVolumeType] = useState<VolumeType>('totalDollarVolume')
  const [volumeError, setVolumeError] = useState<string | null>(null)
  
  // State for forcing chart re-initialization on tab switch
  const [chartKey, setChartKey] = useState(0)

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  
  // Data refs - store raw data and processed data
  const rawDataRef = useRef<RawPricePoint[]>([])
  const volumeDataRef = useRef<RawVolumeData[]>([])
  
  // Cache for processed volume data and volume maps
  const processedVolumeCache = useRef<Map<TimePeriod, ProcessedVolumeData[]>>(new Map())
  const volumeMapCache = useRef<Map<TimePeriod, Map<number, ProcessedVolumeData>>>(new Map())
  
  // Ref to track current token for tooltip (since tooltip effect has no dependencies)
  const selectedTokenRef = useRef<'yes' | 'no'>(selectedToken)
  
  // Update token ref when token changes
  useEffect(() => {
    selectedTokenRef.current = selectedToken
  }, [selectedToken])

  const isCurrentMarketActive = useMemo(() => {
    return selectedMarket?.active === true && selectedMarket?.archived === false && selectedMarket?.closed === false
  }, [selectedMarket])

  // Initialize live mode hook
  const {
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
  } = useLiveMode({
    isCurrentMarketActive,
    selectedMarket,
    selectedToken,
    rawDataRef,
    chartRef,
    seriesRef,
    volumeSeriesRef
  })

  // 🚀 OPTIMIZATION 3: Intelligent Caching System
  // Caches processed volume data by time period to avoid expensive reprocessing
  const getCachedProcessedVolumeData = useCallback((period: TimePeriod) => {
    // Check if we have cached data for this period - avoids reprocessing
    if (processedVolumeCache.current.has(period)) {
      return processedVolumeCache.current.get(period)!
    }
    
    // Process and cache the data for future use
    const processedData = processRawVolumeData(volumeDataRef.current, period)
    processedVolumeCache.current.set(period, processedData)
    
    // Also create and cache volume map for O(1) lookups
    const volumeMap = new Map<number, ProcessedVolumeData>()
    processedData.forEach(vol => {
      volumeMap.set(vol.time as number, vol)
    })
    volumeMapCache.current.set(period, volumeMap)
    
    return processedData
  }, [])

  // Helper function to get cached volume map
  const getCachedVolumeMap = useCallback((period: TimePeriod) => {
    if (volumeMapCache.current.has(period)) {
      return volumeMapCache.current.get(period)!
    }
    
    // This will also create the volume map cache
    getCachedProcessedVolumeData(period)
    return volumeMapCache.current.get(period)!
  }, [getCachedProcessedVolumeData])

  // Clear caches when volume data changes
  const clearVolumeDataCaches = useCallback(() => {
    processedVolumeCache.current.clear()
    volumeMapCache.current.clear()
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

  // Handle mode switching - wrapper for the hook function that also sets the period
  const handleHistoricalModeSwitch = useCallback((period: TimePeriod) => {
    setSelectedPeriod(period)
    switchToHistoricalMode(period)
  }, [switchToHistoricalMode])

  // Initialize chart
  useEffect(() => {
    let chart: IChartApi | null = null
    let resizeObserver: ResizeObserver | null = null
    
    // The key prop should ensure this ref is available, but we check just in case.
    if (!chartContainerRef.current) {
      console.error('📈 Chart container ref not available on initialization.')
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
  }, [chartKey])

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
          
          // Get volume data for this timestamp using cached volume map
          const currentVolumeData = volumeDataRef.current
          if (currentVolumeData && currentVolumeData.length > 0) {
            const targetTime = param.time as number
            
            // Use cached volume map for instant O(1) lookup
            const volumeMap = getCachedVolumeMap(selectedPeriod)
            const volumeEntry = volumeMap.get(targetTime)
            
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
  }, [selectedPeriod, getCachedVolumeMap, chartKey]) // Add selectedPeriod and getCachedVolumeMap to recreate tooltip when period changes

  // Fetch chart data - one API call per market/token combination
  // Note: selectedPeriod is NOT in dependencies to avoid unnecessary API calls
  // Period changes are handled by the separate effect below that re-processes cached data
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
        throw new Error('Invalid token IDs format')
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
    
    try {
      // Fetch raw price data (14 days, fidelity=1)
      const priceUrl = `/api/prices-history?market=${encodeURIComponent(tokenId)}`
      const priceResponse = await fetch(priceUrl)
      
      if (!priceResponse.ok) {
        throw new Error(`Failed to fetch price data: ${priceResponse.status}`)
      }
      
      const priceResult = await priceResponse.json()
      
      if (!priceResult.success || !priceResult.data?.length) {
        setError('No price data available for this market.')
        setLoading(false)
        return
      }
      
      // Store raw data
      rawDataRef.current = priceResult.data
      
      // Process data for current period and display
      const processedData = processRawPriceData(priceResult.data, selectedPeriod)
      
      if (processedData.length === 0) {
        setError('No valid price data found.')
        setLoading(false)
        return
      }
      
      // Update chart with processed data
      if (seriesRef.current && !isLiveMode) {
        seriesRef.current.setData(processedData)
      }
      
      setLoading(false)
      
      // Fetch volume data using timestamps from raw price data (covers full range)
      try {
        // Extract oldest and newest timestamps from raw price data (with normalization)
        const oldestRawTimestamp = rawDataRef.current[0].t
        const newestRawTimestamp = rawDataRef.current[rawDataRef.current.length - 1].t
        const oldestTimestamp = Math.floor(oldestRawTimestamp / 10) * 10  // Normalize
        const newestTimestamp = Math.floor(newestRawTimestamp / 10) * 10  // Normalize
        
        const volumeUrl = `https://trade-analyze-production.up.railway.app/api/volumes-history?market=${encodeURIComponent(tokenId)}&startTs=${oldestTimestamp}&endTs=${newestTimestamp}&fidelity=1`
        
        const volumeResponse = await fetch(volumeUrl)
        
        if (volumeResponse.ok) {
          const volumeResult = await volumeResponse.json()
          if (volumeResult && Array.isArray(volumeResult)) {
            volumeDataRef.current = volumeResult
            // Clear caches when new volume data is loaded
            clearVolumeDataCaches()
            updateVolumeDisplay(processedData)
          } else {
            setVolumeError('Invalid volume data format')
          }
        } else {
          setVolumeError(`Volume API error: ${volumeResponse.status}`)
        }
      } catch (volumeErr) {
        const volumeErrorMessage = volumeErr instanceof Error ? volumeErr.message : 'Unknown volume error'
        setVolumeError(`Volume data unavailable: ${volumeErrorMessage}`)
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(`Error loading chart: ${errorMessage}`)
      setLoading(false)
    }
  }, [selectedMarket?.clobTokenIds, selectedToken, isLiveMode])

  // 🚀 OPTIMIZATION 1: Missing Timestamp Handler
  // Handles sparse volume data by filling missing timestamps with zero values
  // This ensures chart displays correctly even when API doesn't return 0-volume entries
  const alignVolumeWithPriceTimestamps = useCallback((volumeData: ProcessedVolumeData[], priceTimestamps: number[]) => {
    // Create hash map for O(1) lookup (Hash Map Lookup optimization)
    const volumeMap = new Map<number, ProcessedVolumeData>()
    volumeData.forEach(vol => {
      volumeMap.set(vol.time as number, vol)
    })
    
    // Fill missing timestamps with zero values - ensures 1:1 mapping with price data
    return priceTimestamps.map(timestamp => {
      const existingVolume = volumeMap.get(timestamp)
      return existingVolume || {
        time: timestamp as any,
        totalSize: 0,
        totalDollarVolume: 0
      }
    })
  }, [])

  // 🚀 OPTIMIZATION 2: Pre-aligned Volume Data  
  // Creates chart-ready histogram data with O(1) volume lookups
  // Eliminates expensive linear searches during chart rendering
  const createPreAlignedVolumeData = useCallback((priceData: ProcessedCandlestickData[], alignedVolumeData: ProcessedVolumeData[]) => {
    // Create hash map for instant volume lookup - replaces O(n) find() with O(1) get()
    const volumeMap = new Map<number, ProcessedVolumeData>()
    alignedVolumeData.forEach(vol => {
      volumeMap.set(vol.time as number, vol)
    })
    
    // Pre-align volume data with price data for efficient rendering
    return priceData.map(priceCandle => {
      const timestamp = priceCandle.time as number
      const volumeEntry = volumeMap.get(timestamp) // O(1) lookup - major performance gain
      
      const isGreen = priceCandle.close >= priceCandle.open
      const color = isGreen ? '#26a69a' : '#ef5350'
      const volumeValue = volumeEntry ? 
        (volumeType === 'totalDollarVolume' ? volumeEntry.totalDollarVolume : volumeEntry.totalSize) : 0
      
      return {
        time: priceCandle.time,
        value: volumeValue,
        color: color
      }
    })
  }, [volumeType])

  // 🚀 OPTIMIZED VOLUME DISPLAY PIPELINE
  // Combines all three optimizations for maximum performance with sparse volume data
  // Performance improvement: O(n²) → O(n) + caching + missing data handling
  const updateVolumeDisplay = useCallback((processedPriceData: ProcessedCandlestickData[]) => {
    if (!volumeSeriesRef.current || volumeDataRef.current.length === 0) return
    
    try {
      // Use cached processed volume data for better performance
      const processedVolumeData = getCachedProcessedVolumeData(selectedPeriod)
      
      // Extract price timestamps for alignment
      const priceTimestamps = processedPriceData.map(candle => candle.time as number)
      
      // Align volume data with price timestamps (handles missing timestamps)
      const alignedVolumeData = alignVolumeWithPriceTimestamps(processedVolumeData, priceTimestamps)
      
      // Create pre-aligned histogram data for efficient rendering
      const volumeHistogramData = createPreAlignedVolumeData(processedPriceData, alignedVolumeData)
      
      volumeSeriesRef.current.setData(volumeHistogramData)
    } catch (error) {
      console.error('Error updating volume display:', error)
      setVolumeError('Error processing volume data')
    }
  }, [selectedPeriod, getCachedProcessedVolumeData, alignVolumeWithPriceTimestamps, createPreAlignedVolumeData, setVolumeError])

  // Fetch data when dependencies change (only for historical mode)
  useEffect(() => {
    if (selectedMarket?.conditionId && !isLiveMode) {
      fetchChartData()
    }
  }, [selectedMarket?.conditionId, selectedToken, fetchChartData, isLiveMode])

  // Update chart when period changes - uses cached raw data (no API call)
  useEffect(() => {
    if (!isLiveMode && rawDataRef.current.length > 0 && seriesRef.current) {
      const processedData = processRawPriceData(rawDataRef.current, selectedPeriod)
      
      if (processedData.length > 0) {
        seriesRef.current.setData(processedData)
        
        // Update volume display too
        if (volumeDataRef.current.length > 0) {
          updateVolumeDisplay(processedData)
        }
      }
    }
  }, [selectedPeriod, isLiveMode, updateVolumeDisplay, chartKey]) // Add chartKey to re-run on re-initialization

  // Update volume series when volume type changes
  useEffect(() => {
    if (!isLiveMode && rawDataRef.current.length > 0 && volumeDataRef.current.length > 0) {
      const processedData = processRawPriceData(rawDataRef.current, selectedPeriod)
      updateVolumeDisplay(processedData)
    }
  }, [volumeType, selectedPeriod, isLiveMode, updateVolumeDisplay, chartKey]) // Add chartKey to re-run on re-initialization

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const chartTitle = getChartTitle(selectedToken)

  // Add resize trigger when chart tab becomes active
  const handleTabChange = useCallback((value: string) => {
    if (value === 'chart') {
      setChartKey(prev => prev + 1)
    }
  }, [])

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          <span className="hidden sm:inline">Market Insight</span>
          <span className="sm:hidden">Insight</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="chart" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3 bg-transparent">
            <TabsTrigger value="chart" className="flex items-center gap-1 sm:gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Chart</span>
              <span className="sm:hidden">Chart</span>
            </TabsTrigger>
            <TabsTrigger value="info" className="flex items-center gap-1 sm:gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Info</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger value="analyze" className="flex items-center gap-1 sm:gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Trade Analyze</span>
              <span className="sm:hidden">Analyze</span>
            </TabsTrigger>
          </TabsList>

          {/* Chart Tab */}
          <TabsContent value="chart" className="space-y-4 mt-4 sm:mt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-base font-medium">
                  <TrendingUp className="h-4 w-4" />
                  {chartTitle}
                </div>
              </div>
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
                      onClick={() => handleHistoricalModeSwitch(period)}
                      disabled={loading}
                      className="text-xs px-2 py-1 h-7"
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              </div>
              {/* Hide volume controls in live mode */}
              {!isLiveMode && (
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
              )}
              
              {/* Live mode status */}
              {isLiveMode && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2 font-medium">Live Mode Status</div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const status = getLiveModeStatus()
                      if (!status) return null
                      
                      const statusColor = status.type === 'error' ? 'text-red-500' : 
                                        status.type === 'warning' ? 'text-yellow-500' : 
                                        'text-green-500'
                      
                      return (
                        <div className={`text-xs ${statusColor}`}>
                          {status.message}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
              {/* Hide volume error in live mode */}
              {!isLiveMode && volumeError && (
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
            
            {/* Hide volume error in live mode */}
            {!isLiveMode && volumeError && (
              <Alert variant="default" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{volumeError}</AlertDescription>
              </Alert>
            )}
            
            {/* Show live mode errors */}
            {isLiveMode && liveError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{liveError}</AlertDescription>
              </Alert>
            )}
            
            <div className="relative">
              {loading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                  <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div 
                key={chartKey}
                ref={chartContainerRef} 
                className="w-full"
                style={{ height: '384px' }}
              />
              <div className="text-xs text-muted-foreground mt-2">
                Chart: {getDataPointCount()}{!isLiveMode && `, displaying ${selectedPeriod} view`}
                {!isLiveMode && volumeDataRef.current.length > 0 && ` • ${volumeDataRef.current.length} volume data points`}
              </div>
            </div>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4 mt-4 sm:mt-6">
            <div style={{ minHeight: '500px' }}>
              {selectedMarket ? (
                <div className="space-y-6">

                  
                  {/* Market Question */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Market Question</h3>
                    <p className="text-sm text-foreground leading-relaxed">{selectedMarket.question}</p>
                  </div>

                  {/* Market Description */}
                  {selectedMarket.description && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Description</h3>
                      <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {selectedMarket.description}
                      </div>
                    </div>
                  )}
                  
                  {/* Date Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Start Date</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedMarket.startDate ? formatDate(selectedMarket.startDate) : 'N/A'}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">End Date</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedMarket.endDate ? formatDate(selectedMarket.endDate) : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Additional Market Details */}
                  {(selectedMarket.liquidity || selectedMarket.volume24hr) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedMarket.liquidity && (
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">Liquidity</h3>
                          <p className="text-sm text-muted-foreground">
                            ${parseFloat(selectedMarket.liquidity.toString()).toLocaleString()}
                          </p>
                        </div>
                      )}
                      
                      {selectedMarket.volume24hr && (
                        <div className="space-y-2">
                          <h3 className="text-lg font-medium">24h Volume</h3>
                          <p className="text-sm text-muted-foreground">
                            ${selectedMarket.volume24hr.toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No market selected</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Trade Analyze Tab */}
          <TabsContent value="analyze" className="space-y-4 mt-4 sm:mt-6">
            <MoneyFlowAnalysis selectedMarket={selectedMarket} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Money Flow Analysis Component
function MoneyFlowAnalysis({ selectedMarket }: { selectedMarket: Market | null }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tradeData, setTradeData] = useState<TradeAnalysisData | null>(null)

  // Client-side cache for trade analysis data (1 minute cache)
  const cacheRef = useRef<Map<string, { data: TradeAnalysisData; timestamp: number }>>(new Map())
  const CACHE_DURATION = 60 * 1000 // 1 minute in milliseconds
  
  // Ref to track current request to prevent duplicates
  const currentRequestRef = useRef<string | null>(null)

  // Check if we have valid cached data
  const getCachedData = useCallback((conditionId: string): TradeAnalysisData | null => {
    const cached = cacheRef.current.get(conditionId)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      return cached.data
    }
    return null
  }, [CACHE_DURATION])

  // Store data in cache
  const setCachedData = useCallback((conditionId: string, data: TradeAnalysisData) => {
    cacheRef.current.set(conditionId, {
      data,
      timestamp: Date.now()
    })
  }, [])

  // Fetch trade analysis data
  const fetchTradeAnalysis = useCallback(async () => {
    if (!selectedMarket?.conditionId) {
      setError('No market selected')
      return
    }

    const conditionId = selectedMarket.conditionId

    // Check if we already have a request in progress for this market
    if (currentRequestRef.current === conditionId) {
      return
    }

    // Check cache first
    const cachedData = getCachedData(conditionId)
    if (cachedData) {
      setTradeData(cachedData)
      setError(null)
      return
    }

    // Set current request to prevent duplicates
    currentRequestRef.current = conditionId
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`https://trade-analyze-production.up.railway.app/api/trade-analyze?market=${encodeURIComponent(conditionId)}`)
      
      // Check if this request is still relevant (user might have switched markets)
      if (currentRequestRef.current !== conditionId) {
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch trade analysis: ${response.status}`)
      }

      const data = await response.json()
      
      // Store in cache
      setCachedData(conditionId, data)
      setTradeData(data)
    } catch (err) {
      // Only set error if this request is still relevant
      if (currentRequestRef.current === conditionId) {
        console.error('Trade analysis fetch error:', err)
        setError('No trade analysis data available for this market')
      }
    } finally {
      // Clear current request if it's still this one
      if (currentRequestRef.current === conditionId) {
        currentRequestRef.current = null
        setLoading(false)
      }
    }
  }, [selectedMarket?.conditionId, getCachedData, setCachedData])

  // Fetch data when market changes
  useEffect(() => {
    if (selectedMarket?.conditionId) {
      fetchTradeAnalysis()
    } else {
      // Clear current request and reset state when no market selected
      currentRequestRef.current = null
      setTradeData(null)
      setError(null)
    }
  }, [selectedMarket?.conditionId]) // Remove fetchTradeAnalysis from deps to prevent duplicate calls

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      currentRequestRef.current = null
    }
  }, [])

  // Format currency
  const formatCurrency = useCallback((value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
  }, [])

  // Prepare unified chart data with both buy and sell orders
  const unifiedChartData = useMemo((): MoneyFlowChartData[] => {
    if (!tradeData) return []

    const segments = [
      // Buy orders (Bullish) - Green shades
      {
        orderSize: "Buy Large",
        volume: tradeData.yesPosition.largeOrders.totalVolume,
        fill: "rgb(15, 143, 98)", // Large buy
      },
      {
        orderSize: "Buy Medium",
        volume: tradeData.yesPosition.middleOrders.totalVolume,
        fill: "rgb(46, 189, 133)", // Medium buy
      },
      {
        orderSize: "Buy Small",
        volume: tradeData.yesPosition.smallOrders.totalVolume,
        fill: "rgb(120, 214, 172)", // Small buy
      },
      // Sell orders (Bearish) - Red shades
      {
        orderSize: "Sell Large",
        volume: tradeData.noPosition.largeOrders.totalVolume,
        fill: "rgb(217, 48, 78)", // Large sell
      },
      {
        orderSize: "Sell Medium",
        volume: tradeData.noPosition.middleOrders.totalVolume,
        fill: "rgb(246, 70, 93)", // Medium sell
      },
      {
        orderSize: "Sell Small",
        volume: tradeData.noPosition.smallOrders.totalVolume,
        fill: "rgb(255, 153, 160)", // Small sell
      },
    ]

    // Filter out zero-value segments
    return segments.filter(item => item.volume > 0)
  }, [tradeData])

  // Unified chart configuration
  const unifiedChartConfig = {
    volume: {
      label: "Volume",
    },
    "Buy Large": {
      label: "Buy Large Orders (>$1,000)",
      color: "rgb(15, 143, 98)",
    },
    "Buy Medium": {
      label: "Buy Medium Orders ($100-$1,000)",
      color: "rgb(46, 189, 133)",
    },
    "Buy Small": {
      label: "Buy Small Orders (<$100)",
      color: "rgb(120, 214, 172)",
    },
    "Sell Large": {
      label: "Sell Large Orders (>$1,000)",
      color: "rgb(217, 48, 78)",
    },
    "Sell Medium": {
      label: "Sell Medium Orders ($100-$1,000)",
      color: "rgb(246, 70, 93)",
    },
    "Sell Small": {
      label: "Sell Small Orders (<$100)",
      color: "rgb(255, 153, 160)",
    },
  } satisfies ChartConfig

  // Calculate table data
  const tableData = useMemo(() => {
    if (!tradeData) return []

    return [
      {
        orderSize: "Large",
        buy: tradeData.yesPosition.largeOrders.totalVolume,
        sell: tradeData.noPosition.largeOrders.totalVolume,
        inflow: tradeData.yesPosition.largeOrders.totalVolume - tradeData.noPosition.largeOrders.totalVolume,
        threshold: ">$1,000"
      },
      {
        orderSize: "Medium",
        buy: tradeData.yesPosition.middleOrders.totalVolume,
        sell: tradeData.noPosition.middleOrders.totalVolume,
        inflow: tradeData.yesPosition.middleOrders.totalVolume - tradeData.noPosition.middleOrders.totalVolume,
        threshold: "$100-$1,000"
      },
      {
        orderSize: "Small",
        buy: tradeData.yesPosition.smallOrders.totalVolume,
        sell: tradeData.noPosition.smallOrders.totalVolume,
        inflow: tradeData.yesPosition.smallOrders.totalVolume - tradeData.noPosition.smallOrders.totalVolume,
        threshold: "<$100"
      },
    ]
  }, [tradeData])

  // Calculate totals
  const totals = useMemo(() => {
    if (!tableData.length) return { buy: 0, sell: 0, inflow: 0 }
    
    return tableData.reduce((acc, row) => ({
      buy: acc.buy + row.buy,
      sell: acc.sell + row.sell,
      inflow: acc.inflow + row.inflow
    }), { buy: 0, sell: 0, inflow: 0 })
  }, [tableData])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" style={{ minHeight: '500px' }}>
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading trade analysis...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12" style={{ minHeight: '500px' }}>
        <div className="text-center space-y-4">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!tradeData) {
    return (
      <div className="flex items-center justify-center py-12" style={{ minHeight: '500px' }}>
        <div className="text-center space-y-4">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No market selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" style={{ minHeight: '500px' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">24h trading flow</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {tradeData.totalTrades} trades
          </Badge>
        </div>
      </div>



      {/* Side by Side Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Order Volume Breakdown Chart */}
        <div className="border-0">
          <div className="items-center pb-0">
            <h3 className="text-base font-semibold text-center">Order Volume Breakdown</h3>
          </div>
          <div className="flex-1 pb-0">
            {unifiedChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <p className="text-sm">No order data available</p>
              </div>
            ) : (
              <ChartContainer
                config={unifiedChartConfig}
                className="[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square max-h-[400px] pb-0"
              >
                <PieChart>
                  <ChartTooltip 
                    content={
                      <ChartTooltipContent 
                        hideLabel 
                        formatter={(value) => [formatCurrency(Number(value)), "Volume"]}
                      />
                    } 
                  />
                  <Pie 
                    data={unifiedChartData} 
                    dataKey="volume" 
                    nameKey="orderSize"
                    cx="50%" 
                    cy="50%" 
                    outerRadius={84}
                    label={({ percent }) => `${((percent || 0) * 100).toFixed(1)}%`}
                  />
                </PieChart>
              </ChartContainer>
            )}
          </div>
        </div>

        {/* Order Flow Breakdown Table */}
        <div className="border-0">
          <div>
            <h3 className="text-base font-semibold">Order Flow Breakdown</h3>
            <p className="text-sm text-muted-foreground">Bullish vs Bearish volume by order size</p>
          </div>
          <div>
            <div className="space-y-4">
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-xs font-medium text-muted-foreground">Orders</th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground">Bullish (USD)</th>
                      <th className="text-right py-2 text-xs font-medium text-muted-foreground">Bearish (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, index) => (
                      <tr key={row.orderSize} className="border-b border-border/50">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: index === 0 ? 'var(--chart-1)' : index === 1 ? 'var(--chart-2)' : 'var(--chart-3)' }}
                            />
                            <span className="font-medium">{row.orderSize}</span>
                          </div>
                          <div className="text-xs text-muted-foreground ml-5">{row.threshold}</div>
                        </td>
                        <td className="text-right py-3 text-price-positive font-medium">
                          {formatCurrency(row.buy)}
                        </td>
                        <td className="text-right py-3 text-price-negative font-medium">
                          {formatCurrency(row.sell)}
                        </td>
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="border-t-2 font-semibold">
                      <td className="py-3">Total</td>
                      <td className="text-right py-3 text-price-positive">
                        {formatCurrency(totals.buy)}
                      </td>
                      <td className="text-right py-3 text-price-negative">
                        {formatCurrency(totals.sell)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
