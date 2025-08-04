# Markets API Design Documentation

## API Endpoint
`GET /api/markets`

## Request Parameters
- `status` (string): `"active"` | `"closed"` (default: `"active"`)
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

### Active Events (Default)
```
GET /api/markets?limit=20&order=volume24hr&ascending=false&offset=0
```

### Closed Events  
```
GET /api/markets?status=closed&limit=20&order=volume24hr&ascending=false&offset=0
```

### Search with Filters
```
GET /api/markets?status=active&search=trump&category=Politics&minPrice=0.3&maxPrice=0.7&limit=20&order=volume24hr&ascending=false
```

## Response Format

```json
{
  "events": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "metadata": {
    "status": "active",
    "dataSource": "polymarket_api",
    "filters": {
      "search": "trump",
      "category": "Politics"
    }
  },
  "logs": [...],
  "cache": {
    "totalEvents": 150,
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}

