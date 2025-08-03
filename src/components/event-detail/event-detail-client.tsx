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
    console.log('[EventDetailClient] Market selection effect', {
      eventMarketsLength: event.markets.length,
      selectedMarketId,
      currentSelectedMarket: selectedMarket?.conditionId
    })
    
    if (event.markets.length > 0) {
      if (selectedMarketId) {
        console.log('[EventDetailClient] Looking for specific market', selectedMarketId)
        const targetMarket = event.markets.find(m => m.conditionId === selectedMarketId)
        if (targetMarket) {
          console.log('[EventDetailClient] Found target market', {
            conditionId: targetMarket.conditionId,
            question: targetMarket.question
          })
          setSelectedMarket(targetMarket)
          return
        } else {
          console.log('[EventDetailClient] Target market not found')
        }
      }
      
      const activeMarkets = event.markets.filter(market => 
        market.active && !market.archived && !market.closed
        )
      console.log('[EventDetailClient] Active markets found', {
        total: activeMarkets.length,
        firstMarket: activeMarkets[0] ? {
          conditionId: activeMarkets[0].conditionId,
          question: activeMarkets[0].question
        } : null
      })
      
      if (activeMarkets.length > 0) {
        console.log('[EventDetailClient] Setting first active market as selected')
        setSelectedMarket(activeMarkets[0])
      }
    } else {
      console.log('[EventDetailClient] No markets available')
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

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-6">
          <MarketInsightCard 
            selectedMarket={selectedMarket} 
            selectedToken={selectedToken}
            event={event}
          />
              <MarketListCard
                markets={event.markets}
                selectedMarket={selectedMarket}
            onMarketSelect={handleMarketSelect}
                selectedToken={selectedToken}
                onTokenChange={handleTokenChange}
                event={event}
              />
          <OperationsCard 
            selectedMarket={selectedMarket}
            selectedToken={selectedToken}
            onTokenChange={handleTokenChange}
          />
          <TradingActivityCard 
            selectedMarket={selectedMarket}
            event={event}
          />
          </div>

        {/* Desktop Layout - 3 Column Grid */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-6">
          {/* Market List - 3 columns */}
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

          {/* Market Insight + Operations - 6 columns */}
          <div className="lg:col-span-6">
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

          {/* Trading Activity - 3 columns */}
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