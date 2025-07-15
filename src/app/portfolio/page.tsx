"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Navbar } from '@/components/ui/navbar'
import { Footer } from '@/components/ui/footer'
import { WalletSetupGuide } from '@/components/ui/wallet-setup-guide'
import { useWalletAddress } from '@/hooks/use-wallet-address'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,

  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { TrendingUp, TrendingDown, Wallet, DollarSign, ChevronDown, ChevronRight } from "lucide-react"

// Mock data generation
const generateMockPortfolioData = () => {
  const data = []
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 29) // 30 days ago
  
  let portfolioValue = 10000 // Starting portfolio value
  let totalPnL = 0
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    // Generate realistic P/L changes (-500 to +500)
    const dailyPnL = (Math.random() - 0.5) * 1000
    totalPnL += dailyPnL
    portfolioValue = 10000 + totalPnL
    
    data.push({
      date: date.toISOString().split('T')[0],
      portfolioValue: Math.round(portfolioValue),
      dailyPnL: Math.round(dailyPnL),
      totalPnL: Math.round(totalPnL),
      cumulativePnL: Math.round(totalPnL)
    })
  }
  
  return data
}

// Realistic event titles and categories
const MOCK_EVENTS = [
  {
    title: "2024 US Presidential Election",
    category: "Politics",
    markets: [
      "Will Donald Trump win the 2024 US Presidential Election?",
      "Will Joe Biden win the 2024 US Presidential Election?",
      "Will the 2024 US Presidential Election be decided by more than 5%?"
    ]
  },
  {
    title: "Bitcoin Price Movement",
    category: "Crypto",
    markets: [
      "Will Bitcoin reach $100,000 by end of 2024?",
      "Will Bitcoin drop below $30,000 in 2024?",
      "Will Bitcoin outperform the S&P 500 in 2024?"
    ]
  },
  {
    title: "AI Development",
    category: "Technology",
    markets: [
      "Will OpenAI release GPT-5 in 2024?",
      "Will any AI model pass the Turing Test in 2024?",
      "Will AI be regulated by the US government in 2024?"
    ]
  },
  {
    title: "Climate Change",
    category: "Environment",
    markets: [
      "Will 2024 be the hottest year on record?",
      "Will Arctic sea ice reach a new minimum in 2024?",
      "Will a major climate agreement be signed in 2024?"
    ]
  },
  {
    title: "Space Exploration",
    category: "Science",
    markets: [
      "Will SpaceX successfully land on Mars in 2024?",
      "Will NASA launch the Artemis mission in 2024?",
      "Will a private company achieve lunar landing in 2024?"
    ]
  },
  {
    title: "Stock Market",
    category: "Finance",
    markets: [
      "Will the S&P 500 reach 6000 points in 2024?",
      "Will there be a market crash in 2024?",
      "Will interest rates be cut in 2024?"
    ]
  },
  {
    title: "Sports Championships",
    category: "Sports",
    markets: [
      "Will the Chiefs win the Super Bowl 2024?",
      "Will LeBron James retire in 2024?",
      "Will a new NBA scoring record be set in 2024?"
    ]
  },
  {
    title: "Global Conflicts",
    category: "World Events",
    markets: [
      "Will the Ukraine conflict end in 2024?",
      "Will there be a major diplomatic breakthrough in 2024?",
      "Will new sanctions be imposed in 2024?"
    ]
  }
]

// Mock activity data for a specific day
const generateMockActivityForDay = (date: string) => {
  const numTrades = Math.floor(Math.random() * 8) + 2 // 2-9 trades per day
  const activities = []
  
  // Generate activities across multiple events
  for (let i = 0; i < numTrades; i++) {
    const eventIndex = Math.floor(Math.random() * MOCK_EVENTS.length)
    const event = MOCK_EVENTS[eventIndex]
    const marketIndex = Math.floor(Math.random() * event.markets.length)
    const market = event.markets[marketIndex]
    
    const tradeValue = Math.random() * 1500 + 50 // $50-$1550
    const side = Math.random() > 0.5 ? 'BUY' : 'SELL'
    const outcome = Math.random() > 0.5 ? 'Yes' : 'No'
    
    activities.push({
      proxyWallet: "0x6af75d4e4aaf700450efbac3708cce1665810ff1",
      timestamp: new Date(date).getTime() / 1000 + i * 2400 + Math.random() * 1000, // Spread throughout day
      conditionId: `${eventIndex}_${marketIndex}_${date}`,
      type: "TRADE",
      size: Math.round(tradeValue / (Math.random() * 0.8 + 0.1)),
      usdcSize: tradeValue,
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      price: Math.random() * 0.8 + 0.1, // 0.1-0.9
      asset: `asset_${eventIndex}_${marketIndex}`,
      side,
      outcomeIndex: outcome === 'Yes' ? 0 : 1,
      title: market,
      slug: market.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      icon: `https://picsum.photos/64/64?random=${eventIndex * 10 + marketIndex}`,
      eventTitle: event.title,
      eventSlug: event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      eventCategory: event.category,
      outcome,
      name: "MockUser",
      pseudonym: `Trader-${Math.floor(Math.random() * 1000)}`,
      bio: "",
      profileImage: `https://picsum.photos/32/32?random=${i + 500}`,
      profileImageOptimized: ""
    })
  }
  
  // Sort activities by timestamp
  return activities.sort((a, b) => a.timestamp - b.timestamp)
}

const mockData = generateMockPortfolioData()

const chartConfig = {
  portfolioValue: {
    label: "Portfolio Value",
    color: "var(--chart-1)",
  },
  totalPnL: {
    label: "Total P/L",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export default function PortfolioPage() {
  const { walletAddress, hasWalletAddress, isLoading, refetchWalletAddress } = useWalletAddress()
  const [timeRange, setTimeRange] = React.useState("30d")
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)
  const [activityData, setActivityData] = React.useState<any[]>([])
  const [groupingMode, setGroupingMode] = React.useState<'day' | 'event'>('day')

  // Get current portfolio stats
  const currentData = mockData[mockData.length - 1]
  const currentValue = currentData.portfolioValue
  const totalPnL = currentData.totalPnL
  const totalPnLPercent = ((totalPnL / 10000) * 100)

  // Handle chart click
  const handleChartClick = (data: any) => {
    if (data && data.activeLabel) {
      const clickedDate = data.activeLabel
      setSelectedDate(clickedDate)
      const activities = generateMockActivityForDay(clickedDate)
      setActivityData(activities)
    }
  }

  // Group activities by event for display
  const groupActivitiesByEvent = (activities: any[]) => {
    const grouped = activities.reduce((acc, activity) => {
      const eventKey = activity.eventTitle
      if (!acc[eventKey]) {
        acc[eventKey] = {
          eventTitle: activity.eventTitle,
          eventCategory: activity.eventCategory,
          eventSlug: activity.eventSlug,
          activities: [],
          totalTrades: 0,
          totalVolume: 0,
          winCount: 0,
          lossCount: 0,
          dateRange: { earliest: activity.timestamp, latest: activity.timestamp }
        }
      }
      
      acc[eventKey].activities.push(activity)
      acc[eventKey].totalTrades += 1
      acc[eventKey].totalVolume += activity.usdcSize
      
      // Calculate win/loss (simplified logic)
      if (activity.side === 'BUY') {
        acc[eventKey].winCount += 1
      } else {
        acc[eventKey].lossCount += 1
      }
      
      // Update date range
      if (activity.timestamp < acc[eventKey].dateRange.earliest) {
        acc[eventKey].dateRange.earliest = activity.timestamp
      }
      if (activity.timestamp > acc[eventKey].dateRange.latest) {
        acc[eventKey].dateRange.latest = activity.timestamp
      }
      
      return acc
    }, {} as Record<string, any>)
    
    // Sort events by number of trades (descending)
    return Object.values(grouped).sort((a: any, b: any) => b.totalTrades - a.totalTrades)
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
  }

  const filteredData = mockData.filter((item) => {
    // For 30d, show all data
    return true
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="border-b bg-background">
          <div className="container mx-auto px-4 py-4 max-w-[1200px]">
            <h1 className="text-2xl font-bold">Portfolio</h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6 space-y-6 max-w-[1200px]">
          <div className="text-center py-8">Loading...</div>
        </div>
        <Footer />
      </div>
    )
  }

  // Show setup guide if no wallet address
  if (!hasWalletAddress) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="border-b bg-background">
          <div className="container mx-auto px-4 py-4 max-w-[1200px]">
            <h1 className="text-2xl font-bold">Portfolio</h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6 space-y-6 max-w-[1200px]">
          <WalletSetupGuide onAddressAdded={refetchWalletAddress} />
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Page Header */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 max-w-[1200px]">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Portfolio</h1>
            <div className="text-sm text-muted-foreground">
              Wallet: <code className="bg-muted px-2 py-1 rounded text-xs">{walletAddress}</code>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6 max-w-[1200px]">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Portfolio Value
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(currentValue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total P/L
              </CardTitle>
              {totalPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(totalPnL)}
              </div>
              <p className={`text-xs ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercentage(totalPnLPercent)} from initial value
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="pt-0">
          <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
            <div className="grid flex-1 gap-1">
              <CardTitle>Portfolio P/L Chart</CardTitle>
              <CardDescription>
                Showing portfolio performance for the last 30 days
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={groupingMode === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setGroupingMode('day')}
                  className="h-7 px-3 text-xs"
                >
                  Group by Day
                </Button>
                <Button
                  variant={groupingMode === 'event' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setGroupingMode('event')}
                  className="h-7 px-3 text-xs"
                >
                  Group by Event
                </Button>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger
                  className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
                  aria-label="Select a value"
                >
                  <SelectValue placeholder="Last 30 days" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="30d" className="rounded-lg">
                    Last 30 days
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <AreaChart data={filteredData} onClick={handleChartClick}>
                <defs>
                  <linearGradient id="fillPnL" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-totalPnL)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-totalPnL)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }}
                      indicator="dot"
                      formatter={(value, name) => [
                        name === 'totalPnL' ? formatCurrency(value as number) : formatCurrency(value as number),
                        name === 'totalPnL' ? 'Total P/L' : 'Portfolio Value'
                      ]}
                    />
                  }
                />
                <Area
                  dataKey="totalPnL"
                  type="natural"
                  fill="url(#fillPnL)"
                  stroke="var(--color-totalPnL)"
                  stackId="a"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Activity Section */}
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
              {selectedDate && activityData.length > 0 && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {groupingMode === 'day' ? 'Chronological' : 'By Event'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {selectedDate 
                ? `Showing activity ${groupingMode === 'day' ? 'chronologically' : 'grouped by event'} for selected day`
                : `Click on a chart point to view activity for that day`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click on a day in the chart above to see your trading activity</p>
              </div>
            ) : activityData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activity on this day</p>
              </div>
            ) : groupingMode === 'day' ? (
              // Group by Day (Chronological) Display
              <div className="space-y-4">
                {activityData.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <img
                      src={activity.icon}
                      alt={activity.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{activity.title}</h4>
                      <div className="text-xs text-muted-foreground mb-1">{activity.eventTitle}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={activity.side === 'BUY' ? 'default' : 'destructive'} className="text-xs">
                          {activity.side}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {activity.outcome}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {activity.size.toFixed(0)} shares @ {formatCurrency(activity.price)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(activity.usdcSize)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp * 1000).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Group by Event Display
              <div className="space-y-4">
                {groupActivitiesByEvent(activityData).map((eventGroup: any, eventIndex: number) => (
                  <Collapsible key={eventIndex} defaultOpen={true}>
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <ChevronRight className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-90" />
                            <div>
                              <h3 className="font-medium text-sm">{eventGroup.eventTitle}</h3>
                              <p className="text-xs text-muted-foreground">{eventGroup.eventCategory}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="text-center">
                              <div className="font-medium">{eventGroup.totalTrades}</div>
                              <div className="text-muted-foreground">Trades</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium">{formatCurrency(eventGroup.totalVolume)}</div>
                              <div className="text-muted-foreground">Volume</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-green-500">{eventGroup.winCount}</div>
                              <div className="text-muted-foreground">Buy</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-red-500">{eventGroup.lossCount}</div>
                              <div className="text-muted-foreground">Sell</div>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t">
                          {eventGroup.activities.map((activity: any, activityIndex: number) => (
                            <div key={activityIndex} className="flex items-center space-x-4 p-4 border-b last:border-b-0">
                              <img
                                src={activity.icon}
                                alt={activity.title}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium truncate">{activity.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant={activity.side === 'BUY' ? 'default' : 'destructive'} className="text-xs">
                                    {activity.side}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {activity.outcome}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {activity.size.toFixed(0)} shares @ {formatCurrency(activity.price)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {formatCurrency(activity.usdcSize)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(activity.timestamp * 1000).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  )
} 