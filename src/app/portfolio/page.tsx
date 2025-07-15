"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Navbar } from '@/components/ui/navbar'
import { Footer } from '@/components/ui/footer'
import { WalletSetupGuide } from '@/components/ui/wallet-setup-guide'
import { useWalletAddress } from '@/hooks/use-wallet-address'
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ActivitySection } from "@/components/ui/activity-section"
import { ActivityItem } from "@/app/api/portfolio/activity/route"
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
import { TrendingUp, TrendingDown, Wallet, DollarSign, ChevronDown, ChevronRight, AlertCircle } from "lucide-react"
import { 
  PortfolioData, 
  ChartDataPoint, 
  calculateSingleDayPnL, 
  formatCurrency, 
  getLatestPnL 
} from '@/lib/portfolio-utils'





const chartConfig = {
  accumulativePnL: {
    label: "Accumulative P/L",
    color: "var(--chart-1)",
  },
  singleDayPnL: {
    label: "Single Day P/L",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export default function PortfolioPage() {
  const { walletAddress, hasWalletAddress, isLoading, refetchWalletAddress } = useWalletAddress()
  const [portfolioData, setPortfolioData] = React.useState<PortfolioData | null>(null)
  const [chartData, setChartData] = React.useState<ChartDataPoint[]>([])
  const [isLoadingData, setIsLoadingData] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [chartMode, setChartMode] = React.useState<'accumulative' | 'singleDay'>('accumulative')
  
  // Activity state
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null)
  const [activityData, setActivityData] = React.useState<ActivityItem[]>([])
  const [isLoadingActivity, setIsLoadingActivity] = React.useState(false)
  const [activityError, setActivityError] = React.useState<string | null>(null)
  const [activityGroupingMode, setActivityGroupingMode] = React.useState<'timestamp' | 'event'>('timestamp')
  const [activitySortBy, setActivitySortBy] = React.useState<'TIMESTAMP' | 'TOKENS' | 'CASH'>('TIMESTAMP')
  const [activitySortDirection, setActivitySortDirection] = React.useState<'ASC' | 'DESC'>('DESC')

  // Fetch portfolio data
  const fetchPortfolioData = React.useCallback(async () => {
    if (!walletAddress) return

    setIsLoadingData(true)
    setError(null)

    try {
      const apiUrl = `/api/portfolio/data?user=${walletAddress}`
      
      const response = await fetch(apiUrl)
      
      const data: PortfolioData = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch portfolio data')
      }

      setPortfolioData(data)
      
      // Process chart data
      const processedChartData = calculateSingleDayPnL(data.pnlData)
      setChartData(processedChartData)

    } catch (err) {
      console.error('Client fetch error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setPortfolioData(null)
      setChartData([])
    } finally {
      setIsLoadingData(false)
    }
  }, [walletAddress])

  // Fetch data when wallet address changes
  React.useEffect(() => {
    if (hasWalletAddress && walletAddress) {
      fetchPortfolioData()
    }
  }, [hasWalletAddress, walletAddress, fetchPortfolioData])

  // Fetch activity data for selected date
  const fetchActivityData = React.useCallback(async (date: string) => {
    if (!walletAddress) return

    setIsLoadingActivity(true)
    setActivityError(null)

    try {
      // Calculate start and end timestamps for the day in UTC
      const selectedDate = new Date(date)
      const startOfDay = new Date(selectedDate)
      startOfDay.setUTCHours(0, 0, 0, 0)
      const endOfDay = new Date(selectedDate)
      endOfDay.setUTCHours(23, 59, 59, 999)

      const startTimestamp = Math.floor(startOfDay.getTime() / 1000)
      const endTimestamp = Math.floor(endOfDay.getTime() / 1000)

      const params = new URLSearchParams({
        user: walletAddress,
        start: startTimestamp.toString(),
        end: endTimestamp.toString(),
        limit: '200',
        sortBy: activitySortBy,
        sortDirection: activitySortDirection
      })

      const response = await fetch(`/api/portfolio/activity?${params.toString()}`)
      
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch activity data')
      }

      setActivityData(data.activities || [])

    } catch (err) {
      console.error('Activity fetch error:', err)
      setActivityError(err instanceof Error ? err.message : 'An error occurred')
      setActivityData([])
    } finally {
      setIsLoadingActivity(false)
    }
  }, [walletAddress, activitySortBy, activitySortDirection])

  // Load today's activity by default when wallet address is available
  React.useEffect(() => {
    if (hasWalletAddress && walletAddress && !selectedDate) {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      setSelectedDate(today)
      fetchActivityData(today)
    }
  }, [hasWalletAddress, walletAddress, selectedDate, fetchActivityData])

  // Handle chart click
  const handleChartClick = (data: any) => {
    if (data && data.activeLabel) {
      const clickedDate = data.activeLabel
      setSelectedDate(clickedDate)
      fetchActivityData(clickedDate)
    }
  }

  // Handle activity sorting changes
  React.useEffect(() => {
    if (selectedDate) {
      fetchActivityData(selectedDate)
    }
  }, [selectedDate, fetchActivityData])

  // Get current stats
  const positionValue = portfolioData?.positionValue || 0
  const latestPnL = portfolioData ? getLatestPnL(portfolioData.pnlData) : 0

  // Get chart data based on current mode
  const getChartData = () => {
    return chartData.map(point => ({
      ...point,
      value: chartMode === 'accumulative' ? point.accumulativePnL : point.singleDayPnL
    }))
  }

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
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoadingData && (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading portfolio data...</div>
          </div>
        )}

        {/* Portfolio Content */}
        {!isLoadingData && !error && portfolioData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Position Value
                  </CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(positionValue)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total P/L
                  </CardTitle>
                  {latestPnL >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${latestPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(latestPnL)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card className="pt-0">
              <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1">
                  <CardTitle>P/L Chart</CardTitle>
                  <CardDescription>
                    Showing your P/L performance over time
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 border rounded-lg p-1">
                    <Button
                      variant={chartMode === 'accumulative' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setChartMode('accumulative')}
                      className="h-7 px-3 text-xs"
                    >
                      Accumulative P/L
                    </Button>
                    <Button
                      variant={chartMode === 'singleDay' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setChartMode('singleDay')}
                      className="h-7 px-3 text-xs"
                    >
                      Single Day P/L
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer
                  config={chartConfig}
                  className="aspect-auto h-[250px] w-full"
                >
                  <AreaChart data={getChartData()} onClick={handleChartClick}>
                    <defs>
                      <linearGradient id="fillPnL" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={chartMode === 'accumulative' ? "var(--color-accumulativePnL)" : "var(--color-singleDayPnL)"}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={chartMode === 'accumulative' ? "var(--color-accumulativePnL)" : "var(--color-singleDayPnL)"}
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
                      minTickGap={15}
                      interval={Math.max(0, Math.floor(getChartData().length / 8))}
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
                          formatter={(value, name, item) => {
                            const point = item.payload as ChartDataPoint
                            if (point?.hasNote && chartMode === 'singleDay') {
                              return [point.note, '']
                            }
                            return [
                              formatCurrency(value as number),
                              '' // Remove the label text
                            ]
                          }}
                        />
                      }
                    />
                    <Area
                      dataKey="value"
                      type="natural"
                      fill="url(#fillPnL)"
                      stroke={chartMode === 'accumulative' ? "var(--color-accumulativePnL)" : "var(--color-singleDayPnL)"}
                      stackId="a"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Activity Section */}
            <ActivitySection
              activities={activityData}
              selectedDate={selectedDate}
              isLoading={isLoadingActivity}
              error={activityError}
              groupingMode={activityGroupingMode}
              sortBy={activitySortBy}
              sortDirection={activitySortDirection}
              onGroupingModeChange={setActivityGroupingMode}
              onSortByChange={setActivitySortBy}
              onSortDirectionChange={setActivitySortDirection}
            />
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}

 