"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { Navbar } from '@/components/ui/navbar'
import { Footer } from '@/components/ui/footer'
import { BottomNavigation } from '@/components/ui/bottom-navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WalletManagerDialog } from "@/components/trading-analysis/wallet-manager-dialog"
import { MarketAnalysisTable } from "@/components/trading-analysis/market-analysis-table"
import { DatePicker } from "@/components/ui/date-picker"
import { useWalletManager } from "@/hooks/use-wallet-manager"
import { useTradingAnalysis } from "@/hooks/use-trading-analysis"
import { formatCurrency, formatPercentage } from "@/lib/portfolio-utils"
import { AlertCircle, Settings, RefreshCw, TrendingUp, TrendingDown, Wallet, BarChart3, Calendar } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function TradingAnalysisPage() {
  const renderCountRef = React.useRef(0)
  renderCountRef.current += 1
  console.log(`[TradingAnalysisPage] Render #${renderCountRef.current}`)
  
  const { wallets, getEnabledWallets, isLoading: isLoadingWallets } = useWalletManager()
  const enabledWallets = React.useMemo(() => {
    const enabled = wallets.filter(w => w.enabled).map(w => w.address)
    console.log('[TradingAnalysisPage] enabledWallets memoized:', enabled)
    return enabled
  }, [wallets])
  
  const [autoRefresh, setAutoRefresh] = React.useState(true)
  
  // Parse date from URL on mount
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const dateParam = params.get('date')
      if (dateParam) {
        try {
          const parsed = parse(dateParam, 'yyyy-MM-dd', new Date())
          console.log('[TradingAnalysisPage] Initial date from URL:', dateParam, parsed.toISOString())
          return parsed
        } catch {
          console.log('[TradingAnalysisPage] Failed to parse date from URL, using today')
        }
      }
    }
    const today = new Date()
    console.log('[TradingAnalysisPage] Initial date (today):', today.toISOString())
    return today
  })
  
  // Update date when URL changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const dateParam = params.get('date')
      if (dateParam) {
        try {
          const parsed = parse(dateParam, 'yyyy-MM-dd', new Date())
          if (parsed.getTime() !== selectedDate.getTime()) {
            console.log('[TradingAnalysisPage] Date changed from URL:', dateParam)
            setSelectedDate(parsed)
          }
        } catch (e) {
          console.error('[TradingAnalysisPage] Error parsing date from URL:', e)
        }
      }
    }
  }, [typeof window !== 'undefined' ? window.location.search : ''])
  
  console.log('[TradingAnalysisPage] Calling useTradingAnalysis with:', {
    enabledWallets,
    autoRefresh,
    selectedDate: selectedDate.toISOString(),
  })
  
  const {
    marketSummaries,
    overallStats,
    tradingBehavior,
    isLoading,
    error,
    refetch,
  } = useTradingAnalysis(enabledWallets, {
    autoRefresh,
    enabled: enabledWallets.length > 0,
    selectedDate,
  })

  // Load auto refresh setting from localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('trading_analysis_auto_refresh')
    if (saved !== null) {
      setAutoRefresh(saved === 'true')
    }
  }, [])

  // Listen for wallet updates and refetch data
  React.useEffect(() => {
    const handleWalletsUpdated = () => {
      // Trigger a refetch when wallets are updated
      if (enabledWallets.length > 0) {
        refetch()
      }
    }

    window.addEventListener('wallets-updated', handleWalletsUpdated)
    return () => window.removeEventListener('wallets-updated', handleWalletsUpdated)
  }, [enabledWallets.length, refetch])

  // Save auto refresh setting
  const handleToggleAutoRefresh = (enabled: boolean) => {
    setAutoRefresh(enabled)
    localStorage.setItem('trading_analysis_auto_refresh', String(enabled))
  }

  if (isLoadingWallets) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-32 w-full" />
        </div>
        <Footer />
        <BottomNavigation />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Trading Analysis</h1>
              <p className="text-muted-foreground mt-2">
                Analyze your trading history, performance, and market insights
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DatePicker
                date={selectedDate}
                onDateChange={(date) => date && setSelectedDate(date)}
                placeholder="Select date"
              />
              <WalletManagerDialog>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Wallets
                </Button>
              </WalletManagerDialog>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Wallet Status */}
          {enabledWallets.length === 0 ? (
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription>
                {wallets.length === 0 ? (
                  <>
                    No wallets added yet. Please add wallets to view trading analysis.
                    <WalletManagerDialog>
                      <Button variant="link" className="p-0 h-auto ml-2">
                        Add Wallet
                      </Button>
                    </WalletManagerDialog>
                  </>
                ) : (
                  <>
                    No wallets enabled. Please enable at least one wallet to view trading analysis.
                    <WalletManagerDialog>
                      <Button variant="link" className="p-0 h-auto ml-2">
                        Manage Wallets
                      </Button>
                    </WalletManagerDialog>
                  </>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Market Summaries - Using Table */}
              {error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-medium">
                        {error instanceof Error ? error.message : 'Failed to load market summaries'}
                      </div>
                      {error instanceof Error && error.message.includes('authentication required') && (
                        <div className="text-sm space-y-1">
                          <div>Dome API requires an API key to access trading data.</div>
                          <div>
                            <strong>To fix this:</strong>
                          </div>
                          <ol className="list-decimal list-inside space-y-1 ml-2">
                            <li>Get a free API key at <a href="https://dashboard.domeapi.io" target="_blank" rel="noopener noreferrer" className="underline">dashboard.domeapi.io</a></li>
                            <li>Add it to your <code className="bg-muted px-1 rounded">.env.local</code> file: <code className="bg-muted px-1 rounded">DOME_API_KEY=your_api_key_here</code></li>
                            <li>Restart the development server</li>
                          </ol>
                        </div>
                      )}
                      {error instanceof Error && !error.message.includes('authentication required') && (
                        <div className="text-xs text-muted-foreground">
                          Check browser console (F12) and server logs for more details
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex items-center justify-end mb-4">
                    <label className="text-sm text-muted-foreground flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => handleToggleAutoRefresh(e.target.checked)}
                        className="rounded"
                      />
                      Auto Refresh (100s)
                    </label>
                  </div>
                  <MarketAnalysisTable
                    summaries={marketSummaries}
                    isLoading={isLoading}
                    wallets={enabledWallets}
                    selectedDate={selectedDate}
                    totalTradeCount={overallStats?.totalTradeCount}
                    walletConfigs={wallets.filter(w => w.enabled).map(w => ({ address: w.address, alias: w.alias || w.address }))}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
      <BottomNavigation />
    </div>
  )
}
