/**
 * Centralized API Configuration
 * All domains and API endpoints used throughout the application
 */

// Environment variables fallback for API URLs
const getEnvVar = (key: string, fallback: string): string => {
  if (typeof window !== 'undefined') {
    // Client-side: use Next.js public env vars
    return (window as any).__NEXT_DATA__?.env?.[key] || process.env[key] || fallback
  }
  // Server-side: use process.env directly
  return process.env[key] || fallback
}

export const API_CONFIG = {
  // Main application domains
  APP: {
    BASE_URL: 'https://trade100.vercel.app',
    DOMAIN: 'trade100.vercel.app'
  },

  // Polymarket API endpoints
  POLYMARKET: {
    // Main API
    GAMMA_API: getEnvVar('NEXT_PUBLIC_POLYMARKET_API_URL', 'https://gamma-api.polymarket.com'),
    
    // Data API
    DATA_API: 'https://data-api.polymarket.com',
    
    // CLOB (Central Limit Order Book) API
    CLOB_API: 'https://clob.polymarket.com',
    
    // User PnL API
    USER_PNL_API: 'https://user-pnl-api.polymarket.com',
    
    // Main website
    WEBSITE: 'https://polymarket.com',
    
    // Status page
    STATUS: 'https://status.polymarket.com',
    
    // WebSocket endpoints
    WS: {
      LIVE_DATA: 'wss://ws-live-data.polymarket.com',
      SUBSCRIPTIONS: getEnvVar('NEXT_PUBLIC_POLYMARKET_WS_URL', 'wss://ws-subscriptions-clob.polymarket.com')
    }
  },

  // Trade analysis API (custom backend)
  TRADE_ANALYSIS: {
    BASE_URL: 'https://api-test-production-3326.up.railway.app',
    ENDPOINTS: {
      TRADE: '/api/trade',
      RECOMMEND: '/api/recommend', 
      MARKET_HISTORY: '/api/market-history',
      TRADE_ANALYZE: '/api/trade-analyze'
    }
  },

  // External services
  EXTERNAL: {
    // Blockchain explorer
    POLYGONSCAN: 'https://polygonscan.com',
    
    // Social/Community
    DISCORD: 'https://discord.gg/ZR4QtSr3VU',
    GITHUB: 'https://github.com/Windsooon/Trade100',
    
    // Development tools
    SHADCN_UI_SCHEMA: 'https://ui.shadcn.com/schema.json',
    VERCEL_DEPLOY: 'https://vercel.com/new/clone?repository-url=https://github.com/Windsooon/Trade100'
  },

  // CDN and assets
  CDN: {
    GITHUB_RAW: 'https://raw.githubusercontent.com/Windsooon/Trade100/refs/heads/main'
  }
} as const

// Helper functions for building URLs
export const buildUrl = {
  /**
   * Build Trade Analysis API URL
   */
  tradeAnalysis: (endpoint: string, params?: Record<string, string | number>) => {
    const url = new URL(endpoint, API_CONFIG.TRADE_ANALYSIS.BASE_URL)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value))
      })
    }
    return url.toString()
  },

  /**
   * Build Polymarket API URL
   */
  polymarket: (baseUrl: string, endpoint: string, params?: Record<string, string | number>) => {
    const url = new URL(endpoint, baseUrl)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value))
      })
    }
    return url.toString()
  },

  /**
   * Build Polygonscan transaction URL
   */
  polygonscanTx: (txHash: string) => {
    return `${API_CONFIG.EXTERNAL.POLYGONSCAN}/tx/${txHash}`
  },

  /**
   * Build Polymarket event URL
   */
  polymarketEvent: (slug: string) => {
    return `${API_CONFIG.POLYMARKET.WEBSITE}/event/${slug}`
  }
}

// Export individual API configurations for backwards compatibility
export const POLYMARKET_API_URL = API_CONFIG.POLYMARKET.GAMMA_API
export const POLYMARKET_DATA_API_URL = API_CONFIG.POLYMARKET.DATA_API
export const POLYMARKET_CLOB_API_URL = API_CONFIG.POLYMARKET.CLOB_API
export const POLYMARKET_WS_URL = API_CONFIG.POLYMARKET.WS.SUBSCRIPTIONS
export const TRADE_ANALYSIS_API_URL = API_CONFIG.TRADE_ANALYSIS.BASE_URL