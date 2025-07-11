"use client"

import { useState, useEffect } from 'react'
import { SharedOrderBookProvider } from './shared-order-book-provider'
import { EventInfoBanner } from './event-info-banner'
import { MarketListCard } from './market-list-card'
import { TradingChartCard } from './trading-chart-card'
import { OperationsCard } from './operations-card'
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

  useEffect(() => {
    if (event?.markets && event.markets.length > 0) {
      let targetMarket: Market | null = null

      // If selectedMarketId is provided, try to find that specific market
      if (selectedMarketId) {
        targetMarket = event.markets.find((m: Market) => m.conditionId === selectedMarketId) || null
      }

      // If no specific market found or no selectedMarketId, use default logic
      if (!targetMarket) {
        const activeMarkets = event.markets.filter((m: Market) =>
          m.active === true && m.archived === false && m.closed === false
        )
        targetMarket = activeMarkets.length > 0 ? activeMarkets[0] : event.markets[0]
      }

      setSelectedMarket(targetMarket)
    }
  }, [event, selectedMarketId])

  const handleTokenChange = (token: 'yes' | 'no') => {
    setSelectedToken(token)
  }

  // Get all active markets for the shared provider
  const allActiveMarkets = event?.markets?.filter((m: Market) =>
    m.active === true && m.archived === false && m.closed === false
  ) || []

  return (
    <SharedOrderBookProvider allActiveMarkets={allActiveMarkets}>
      <div className="space-y-3">
        {/* Event Info Banner - Full Width */}
        <EventInfoBanner event={event} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mobile: Trading Chart First */}
          <div className="block lg:hidden">
            <TradingChartCard 
              selectedMarket={selectedMarket} 
              selectedToken={selectedToken}
              event={event}
            />
          </div>

          {/* Left Side - Market List */}
          <div className="lg:col-span-5">
            {/* Market List with Collapsible Order Books */}
            <div className="border rounded-lg">
              <MarketListCard
                markets={event.markets}
                selectedMarket={selectedMarket}
                onMarketSelect={setSelectedMarket}
                selectedToken={selectedToken}
                onTokenChange={handleTokenChange}
                event={event}
              />
            </div>
          </div>

          {/* Right Side - Desktop Trading Chart and Operations */}
          <div className="lg:col-span-7 space-y-6">
            {/* Desktop: Trading Chart */}
            <div className="hidden lg:block">
              <TradingChartCard 
                selectedMarket={selectedMarket} 
                selectedToken={selectedToken}
                event={event}
              />
            </div>
            
            <OperationsCard 
              selectedMarket={selectedMarket}
              selectedToken={selectedToken}
              onTokenChange={handleTokenChange}
            />
          </div>
        </div>
      </div>
    </SharedOrderBookProvider>
  )
} 