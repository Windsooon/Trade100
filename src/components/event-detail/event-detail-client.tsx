"use client"

import { useState, useEffect } from 'react'
import { EventInfoBanner } from './event-info-banner'
import { MarketListCard } from './market-list-card'
import { MarketInsightCard } from './market-insight-card'
import { TradingActivityCard } from './trading-activity-card'
import { OperationsCard } from './operations-card'
import { SharedOrderBookProvider } from './shared-order-book-provider'
import { Event, Market } from '@/lib/stores'

export default function EventDetailClient({
  event,
  selectedMarketId
}: {
  event: Event
  selectedMarketId?: string
}) {
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [selectedToken, setSelectedToken] = useState<'yes' | 'no'>('yes')

  // Set initial market selection
  useEffect(() => {
    if (event.markets.length > 0) {
      if (selectedMarketId) {
        const targetMarket = event.markets.find(m => m.conditionId === selectedMarketId)
        if (targetMarket) {
          setSelectedMarket(targetMarket)
          return
        }
      }
      
      const activeMarkets = event.markets.filter(market => 
        market.active && !market.archived && !market.closed
      )
      if (activeMarkets.length > 0) {
        setSelectedMarket(activeMarkets[0])
      }
    }
  }, [event.markets, selectedMarketId])

  const handleMarketSelect = (market: Market) => {
    setSelectedMarket(market)
  }

  const handleTokenChange = (token: 'yes' | 'no') => {
    setSelectedToken(token)
  }

  // Get all active markets for the order book provider
  const allActiveMarkets = event.markets.filter(market => 
    market.active && !market.archived && !market.closed
  )

  return (
    <SharedOrderBookProvider allActiveMarkets={allActiveMarkets}>
      <div className="space-y-6">
        {/* Event Info Banner */}
        <EventInfoBanner event={event} />
        
        {/* Main Content - 3 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mobile Order: Market Insight + Operations first */}
          <div className="lg:hidden space-y-4">
            <MarketInsightCard 
              selectedMarket={selectedMarket} 
              selectedToken={selectedToken}
              event={event}
            />
            <OperationsCard 
              selectedMarket={selectedMarket}
              selectedToken={selectedToken}
              onTokenChange={handleTokenChange}
            />
          </div>

          {/* Market List - 3 columns on desktop, full width on mobile (2nd position) */}
          <div className="lg:col-span-3">
            <MarketListCard 
              markets={event.markets}
              selectedMarket={selectedMarket}
              onMarketSelect={handleMarketSelect}
              selectedToken={selectedToken}
              onTokenChange={handleTokenChange}
              event={event}
            />
          </div>

          {/* Market Insight + Operations - 6 columns on desktop, hidden on mobile (shown first above) */}
          <div className="hidden lg:block lg:col-span-6">
            <div className="h-full flex flex-col gap-4">
              <div className="flex-1 min-h-0">
                <MarketInsightCard 
                  selectedMarket={selectedMarket} 
                  selectedToken={selectedToken}
                  event={event}
                />
              </div>
              <div className="h-80">
                <OperationsCard 
                  selectedMarket={selectedMarket}
                  selectedToken={selectedToken}
                  onTokenChange={handleTokenChange}
                />
              </div>
            </div>
          </div>

          {/* Trading Activity - 3 columns on desktop, full width on mobile (3rd position) */}
          <div className="lg:col-span-3">
            <TradingActivityCard 
              selectedMarket={selectedMarket}
              event={event}
            />
          </div>
        </div>
      </div>
    </SharedOrderBookProvider>
  )
} 