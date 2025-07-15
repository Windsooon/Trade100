"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ActivityItem } from "@/app/api/portfolio/activity/route"
import { ExternalLink, ArrowUpDown, Coins, Gift, Repeat, Award } from "lucide-react"

interface ActivityCardProps {
  activity: ActivityItem
}

// Get icon for activity type
function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'TRADE':
      return <ArrowUpDown className="h-3 w-3" />
    case 'REDEEM':
      return <Coins className="h-3 w-3" />
    case 'SPLIT':
    case 'MERGE':
      return <Repeat className="h-3 w-3" />
    case 'REWARD':
      return <Award className="h-3 w-3" />
    case 'CONVERSION':
      return <Gift className="h-3 w-3" />
    default:
      return <ArrowUpDown className="h-3 w-3" />
  }
}

// Get activity type styling
function getActivityTypeStyle(type: ActivityItem['type'], side?: string) {
  if (type === 'TRADE') {
    return side === 'BUY' 
      ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
      : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
  }
  
  switch (type) {
    case 'REDEEM':
      return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20'
    case 'SPLIT':
    case 'MERGE':
      return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20'
    case 'REWARD':
      return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20'
    case 'CONVERSION':
      return 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20'
    default:
      return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20'
  }
}

// Format price to currency with proper decimal places
function formatPrice(price: number): string {
  if (price === 0) return '—'
  if (price < 0.01) return `$${price.toFixed(4)}`
  return `$${price.toFixed(2)}`
}

// Format shares with proper decimal places
function formatShares(shares: number): string {
  if (shares === 0) return '—'
  return shares.toFixed(2)
}

// Format value as currency
function formatValue(value: number): string {
  if (value === 0) return '—'
  return `$${value.toFixed(2)}`
}

// Format date to compact format
function formatCompactDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 1) return 'Today'
  if (diffDays === 2) return 'Yesterday'
  if (diffDays <= 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const displayType = activity.type === 'TRADE' ? activity.side : activity.type
  const typeStyle = getActivityTypeStyle(activity.type, activity.side)
  
  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-3">
        {/* Desktop Layout */}
        <div className="hidden md:grid grid-cols-12 gap-2 items-center text-sm">
          {/* Market with icon - 4 columns */}
          <div className="col-span-4 flex items-center gap-2 min-w-0">
            {activity.icon && (
              <img
                src={activity.icon}
                alt={activity.title}
                className="w-6 h-6 rounded object-cover flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate text-xs" title={activity.title}>
                {activity.title}
              </p>
            </div>
          </div>

          {/* Price - 1 column */}
          <div className="col-span-1 text-right">
            <span className="font-mono text-xs">
              {formatPrice(activity.price)}
            </span>
          </div>

          {/* Shares - 1 column */}
          <div className="col-span-1 text-right">
            <span className="font-mono text-xs">
              {formatShares(activity.size)}
            </span>
          </div>

          {/* Value - 2 columns */}
          <div className="col-span-2 text-right">
            <span className="font-mono text-xs font-medium">
              {formatValue(activity.usdcSize)}
            </span>
          </div>

          {/* Outcome - 1 column */}
          <div className="col-span-1 text-center">
            {activity.outcome ? (
              <Badge 
                variant={activity.outcome === 'Yes' ? 'default' : 'secondary'}
                className="text-xs px-1 py-0 h-5"
              >
                {activity.outcome}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            )}
          </div>

          {/* Type - 1 column */}
          <div className="col-span-1 flex items-center justify-center">
            <div className={`p-1 rounded text-xs ${typeStyle}`} title={displayType}>
              {getActivityIcon(activity.type)}
            </div>
          </div>

          {/* Date with link - 1 column */}
          <div className="col-span-1 text-right flex items-center justify-end gap-1">
            <span className="text-muted-foreground text-xs">
              {formatCompactDate(activity.timestamp)}
            </span>
            <a
              href={`https://polygonscan.com/tx/${activity.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
              title="View on PolygonScan"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-2">
          {/* Top row: Market + Value */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {activity.icon && (
                <img
                  src={activity.icon}
                  alt={activity.title}
                  className="w-6 h-6 rounded object-cover flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-sm" title={activity.title}>
                  {activity.title}
                </p>
              </div>
            </div>
            <div className="font-mono text-sm font-medium">
              {formatValue(activity.usdcSize)}
            </div>
          </div>

          {/* Bottom row: Details */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className={`p-1 rounded ${typeStyle}`} title={displayType}>
                {getActivityIcon(activity.type)}
              </div>
              {activity.outcome && (
                <Badge 
                  variant={activity.outcome === 'Yes' ? 'default' : 'secondary'}
                  className="text-xs px-1 py-0 h-5"
                >
                  {activity.outcome}
                </Badge>
              )}
              <span className="font-mono">{formatPrice(activity.price)}</span>
              <span className="font-mono">{formatShares(activity.size)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{formatCompactDate(activity.timestamp)}</span>
              <a
                href={`https://polygonscan.com/tx/${activity.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
                title="View on PolygonScan"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 