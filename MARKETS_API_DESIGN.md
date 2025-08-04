# Markets API Design Documentation

## Overview
This document describes the comprehensive API design for the `/api/markets` endpoint that supports both active and closed events with full filtering, sorting, search, and pagination capabilities.

## API Endpoint
`GET /api/markets`

## Architecture Overview
- **Active Events**: Fetched live from Polymarket API and cached (existing behavior)
- **Closed Events**: Queried from PostgreSQL database
- **Hybrid Response**: Combines both data sources based on status parameter

## Request Parameters

### Status Parameter (New)
- `status` (string, optional): `"active"` | `"closed"`
  - Default: `"active"` (maintains backward compatibility)
  - `"active"`: Returns only active events from Polymarket API
  - `"closed"`: Returns only closed events from database

### Pagination Parameters
- `limit` (number, optional): Number of items per page
  - Default: `20`
  - Range: `1-100`
- `offset` (number, optional): Number of items to skip
  - Default: `0`
- `page` (number, optional): Alternative to offset (page * limit = offset)
  - Default: `1`

### Sorting Parameters
- `order` (string, optional): Field to sort by
  - Options: `"volume24hr"`, `"volume1wk"`, `"liquidity"`, `"endDate"`, `"priceChange24h"`, `"priceChange1h"`, `"priceChangePercent24h"`, `"priceChangePercent1h"`, `"bestBid"`, `"bestAsk"`
  - Default: `"volume24hr"`
- `ascending` (boolean, optional): Sort direction
  - Default: `false` (descending)

### Search Parameters
- `search` (string, optional): Search term for event titles and market questions
  - Case-insensitive partial match
- `category` (string, optional): Filter by tag/category
  - Example: `"Politics"`, `"Sports"`, `"Crypto"`

### Price Filter Parameters
- `minPrice` (number, optional): Minimum Yes price (0.0 - 1.0)
- `maxPrice` (number, optional): Maximum Yes price (0.0 - 1.0)
- `minBestAsk` (number, optional): Minimum best ask price (0.0 - 1.0)
- `maxBestAsk` (number, optional): Maximum best ask price (0.0 - 1.0)

### View Mode Parameters
- `viewMode` (string, optional): `"events"` | `"markets"`
  - Default: `"events"`
  - `"events"`: Returns events with nested markets
  - `"markets"`: Returns flattened list of individual markets

## Example Requests

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

### Market View Mode
```
GET /api/markets?status=active&viewMode=markets&limit=50&order=priceChange24h&ascending=false
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "events": [...] // or "markets": [...] based on viewMode
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "offset": 0,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  },
  "metadata": {
    "status": "active",
    "viewMode": "events",
    "filters": {
      "search": "trump",
      "category": "Politics",
      "priceRange": {
        "min": 0.3,
        "max": 0.7
      }
    },
    "sorting": {
      "field": "volume24hr",
      "direction": "desc"
    },
    "dataSource": "polymarket_api", // or "database" for closed
    "cacheInfo": {
      "lastUpdated": "2024-01-15T10:30:00Z",
      "cacheAge": "30s"
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Invalid order parameter. Must be one of: volume24hr, volume1wk, liquidity...",
    "details": {
      "parameter": "order",
      "provided": "invalid_field",
      "expected": ["volume24hr", "volume1wk", "liquidity", "endDate", "priceChange24h", "priceChange1h", "priceChangePercent24h", "priceChangePercent1h", "bestBid", "bestAsk"]
    }
  }
}
```

## Database Schema Requirements

### Events Table
```sql
CREATE TABLE events (
  id VARCHAR(255) PRIMARY KEY,
  title TEXT NOT NULL,
  slug VARCHAR(500) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  volume DECIMAL(20,8),
  volume_24hr DECIMAL(20,8),
  volume_1wk DECIMAL(20,8),
  volume_1mo DECIMAL(20,8),
  liquidity DECIMAL(20,8),
  neg_risk BOOLEAN DEFAULT FALSE,
  icon TEXT,
  status VARCHAR(50) DEFAULT 'closed', -- 'active', 'closed', 'archived'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Markets Table
```sql
CREATE TABLE markets (
  id VARCHAR(255) PRIMARY KEY,
  event_id VARCHAR(255) REFERENCES events(id),
  question TEXT NOT NULL,
  condition_id VARCHAR(255) UNIQUE NOT NULL,
  slug VARCHAR(500),
  group_item_title TEXT,
  best_bid DECIMAL(10,8),
  best_ask DECIMAL(10,8),
  outcome_prices JSON, -- ["0.65", "0.35"]
  one_hour_price_change DECIMAL(10,8),
  one_day_price_change DECIMAL(10,8),
  one_week_price_change DECIMAL(10,8),
  one_month_price_change DECIMAL(10,8),
  volume_24hr DECIMAL(20,8),
  volume_1wk DECIMAL(20,8),
  volume_1mo DECIMAL(20,8),
  active BOOLEAN DEFAULT TRUE,
  archived BOOLEAN DEFAULT FALSE,
  closed BOOLEAN DEFAULT FALSE,
  clob_token_ids TEXT,
  last_trade_price DECIMAL(10,8),
  end_date_iso TIMESTAMP,
  start_date TIMESTAMP,
  icon TEXT,
  description TEXT,
  liquidity DECIMAL(20,8),
  closed_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tags Table
```sql
CREATE TABLE tags (
  id VARCHAR(255) PRIMARY KEY,
  label VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Event Tags Junction Table
```sql
CREATE TABLE event_tags (
  event_id VARCHAR(255) REFERENCES events(id) ON DELETE CASCADE,
  tag_id VARCHAR(255) REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, tag_id)
);
```

### Required Indexes
```sql
-- Events table indexes
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_volume_24hr ON events(volume_24hr DESC);
CREATE INDEX idx_events_volume_1wk ON events(volume_1wk DESC);
CREATE INDEX idx_events_liquidity ON events(liquidity DESC);
CREATE INDEX idx_events_end_date ON events(end_date);
CREATE INDEX idx_events_title_search ON events USING gin(to_tsvector('english', title));

-- Markets table indexes
CREATE INDEX idx_markets_event_id ON markets(event_id);
CREATE INDEX idx_markets_condition_id ON markets(condition_id);
CREATE INDEX idx_markets_active_status ON markets(active, archived, closed);
CREATE INDEX idx_markets_volume_24hr ON markets(volume_24hr DESC);
CREATE INDEX idx_markets_volume_1wk ON markets(volume_1wk DESC);
CREATE INDEX idx_markets_liquidity ON markets(liquidity DESC);
CREATE INDEX idx_markets_price_changes ON markets(one_day_price_change DESC, one_hour_price_change DESC);
CREATE INDEX idx_markets_question_search ON markets USING gin(to_tsvector('english', question));

-- Junction table index
CREATE INDEX idx_event_tags_tag_id ON event_tags(tag_id);
```

## Implementation SQL Queries

### Get Closed Events with Filtering and Sorting
```sql
-- Base query for closed events
WITH filtered_events AS (
  SELECT DISTINCT e.*
  FROM events e
  LEFT JOIN event_tags et ON e.id = et.event_id
  LEFT JOIN tags t ON et.tag_id = t.id
  WHERE e.status = 'closed'
    AND ($1::text IS NULL OR e.title ILIKE '%' || $1 || '%') -- search
    AND ($2::text IS NULL OR t.label = $2) -- category
),
events_with_metrics AS (
  SELECT 
    e.*,
    COALESCE(SUM(m.volume_24hr), 0) as total_volume_24hr,
    COALESCE(SUM(m.volume_1wk), 0) as total_volume_1wk,
    COALESCE(SUM(m.liquidity), 0) as total_liquidity,
    COUNT(m.id) as market_count
  FROM filtered_events e
  LEFT JOIN markets m ON e.id = m.event_id 
    AND m.active = true AND m.archived = false AND m.closed = false
    AND ($3::decimal IS NULL OR (m.outcome_prices->>0)::decimal >= $3) -- minPrice
    AND ($4::decimal IS NULL OR (m.outcome_prices->>0)::decimal <= $4) -- maxPrice
    AND ($5::decimal IS NULL OR m.best_ask >= $5) -- minBestAsk
    AND ($6::decimal IS NULL OR m.best_ask <= $6) -- maxBestAsk
  GROUP BY e.id, e.title, e.slug, e.start_date, e.end_date, e.volume, e.volume_24hr, e.volume_1wk, e.volume_1mo, e.liquidity, e.neg_risk, e.icon, e.status, e.created_at, e.updated_at
  HAVING COUNT(m.id) > 0 OR ($3::decimal IS NULL AND $4::decimal IS NULL AND $5::decimal IS NULL AND $6::decimal IS NULL)
)
SELECT * FROM events_with_metrics
ORDER BY 
  CASE WHEN $7 = 'volume24hr' AND $8 = false THEN total_volume_24hr END DESC,
  CASE WHEN $7 = 'volume24hr' AND $8 = true THEN total_volume_24hr END ASC,
  CASE WHEN $7 = 'volume1wk' AND $8 = false THEN total_volume_1wk END DESC,
  CASE WHEN $7 = 'volume1wk' AND $8 = true THEN total_volume_1wk END ASC,
  CASE WHEN $7 = 'liquidity' AND $8 = false THEN total_liquidity END DESC,
  CASE WHEN $7 = 'liquidity' AND $8 = true THEN total_liquidity END ASC,
  CASE WHEN $7 = 'endDate' AND $8 = false THEN e.end_date END DESC,
  CASE WHEN $7 = 'endDate' AND $8 = true THEN e.end_date END ASC
LIMIT $9 OFFSET $10;
```

### Get Closed Markets with Filtering and Sorting
```sql
SELECT 
  m.*,
  e.title as event_title,
  e.slug as event_slug,
  e.icon as event_icon,
  array_agg(json_build_object('id', t.id, 'label', t.label)) as tags
FROM markets m
JOIN events e ON m.event_id = e.id
LEFT JOIN event_tags et ON e.id = et.event_id
LEFT JOIN tags t ON et.tag_id = t.id
WHERE e.status = 'closed'
  AND ($1::text IS NULL OR (m.question ILIKE '%' || $1 || '%' OR e.title ILIKE '%' || $1 || '%')) -- search
  AND ($2::text IS NULL OR t.label = $2) -- category
  AND ($3::decimal IS NULL OR (m.outcome_prices->>0)::decimal >= $3) -- minPrice
  AND ($4::decimal IS NULL OR (m.outcome_prices->>0)::decimal <= $4) -- maxPrice
  AND ($5::decimal IS NULL OR m.best_ask >= $5) -- minBestAsk
  AND ($6::decimal IS NULL OR m.best_ask <= $6) -- maxBestAsk
GROUP BY m.id, m.event_id, m.question, m.condition_id, m.slug, m.group_item_title, m.best_bid, m.best_ask, m.outcome_prices, m.one_hour_price_change, m.one_day_price_change, m.one_week_price_change, m.one_month_price_change, m.volume_24hr, m.volume_1wk, m.volume_1mo, m.active, m.archived, m.closed, m.clob_token_ids, m.last_trade_price, m.end_date_iso, m.start_date, m.icon, m.description, m.liquidity, m.closed_time, m.created_at, m.updated_at, e.title, e.slug, e.icon
ORDER BY 
  CASE WHEN $7 = 'volume24hr' AND $8 = false THEN m.volume_24hr END DESC,
  CASE WHEN $7 = 'volume24hr' AND $8 = true THEN m.volume_24hr END ASC,
  CASE WHEN $7 = 'volume1wk' AND $8 = false THEN m.volume_1wk END DESC,
  CASE WHEN $7 = 'volume1wk' AND $8 = true THEN m.volume_1wk END ASC,
  CASE WHEN $7 = 'liquidity' AND $8 = false THEN m.liquidity END DESC,
  CASE WHEN $7 = 'liquidity' AND $8 = true THEN m.liquidity END ASC,
  CASE WHEN $7 = 'priceChange24h' AND $8 = false THEN m.one_day_price_change END DESC,
  CASE WHEN $7 = 'priceChange24h' AND $8 = true THEN m.one_day_price_change END ASC,
  CASE WHEN $7 = 'priceChange1h' AND $8 = false THEN m.one_hour_price_change END DESC,
  CASE WHEN $7 = 'priceChange1h' AND $8 = true THEN m.one_hour_price_change END ASC,
  CASE WHEN $7 = 'bestBid' AND $8 = false THEN m.best_bid END DESC,
  CASE WHEN $7 = 'bestBid' AND $8 = true THEN m.best_bid END ASC,
  CASE WHEN $7 = 'bestAsk' AND $8 = false THEN m.best_ask END DESC,
  CASE WHEN $7 = 'bestAsk' AND $8 = true THEN m.best_ask END ASC
LIMIT $9 OFFSET $10;
```

## Error Handling

### Parameter Validation
1. **Status Parameter**: Must be "active" or "closed"
2. **Pagination**: limit (1-100), offset (≥0), page (≥1)
3. **Sorting**: order must be valid field, ascending must be boolean
4. **Price Filters**: Must be decimal between 0.0 and 1.0
5. **View Mode**: Must be "events" or "markets"

### Data Source Handling
1. **Active Events**: Handle Polymarket API failures gracefully, use cache when available
2. **Closed Events**: Handle database connection issues, provide appropriate error messages
3. **Hybrid Responses**: Ensure consistent response format regardless of data source

## Performance Considerations

1. **Database Queries**: Use prepared statements and proper indexing
2. **Caching**: Implement Redis caching for frequently accessed closed event data
3. **Pagination**: Use offset-based pagination with limits
4. **Query Optimization**: Use CTEs and proper JOIN strategies
5. **API Rate Limiting**: Implement rate limiting to prevent abuse

## Migration Strategy

1. **Backward Compatibility**: Default status="active" maintains existing behavior
2. **Gradual Rollout**: Implement database queries alongside existing Polymarket API calls
3. **Testing**: Comprehensive testing with both data sources
4. **Monitoring**: Add logging and metrics for both data sources

This API design provides a comprehensive, scalable solution that supports both active and closed events with full filtering, sorting, and search capabilities while maintaining backward compatibility.