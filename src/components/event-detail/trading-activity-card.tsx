"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Activity, User, Users, Loader2 } from 'lucide-react'
import { Market, Event } from '@/lib/stores'

interface TradingActivityCardProps {
  selectedMarket: Market | null
  event: Event
}

export function TradingActivityCard({ selectedMarket, event }: TradingActivityCardProps) {
  const [loading, setLoading] = useState(false)

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          <span className="hidden sm:inline">Trading Activity</span>
          <span className="sm:hidden">Activity</span>
          <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        <Tabs defaultValue="market" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 bg-transparent">
            <TabsTrigger value="market" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Market Trade</span>
              <span className="sm:hidden text-xs">Market</span>
            </TabsTrigger>
            <TabsTrigger value="my" className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">My Trade</span>
              <span className="sm:hidden text-xs">My</span>
            </TabsTrigger>
          </TabsList>

          {/* Market Trade Tab */}
          <TabsContent value="market" className="flex-1 mt-4 sm:mt-6">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Recent Market Trades</h3>
                {selectedMarket && (
                  <Badge variant="outline" className="text-xs">
                    {selectedMarket.question.length > 30 
                      ? `${selectedMarket.question.substring(0, 30)}...` 
                      : selectedMarket.question
                    }
                  </Badge>
                )}
              </div>
              
              {!selectedMarket ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div className="space-y-3">
                    <Users className="h-12 w-12 mx-auto opacity-50 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Select a market to view trading activity
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div className="space-y-3">
                    <Users className="h-12 w-12 mx-auto opacity-50 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Market trading activity will be displayed here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Real-time trades from all users for this market
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* My Trade Tab */}
          <TabsContent value="my" className="flex-1 mt-4 sm:mt-6">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">My Trading History</h3>
                {selectedMarket && (
                  <Badge variant="outline" className="text-xs">
                    Personal Trades
                  </Badge>
                )}
              </div>
              
              {!selectedMarket ? (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div className="space-y-3">
                    <User className="h-12 w-12 mx-auto opacity-50 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Select a market to view your trades
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div className="space-y-3">
                    <User className="h-12 w-12 mx-auto opacity-50 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Your trading history will be displayed here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Connect wallet to view your personal trades
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 