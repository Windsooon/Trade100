import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Simplified Event interface - only keeping necessary fields
export interface Event {
  id: string
  title: string
  slug: string
  startDate: string
  endDate: string
  volume?: number
  volume24hr?: number
  volume1wk?: number
  volume1mo?: number
  liquidity?: number
  markets: Market[]
  tags: Tag[]
  negRisk?: boolean
}

// Simplified Market interface - only keeping necessary fields
export interface Market {
  question: string
  conditionId: string
  groupItemTitle?: string
  bestBid?: string
  bestAsk?: string
  outcomePrices: string[]
  oneHourPriceChange?: number
  oneDayPriceChange?: number
  oneWeekPriceChange?: number
  oneMonthPriceChange?: number
  volume24hr?: number
  volume1wk?: number
  volume1mo?: number
  active?: boolean
  archived?: boolean
  closed?: boolean
  clobTokenIds?: string
  lastTradePrice?: number
  endDateIso?: string
}

// Helper function to check if a market is active
export const isMarketActive = (market: Market): boolean => {
  return market.active === true && market.archived === false && market.closed === false
}

// Helper function to get market display title (groupItemTitle if available, otherwise question)
export const getMarketDisplayTitle = (market: Market): string => {
  return market.groupItemTitle || market.question
}

// Simplified Tag interface - only keeping necessary fields
export interface Tag {
  id: string
  label: string
}

interface WatchlistStore {
  watchlistIds: string[]
  addToWatchlist: (marketId: string) => void
  removeFromWatchlist: (marketId: string) => void
  isInWatchlist: (marketId: string) => boolean
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      watchlistIds: [],
      addToWatchlist: (marketId: string) =>
        set((state) => ({
          watchlistIds: state.watchlistIds.includes(marketId)
            ? state.watchlistIds
            : [...state.watchlistIds, marketId],
        })),
      removeFromWatchlist: (marketId: string) =>
        set((state) => ({
          watchlistIds: state.watchlistIds.filter((id) => id !== marketId),
        })),
      isInWatchlist: (marketId: string) => get().watchlistIds.includes(marketId),
    }),
    {
      name: 'trade100-watchlist',
    }
  )
)

interface PriceStore {
  prices: Record<string, { prices: number[]; lastUpdate: string }>
  updatePrice: (marketId: string, prices: number[], timestamp: string) => void
  getLastUpdate: (marketId: string) => string | null
}

export const usePriceStore = create<PriceStore>((set, get) => ({
  prices: {},
  updatePrice: (marketId: string, prices: number[], timestamp: string) =>
    set((state) => ({
      prices: {
        ...state.prices,
        [marketId]: { prices, lastUpdate: timestamp },
      },
    })),
  getLastUpdate: (marketId: string) => get().prices[marketId]?.lastUpdate || null,
}))

interface SettingsStore {
  showOrderConfirmation: boolean
  privateKey: string | null
  setShowOrderConfirmation: (show: boolean) => void
  setPrivateKey: (key: string | null) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      showOrderConfirmation: true,
      privateKey: null,
      setShowOrderConfirmation: (show: boolean) => set({ showOrderConfirmation: show }),
      setPrivateKey: (key: string | null) => set({ privateKey: key }),
    }),
    {
      name: 'trade100-settings',
    }
  )
) 