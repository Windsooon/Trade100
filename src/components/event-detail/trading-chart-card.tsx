"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import { Market, Event } from '@/lib/stores'
import Highcharts from 'highcharts/highstock'
import HighchartsReact from 'highcharts-react-official'

interface TradingChartCardProps {
  selectedMarket: Market | null
  selectedToken: 'yes' | 'no'
  event: Event
}

type TimePeriod = '1m' | '1h' | '6h' | '1d' | '1w' | '1M'

interface PriceHistoryPoint {
  t: number // timestamp
  p: number // price
}

export function TradingChartCard({ selectedMarket, selectedToken, event }: TradingChartCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1h')
  const [historicalData, setHistoricalData] = useState<[number, number, number, number, number][]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chartRef = useRef<HighchartsReact.RefObject>(null)
  
  const getFidelity = useCallback((period: TimePeriod): number => {
    switch (period) {
      case '1m': return 1
      case '1h': return 60
      case '6h': return 360
      case '1d': return 1440
      case '1w': return 10080
      case '1M': return 43200 // 30 days in minutes
      default: return 1440
    }
  }, [])

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
      '1w': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000
    }[period] || 0
    
    // Disable if the period is longer than the event duration
    return periodMs > eventDurationMs
  }, [event.startDate])

  // Calculate startTs based on selected period to avoid too many candles
  const getStartTimestamp = useCallback((period: TimePeriod): number => {
    const now = Date.now()
    const eventStartTime = new Date(event.startDate).getTime()
    
    // Calculate period-specific start time
    let periodStartTime: number
    switch (period) {
      case '1m':
        periodStartTime = now - (1 * 12 * 60 * 60 * 1000) // 12 hours ago
        break
      case '1h':
        periodStartTime = now - (7 * 24 * 60 * 60 * 1000) // 1 week ago
        break
      case '6h':
        periodStartTime = now - (30 * 24 * 60 * 60 * 1000) // 1 month ago
        break
      case '1d':
        periodStartTime = now - (90 * 24 * 60 * 60 * 1000) // 3 months ago
        break
      case '1w':
        periodStartTime = now - (180 * 24 * 60 * 60 * 1000) // 6 months ago
        break
      case '1M':
        periodStartTime = now - (365 * 24 * 60 * 60 * 1000) // 1 year ago
        break
      default:
        periodStartTime = eventStartTime // Fallback to event start
    }
    
    // Never go earlier than event start date
    const finalStartTime = Math.max(eventStartTime, periodStartTime)
    
    return Math.floor(finalStartTime / 1000) // Convert to Unix timestamp
  }, [event.startDate])

  const convertToCandlestick = useCallback((history: PriceHistoryPoint[]): [number, number, number, number, number][] => {
    if (!history || !Array.isArray(history) || history.length === 0) return []
    return history.map((point, index) => {
      const timestamp = point.t * 1000
      const openPrice = point.p
      const closePrice = index < history.length - 1 ? history[index + 1].p : point.p
      const high = Math.max(openPrice, closePrice)
      const low = Math.min(openPrice, closePrice)
      return [timestamp, openPrice, high, low, closePrice]
    })
  }, [])
  
  const isCurrentMarketActive = useMemo(() => {
    return selectedMarket?.active === true && selectedMarket?.archived === false && selectedMarket?.closed === false
  }, [selectedMarket])

  useEffect(() => {
    if (!selectedMarket?.conditionId) return

    const fetchHistoricalData = async (period: TimePeriod) => {
      if (!selectedMarket?.clobTokenIds) return
      
      let tokenId: string | null = null
      try {
        const ids = JSON.parse(selectedMarket.clobTokenIds)
        tokenId = selectedToken === 'yes' ? ids[0] : ids[1]
      } catch { return }

      if (!tokenId) return

      setLoading(true)
      setError(null)
      try {
        const fidelity = getFidelity(period)
        
        const startTs = getStartTimestamp(period)
        const url = `/api/price-history?market=${tokenId}&startTs=${startTs}&fidelity=${fidelity}`
        
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)
        
        const data: any = await response.json()
        let historyData: PriceHistoryPoint[] = data.data || data.history || (Array.isArray(data) ? data : [])
        const candlestickData = convertToCandlestick(historyData)
        setHistoricalData(candlestickData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch history')
        setHistoricalData([])
      } finally {
        setLoading(false)
      }
    }

    setHistoricalData([])
    fetchHistoricalData(selectedPeriod)
  }, [selectedMarket?.conditionId, selectedToken, selectedPeriod, isCurrentMarketActive, getFidelity, getStartTimestamp, convertToCandlestick])

  const chartOptions = useMemo((): Highcharts.Options => ({
    accessibility: { enabled: false },
    title: { text: `${selectedToken.toUpperCase()} Token Price`, style: { fontSize: '14px' } },
    chart: { 
      height: 400, 
      backgroundColor: 'transparent'
    },
    rangeSelector: { enabled: false },
    navigator: { enabled: true, series: { color: selectedToken === 'yes' ? '#22c55e' : '#ef4444' } },
    xAxis: { 
      type: 'datetime', 
      gridLineWidth: 0, 
      lineWidth: 1
    },
    yAxis: { title: { text: 'Price' }, gridLineWidth: 0, lineWidth: 1 },
    tooltip: {
      shared: true,
      formatter: function() {
        const time = Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x as number)
        if (this.points && this.points.length > 0) {
          const point = this.points[0] as any
          if (point && typeof point.open === 'number' && typeof point.close === 'number') {
            const open = point.open
            const close = point.close
            const changePercent = open !== 0 ? (((close - open) / open) * 100).toFixed(2) : '0.00'
            const changeColor = close >= open ? '#22c55e' : '#ef4444'
            return `<b>${time}</b><br/>Open: <b>${open.toFixed(4)}</b><br/>High: <b>${point.high.toFixed(4)}</b><br/>Low: <b>${point.low.toFixed(4)}</b><br/>Close: <b style="color: ${changeColor}">${close.toFixed(4)} (${close >= open ? '+' : ''}${changePercent}%)</b>`
          }
        }
        return `<b>${time}</b><br/>Price: <b>${(this.y as number).toFixed(4)}</b>`
      }
    },
    plotOptions: {
      series: { 
        animation: false
      },
      candlestick: {
        dataGrouping: {
          enabled: false  // Disable data grouping to show actual API data resolution
        }
      }
    },
    series: [{
      name: `${selectedToken.toUpperCase()} Price`,
      type: 'candlestick',
      data: historicalData,
      color: '#ef4444',
      upColor: '#22c55e',
      lineColor: '#ef4444',
      upLineColor: '#22c55e',
      visible: true
    } as any],
    exporting: { enabled: false },
    credits: { enabled: false }
  }), [selectedToken, historicalData])

  return (
    <Card className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Price Chart
          </CardTitle>
        </div>
        <div className="space-y-3 mt-2">
          <div>
            <div className="text-xs text-muted-foreground mb-2 font-medium">Data Resolution</div>
            <div className="flex gap-1">
              {(['1m', '1h', '6h', '1d', '1w', '1M'] as TimePeriod[]).map((period) => (
                <Button
                  key={period}
                  variant={selectedPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period)}
                  disabled={loading || !isCurrentMarketActive || isPeriodDisabled(period)}
                  className="text-xs px-2 py-1 h-7"
                >
                  {period === '1M' ? '1M' : period.toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && <Alert variant="destructive" className="mb-4"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        {!isCurrentMarketActive ? (
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Price chart not available for inactive markets</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : historicalData.length === 0 ? (
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No price history available for this period</p>
            </div>
          </div>
        ) : (
          <div className="h-96">
            <HighchartsReact
              ref={chartRef}
              highcharts={Highcharts}
              constructorType="stockChart"
              options={chartOptions}
              allowChartUpdate={true}
              immutable={false}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
} 