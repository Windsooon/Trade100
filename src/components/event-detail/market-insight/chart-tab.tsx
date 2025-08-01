import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Loader2, WifiOff, Activity, BarChart3, TrendingUp as LineChart } from 'lucide-react'
import { createChart, IChartApi, ISeriesApi, HistogramSeries } from 'lightweight-charts'
import { ChartTabProps, TimePeriod, MarketHistoryDataPoint, VolumeType } from './types'
import { ChartTooltip, VolumeTooltip, type PriceData, type TooltipPosition } from './tooltips'
import { useMarketData, useRealtimeUpdates } from './hooks'
import { 
  getChartOptions, 
  getSeriesConfig, 
  getPriceSeriesScaleOptions, 
  getVolumeSeriesOptions, 
  getVolumeSeriesScaleOptions 
} from './utils/chartConfig'
import { 
  formatVolume, 
  getLineColor, 
  transformToCandlestickData, 
  transformToLineData, 
  transformToVolumeData 
} from './utils/dataProcessing'

type ChartType = 'candle' | 'line'

export function ChartTab({ selectedMarket, selectedToken }: ChartTabProps) {
  
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1h')
  const [chartType, setChartType] = useState<ChartType>('candle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [volumeType, setVolumeType] = useState<VolumeType>('totalDollarVolume')
  const [volumeError, setVolumeError] = useState<string | null>(null)
  const [chartKey, setChartKey] = useState(0)
  const [dataLoaded, setDataLoaded] = useState(false)
  
  // Tooltip states
  const [tooltipData, setTooltipData] = useState<PriceData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null)
  const [tooltipTimestamp, setTooltipTimestamp] = useState<number | null>(null)
  const [showPriceTooltip, setShowPriceTooltip] = useState(false)
  const [showVolumeTooltip, setShowVolumeTooltip] = useState(false)

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  
  // Data refs - store raw data from API
  const rawDataRef = useRef<MarketHistoryDataPoint[]>([])
  const volumeDataRef = useRef<MarketHistoryDataPoint[]>([])
  
  // Ref to track current token for tooltip
  const selectedTokenRef = useRef<'yes' | 'no'>(selectedToken)
  
  // Update token ref when token changes
  useEffect(() => {
    selectedTokenRef.current = selectedToken
  }, [selectedToken])

  // Initialize market data hook
  const { fetchMarketHistory, clearActiveRequests } = useMarketData({
    onError: (errorMessage) => setError(errorMessage),
    onSuccess: (data) => {
      rawDataRef.current = data
      volumeDataRef.current = data
      if (data.length > 0) {
        realtimeUpdates.setLatestTimestamp(data[data.length - 1].timestamp)
      }
      setLoading(false)
      setDataLoaded(true)
    }
  })

  // Initialize real-time updates hook
  const realtimeUpdates = useRealtimeUpdates({
    chartType,
    volumeType,
    selectedPeriod,
    marketId: selectedMarket?.conditionId,
    seriesRef,
    volumeSeriesRef,
    rawDataRef,
    volumeDataRef
  })

  // Log when key dependencies change
  useEffect(() => {
    console.log('🔄 Key dependency changed - marketId:', selectedMarket?.conditionId)
  }, [selectedMarket?.conditionId])

  useEffect(() => {
    console.log('🔄 Key dependency changed - selectedPeriod:', selectedPeriod)
  }, [selectedPeriod])

  useEffect(() => {
    console.log('🔄 Key dependency changed - chartType:', chartType)
  }, [chartType])

  // Initialize chart
  useEffect(() => {
    let chart: IChartApi | null = null
    let resizeObserver: ResizeObserver | null = null
    
    if (!chartContainerRef.current) {
      return
    }

    const chartOptions = getChartOptions()
    const { seriesType, seriesOptions } = getSeriesConfig(chartType)
    
    try {
      chart = createChart(chartContainerRef.current, chartOptions)
      
      const priceSeries = chart.addSeries(seriesType, seriesOptions)
      priceSeries.priceScale().applyOptions(getPriceSeriesScaleOptions())

      const volumeSeries = chart.addSeries(HistogramSeries, getVolumeSeriesOptions())
      volumeSeries.priceScale().applyOptions(getVolumeSeriesScaleOptions())

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

  // Setup crosshair handler for tooltips
  useEffect(() => {
    if (!chartRef.current || !chartContainerRef.current) {
      return
    }

    const crosshairHandler = (param: any) => {
      const container = chartContainerRef.current!
      
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > container.clientWidth ||
        param.point.y < 0 ||
        param.point.y > container.clientHeight
      ) {
        setShowPriceTooltip(false)
        setShowVolumeTooltip(false)
        return
      }

      const position = { x: param.point.x, y: param.point.y }
      const timestamp = param.time as number
      
      // Determine if mouse is in volume area (bottom 30%) or price area (top 70%)
      const volumeAreaStart = container.clientHeight * 0.7
      const isInVolumeArea = param.point.y >= volumeAreaStart
      
      if (isInVolumeArea) {
        // Show volume tooltip
        setShowPriceTooltip(false)
        setShowVolumeTooltip(true)
        setTooltipPosition(position)
        setTooltipTimestamp(timestamp)
      } else {
        // Show price tooltip
        setShowVolumeTooltip(false)
        
        const currentSeries = seriesRef.current
        if (!currentSeries) {
          setShowPriceTooltip(false)
          return
        }

        const data = param.seriesData.get(currentSeries)
        if (data) {
          setTooltipData(data as PriceData)
          setTooltipPosition(position)
          setTooltipTimestamp(timestamp)
          setShowPriceTooltip(true)
        } else {
          setShowPriceTooltip(false)
        }
      }
    }

    chartRef.current.subscribeCrosshairMove(crosshairHandler)

    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.unsubscribeCrosshairMove(crosshairHandler)
        } catch (error) {
          // Ignore errors during cleanup
        }
      }
    }
  }, [chartKey])







  // Load data and update chart
  const loadMarketData = useCallback(async () => {
    if (!selectedMarket?.conditionId) {
      setError('No market selected or market data unavailable')
      return
    }

    setLoading(true)
    setError(null)
    setVolumeError(null)
    setDataLoaded(false)

    try {
      await fetchMarketHistory(selectedMarket.conditionId, selectedPeriod)
    } catch (error) {
      // Error handling is done in the hook
    }
  }, [selectedMarket?.conditionId, selectedPeriod, fetchMarketHistory])

  // Update chart display when data changes
  const updateChartDisplay = useCallback(() => {
    if (!rawDataRef.current.length || !seriesRef.current || !volumeSeriesRef.current || !dataLoaded) {
      return
    }

    const data = rawDataRef.current
    
    // Transform data based on chart type
    const chartData = chartType === 'candle' 
      ? transformToCandlestickData(data)
      : transformToLineData(data)
    
    const volumeData = transformToVolumeData(data, volumeType)

    // Update chart
    seriesRef.current.setData(chartData)
    volumeSeriesRef.current.setData(volumeData)

    // Update line color for line charts
    if (chartType === 'line' && 'applyOptions' in seriesRef.current) {
      const lineColor = getLineColor(data)
      seriesRef.current.applyOptions({ color: lineColor })
    }
  }, [chartType, volumeType, dataLoaded])

  // Fetch data when dependencies change
  useEffect(() => {
    console.log('📊 Chart data loading effect triggered:', {
      marketId: selectedMarket?.conditionId,
      selectedPeriod,
      hasMarket: !!selectedMarket?.conditionId
    })

    if (selectedMarket?.conditionId) {
      // Stop any existing real-time updates
      console.log('🛑 Stopping existing realtime updates before loading new data')
      realtimeUpdates.stopRealtimeUpdates()
      
      // Load data and then start real-time updates
      console.log('📥 Loading market data...')
      loadMarketData().then(() => {
        console.log('✅ Market data loaded, starting realtime updates in 1s')
        setTimeout(() => {
          realtimeUpdates.startRealtimeUpdates()
        }, 1000) // Wait 1 second after initial load
      })
      
      return () => {
        console.log('🧹 Cleanup: stopping realtime updates')
        realtimeUpdates.stopRealtimeUpdates()
      }
    } else {
      // Clear all active requests when no market selected
      console.log('❌ No market selected, clearing requests and stopping updates')
      clearActiveRequests()
      realtimeUpdates.stopRealtimeUpdates()
    }
  }, [selectedMarket?.conditionId, selectedPeriod, loadMarketData, realtimeUpdates, clearActiveRequests])

  // Update chart display when data or chart settings change
  useEffect(() => {
    updateChartDisplay()
  }, [updateChartDisplay, chartKey, dataLoaded])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearActiveRequests()
      realtimeUpdates.cleanup()
    }
  }, [clearActiveRequests, realtimeUpdates])

  // Trigger chart re-initialization when chart type changes
  useEffect(() => {
    setChartKey(prev => prev + 1)
  }, [chartType])

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

      {realtimeUpdates.realtimeError && (
        <Alert variant="destructive" className="mb-4">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Real-time updates failed: {realtimeUpdates.realtimeError}
          </AlertDescription>
        </Alert>
      )}

      {/* Real-time status indicator */}
      <div className="flex items-center gap-2 text-sm mb-4">
        <div className="flex items-center gap-1">
          <Activity className={`h-3 w-3 ${realtimeUpdates.newDataHighlight ? 'text-green-500 animate-pulse' : 'text-green-500'}`} />
          <span className="text-green-600 dark:text-green-400">Live Updates</span>
        </div>
        {realtimeUpdates.lastUpdateTime && (
          <span className="text-xs text-muted-foreground">
            Last: {realtimeUpdates.lastUpdateTime.toLocaleTimeString()}
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
          className={`w-full transition-all duration-300 ${realtimeUpdates.newDataHighlight ? 'ring-2 ring-green-500 ring-opacity-50' : ''}`}
          style={{ height: '384px' }}
        />

        {/* Tooltip Components */}
        {chartContainerRef.current && (
          <>
            <ChartTooltip
              container={chartContainerRef.current}
              data={tooltipData}
              position={tooltipPosition}
              timestamp={tooltipTimestamp}
              selectedToken={selectedToken}
              isVisible={showPriceTooltip}
            />
            <VolumeTooltip
              container={chartContainerRef.current}
              volumeData={volumeDataRef.current}
              position={tooltipPosition}
              timestamp={tooltipTimestamp}
              isVisible={showVolumeTooltip}
              formatVolume={formatVolume}
            />
          </>
        )}
      </div>
    </div>
  )
} 