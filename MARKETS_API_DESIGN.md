# Markets API Design Documentation

## API Endpoints

### Active Events/Markets (Existing)
`GET /api/markets` - Returns active events with nested markets (client-side processing)

### Closed Events (New)
`GET /api/closed_events` - Returns closed events with minimal market data

### Closed Markets (New) 
`GET /api/closed_markets` - Returns flattened list of closed markets

## Request Parameters (All Endpoints)
- `limit` (number): Items per page (default: `20`, max: `100`)
- `offset` (number): Items to skip (default: `0`)
- `order` (string): `"volume24hr"` | `"volume1wk"` | `"liquidity"` | `"endDate"` | `"priceChange24h"` | `"priceChange1h"` | `"bestBid"` | `"bestAsk"` (default: `"volume24hr"`)
- `ascending` (boolean): Sort direction (default: `false`)
- `search` (string): Search term for titles/questions
- `category` (string): Filter by tag/category
- `minPrice` (number): Min Yes price (0.0-1.0)
- `maxPrice` (number): Max Yes price (0.0-1.0)
- `minBestAsk` (number): Min best ask (0.0-1.0)
- `maxBestAsk` (number): Max best ask (0.0-1.0)

## Example URLs

### Active Events (Client-side Processing)
```
GET /api/markets?limit=9999&search=trump&category=Politics
```

### Closed Events (Server-side Processing)
```
GET /api/closed_events?limit=20&order=volume24hr&ascending=false&offset=0
GET /api/closed_events?search=trump&category=Politics&limit=20&order=volume24hr&ascending=false&offset=0
```

### Closed Markets (Server-side Processing)
```
GET /api/closed_markets?limit=20&order=volume24hr&ascending=false&offset=0
GET /api/closed_markets?search=trump&category=Politics&minPrice=0.3&maxPrice=0.7&limit=20&order=priceChange24h&ascending=false&offset=0
```

## Response Format

### /api/markets (Active - Existing Format)
```json
{
  "events": [
    {
      "id": "event-1",
      "title": "Event Title",
      "slug": "event-slug",
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-12-31T23:59:59Z",
      "volume24hr": 50000,
      "volume1wk": 200000,
      "liquidity": 100000,
      "icon": "https://...",
      "tags": [{"id": "politics", "label": "Politics"}],
      "markets": [
        {
          "id": "market-1",
          "question": "Market Question",
          "conditionId": "condition-123",
          "outcomePrices": ["0.65", "0.35"],
          "volume24hr": 25000,
          "oneHourPriceChange": 0.02,
          "oneDayPriceChange": 0.05,
          "bestBid": "0.64",
          "bestAsk": "0.66",
          "active": true,
          "archived": false,
          "closed": false
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "metadata": {
    "dataSource": "polymarket_api"
  },
  "logs": [...],
  "cache": {
    "totalEvents": 150,
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

### /api/closed_events (New)
```json
{
  "events": [
    {
      "id": "event-1",
      "title": "Event Title",
      "slug": "event-slug", 
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-12-31T23:59:59Z",
      "volume24hr": 50000,
      "volume1wk": 200000,
      "liquidity": 100000,
      "icon": "https://...",
      "tags": [{"id": "politics", "label": "Politics"}],
      "markets": [
        {
          "conditionId": "condition-123",
          "question": "Market Question",
          "outcomePrices": ["0.65", "0.35"],
          "volume24hr": 25000,
          "oneHourPriceChange": 0.02,
          "oneDayPriceChange": 0.05
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "metadata": {
    "dataSource": "database"
  }
}
```

### /api/closed_markets (New)
```json
{
  "events": [
    {
      "id": "market-1",
      "question": "Market Question",
      "conditionId": "condition-123",
      "groupItemTitle": "Group Item Title",
      "outcomePrices": ["0.65", "0.35"],
      "oneHourPriceChange": 0.02,
      "oneDayPriceChange": 0.05,
      "volume24hr": 25000,
      "volume1wk": 100000,
      "liquidity": 50000,
      "bestBid": "0.64",
      "bestAsk": "0.66",
      "eventTitle": "Event Title",
      "eventSlug": "event-slug",
      "eventIcon": "https://..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "metadata": {
    "dataSource": "database"
  }
}

