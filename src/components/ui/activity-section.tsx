"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ActivityCard } from "@/components/ui/activity-card"
import { ActivityItem } from "@/app/api/portfolio/activity/route"
import { formatCurrency } from "@/lib/portfolio-utils"
import { DollarSign, ChevronRight, Clock, Calendar } from "lucide-react"

interface ActivitySectionProps {
  activities: ActivityItem[]
  selectedDate: string | null
  isLoading: boolean
  error: string | null
  groupingMode: 'timestamp' | 'event'
  sortBy: 'TIMESTAMP' | 'TOKENS' | 'CASH'
  sortDirection: 'ASC' | 'DESC'
  onGroupingModeChange: (mode: 'timestamp' | 'event') => void
  onSortByChange: (sortBy: 'TIMESTAMP' | 'TOKENS' | 'CASH') => void
  onSortDirectionChange: (direction: 'ASC' | 'DESC') => void
}

interface TradeSummary {
  totalBuyAmount: number
  totalSellAmount: number
  averageBuyPrice: number
  averageSellPrice: number
  totalBuyShares: number
  totalSellShares: number
  tradeCount: number
}

interface MarketGroup {
  slug: string
  title: string
  activities: ActivityItem[]
  totalTrades: number
  totalVolume: number
  totalShares: number
  tradeSummary: TradeSummary
  totalRedeem: number
  totalMerge: number
}

interface EventGroup {
  eventSlug: string
  eventTitle: string
  markets: MarketGroup[]
  totalTrades: number
  totalVolume: number
  totalShares: number
}

// Calculate trade summary for a list of activities
function calculateTradeSummary(activities: ActivityItem[]): TradeSummary {
  const trades = activities.filter(activity => activity.type === 'TRADE')
  
  if (trades.length === 0) {
    return {
      totalBuyAmount: 0,
      totalSellAmount: 0,
      averageBuyPrice: 0,
      averageSellPrice: 0,
      totalBuyShares: 0,
      totalSellShares: 0,
      tradeCount: 0
    }
  }

  const buyTrades = trades.filter(trade => trade.side === 'BUY')
  const sellTrades = trades.filter(trade => trade.side === 'SELL')

  const totalBuyAmount = buyTrades.reduce((sum, trade) => sum + trade.usdcSize, 0)
  const totalSellAmount = sellTrades.reduce((sum, trade) => sum + trade.usdcSize, 0)
  const totalBuyShares = buyTrades.reduce((sum, trade) => sum + trade.size, 0)
  const totalSellShares = sellTrades.reduce((sum, trade) => sum + trade.size, 0)

  const averageBuyPrice = buyTrades.length > 0 
    ? buyTrades.reduce((sum, trade) => sum + trade.price, 0) / buyTrades.length 
    : 0
  
  const averageSellPrice = sellTrades.length > 0 
    ? sellTrades.reduce((sum, trade) => sum + trade.price, 0) / sellTrades.length 
    : 0

  return {
    totalBuyAmount,
    totalSellAmount,
    averageBuyPrice,
    averageSellPrice,
    totalBuyShares,
    totalSellShares,
    tradeCount: trades.length
  }
}

// Calculate redeem and merge totals for a list of activities
function calculateRedeemMergeTotals(activities: ActivityItem[]): { totalRedeem: number; totalMerge: number } {
  const redeems = activities.filter(activity => activity.type === 'REDEEM')
  const merges = activities.filter(activity => activity.type === 'MERGE')

  const totalRedeem = redeems.reduce((sum, activity) => sum + activity.usdcSize, 0)
  const totalMerge = merges.reduce((sum, activity) => sum + activity.usdcSize, 0)

  return { totalRedeem, totalMerge }
}

// Group activities by event and then by market within each event
function groupActivitiesByEvent(activities: ActivityItem[]): EventGroup[] {
  const eventGrouped = activities.reduce((acc, activity) => {
    const eventKey = activity.eventSlug || 'unknown'
    
    if (!acc[eventKey]) {
      acc[eventKey] = {
        eventSlug: activity.eventSlug,
        eventTitle: activity.eventSlug ? activity.eventSlug.replace(/-/g, ' ') : 'Unknown Event',
        markets: {},
        totalTrades: 0,
        totalVolume: 0,
        totalShares: 0
      }
    }
    
    const marketKey = activity.slug || 'unknown'
    
    if (!acc[eventKey].markets[marketKey]) {
      acc[eventKey].markets[marketKey] = {
        slug: activity.slug,
        title: activity.title || activity.slug?.replace(/-/g, ' ') || 'Unknown Market',
        activities: [],
        totalTrades: 0,
        totalVolume: 0,
        totalShares: 0,
        tradeSummary: {
          totalBuyAmount: 0,
          totalSellAmount: 0,
          averageBuyPrice: 0,
          averageSellPrice: 0,
          totalBuyShares: 0,
          totalSellShares: 0,
          tradeCount: 0
        },
        totalRedeem: 0,
        totalMerge: 0
      }
    }
    
    acc[eventKey].markets[marketKey].activities.push(activity)
    acc[eventKey].markets[marketKey].totalTrades += 1
    acc[eventKey].markets[marketKey].totalVolume += activity.usdcSize
    acc[eventKey].markets[marketKey].totalShares += activity.size
    
    acc[eventKey].totalTrades += 1
    acc[eventKey].totalVolume += activity.usdcSize
    acc[eventKey].totalShares += activity.size
    
    return acc
  }, {} as Record<string, { eventSlug: string; eventTitle: string; markets: Record<string, MarketGroup>; totalTrades: number; totalVolume: number; totalShares: number }>)
  
  // Convert to final structure and sort
  return Object.values(eventGrouped).map(event => ({
    ...event,
    markets: Object.values(event.markets).map(market => {
      // Calculate summaries for this market
      const tradeSummary = calculateTradeSummary(market.activities)
      const { totalRedeem, totalMerge } = calculateRedeemMergeTotals(market.activities)
      
      return {
        ...market,
        tradeSummary,
        totalRedeem,
        totalMerge
      }
    }).sort((a, b) => b.totalTrades - a.totalTrades)
  })).sort((a, b) => b.totalTrades - a.totalTrades)
}

export function ActivitySection({
  activities,
  selectedDate,
  isLoading,
  error,
  groupingMode,
  sortBy,
  sortDirection,
  onGroupingModeChange,
  onSortByChange,
  onSortDirectionChange
}: ActivitySectionProps) {
  const eventGroups = React.useMemo(() => {
    return groupingMode === 'event' ? groupActivitiesByEvent(activities) : []
  }, [activities, groupingMode])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Activity
          {selectedDate && (
            <Badge variant="secondary" className="ml-2">
              {new Date(selectedDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {selectedDate 
            ? `Showing activity for selected day`
            : `Click on a chart point to view activity for that day`
          }
        </CardDescription>
        
        {/* Controls */}
        {selectedDate && activities.length > 0 && (
          <div className="flex items-center gap-4 pt-4">
            {/* Grouping Mode Toggle */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={groupingMode === 'timestamp' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onGroupingModeChange('timestamp')}
                className="h-7 px-3 text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                Timeline
              </Button>
              <Button
                variant={groupingMode === 'event' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onGroupingModeChange('event')}
                className="h-7 px-3 text-xs"
              >
                <Calendar className="h-3 w-3 mr-1" />
                By Event
              </Button>
            </div>

            {/* Sorting Controls */}
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={onSortByChange}>
                <SelectTrigger className="w-32 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TIMESTAMP">Time</SelectItem>
                  <SelectItem value="TOKENS">Shares</SelectItem>
                  <SelectItem value="CASH">Value</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSortDirectionChange(sortDirection === 'ASC' ? 'DESC' : 'ASC')}
                className="h-7 px-2 text-xs"
              >
                {sortDirection === 'ASC' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading activity data...</div>
          </div>
        )}

        {/* No Date Selected */}
        {!selectedDate && !isLoading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click on a day in the chart above to see your trading activity</p>
          </div>
        )}

        {/* No Activity */}
        {selectedDate && !isLoading && !error && activities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activity on this day</p>
          </div>
        )}

        {/* Activity Content */}
        {selectedDate && !isLoading && !error && activities.length > 0 && (
          <>
            {/* Header Row - Desktop Only */}
            <div className="hidden md:grid grid-cols-12 gap-2 items-center text-xs font-medium text-muted-foreground mb-4 px-3">
              <div className="col-span-4">Market</div>
              <div className="col-span-1 text-right">Price</div>
              <div className="col-span-1 text-right">Shares</div>
              <div className="col-span-2 text-right">Value</div>
              <div className="col-span-1 text-center">Outcome</div>
              <div className="col-span-1 text-center">Type</div>
              <div className="col-span-1 text-right">Date</div>
            </div>

            {/* Timeline Mode */}
            {groupingMode === 'timestamp' && (
              <div className="space-y-2">
                {activities.map((activity, index) => (
                  <ActivityCard key={`${activity.transactionHash}-${index}`} activity={activity} />
                ))}
              </div>
            )}

            {/* Event Grouping Mode */}
            {groupingMode === 'event' && (
              <div className="space-y-4">
                {eventGroups.map((eventGroup, eventIndex) => (
                  <Collapsible key={eventGroup.eventSlug} defaultOpen={false}>
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <ChevronRight className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-90" />
                            <div>
                              <h3 className="font-medium text-sm">{eventGroup.eventTitle}</h3>
                              <p className="text-xs text-muted-foreground">{eventGroup.markets.length} markets</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="text-center">
                              <div className="font-medium">{eventGroup.totalTrades}</div>
                              <div className="text-muted-foreground">Activities</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium">{eventGroup.totalShares.toLocaleString()}</div>
                              <div className="text-muted-foreground">Shares</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium">{formatCurrency(eventGroup.totalVolume)}</div>
                              <div className="text-muted-foreground">Volume</div>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t">
                          <div className="space-y-2 p-2">
                            {eventGroup.markets.map((marketGroup, marketIndex) => (
                              <Collapsible key={marketGroup.slug} defaultOpen={true}>
                                <div className="border rounded-md ml-4">
                                  <CollapsibleTrigger asChild>
                                    <div className="flex items-center justify-between p-3 hover:bg-muted/30 cursor-pointer">
                                      <div className="flex items-center gap-2">
                                        <ChevronRight className="h-3 w-3 transition-transform duration-200 data-[state=open]:rotate-90" />
                                        <div>
                                          <h4 className="font-medium text-xs">{marketGroup.title}</h4>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 text-xs">
                                        <div className="text-center">
                                          <div className="font-medium">{marketGroup.totalTrades}</div>
                                          <div className="text-muted-foreground">Activities</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-medium">{marketGroup.totalShares.toLocaleString()}</div>
                                          <div className="text-muted-foreground">Shares</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-medium">{formatCurrency(marketGroup.totalVolume)}</div>
                                          <div className="text-muted-foreground">Volume</div>
                                        </div>
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="border-t">
                                      {/* Market Summary */}
                                      <div className="p-3 bg-muted/20 border-b">
                                        <div className="text-xs text-muted-foreground space-y-1">
                                          {/* Trade Summary */}
                                          {marketGroup.tradeSummary.tradeCount > 0 ? (
                                            <div>
                                              <span className="font-medium">Trades:</span> 
                                              <span className="ml-1">
                                                BUY: {formatCurrency(marketGroup.tradeSummary.totalBuyAmount)} 
                                                ({marketGroup.tradeSummary.totalBuyShares.toFixed(2)} shares, avg ${marketGroup.tradeSummary.averageBuyPrice.toFixed(4)}) | 
                                                SELL: {formatCurrency(marketGroup.tradeSummary.totalSellAmount)} 
                                                ({marketGroup.tradeSummary.totalSellShares.toFixed(2)} shares, avg ${marketGroup.tradeSummary.averageSellPrice.toFixed(4)})
                                              </span>
                                            </div>
                                          ) : (
                                            <div>No trades</div>
                                          )}
                                          
                                          {/* Redeem Summary */}
                                          {marketGroup.totalRedeem > 0 && (
                                            <div>
                                              <span className="font-medium">Redeems:</span> 
                                              <span className="ml-1">{formatCurrency(marketGroup.totalRedeem)}</span>
                                            </div>
                                          )}
                                          
                                          {/* Merge Summary */}
                                          {marketGroup.totalMerge > 0 && (
                                            <div>
                                              <span className="font-medium">Merges:</span> 
                                              <span className="ml-1">{formatCurrency(marketGroup.totalMerge)}</span>
                                            </div>
                                          )}
                                          
                                          {/* Show message if no redemptions */}
                                          {marketGroup.totalRedeem === 0 && marketGroup.totalMerge === 0 && marketGroup.tradeSummary.tradeCount > 0 && (
                                            <div>No redemptions</div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-1 p-2">
                                        {marketGroup.activities.map((activity, activityIndex) => (
                                          <ActivityCard 
                                            key={`${activity.transactionHash}-${activityIndex}`} 
                                            activity={activity} 
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
} 