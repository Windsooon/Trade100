"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MarketSummary } from "@/lib/services/trading-analysis.service"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

interface MarketSummaryCardProps {
  summary: MarketSummary
  onClick?: () => void
}

export function MarketSummaryCard({ summary, onClick }: MarketSummaryCardProps) {
  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${onClick ? '' : ''}`}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2">{summary.title}</CardTitle>
            <CardDescription className="mt-1">
              {summary.marketSlug}
            </CardDescription>
          </div>
          {onClick && (
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Trades</div>
              <div className="font-medium">{summary.tradeCount}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Yes Shares</div>
              <div className="font-medium">{summary.yesHolding.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">No Shares</div>
              <div className="font-medium">{summary.noHolding.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Net Shares</div>
              <div className="font-medium">{summary.netHolding.toFixed(2)}</div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              Bought: {summary.totalBought.toFixed(2)}
            </Badge>
            <Badge variant="outline">
              Sold: {summary.totalSold.toFixed(2)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
