export interface PnLDataPoint {
  t: number // timestamp
  p: number // P/L value
}

export interface ChartDataPoint {
  date: string
  accumulativePnL: number
  singleDayPnL: number
  timestamp: number
  hasNote?: boolean
  note?: string
}

export interface PortfolioData {
  positionValue: number
  pnlData: PnLDataPoint[]
  error?: string
}

// Calculate single day P/L from accumulative data
export function calculateSingleDayPnL(pnlData: PnLDataPoint[]): ChartDataPoint[] {
  if (!pnlData || pnlData.length === 0) {
    return []
  }

  // Sort by timestamp to ensure correct order
  const sortedData = [...pnlData].sort((a, b) => a.t - b.t)
  
  return sortedData.map((point, index) => {
    const date = new Date(point.t * 1000)
    const dateString = date.toISOString().split('T')[0]
    
    let singleDayPnL = 0
    let hasNote = false
    let note = undefined
    
    if (index === 0) {
      // First day: show 0 and add note
      singleDayPnL = 0
      hasNote = true
      note = "No single day P/L for this day"
    } else {
      // Calculate difference from previous day
      singleDayPnL = point.p - sortedData[index - 1].p
    }
    
    return {
      date: dateString,
      accumulativePnL: point.p,
      singleDayPnL,
      timestamp: point.t,
      hasNote,
      note
    }
  })
}

// Format currency with proper signs
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Format percentage with proper signs
export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

// Get the latest P/L value
export function getLatestPnL(pnlData: PnLDataPoint[]): number {
  if (!pnlData || pnlData.length === 0) return 0
  
  const sortedData = [...pnlData].sort((a, b) => b.t - a.t)
  return sortedData[0].p
}

// Calculate P/L percentage based on position value
export function calculatePnLPercentage(pnl: number, positionValue: number): number {
  if (positionValue === 0) return 0
  
  // Calculate initial investment (position value - current P/L)
  const initialValue = positionValue - pnl
  if (initialValue === 0) return 0
  
  return (pnl / initialValue) * 100
} 