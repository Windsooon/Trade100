"use client"

import { useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3,
  Brain,
  Activity,
  Users,
  Info
} from 'lucide-react'
import { MarketInsightCardProps } from './market-insight/types'
import { ChartTab } from './market-insight/chart-tab'
import { InfoTab } from './market-insight/info-tab'
import { MoneyFlowAnalysis } from './market-insight/money-flow-analysis'
import { TraderAnalysis } from './market-insight/trader-analysis'

export function MarketInsightCard({ selectedMarket, selectedToken, event }: MarketInsightCardProps) {
  
  const componentId = useRef(Math.random().toString(36).substr(2, 9))
  const renderCount = useRef(0)
  
  // Track component renders
  renderCount.current += 1
  
  // Add resize trigger when chart tab becomes active
  const handleTabChange = useCallback((value: string) => {
    // Chart tab will handle its own re-initialization
  }, [selectedMarket?.conditionId])

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          <span className="hidden sm:inline">Market Insight</span>
          <span className="sm:hidden">Insight</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        <Tabs defaultValue="chart" className="w-full h-full flex flex-col" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4 bg-transparent">
            <TabsTrigger value="chart" className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Chart</span>
              <span className="sm:hidden text-xs">Chart</span>
            </TabsTrigger>
            <TabsTrigger value="info" className="flex items-center gap-1">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Info</span>
              <span className="sm:hidden text-xs">Info</span>
            </TabsTrigger>
            <TabsTrigger value="analyze" className="flex items-center gap-1">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">Trade Analyze</span>
              <span className="sm:hidden text-xs">Analyze</span>
            </TabsTrigger>
            <TabsTrigger value="trader" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Trader</span>
              <span className="sm:hidden text-xs">Trader</span>
            </TabsTrigger>
          </TabsList>

          {/* Chart Tab */}
          <TabsContent value="chart" className="flex-1">
            <ChartTab 
              selectedMarket={selectedMarket} 
              selectedToken={selectedToken}
              event={event}
            />
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info" className="flex-1">
            <InfoTab selectedMarket={selectedMarket} />
          </TabsContent>

          {/* Trade Analyze Tab */}
          <TabsContent value="analyze" className="flex-1">
            <MoneyFlowAnalysis selectedMarket={selectedMarket} />
          </TabsContent>

          {/* Trader Tab */}
          <TabsContent value="trader" className="flex-1">
            <TraderAnalysis selectedMarket={selectedMarket} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}


 