# Database Implementation Guide for Closed Events

## Overview
This guide provides step-by-step instructions for implementing the database integration for closed events in the `/api/markets` endpoint. The implementation should support all filtering, sorting, and pagination features available for active events.

## Current Implementation Status
✅ **Completed:**
- UI components with active/closed dropdown
- API endpoint structure with status parameter validation
- Comprehensive API design documentation
- Database schema specifications

❌ **Needs Implementation:**
- Database connection setup
- Closed events query implementation
- Database query functions
- Error handling for database operations

## Database Setup Required

### 1. Install Database Dependencies
```bash
npm install pg @types/pg
# or if using Prisma:
npm install prisma @prisma/client
npm install @types/node
```

### 2. Environment Variables
Add to `.env.local`:
```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/polymarket_db"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="polymarket_db"
DB_USER="username"
DB_PASSWORD="password"
```

### 3. Database Schema
Execute the SQL from `MARKETS_API_DESIGN.md` to create tables:
- `events`
- `markets` 
- `tags`
- `event_tags`
- All required indexes

## Implementation Tasks

### Task 1: Database Connection Module
Create `src/lib/database.ts`:

```typescript
// Example structure - implement database connection
import { Pool } from 'pg'

interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

export class Database {
  private pool: Pool
  
  constructor(config: DatabaseConfig) {
    // Initialize connection pool
  }
  
  async query(text: string, params?: any[]): Promise<any> {
    // Execute parameterized queries
  }
  
  async close(): Promise<void> {
    // Close connection pool
  }
}

export const db = new Database({
  host: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT!),
  database: process.env.DB_NAME!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
})
```

### Task 2: Query Functions
Create `src/lib/queries.ts`:

```typescript
// Implement the SQL queries from MARKETS_API_DESIGN.md
import { db } from './database'
import { Event, Market, Tag } from './stores'

interface QueryParams {
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  minBestAsk?: number
  maxBestAsk?: number
  orderBy: string
  ascending: boolean
  limit: number
  offset: number
}

export async function getClosedEvents(params: QueryParams): Promise<{
  events: Event[]
  total: number
}> {
  // Implement the closed events query from MARKETS_API_DESIGN.md
  // Use the "Get Closed Events with Filtering and Sorting" SQL
}

export async function getClosedMarkets(params: QueryParams): Promise<{
  markets: (Market & { eventTitle: string; eventSlug: string; eventIcon?: string })[]
  total: number
}> {
  // Implement the closed markets query from MARKETS_API_DESIGN.md
  // Use the "Get Closed Markets with Filtering and Sorting" SQL
}
```

### Task 3: Update API Route
In `src/app/api/markets/route.ts`, replace the placeholder closed events handling:

```typescript
// Replace this section:
} else {
  // Handle closed events from database
  // For now, return empty response with proper structure
  // This will be implemented by the AI model based on the documentation
  return NextResponse.json({
    error: 'Closed events functionality not yet implemented. Database integration required.',
    details: 'Please implement database queries for closed events as specified in MARKETS_API_DESIGN.md',
    implementation_needed: {
      database: 'PostgreSQL',
      tables: ['events', 'markets', 'tags', 'event_tags'],
      queries: 'See MARKETS_API_DESIGN.md for SQL examples'
    }
  }, { status: 501 })
}

// With actual implementation:
} else {
  // Handle closed events from database
  try {
    const { events: closedEvents, total } = await getClosedEvents({
      search,
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      orderBy: 'volume24hr', // Default, make this configurable
      ascending: false,
      limit,
      offset: (page - 1) * limit
    })
    
    return NextResponse.json({
      events: closedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      metadata: {
        status: 'closed',
        dataSource: 'database',
        filters: {
          search: search || undefined,
          category: category || undefined,
          priceRange: (minPrice || maxPrice) ? {
            min: minPrice ? parseFloat(minPrice) : undefined,
            max: maxPrice ? parseFloat(maxPrice) : undefined
          } : undefined
        }
      },
      logs: [], // No fetch logs for database queries
      cache: {
        totalEvents: total,
        lastUpdated: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Database query failed:', error)
    return NextResponse.json({
      error: 'Failed to fetch closed events from database.',
      details: error instanceof Error ? error.message : 'Database connection error'
    }, { status: 500 })
  }
}
```

## Data Transformation Requirements

### Event Structure
Ensure database events match the `Event` interface in `src/lib/stores.ts`:
```typescript
interface Event {
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
  icon?: string
}
```

### Market Structure
Ensure database markets match the `Market` interface:
```typescript
interface Market {
  id?: string
  question: string
  conditionId: string
  // ... all other fields from stores.ts
}
```

## Error Handling Requirements

### Database Connection Errors
```typescript
try {
  // Database operation
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    return NextResponse.json({
      error: 'Database connection failed. Please check database server.',
      details: 'Connection refused - database may be down'
    }, { status: 503 })
  }
  
  if (error.code === '42P01') {
    return NextResponse.json({
      error: 'Database table not found. Please run database migrations.',
      details: 'Required tables may not exist'
    }, { status: 500 })
  }
  
  // Generic database error
  return NextResponse.json({
    error: 'Database query failed.',
    details: error.message
  }, { status: 500 })
}
```

### Parameter Validation
Add validation for additional parameters:
```typescript
// Validate sorting parameters
const validSortFields = ['volume24hr', 'volume1wk', 'liquidity', 'endDate', 'priceChange24h', 'priceChange1h', 'bestBid', 'bestAsk']
const orderBy = searchParams.get('order') || 'volume24hr'

if (!validSortFields.includes(orderBy)) {
  return NextResponse.json({
    error: 'Invalid order parameter.',
    details: { parameter: 'order', provided: orderBy, expected: validSortFields }
  }, { status: 400 })
}

// Validate price ranges
if (minPrice && (isNaN(parseFloat(minPrice)) || parseFloat(minPrice) < 0 || parseFloat(minPrice) > 1)) {
  return NextResponse.json({
    error: 'Invalid minPrice parameter. Must be between 0.0 and 1.0.',
    details: { parameter: 'minPrice', provided: minPrice }
  }, { status: 400 })
}
```

## Testing Requirements

### Test Cases to Implement
1. **Basic closed events query** - no filters
2. **Search functionality** - filter by event title
3. **Category filtering** - filter by tags
4. **Price range filtering** - min/max prices
5. **Sorting** - all supported sort fields
6. **Pagination** - various page sizes and offsets
7. **Error handling** - database down, invalid queries
8. **Performance** - large result sets

### Sample Test Data
Create test data that includes:
- Events with various tags (Politics, Sports, Crypto, etc.)
- Markets with different price ranges
- Events with different end dates
- Events with various volume levels

## Performance Optimization

### Query Optimization
1. **Use indexes** - Ensure all indexes from schema are created
2. **Limit result sets** - Always use LIMIT and OFFSET
3. **Prepared statements** - Use parameterized queries
4. **Connection pooling** - Reuse database connections

### Caching Strategy
Consider implementing Redis caching for:
- Frequently accessed closed events
- Tag lists
- Expensive aggregation queries

## Deployment Considerations

### Environment Setup
1. **Database migrations** - Run schema creation scripts
2. **Connection limits** - Configure appropriate pool sizes
3. **Monitoring** - Add database query logging
4. **Backup strategy** - Ensure closed events data is backed up

### Security
1. **SQL injection prevention** - Use parameterized queries only
2. **Connection security** - Use SSL for database connections
3. **Access control** - Limit database permissions

## Implementation Checklist

- [ ] Install database dependencies
- [ ] Set up environment variables
- [ ] Create database schema and indexes
- [ ] Implement database connection module
- [ ] Implement query functions
- [ ] Update API route with database integration
- [ ] Add comprehensive error handling
- [ ] Add parameter validation
- [ ] Create test data
- [ ] Test all filtering and sorting combinations
- [ ] Test error scenarios
- [ ] Performance test with large datasets
- [ ] Add logging and monitoring

## Support Files Reference

Refer to these files for complete specifications:
- `MARKETS_API_DESIGN.md` - Complete API specification
- `src/lib/stores.ts` - TypeScript interfaces
- `src/app/api/markets/route.ts` - Current API implementation
- `src/app/markets/page.tsx` - Frontend usage patterns

## Expected Outcome

After implementation, users should be able to:
1. ✅ Switch between "Active" and "Closed" events using the dropdown
2. ✅ Use all existing filters (search, tags, price ranges) with closed events
3. ✅ Sort closed events by all supported criteria
4. ✅ Paginate through closed events
5. ✅ See appropriate loading and error messages
6. ✅ Experience the same performance as active events

The API should respond with the exact same structure for both active and closed events, ensuring the frontend works seamlessly with both data sources.