import { MarketHistoryDataPoint, TimePeriod, VolumeType } from '../types'

export const formatVolume = (value: number, isDollar: boolean = false): string => {
  const prefix = isDollar ? '$' : ''
  if (value >= 1000000) {
    return `${prefix}${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `${prefix}${(value / 1000).toFixed(1)}K`
  }
  return `${prefix}${value.toFixed(0)}`
}

export const getLineColor = (data: MarketHistoryDataPoint[]): string => {
  if (data.length < 2) return '#26a69a'
  const firstPrice = data[0].price.close
  const lastPrice = data[data.length - 1].price.close
  return lastPrice >= firstPrice ? '#26a69a' : '#ef5350'
}

export const transformToCandlestickData = (data: MarketHistoryDataPoint[]) => {
  return data.map(point => ({
    time: point.timestamp as any,
    open: point.price.open,
    high: point.price.high,
    low: point.price.low,
    close: point.price.close
  }))
}

export const transformToLineData = (data: MarketHistoryDataPoint[]) => {
  return data.map(point => ({
    time: point.timestamp as any,
    value: point.price.close
  }))
}

export const transformToVolumeData = (data: MarketHistoryDataPoint[], volumeType: VolumeType) => {
  return data.map(point => ({
    time: point.timestamp as any,
    value: volumeType === 'totalDollarVolume' ? point.volume.totalDollarVolume : point.volume.totalSize,
    color: point.price.close >= point.price.open ? '#26a69a' : '#ef5350'
  }))
}

export const calculateTimeRange = (period: TimePeriod): { startTs: number; endTs: number; fidelity: number } => {
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
}

export const calculateLatestDataRange = (period: TimePeriod): { startTs: number; endTs: number; fidelity: number } => {
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
}