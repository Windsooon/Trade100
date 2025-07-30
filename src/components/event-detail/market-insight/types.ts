import { Market, Event } from '@/lib/stores'

// Main component props
export interface MarketInsightCardProps {
  selectedMarket: Market | null
  selectedToken: 'yes' | 'no'
  event: Event
}

// New interface for market history API response
export interface MarketHistoryResponse {
  asset_id: string
  start: number
  fidelity: number
  data: MarketHistoryDataPoint[]
}

export interface MarketHistoryDataPoint {
  timestamp: number
  volume: {
    totalSize: number
    totalDollarVolume: number
  }
  price: {
    open: number
    high: number
    low: number
    close: number
  }
}

// Define TimePeriod type locally since we removed the import
export type TimePeriod = '1m' | '1h' | '6h' | '1d'

export type VolumeType = 'totalSize' | 'totalDollarVolume'

// Add interfaces for trade analysis
export interface TradeAnalysisData {
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

export interface MoneyFlowChartData {
  orderSize: string
  volume: number
  fill: string
}

// Component props interfaces
export interface MoneyFlowAnalysisProps {
  selectedMarket: Market | null
}

export interface TraderAnalysisProps {
  selectedMarket: Market | null
}

export interface TradeChartProps {
  trades: any[]
  loading: boolean
  error: string | null
  holder: any
  selectedMarket: Market | null
  selectedToken: 'yes' | 'no'
  selectedPeriod?: TimePeriod
}

export interface TradeHistoryDialogProps {
  holder: any
  selectedMarket: Market | null
  selectedToken: 'yes' | 'no'
}

export interface HolderCardProps {
  holder: any
  selectedMarket: Market | null
  selectedToken: 'yes' | 'no'
  formatShares: (amount: number) => string
  getDefaultAvatar: (name: string) => string
}

export interface ChartTabProps {
  selectedMarket: Market | null
  selectedToken: 'yes' | 'no'
  event: Event
}

export interface InfoTabProps {
  selectedMarket: Market | null
}

// Helper function to extract asset_id from market based on selected token
export const getAssetIdFromMarket = (market: Market | null, selectedToken: 'yes' | 'no'): string | null => {
  if (!market?.clobTokenIds) {
    return null
  }
  
  try {
    const tokenIds = JSON.parse(market.clobTokenIds)
    if (Array.isArray(tokenIds) && tokenIds.length >= 2) {
      // tokenIds[0] is YES token, tokenIds[1] is NO token
      return selectedToken === 'yes' ? tokenIds[0] : tokenIds[1]
    }
  } catch (error) {
    console.error('Failed to parse clobTokenIds:', error)
  }
  
  return null
} 