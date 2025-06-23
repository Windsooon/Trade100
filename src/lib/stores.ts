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

// Watchlist market object interface
export interface WatchlistMarket {
  id: string
  question: string
  conditionId: string
  slug: string
  eventSlug: string
  eventTitle: string
  addedAt: number // timestamp when added to watchlist
}

interface WatchlistStore {
  watchlist: WatchlistMarket[]
  addToWatchlist: (market: WatchlistMarket) => void
  removeFromWatchlist: (conditionId: string) => void
  isInWatchlist: (conditionId: string) => boolean
  getWatchlistConditionIds: () => Set<string>
}

export const useWatchlistStore = create<WatchlistStore>()(
  persist(
    (set, get) => ({
      watchlist: [],
      addToWatchlist: (market: WatchlistMarket) =>
        set((state) => ({
          watchlist: state.watchlist.some(w => w.conditionId === market.conditionId)
            ? state.watchlist
            : [...state.watchlist, { ...market, addedAt: Date.now() }],
        })),
      removeFromWatchlist: (conditionId: string) =>
        set((state) => ({
          watchlist: state.watchlist.filter((w) => w.conditionId !== conditionId),
        })),
      isInWatchlist: (conditionId: string) => 
        get().watchlist.some(w => w.conditionId === conditionId),
      getWatchlistConditionIds: () => 
        new Set(get().watchlist.map(w => w.conditionId)),
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