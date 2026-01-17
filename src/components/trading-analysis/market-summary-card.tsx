"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MarketSummary } from "@/lib/services/trading-analysis.service"
import { formatCurrency, formatPercentage } from "@/lib/portfolio-utils"
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react"
import Link from "next/link"

interface MarketSummaryCardProps {
  summary: MarketSummary
  onClick?: () => void
}

export function MarketSummaryCard({ summary, onClick }: MarketSummaryCardProps) {
  const isProfit = summary.totalPnL > 0
  const pnlPercentage = summary.avgBuyPrice > 0
    ? ((summary.totalPnL / (summary.avgBuyPrice * summary.totalBought)) * 100)
    : 0

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
          {/* P/L Summary */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total P/L</span>
            <div className="flex items-center gap-2">
              {isProfit ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`font-semibold ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(summary.totalPnL)}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Realized</div>
              <div className="font-medium">{formatCurrency(summary.realizedPnL)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Unrealized</div>
              <div className="font-medium">{formatCurrency(summary.unrealizedPnL)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Trades</div>
              <div className="font-medium">{summary.tradeCount}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Holding</div>
              <div className="font-medium">{summary.currentHolding.toFixed(2)}</div>
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
            {pnlPercentage !== 0 && (
              <Badge variant={isProfit ? "default" : "destructive"}>
                {formatPercentage(pnlPercentage)}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
