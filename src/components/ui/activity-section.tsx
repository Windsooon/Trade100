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

interface EventGroup {
  eventSlug: string
  eventTitle: string
  activities: ActivityItem[]
  totalTrades: number
  totalVolume: number
  totalShares: number
}

// Group activities by event
function groupActivitiesByEvent(activities: ActivityItem[]): EventGroup[] {
  const grouped = activities.reduce((acc, activity) => {
    const key = activity.eventSlug || 'unknown'
    
    if (!acc[key]) {
      acc[key] = {
        eventSlug: activity.eventSlug,
        eventTitle: activity.eventSlug ? activity.eventSlug.replace(/-/g, ' ') : 'Unknown Event', // Format eventSlug by removing dashes
        activities: [],
        totalTrades: 0,
        totalVolume: 0,
        totalShares: 0
      }
    }
    
    acc[key].activities.push(activity)
    acc[key].totalTrades += 1
    acc[key].totalVolume += activity.usdcSize
    acc[key].totalShares += activity.size
    
    return acc
  }, {} as Record<string, EventGroup>)
  
  // Sort events by total activity count (descending)
  return Object.values(grouped).sort((a, b) => b.totalTrades - a.totalTrades)
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
                          <div className="space-y-1 p-2">
                            {eventGroup.activities.map((activity, activityIndex) => (
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
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
} 