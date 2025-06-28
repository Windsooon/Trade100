import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Target, ChevronDown, ChevronRight } from 'lucide-react'
import { Market, isMarketActive, getMarketDisplayTitle } from '@/lib/stores'
import { cn } from '@/lib/utils'
import { useState, useMemo } from 'react'
import { usePolymarketStatus } from '@/hooks/use-polymarket-status'
import { useOrderBook } from '@/lib/order-book-context'

interface MarketListCardProps {
  markets: Market[]
  selectedMarket: Market | null
  onMarketSelect: (market: Market) => void
}

export function MarketListCard({ markets, selectedMarket, onMarketSelect }: MarketListCardProps) {
  const [showInactiveMarkets, setShowInactiveMarkets] = useState(false)
  const { statusDisplay, formattedResponseTime } = usePolymarketStatus()
  const { getLowestAskPrice } = useOrderBook()

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
    
    // Get YES/NO prices from order book (lowest ask) or fall back to static prices
    const getYesNoPrice = (market: Market): { yesPrice: number, noPrice: number } => {
      // Try to get real-time prices from order book first
      const orderBookYesPrice = getLowestAskPrice(market.conditionId, 'yes')
      const orderBookNoPrice = getLowestAskPrice(market.conditionId, 'no')
      
      if (orderBookYesPrice !== null && orderBookNoPrice !== null) {
        return {
          yesPrice: orderBookYesPrice,
          noPrice: orderBookNoPrice
        }
      }
      
      // Fall back to static prices from market data
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
      <div
        key={market.conditionId}
        className={`p-3 border rounded cursor-pointer transition-colors ${
          isSelected 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
        onClick={() => onMarketSelect(market)}
      >
        {/* Market question */}
        <div className="text-sm font-medium leading-tight mb-2">
          {getMarketDisplayTitle(market)}
        </div>
        {/* Yes/No prices */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Yes:</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {yesPrice.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">No:</span>
            <span className="font-medium text-red-600 dark:text-red-400">
              {noPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-sm">
            <Target className="h-4 w-4" />
            Markets ({markets.length})
          </h3>
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
      </div>
      <div className="flex-1 p-3 overflow-y-auto">
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
                  <h4 className="font-medium text-sm text-muted-foreground">
                    Active Markets (Accepting Orders) - {activeMarkets.length}
                  </h4>
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
      </div>
    </div>
  )
} 