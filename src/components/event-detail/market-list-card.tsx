import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Target, ChevronDown, ChevronRight } from 'lucide-react'
import { Market, isMarketActive } from '@/lib/stores'
import { cn } from '@/lib/utils'
import { useState, useMemo } from 'react'

interface MarketListCardProps {
  markets: Market[]
  selectedMarket: Market | null
  onMarketSelect: (market: Market) => void
}

export function MarketListCard({ markets, selectedMarket, onMarketSelect }: MarketListCardProps) {
  const [showInactiveMarkets, setShowInactiveMarkets] = useState(false)

  // Group markets by status and sort by absolute 1h change
  const { activeMarkets, resolvedMarkets } = useMemo(() => {
    const active = markets.filter(market => 
      market.active === true && market.archived === false && market.closed === false
    )
    const resolved = markets.filter(market => 
      market.active === false || market.archived === true || market.closed === true
    )
    
    // Sort by absolute 1h change (biggest movers first)
    const sortByAbsoluteChange = (a: Market, b: Market) => {
      const aChange = Math.abs(a.oneHourPriceChange || 0)
      const bChange = Math.abs(b.oneHourPriceChange || 0)
      return bChange - aChange
    }
    
    return {
      activeMarkets: active.sort(sortByAbsoluteChange),
      resolvedMarkets: resolved.sort(sortByAbsoluteChange)
    }
  }, [markets])

  const formatPriceChange = (change: number | undefined): string => {
    if (change === undefined || change === null) return '0.00%'
    return `${change >= 0 ? '+' : ''}${(change * 100).toFixed(2)}%`
  }

  const renderMarket = (market: Market, index: number, isActive: boolean) => {
    const isSelected = selectedMarket?.conditionId === market.conditionId
    const changeValue = market.oneHourPriceChange || 0
    const changeColor = changeValue >= 0 ? 'text-green-600' : 'text-red-600'
    
    return (
      <div
        key={market.conditionId}
        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
          isSelected 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }`}
        onClick={() => onMarketSelect(market)}
      >
        <div className="space-y-2">
          <div className="text-sm font-medium leading-tight">
            {market.question}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              1h Change
            </div>
            <div className={`text-xs font-medium ${changeColor}`}>
              {formatPriceChange(market.oneHourPriceChange)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Markets ({markets.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  )
} 