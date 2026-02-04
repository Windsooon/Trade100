import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Simplified Event interface - only keeping necessary fields
export interface Event {
  id: string
  title: string
  slug: string
  startDate: string
  endDate: string
  closedTime?: string
  closed_time?: string
  volume?: number
  volume24hr?: number
  volume1wk?: number
  volume1mo?: number
  liquidity?: number
  markets: Market[]
  tags: Tag[]
  negRisk?: boolean
  icon?: string
}

// Simplified Market interface - only keeping necessary fields
export interface Market {
  id?: string
  question: string
  conditionId: string
  slug?: string
  groupItemTitle?: string
  bestBid?: string
  bestAsk?: string
  outcomePrices: string[]
  oneHourPriceChange?: number
  oneDayPriceChange?: number
  oneWeekPriceChange?: number
  oneMonthPriceChange?: number
  volume?: number
  volume24hr?: number
  volume1wk?: number
  volume1mo?: number
  active?: boolean
  archived?: boolean
  closed?: boolean
  clobTokenIds?: string
  lastTradePrice?: number
  endDateIso?: string
  endDate?: string
  startDate?: string
  icon?: string
  image?: string
  description?: string
  liquidity?: number
  liquidityNum?: number
  closedTime?: string
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

// Real-time market data store for home page
interface HomePageMarket {
  conditionId: string
  clobTokenIds: string
  staticPrice: number
  realtimePrice?: number
  lastPriceUpdate?: number
}

interface HomePageMarketStore {
  marketsByTab: Record<string, HomePageMarket[]>
  activeTab: string
  visitedTabs: Set<string>
  realtimePrices: Record<string, { price: number; lastUpdate: number }>
  lastTabSwitch: number
  setActiveTab: (tab: string) => void
  setMarketsForTab: (tab: string, markets: HomePageMarket[]) => void
  addVisitedTab: (tab: string) => void
  updateRealtimePrice: (conditionId: string, price: number) => void
  getRealtimePrice: (conditionId: string) => number | undefined
  getActiveMarkets: () => HomePageMarket[]
  getVisitedTabsMarkets: () => HomePageMarket[]
  getMarketsChangeKey: () => string
  shouldKeepConnection: (tab: string) => boolean
}

export const useHomePageMarketStore = create<HomePageMarketStore>((set, get) => ({
  marketsByTab: {},
  activeTab: 'volume',
  visitedTabs: new Set(['volume']),
  realtimePrices: {},
  lastTabSwitch: Date.now(),
  
  setActiveTab: (tab: string) => {
    set({ activeTab: tab, lastTabSwitch: Date.now() })
  },
  
  setMarketsForTab: (tab: string, markets: HomePageMarket[]) => {
    set((state) => ({
      marketsByTab: {
        ...state.marketsByTab,
        [tab]: markets
      }
    }))
  },
  
  addVisitedTab: (tab: string) => {
    const state = get()
    // Only add if tab has markets available
    if (state.marketsByTab[tab] && state.marketsByTab[tab].length > 0) {
      set((state) => ({
        visitedTabs: new Set([...state.visitedTabs, tab])
      }))
    }
  },
  
  updateRealtimePrice: (conditionId: string, price: number) => {
    const now = Date.now()
    const state = get()
    const lastUpdate = state.realtimePrices[conditionId]?.lastUpdate || 0
    
    // Throttle updates to 500ms per market
    if (now - lastUpdate < 500) {
      return
    }
    
    set((state) => ({
      realtimePrices: {
        ...state.realtimePrices,
        [conditionId]: { price, lastUpdate: now }
      }
    }))
  },
  
  getRealtimePrice: (conditionId: string) => {
    return get().realtimePrices[conditionId]?.price
  },
  
  getActiveMarkets: () => {
    const state = get()
    return state.marketsByTab[state.activeTab] || []
  },
  
  getVisitedTabsMarkets: () => {
    const state = get()
    const allMarkets: HomePageMarket[] = []
    
    // Collect markets from all visited tabs
    state.visitedTabs.forEach(tabId => {
      const tabMarkets = state.marketsByTab[tabId] || []
      allMarkets.push(...tabMarkets)
    })
    
    // Remove duplicates by conditionId
    const uniqueMarkets = allMarkets.reduce((acc, market) => {
      if (!acc.find(m => m.conditionId === market.conditionId)) {
        acc.push(market)
      }
      return acc
    }, [] as HomePageMarket[])
    
    return uniqueMarkets
  },
  
  getMarketsChangeKey: () => {
    const state = get()
    // Create a key that changes when markets or visited tabs change
    const marketsHash = JSON.stringify(state.marketsByTab)
    const visitedTabsHash = Array.from(state.visitedTabs).sort().join(',')
    return `${marketsHash}_${visitedTabsHash}`
  },
  
  shouldKeepConnection: (tab: string) => {
    const state = get()
    const timeSinceSwitch = Date.now() - state.lastTabSwitch
    // Keep connection for 30 seconds after tab switch
    return tab === state.activeTab || timeSinceSwitch < 30000
  }
})) 