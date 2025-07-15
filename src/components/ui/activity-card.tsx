"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ActivityItem } from "@/app/api/portfolio/activity/route"
import { formatCurrency } from "@/lib/portfolio-utils"
import { ExternalLink, ArrowUpDown, Coins, Gift, Repeat, Award } from "lucide-react"

interface ActivityCardProps {
  activity: ActivityItem
}

// Get icon for activity type
function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'TRADE':
      return <ArrowUpDown className="h-4 w-4" />
    case 'REDEEM':
      return <Coins className="h-4 w-4" />
    case 'SPLIT':
    case 'MERGE':
      return <Repeat className="h-4 w-4" />
    case 'REWARD':
      return <Award className="h-4 w-4" />
    case 'CONVERSION':
      return <Gift className="h-4 w-4" />
    default:
      return <ArrowUpDown className="h-4 w-4" />
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

// Format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now() / 1000
  const diff = now - timestamp
  
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
  
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function ActivityCard({ activity }: ActivityCardProps) {
  const displayType = activity.type === 'TRADE' ? activity.side : activity.type
  const typeStyle = getActivityTypeStyle(activity.type, activity.side)
  
  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="grid grid-cols-7 gap-4 items-center text-sm">
          {/* Type */}
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded ${typeStyle}`}>
              {getActivityIcon(activity.type)}
            </div>
            <span className="font-medium">{displayType}</span>
          </div>

          {/* Market */}
          <div className="col-span-2 flex items-center gap-3">
            {activity.icon && (
              <img
                src={activity.icon}
                alt={activity.title}
                className="w-8 h-8 rounded object-cover flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate" title={activity.title}>
                {activity.title}
              </p>
            </div>
          </div>

          {/* Outcome */}
          <div>
            {activity.outcome ? (
              <Badge 
                variant={activity.outcome === 'Yes' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {activity.outcome}
              </Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>

          {/* Price */}
          <div className="text-right">
            {activity.price > 0 ? (
              <span>{Math.round(activity.price * 100)}¢</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>

          {/* Shares */}
          <div className="text-right">
            <span>{activity.size.toLocaleString()}</span>
          </div>

          {/* Value */}
          <div className="text-right font-medium">
            {formatCurrency(activity.usdcSize)}
          </div>

          {/* Date */}
          <div className="text-right text-muted-foreground flex items-center justify-end gap-1">
            <span>{formatRelativeTime(activity.timestamp)}</span>
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
      </CardContent>
    </Card>
  )
} 