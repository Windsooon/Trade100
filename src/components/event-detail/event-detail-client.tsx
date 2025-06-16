"use client"

import { useState, useEffect } from 'react'
import { OrderBookProvider } from '@/lib/order-book-context'
import { EventInfoCard } from './event-info-card'
import { MarketListCard } from './market-list-card'
import { TradingChartCard } from './trading-chart-card'
import { OperationsCard } from './operations-card'
import { OrderBookCard } from './order-book-card'

export default function EventDetailClient({ event }: { event: any }) {
  const [selectedMarket, setSelectedMarket] = useState<any>(null)
  const [selectedToken, setSelectedToken] = useState<'yes' | 'no'>('yes')

  useEffect(() => {
    if (event?.markets && event.markets.length > 0 && !selectedMarket) {
      // Default to first active market, or first market if no active ones
      const activeMarkets = event.markets.filter((m: any) => 
        m.active === true && m.archived === false && m.closed === false
      )
      const defaultMarket = activeMarkets.length > 0 ? activeMarkets[0] : event.markets[0]
      setSelectedMarket(defaultMarket)
    }
  }, [event, selectedMarket])

  const handleTokenChange = (token: 'yes' | 'no') => {
    setSelectedToken(token)
  }

  return (
    <OrderBookProvider>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side */}
        <div className="lg:col-span-4 space-y-6">
          <EventInfoCard event={event} />
          <OrderBookCard 
            event={event} 
            selectedMarket={selectedMarket}
            selectedToken={selectedToken}
            onTokenChange={handleTokenChange}
          />
          <MarketListCard 
            markets={event.markets} 
            selectedMarket={selectedMarket}
            onMarketSelect={setSelectedMarket}
          />
        </div>
        {/* Right Side */}
        <div className="lg:col-span-8 space-y-6">
          <TradingChartCard 
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
      </div>
    </OrderBookProvider>
  )
} 