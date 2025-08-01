# Domain Centralization Implementation

This document outlines the centralized domain configuration implemented for easier maintenance and management of all URLs used throughout the Trade100 application.

## 📁 Configuration File

**Location**: `src/config/api.ts`

### Key Features:
- ✅ **Centralized Configuration**: All domains in one place
- ✅ **Environment Variable Support**: Automatic fallbacks
- ✅ **Type Safety**: TypeScript with const assertions
- ✅ **Helper Functions**: URL building utilities
- ✅ **Backwards Compatibility**: Legacy exports maintained

## 🌐 Domains Organized by Category

### **Main Application**
- Base URL: `https://trade100.vercel.app`
- Domain: `trade100.vercel.app`

### **Polymarket APIs**
- **Gamma API**: `https://gamma-api.polymarket.com` (with env fallback)
- **Data API**: `https://data-api.polymarket.com`
- **CLOB API**: `https://clob.polymarket.com`
- **User PnL API**: `https://user-pnl-api.polymarket.com`
- **Website**: `https://polymarket.com`
- **Status**: `https://status.polymarket.com`

### **WebSocket Endpoints**
- **Live Data**: `wss://ws-live-data.polymarket.com`
- **Subscriptions**: `wss://ws-subscriptions-clob.polymarket.com` (with env fallback)

### **Trade Analysis API** (Custom Backend)
- **Base URL**: `https://api-test-production-3326.up.railway.app`
- **Endpoints**:
  - `/api/trade`
  - `/api/recommend`
  - `/api/market-history`
  - `/api/trade-analyze`

### **External Services**
- **Polygonscan**: `https://polygonscan.com`
- **Discord**: `https://discord.gg/ZR4QtSr3VU`
- **GitHub**: `https://github.com/Windsooon/Trade100`
- **Vercel Deploy**: `https://vercel.com/new/clone?repository-url=https://github.com/Windsooon/Trade100`

## 🛠️ Helper Functions

### `buildUrl.tradeAnalysis(endpoint, params)`
```typescript
// Build Trade Analysis API URLs with query parameters
const url = buildUrl.tradeAnalysis('/api/market-history', {
  market: 'abc123',
  startTs: 1234567890,
  endTs: 1234567900,
  fidelity: 60
})
```

### `buildUrl.polymarket(baseUrl, endpoint, params)`
```typescript
// Build Polymarket API URLs
const url = buildUrl.polymarket(API_CONFIG.POLYMARKET.GAMMA_API, '/events', {
  slug: 'example-event'
})
```

### `buildUrl.polygonscanTx(txHash)`
```typescript
// Build Polygonscan transaction URLs
const url = buildUrl.polygonscanTx('0x123...')
```

### `buildUrl.polymarketEvent(slug)`
```typescript
// Build Polymarket event URLs
const url = buildUrl.polymarketEvent('example-event')
```

## 📝 Files Updated

### **Core Application Files**
- `src/app/page.tsx` - Trade stats and recommendation APIs
- `src/app/layout.tsx` - Metadata base URL
- `src/app/events/[slug]/page.tsx` - Event data fetching

### **Market Insight Components**
- `src/components/event-detail/market-insight/hooks/useMarketData.ts`
- `src/components/event-detail/market-insight/money-flow-analysis.tsx`
- `src/components/event-detail/market-insight/trade-chart.tsx`

### **API Routes**
- `src/app/api/top-liquidity/route.ts`
- `src/app/api/newest/route.ts`
- `src/app/api/markets/route.ts`
- `src/app/api/portfolio/data/route.ts`

### **UI Components**
- `src/components/ui/activity-feed.tsx` - WebSocket connections
- `src/components/ui/activity-card.tsx` - Polygonscan links
- `src/components/ui/bottom-navigation.tsx` - Social links
- `src/components/ui/navbar.tsx` - Social links
- `src/components/event-detail/event-info-banner.tsx` - Polymarket links
- `src/components/event-detail/shared-order-book-provider.tsx` - WebSocket connections

## 🔄 Migration Benefits

### **Before** (Problems):
- 🔴 URLs scattered across 30+ files
- 🔴 Manual find/replace required for domain changes
- 🔴 Risk of missing instances during updates
- 🔴 No type safety for URLs
- 🔴 Difficult to track all external dependencies

### **After** (Solutions):
- ✅ **Single source of truth** for all domains
- ✅ **One-line changes** to update domains
- ✅ **Type safety** with TypeScript
- ✅ **Environment variable support** for flexibility
- ✅ **Helper functions** for consistent URL building
- ✅ **Clear organization** by service category
- ✅ **Backwards compatibility** maintained

## 🚀 Usage Examples

### Simple Domain Reference
```typescript
import { API_CONFIG } from '@/config/api'

// Use the base URL directly
const response = await fetch(`${API_CONFIG.TRADE_ANALYSIS.BASE_URL}/api/trade`)
```

### URL Building with Parameters
```typescript
import { buildUrl, API_CONFIG } from '@/config/api'

// Build complex URLs with parameters
const url = buildUrl.tradeAnalysis(API_CONFIG.TRADE_ANALYSIS.ENDPOINTS.MARKET_HISTORY, {
  market: marketId,
  startTs: start,
  endTs: end,
  fidelity: 60
})
```

### External Links
```typescript
import { buildUrl } from '@/config/api'

// Build external service URLs
const txUrl = buildUrl.polygonscanTx(transactionHash)
const eventUrl = buildUrl.polymarketEvent(eventSlug)
```

## 🔧 Future Maintenance

To change any domain:

1. **Edit one file**: `src/config/api.ts`
2. **Update the relevant configuration**
3. **All instances automatically use the new domain**

### Example: Changing Trade Analysis API
```typescript
// Before
TRADE_ANALYSIS: {
  BASE_URL: 'https://api-test-production-3326.up.railway.app',
  // ...
}

// After
TRADE_ANALYSIS: {
  BASE_URL: 'https://api-production.up.railway.app',
  // ...
}
```

That's it! All 20+ files using this API will automatically use the new domain.

## 🛡️ Type Safety

The configuration uses TypeScript's `as const` assertion to ensure:
- **Immutable configuration** - prevents accidental modifications
- **Autocomplete support** - IDE suggestions for all available domains
- **Type checking** - compile-time validation of configuration usage

This implementation significantly improves maintainability and reduces the risk of broken URLs when domains change.