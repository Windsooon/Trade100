import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

interface Trade {
  proxyWallet: string
  side: 'BUY' | 'SELL'
  asset: string
  conditionId: string
  size: number
  price: number
  timestamp: number
  title: string
  outcome: string
  outcomeIndex: number
  transactionHash: string
}

interface CurrentPosition {
  proxyWallet: string
  asset: string
  conditionId: string
  size: number
  avgPrice: number
  initialValue: number
  currentValue: number
  cashPnl: number
  percentPnl: number
  totalBought: number
  realizedPnl: number
  percentRealizedPnl: number
  curPrice: number
  redeemable: boolean
  title: string
  outcome: string
  outcomeIndex: number
  endDate: string
  negativeRisk: boolean
}

interface PositionHistory {
  conditionId: string
  asset: string
  title: string
  outcome: string
  outcomeIndex: number
  timeline: Array<{
    timestamp: number
    action: 'BUY' | 'SELL' | 'REDEEM' | 'CURRENT'
    size: number
    price: number
    cumulativeSize: number
    value: number
    transactionHash?: string
    isRedeemable?: boolean
    currentPrice?: number
  }>
  finalStatus: 'ACTIVE' | 'REDEEMED' | 'UNREALIZED' | 'SOLD'
  totalBought: number
  totalSold: number
  currentHolding: number
  realizedPnL: number
  unrealizedPnL: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userAddress = searchParams.get('user')
  
  if (!userAddress) {
    return NextResponse.json(
      { error: 'User address is required' },
      { status: 400 }
    )
  }

  try {
    // 1. Fetch current positions (for active markets)
    const currentPositionsResponse = await proxyFetch(
      `https://data-api.polymarket.com/positions?user=${userAddress}&limit=500`,
      {
        headers: {
          'User-Agent': 'Polymarket Dashboard',
          'Accept': 'application/json',
        },
      }
    )

    let currentPositions: CurrentPosition[] = []
    if (currentPositionsResponse.ok) {
      currentPositions = await currentPositionsResponse.json()
    }

    // 2. Fetch all trading history
    let allTrades: Trade[] = []
    let offset = 0
    const limit = 500

    while (true) {
      const tradesResponse = await proxyFetch(
        `https://data-api.polymarket.com/trades?user=${userAddress}&limit=${limit}&offset=${offset}`,
        {
          headers: {
            'User-Agent': 'Polymarket Dashboard',
            'Accept': 'application/json',
          },
        }
      )

      if (!tradesResponse.ok) break

      const trades: Trade[] = await tradesResponse.json()
      if (trades.length === 0) break

      allTrades.push(...trades)
      
      if (trades.length < limit) break
      offset += limit
    }

    // 3. Process and reconstruct position history
    const positionHistories = reconstructPositionHistory(allTrades, currentPositions)

    return NextResponse.json({
      success: true,
      userAddress,
      totalPositions: positionHistories.length,
      activePositions: positionHistories.filter(p => p.finalStatus === 'ACTIVE').length,
      redeemedPositions: positionHistories.filter(p => p.finalStatus === 'REDEEMED').length,
      unrealizedPositions: positionHistories.filter(p => p.finalStatus === 'UNREALIZED').length,
      positions: positionHistories,
      dataSourceInfo: {
        tradesFound: allTrades.length,
        currentPositionsFound: currentPositions.length,
        note: "Historical positions reconstructed from trades. Unrealized positions from resolved markets may be incomplete."
      }
    })

  } catch (error) {
    console.error('[Position History] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch position history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function reconstructPositionHistory(
  trades: Trade[], 
  currentPositions: CurrentPosition[]
): PositionHistory[] {
  const positionMap = new Map<string, PositionHistory>()

  // Process all trades chronologically
  const sortedTrades = trades.sort((a, b) => a.timestamp - b.timestamp)

  for (const trade of sortedTrades) {
    const key = `${trade.conditionId}-${trade.asset}`
    
    if (!positionMap.has(key)) {
      positionMap.set(key, {
        conditionId: trade.conditionId,
        asset: trade.asset,
        title: trade.title,
        outcome: trade.outcome,
        outcomeIndex: trade.outcomeIndex,
        timeline: [],
        finalStatus: 'SOLD', // Default, will be updated
        totalBought: 0,
        totalSold: 0,
        currentHolding: 0,
        realizedPnL: 0,
        unrealizedPnL: 0
      })
    }

    const position = positionMap.get(key)!
    
    // Calculate cumulative size
    const previousSize = position.currentHolding
    const sizeChange = trade.side === 'BUY' ? trade.size : -trade.size
    const newCumulativeSize = previousSize + sizeChange

    position.timeline.push({
      timestamp: trade.timestamp,
      action: trade.side,
      size: trade.size,
      price: trade.price,
      cumulativeSize: newCumulativeSize,
      value: trade.size * trade.price,
      transactionHash: trade.transactionHash
    })

    // Update position totals
    if (trade.side === 'BUY') {
      position.totalBought += trade.size
    } else {
      position.totalSold += trade.size
      // Calculate realized P&L for this sale
      // This is simplified - would need more complex FIFO/LIFO calculation for accuracy
      position.realizedPnL += trade.size * trade.price
    }

    position.currentHolding = newCumulativeSize
  }

  // Add current positions (for active markets)
  for (const currentPos of currentPositions) {
    const key = `${currentPos.conditionId}-${currentPos.asset}`
    
    if (positionMap.has(key)) {
      // Update existing position with current data
      const position = positionMap.get(key)!
      position.finalStatus = 'ACTIVE'
      position.currentHolding = currentPos.size
      position.unrealizedPnL = currentPos.cashPnl
      
      // Add current state to timeline
      position.timeline.push({
        timestamp: Date.now() / 1000,
        action: 'CURRENT',
        size: currentPos.size,
        price: currentPos.curPrice,
        cumulativeSize: currentPos.size,
        value: currentPos.currentValue,
        isRedeemable: currentPos.redeemable,
        currentPrice: currentPos.curPrice
      })
    } else {
      // Create new position from current holdings (positions without trade history)
      positionMap.set(key, {
        conditionId: currentPos.conditionId,
        asset: currentPos.asset,
        title: currentPos.title,
        outcome: currentPos.outcome,
        outcomeIndex: currentPos.outcomeIndex,
        timeline: [{
          timestamp: Date.now() / 1000,
          action: 'CURRENT',
          size: currentPos.size,
          price: currentPos.curPrice,
          cumulativeSize: currentPos.size,
          value: currentPos.currentValue,
          isRedeemable: currentPos.redeemable,
          currentPrice: currentPos.curPrice
        }],
        finalStatus: 'ACTIVE',
        totalBought: currentPos.totalBought || currentPos.size,
        totalSold: 0,
        currentHolding: currentPos.size,
        realizedPnL: currentPos.realizedPnl || 0,
        unrealizedPnL: currentPos.cashPnl
      })
    }
  }

  // Determine final status for positions without current holdings
  for (const [key, position] of positionMap) {
    if (position.finalStatus !== 'ACTIVE') {
      if (position.currentHolding > 0) {
        // Has holdings but no current position = likely resolved market with unredeemed shares
        position.finalStatus = 'UNREALIZED'
      } else if (position.currentHolding === 0 && position.totalSold > 0) {
        // Sold all shares
        position.finalStatus = 'SOLD'
      } else {
        // Check if redeemable based on last timeline entry
        const lastEntry = position.timeline[position.timeline.length - 1]
        if (lastEntry?.isRedeemable) {
          position.finalStatus = 'REDEEMED'
        } else {
          position.finalStatus = 'UNREALIZED'
        }
      }
    }
  }

  return Array.from(positionMap.values())
} 