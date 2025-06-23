'use client'

import { useState, useCallback } from 'react'
import { Navbar } from '@/components/ui/navbar'
import { ActivityFeed } from '@/components/ui/activity-feed'
import { ActivityDataTables } from '@/components/ui/activity-data-tables'

interface TradeActivity {
  id: string
  timestamp: number
  user: {
    name: string
    pseudonym: string
    profileImage?: string
  }
  market: {
    title: string
    slug: string
    eventSlug: string
    conditionId: string
    icon?: string
  }
  trade: {
    outcome: string
    outcomeIndex: number
    side: 'BUY' | 'SELL'
    price: number
    size: number
    totalValue: number
  }
  transactionHash: string
}

export default function ActivityPage() {
  const [allTrades, setAllTrades] = useState<TradeActivity[]>([])

  // Handle new trades from the activity feed
  const handleTradeReceived = useCallback((trade: TradeActivity) => {
    setAllTrades(prev => {
      // Check if trade already exists to avoid duplicates
      const exists = prev.some(t => t.id === trade.id)
      if (exists) return prev
      
      // Add new trade to the beginning and limit to 1000 trades total
      return [trade, ...prev].slice(0, 1000)
    })
  }, [])

  // Handle refresh request from data tables
  const handleRefresh = useCallback(() => {
    // For now, this doesn't do anything special since we're getting real-time data
    // In the future, this could trigger a manual sync or clear cached data
    console.log('Refresh requested')
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Trading Activity</h1>
          <p className="text-muted-foreground">
            Real-time trading activity and analysis tools for Polymarket
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 h-[calc(100vh-200px)]">
          {/* Left side: Activity Feed - 30% */}
          <div className="lg:col-span-3 h-full">
            <ActivityFeed onTradeReceived={handleTradeReceived} />
          </div>

          {/* Right side: Data Tables - 70% */}
          <div className="lg:col-span-7 h-full">
            <ActivityDataTables 
              trades={allTrades} 
              onRefresh={handleRefresh}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 