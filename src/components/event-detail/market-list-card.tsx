import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Target, ChevronDown, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { Market, isMarketActive, getMarketDisplayTitle, Event } from '@/lib/stores'
import { cn } from '@/lib/utils'
import { useState, useMemo } from 'react'
import { usePolymarketStatus } from '@/hooks/use-polymarket-status'
import { OrderBookDisplay } from './order-book-display'
import { useSharedOrderBook } from './shared-order-book-provider'

interface MarketListCardProps {
  markets: Market[]
  selectedMarket: Market | null
  onMarketSelect: (market: Market) => void
  selectedToken: 'yes' | 'no'
  onTokenChange: (token: 'yes' | 'no') => void
  event: Event
}

export function MarketListCard({ 
  markets, 
  selectedMarket, 
  onMarketSelect, 
  selectedToken, 
  onTokenChange, 
  event
}: MarketListCardProps) {
  console.log('📊 MarketListCard: Component initialized', { 
    marketsCount: markets.length,
    selectedMarketId: selectedMarket?.conditionId,
    timestamp: Date.now() 
  })
  
  const [showInactiveMarkets, setShowInactiveMarkets] = useState(false)
  const [expandedMarket, setExpandedMarket] = useState<string | null>(null)
  const { statusDisplay, formattedResponseTime } = usePolymarketStatus()

  // Group markets by status and sort by absolute 1h change
  const { activeMarkets, resolvedMarkets } = useMemo(() => {
    const active = markets.filter(market => 
      market.active === true && market.archived === false && market.closed === false
    )
    const resolved = markets.filter(market => 
      market.active === false || market.archived === true || market.closed === true
    )
    
    // Sort by market ID (smallest to largest)
    const sortById = (a: Market, b: Market) => {
      const aId = parseInt(a.id || '0', 10)
      const bId = parseInt(b.id || '0', 10)
      return aId - bId
    }
    
    return {
      activeMarkets: active.sort(sortById),
      resolvedMarkets: resolved.sort(sortById)
    }
  }, [markets])



  const formatPriceChange = (change: number | undefined): string => {
    if (change === undefined || change === null) return '0.00%'
    return `${change >= 0 ? '+' : ''}${(change * 100).toFixed(2)}%`
  }

  const renderMarket = (market: Market, index: number, isActive: boolean) => {
    const isSelected = selectedMarket?.conditionId === market.conditionId
    const isExpanded = expandedMarket === market.conditionId
    
    return (
      <MarketRow 
        key={market.conditionId}
        market={market}
        isActive={isActive}
        isSelected={isSelected}
        isExpanded={isExpanded}
        selectedToken={selectedToken}
        onMarketSelect={onMarketSelect}
        onTokenChange={onTokenChange}
        onExpandToggle={() => {
          if (isExpanded) {
            setExpandedMarket(null)
          } else {
            setExpandedMarket(market.conditionId)
          }
        }}
      />
    )
  }

  return (
    <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" />
              Markets ({markets.length})
            </CardTitle>
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                statusDisplay.color === 'text-green-600' ? 'bg-green-500' :
                statusDisplay.color === 'text-destructive' ? 'bg-red-500' :
                statusDisplay.color === 'text-yellow-600' ? 'bg-yellow-500' :
                'bg-gray-500'
              }`} />
              <span className={`font-medium ${statusDisplay.color}`}>
                API Status: {statusDisplay.text}
              </span>
              <Badge variant="secondary" className="text-xs font-normal">
                {formattedResponseTime}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {markets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No markets available for this event
              </div>
            ) : (
              <>
                {/* Active Markets Section */}
                {activeMarkets.length > 0 && (
                  <div className="space-y-2">
                    <div className="space-y-2">
                      {activeMarkets.map((market, index) => 
                        renderMarket(market, index, true)
                      )}
                    </div>
                  </div>
                )}

                {/* Resolved Markets Section */}
                {resolvedMarkets.length > 0 && (
                  <Collapsible open={showInactiveMarkets} onOpenChange={setShowInactiveMarkets}>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-between p-0 h-auto font-medium text-sm text-muted-foreground hover:text-foreground"
                      >
                        <span>Resolved Markets - {resolvedMarkets.length}</span>
                        {showInactiveMarkets ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {resolvedMarkets.map((market, index) => 
                        renderMarket(market, index, false)
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
  )
}

// Separate component that can access orderbook data
function MarketRow({ 
  market, 
  isActive, 
  isSelected, 
  isExpanded, 
  selectedToken, 
  onMarketSelect, 
  onTokenChange, 
  onExpandToggle 
}: {
  market: Market
  isActive: boolean
  isSelected: boolean
  isExpanded: boolean
  selectedToken: 'yes' | 'no'
  onMarketSelect: (market: Market) => void
  onTokenChange: (token: 'yes' | 'no') => void
  onExpandToggle: () => void
}) {
  const { orderBooks } = useSharedOrderBook()
  
  // Get YES/NO prices with real-time updates from orderbook
  const getYesNoPrice = (market: Market): { yesPrice: number, noPrice: number } => {
    // Try to get real-time prices from orderbook first (for active markets)
    if (isActive && market.clobTokenIds) {
      try {
        const yesOrderBookKey = `${market.conditionId}_yes`
        const noOrderBookKey = `${market.conditionId}_no`
        
        const yesOrderBook = orderBooks[yesOrderBookKey]
        const noOrderBook = orderBooks[noOrderBookKey]
        
        let yesPrice = 1 // Default fallback for no asks
        let noPrice = 1 // Default fallback for no asks
        
        // Get YES price from lowest ask in YES orderbook
        if (yesOrderBook && yesOrderBook.asks.length > 0) {
          yesPrice = parseFloat(yesOrderBook.asks[0].price)
        }
        
        // Get NO price from lowest ask in NO orderbook
        if (noOrderBook && noOrderBook.asks.length > 0) {
          noPrice = parseFloat(noOrderBook.asks[0].price)
        }
        
        return { yesPrice, noPrice }
      } catch (error) {
        console.error('Error getting orderbook prices:', error)
      }
    }
    
    // Fall back to static prices
    try {
      if (market.outcomePrices && Array.isArray(market.outcomePrices) && market.outcomePrices.length >= 2) {
        return {
          yesPrice: parseFloat(market.outcomePrices[0]) || 0,
          noPrice: parseFloat(market.outcomePrices[1]) || 0
        }
      }
    } catch (error) {
      console.error('Error parsing outcome prices:', error)
    }
    return { yesPrice: 0, noPrice: 0 }
  }
  
  const { yesPrice, noPrice } = getYesNoPrice(market)
    
    return (
      <Collapsible
        key={market.conditionId}
        open={isExpanded}
        onOpenChange={(open) => {
          onExpandToggle()
        }}
      >
        <div
          className={`border rounded transition-colors ${
            isSelected 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }`}
        >
          {/* Market Row */}
          <div className="p-3">
            <div className="flex items-center justify-between">
              {/* Left side - Market info */}
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => onMarketSelect(market)}
              >
                {/* Market question and collapsible trigger */}
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex-1 text-sm font-medium leading-tight">
                    {getMarketDisplayTitle(market)}
                  </div>
                  {/* Collapsible trigger positioned right next to title */}
                  {isActive && (
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="p-1 h-6 w-6 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <ChevronsUpDown className="h-4 w-4" />
                        <span className="sr-only">Toggle order book</span>
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </div>
                
                {/* Yes/No prices */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Yes:</span>
                    <span className="font-medium text-price-positive">
                      {yesPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">No:</span>
                    <span className="font-medium text-price-negative">
                      {noPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Order Book */}
          {isActive && (
            <CollapsibleContent>
                              <OrderBookDisplay
                  conditionId={market.conditionId}
                  selectedToken={selectedToken}
                  onTokenChange={onTokenChange}
                />
            </CollapsibleContent>
          )}
        </div>
      </Collapsible>
  )
} 