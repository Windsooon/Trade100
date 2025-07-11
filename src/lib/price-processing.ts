import { Time } from 'lightweight-charts'

interface PricePoint {
  t: number // timestamp
  p: number // price
}

interface VolumePoint {
  bucket_start: number
  totalSize: number
  totalDollarVolume: number
}

export interface CandlestickData {
  time: Time
  open: number
  high: number
  low: number
  close: number
}

export interface ProcessedVolumeData {
  time: Time
  totalSize: number
  totalDollarVolume: number
}

export type TimePeriod = '1m' | '1h' | '6h' | '1d'

/**
 * Normalize timestamp by making the last digit 0
 * This aligns price data timestamps with volume data timestamps
 */
function normalizeTimestamp(timestamp: number): number {
  return Math.floor(timestamp / 10) * 10
}

/**
 * Process raw price data into time buckets with OHLC calculations
 */
export function processRawPriceData(
  rawData: PricePoint[], 
  period: TimePeriod
): CandlestickData[] {
  if (!rawData || rawData.length === 0) return []
  
  // Sort data by timestamp to ensure proper processing
  const sortedData = [...rawData].sort((a, b) => a.t - b.t)
  
  // For 1m, return raw data as individual candles
  if (period === '1m') {
    return processRawDataPoints(sortedData)
  }
  
  // For other periods, group into time buckets
  const bucketSizeMs = getBucketSizeInMs(period)
  const buckets = groupIntoBuckets(sortedData, bucketSizeMs)
  
  return processTimeBuckets(buckets, sortedData)
}

/**
 * Process raw data points for 1m display (no grouping needed)
 */
function processRawDataPoints(sortedData: PricePoint[]): CandlestickData[] {
  const result: CandlestickData[] = []
  const seenTimestamps = new Set<number>()
  let previousPoint: PricePoint | null = null
  
  for (const current of sortedData) {
    // Normalize timestamp to align with volume data (last digit = 0)
    const normalizedTime = normalizeTimestamp(current.t)
    
    // Skip duplicate timestamps to ensure unique time values
    if (seenTimestamps.has(normalizedTime)) {
      continue
    }
    seenTimestamps.add(normalizedTime)
    
    // Open price is the previous price, or current price if no previous
    const open = previousPoint ? previousPoint.p : current.p
    const close = current.p
    const high = Math.max(open, close)
    const low = Math.min(open, close)
    
    result.push({
      time: normalizedTime as Time,
      open,
      high,
      low,
      close
    })
    
    // Update previous point for next iteration
    previousPoint = current
  }
  
  return result
}

/**
 * Process raw volume data into time buckets with aggregation
 */
export function processRawVolumeData(
  rawVolumeData: VolumePoint[], 
  period: TimePeriod
): ProcessedVolumeData[] {
  if (!rawVolumeData || rawVolumeData.length === 0) return []
  
  // For 1m, return raw data as individual points
  if (period === '1m') {
    return rawVolumeData.map(point => ({
      time: normalizeTimestamp(point.bucket_start) as Time,
      totalSize: point.totalSize,
      totalDollarVolume: point.totalDollarVolume
    }))
  }
  
  // For other periods, group into time buckets and aggregate
  const bucketSizeMs = getBucketSizeInMs(period)
  const buckets = groupVolumeIntoBuckets(rawVolumeData, bucketSizeMs)
  const result = aggregateVolumeBuckets(buckets)
  

  
  return result
}

/**
 * Group volume data into time buckets
 */
function groupVolumeIntoBuckets(
  volumeData: VolumePoint[], 
  bucketSizeMs: number
): Map<number, VolumePoint[]> {
  const buckets = new Map<number, VolumePoint[]>()
  
  for (const point of volumeData) {
    // Normalize timestamp first to align with price data
    const normalizedTimestamp = normalizeTimestamp(point.bucket_start)
    
    // Convert timestamp to UTC and calculate bucket start time
    const timestampMs = normalizedTimestamp * 1000
    const bucketStart = Math.floor(timestampMs / bucketSizeMs) * bucketSizeMs
    const bucketKey = Math.floor(bucketStart / 1000) // Convert back to seconds
    
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, [])
    }
    buckets.get(bucketKey)!.push({
      ...point,
      bucket_start: normalizedTimestamp // Use normalized timestamp
    })
  }
  
  return buckets
}

/**
 * Aggregate volume data within each time bucket
 */
function aggregateVolumeBuckets(
  buckets: Map<number, VolumePoint[]>
): ProcessedVolumeData[] {
  const result: ProcessedVolumeData[] = []
  
  for (const bucketKey of buckets.keys()) {
    const bucketData = buckets.get(bucketKey)!
    
    if (bucketData.length === 0) {
      // Empty bucket - fill with zeros
      result.push({
        time: bucketKey as Time,
        totalSize: 0,
        totalDollarVolume: 0
      })
      continue
    }
    
    // Aggregate volume data within the bucket
    const totalSize = bucketData.reduce((sum, point) => sum + point.totalSize, 0)
    const totalDollarVolume = bucketData.reduce((sum, point) => sum + point.totalDollarVolume, 0)
    
    result.push({
      time: bucketKey as Time,
      totalSize,
      totalDollarVolume
    })
  }
  
  return result
}

/**
 * Get bucket size in milliseconds for different time periods
 */
function getBucketSizeInMs(period: TimePeriod): number {
  switch (period) {
    case '1h': return 60 * 60 * 1000      // 1 hour
    case '6h': return 6 * 60 * 60 * 1000  // 6 hours  
    case '1d': return 24 * 60 * 60 * 1000 // 24 hours
    default: return 60 * 60 * 1000
  }
}

/**
 * Group price data into time buckets
 */
function groupIntoBuckets(
  sortedData: PricePoint[], 
  bucketSizeMs: number
): Map<number, PricePoint[]> {
  const buckets = new Map<number, PricePoint[]>()
  
  for (const point of sortedData) {
    // Normalize timestamp first to align with volume data
    const normalizedTimestamp = normalizeTimestamp(point.t)
    
    // Convert timestamp to UTC and calculate bucket start time
    const timestampMs = normalizedTimestamp * 1000
    const bucketStart = Math.floor(timestampMs / bucketSizeMs) * bucketSizeMs
    const bucketKey = Math.floor(bucketStart / 1000) // Convert back to seconds
    
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, [])
    }
    buckets.get(bucketKey)!.push({
      ...point,
      t: normalizedTimestamp // Use normalized timestamp
    })
  }
  
  return buckets
}

/**
 * Process time buckets into OHLC candlesticks
 */
function processTimeBuckets(
  buckets: Map<number, PricePoint[]>, 
  allSortedData: PricePoint[]
): CandlestickData[] {
  const result: CandlestickData[] = []
  const sortedBucketKeys = Array.from(buckets.keys()).sort((a, b) => a - b)
  
  for (let i = 0; i < sortedBucketKeys.length; i++) {
    const bucketKey = sortedBucketKeys[i]
    const bucketData = buckets.get(bucketKey)!
    
    if (bucketData.length === 0) {
      // Empty bucket - fill with zeros
      result.push({
        time: bucketKey as Time,
        open: 0,
        high: 0,
        low: 0,
        close: 0
      })
      continue
    }
    
    // Sort bucket data by timestamp
    const sortedBucketData = bucketData.sort((a, b) => a.t - b.t)
    
    // Find previous price (last price before this bucket)
    const previousPrice = findPreviousPrice(allSortedData, bucketKey)
    
    // Calculate OHLC
    const open = previousPrice !== null ? previousPrice : sortedBucketData[0].p
    const close = sortedBucketData[sortedBucketData.length - 1].p
    
    // Include open price in high/low calculation
    const allPrices = [open, ...sortedBucketData.map(p => p.p)]
    const high = Math.max(...allPrices)
    const low = Math.min(...allPrices)
    
    result.push({
      time: bucketKey as Time,
      open,
      high,
      low,
      close
    })
  }
  
  return result
}

/**
 * Find the last price before the given bucket timestamp
 */
function findPreviousPrice(
  allSortedData: PricePoint[], 
  bucketStartTimestamp: number
): number | null {
  // Find the last price point before the bucket start time
  for (let i = allSortedData.length - 1; i >= 0; i--) {
    const normalizedTimestamp = normalizeTimestamp(allSortedData[i].t)
    if (normalizedTimestamp < bucketStartTimestamp) {
      return allSortedData[i].p
    }
  }
  return null
} 