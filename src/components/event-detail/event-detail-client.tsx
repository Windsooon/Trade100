"use client"

import { useState, useEffect } from 'react'
import { OrderBookProvider } from '@/lib/order-book-context'
import { EventInfoCard } from './event-info-card'
import { MarketListCard } from './market-list-card'
import { TradingChartCard } from './trading-chart-card'
import { OperationsCard } from './operations-card'
import { OrderBookCard } from './order-book-card'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable'
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

  return (
    <OrderBookProvider>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side */}
        <div className="lg:col-span-5 space-y-6">
          <EventInfoCard event={event} />

          {/* Resizable Market List and Order Book */}
          <ResizablePanelGroup direction="horizontal" className="min-h-[500px] border rounded-lg">
            <ResizablePanel defaultSize={50}>
              <MarketListCard
                markets={event.markets}
                selectedMarket={selectedMarket}
                onMarketSelect={setSelectedMarket}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50}>
              <OrderBookCard
                event={event}
                selectedMarket={selectedMarket}
                selectedToken={selectedToken}
                onTokenChange={handleTokenChange}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        {/* Right Side */}
        <div className="lg:col-span-7 space-y-6">
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