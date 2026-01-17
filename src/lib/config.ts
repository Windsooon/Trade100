// API Configuration
export const API_CONFIG = {
  // Current domain for active events (Polymarket integration)
  ACTIVE_EVENTS_BASE_URL: typeof window !== 'undefined' ? window.location.origin : '',
  
  // External domain for closed events/markets (Database API)
  CLOSED_EVENTS_BASE_URL: 'https://trade-analyze-production.up.railway.app',
  
  // API endpoints
  ENDPOINTS: {
    ACTIVE_MARKETS: '/api/markets',
    CLOSED_EVENTS: '/api/closed_events',
    CLOSED_MARKETS: '/api/closed_markets',
  },
  
  // Default pagination
  DEFAULT_PAGINATION: {
    ITEMS_PER_PAGE: 20,
    MAX_ITEMS_PER_PAGE: 100,
  },
  
  // Request timeouts
  TIMEOUTS: {
    DEFAULT: 30000, // 30 seconds
  },
  
  // Dome API Configuration
  DOME_API: {
    BASE_URL: 'https://api.domeapi.io/v1/polymarket',
    API_KEY: process.env.DOME_API_KEY, // Optional
    RATE_LIMIT: {
      QPS: 1,                    // 每秒1个请求
      INTERVAL_MS: 1000,         // 间隔1000ms
    },
  },
} as const

// Helper functions to build API URLs
export const buildApiUrl = (endpoint: string, isClosedData: boolean = false): string => {
  const baseUrl = isClosedData ? API_CONFIG.CLOSED_EVENTS_BASE_URL : API_CONFIG.ACTIVE_EVENTS_BASE_URL
  return `${baseUrl}${endpoint}`
}

// Environment-specific configuration
export const getApiConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'
  
  return {
    ...API_CONFIG,
    // Override for development if needed
    CLOSED_EVENTS_BASE_URL: process.env.NEXT_PUBLIC_CLOSED_API_URL || API_CONFIG.CLOSED_EVENTS_BASE_URL,
    isDevelopment,
    isProduction,
  }
}