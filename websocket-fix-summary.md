# WebSocket Connection Fix

## Problem Description

When navigating to an event detail page (e.g., `http://localhost:3008/events/elon-musk-of-tweets-july-11-18`) and using the search market feature to select a market, the page would redirect correctly but experience WebSocket connection issues:

- **3 WebSocket connections** were being established simultaneously
- Error message: `WebSocket is closed before the connection is established`
- The orderbook would fail to connect properly
- Users had to refresh the page to make the WebSocket connection work

## Root Cause Analysis

The issue was caused by **duplicate SharedOrderBookProvider instances** being created:

1. **Primary Provider**: In `src/components/event-detail/event-detail-client.tsx` (line 55)
2. **Duplicate Provider**: In `src/components/event-detail/market-list-card.tsx` (line 94)

Both providers were trying to establish WebSocket connections to the same endpoint (`wss://ws-subscriptions-clob.polymarket.com/ws/market`) simultaneously, creating race conditions and connection conflicts.

## Solution Implemented

### Changes Made

1. **Removed duplicate SharedOrderBookProvider** from `market-list-card.tsx`:
   - Removed the `SharedOrderBookProvider` import
   - Removed the provider wrapper around the Card component
   - Removed the unused `allActiveMarketsForWebSocket` variable

2. **Kept the primary provider** in `event-detail-client.tsx`:
   - This provider wraps the entire event detail page
   - All child components can access the orderbook data through the `useSharedOrderBook` hook

### Files Modified

#### `/workspace/src/components/event-detail/market-list-card.tsx`
- **Line 10**: Removed `SharedOrderBookProvider` from imports
- **Lines 56-61**: Removed `allActiveMarketsForWebSocket` variable definition
- **Line 94**: Removed `<SharedOrderBookProvider>` wrapper 
- **Line 166**: Removed `</SharedOrderBookProvider>` closing tag

## Technical Details

### Before Fix
```tsx
// event-detail-client.tsx
<SharedOrderBookProvider allActiveMarkets={allActiveMarkets}>
  {/* ... */}
  <MarketListCard /> {/* This contained another SharedOrderBookProvider */}
  {/* ... */}
</SharedOrderBookProvider>

// market-list-card.tsx
<SharedOrderBookProvider allActiveMarkets={allActiveMarketsForWebSocket}>
  <Card>
    {/* Market list content */}
  </Card>
</SharedOrderBookProvider>
```

### After Fix
```tsx
// event-detail-client.tsx
<SharedOrderBookProvider allActiveMarkets={allActiveMarkets}>
  {/* ... */}
  <MarketListCard /> {/* Now uses the parent provider */}
  {/* ... */}
</SharedOrderBookProvider>

// market-list-card.tsx
<Card>
  {/* Market list content - uses parent provider via useSharedOrderBook hook */}
</Card>
```

## Benefits

1. **Single WebSocket Connection**: Only one connection is established per event page
2. **No Race Conditions**: Eliminates conflicts between multiple provider instances
3. **Better Performance**: Reduces network overhead and connection management complexity
4. **Reliable Orderbook Updates**: Real-time data flows consistently without connection drops
5. **No Page Refresh Needed**: Market selection works immediately without requiring page refresh

## Testing

The fix can be tested by:

1. Navigate to an event detail page
2. Use the search market feature to find and select a market
3. Verify that the orderbook connects immediately without errors
4. Check browser developer tools to confirm only one WebSocket connection is established
5. Verify that real-time price updates work correctly

## Additional Notes

- The `SharedOrderBookProvider` uses a robust retry mechanism with exponential backoff
- Connection status is tracked and displayed to users
- The provider handles cleanup properly on component unmount
- Market selection and token switching continue to work as expected