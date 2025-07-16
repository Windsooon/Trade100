"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  TrendingUp, 
  Wallet, 
  Brain, 
  AlertTriangle, 
  Eye, 
  EyeOff,
  Loader2,
  Settings
} from 'lucide-react'
import { Market } from '@/lib/stores'

interface OperationsCardProps {
  selectedMarket: Market | null
  selectedToken: 'yes' | 'no'
  onTokenChange: (token: 'yes' | 'no') => void
}

export function OperationsCard({ selectedMarket, selectedToken, onTokenChange }: OperationsCardProps) {
  // Trading tab state
  const [privateKey, setPrivateKey] = useState('')
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [price, setPrice] = useState('')
  const [shares, setShares] = useState('')
  
  // Position tab state
  const [walletAddress, setWalletAddress] = useState('')
  const [positionLoading, setPositionLoading] = useState(false)
  
  // AI Analyze tab state
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  const handleTrade = () => {
    // Placeholder for future trading functionality
  }

  const handleLoadPosition = () => {
    if (!walletAddress) return
    setPositionLoading(true)
    // Simulate loading
    setTimeout(() => setPositionLoading(false), 2000)
  }

  const handleAnalyze = () => {
    if (!geminiApiKey) return
    setAnalysisLoading(true)
    // Simulate loading
    setTimeout(() => setAnalysisLoading(false), 3000)
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-2 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Operations</span>
          <span className="sm:hidden">Ops</span>
          <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        <Tabs defaultValue="trading" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 bg-transparent h-8">
            <TabsTrigger value="trading" className="flex items-center gap-1 text-xs py-1">
              <TrendingUp className="h-3 w-3" />
              <span className="hidden sm:inline">Trading</span>
              <span className="sm:hidden">Trade</span>
            </TabsTrigger>
            <TabsTrigger value="position" className="flex items-center gap-1 text-xs py-1">
              <Wallet className="h-3 w-3" />
              <span className="hidden sm:inline">Position</span>
              <span className="sm:hidden">Pos</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1 text-xs py-1">
              <Brain className="h-3 w-3" />
              <span className="hidden sm:inline">AI Analyze</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
          </TabsList>

          {/* Trading Tab */}
          <TabsContent value="trading" className="space-y-3 mt-3 flex-1">
            {/* Private Key Input */}
            <div className="space-y-1">
              <Label htmlFor="private-key" className="text-xs">Private Key</Label>
              <div className="relative">
                <Input
                  id="private-key"
                  type={showPrivateKey ? "text" : "password"}
                  placeholder="Enter private key"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  className="text-xs h-8"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-8 px-2 hover:bg-transparent"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <Alert className="py-1">
                <AlertTriangle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  Keep your private key safe! Never share it with anyone.
                </AlertDescription>
              </Alert>
            </div>

            {privateKey ? (
              <>
                {/* Token Selection */}
                <div className="space-y-1">
                  <Label className="text-xs">Token</Label>
                  <div className="grid grid-cols-2 gap-1">
                    <Button 
                      variant={selectedToken === 'yes' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onTokenChange('yes')}
                      className="h-7 text-xs"
                    >
                      YES
                    </Button>
                    <Button 
                      variant={selectedToken === 'no' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onTokenChange('no')}
                      className="h-7 text-xs"
                    >
                      NO
                    </Button>
                  </div>
                </div>

                {/* Order Type and Inputs */}
                <div className="space-y-1">
                  <Label className="text-xs">Order Type</Label>
                  <Tabs value={orderType} onValueChange={(value) => setOrderType(value as 'market' | 'limit')}>
                    <TabsList className="grid w-full grid-cols-2 bg-transparent h-7">
                      <TabsTrigger value="market" className="text-xs">Market</TabsTrigger>
                      <TabsTrigger value="limit" className="text-xs">Limit</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="market" className="space-y-2 mt-2">
                      <div className="space-y-1">
                        <Label htmlFor="market-shares" className="text-xs">Shares</Label>
                        <Input
                          id="market-shares"
                          type="number"
                          placeholder="Enter shares"
                          value={shares}
                          onChange={(e) => setShares(e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="limit" className="space-y-2 mt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="limit-price" className="text-xs">Price</Label>
                        <Input
                          id="limit-price"
                          type="number"
                          step="0.0001"
                          placeholder="0.5000"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                            className="text-xs h-8"
                        />
                      </div>
                        <div className="space-y-1">
                          <Label htmlFor="limit-shares" className="text-xs">Shares</Label>
                        <Input
                          id="limit-shares"
                          type="number"
                            placeholder="Shares"
                          value={shares}
                          onChange={(e) => setShares(e.target.value)}
                            className="text-xs h-8"
                        />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Buy/Sell Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                    onClick={handleTrade}
                    disabled={!shares || (orderType === 'limit' && !price)}
                  >
                    Buy {selectedToken.toUpperCase()}
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleTrade}
                    disabled={!shares || (orderType === 'limit' && !price)}
                    className="h-7 text-xs"
                  >
                    Sell {selectedToken.toUpperCase()}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Enter your private key to start trading</p>
              </div>
            )}
          </TabsContent>

          {/* Position Tab */}
          <TabsContent value="position" className="space-y-3 mt-3 flex-1">
            <div className="space-y-1">
              <Label htmlFor="wallet-address" className="text-xs">Wallet Address</Label>
              <Input
                id="wallet-address"
                placeholder="0x..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            {walletAddress ? (
              <>
                <Button 
                  onClick={handleLoadPosition}
                  disabled={positionLoading}
                  className="w-full h-7 text-xs"
                >
                  {positionLoading ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load Position'
                  )}
                </Button>

                {positionLoading ? (
                  <div className="text-center py-2">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Fetching positions...</p>
                  </div>
                ) : (
                  <div className="border rounded-lg p-2 bg-muted/50">
                    <p className="text-xs text-muted-foreground text-center">
                      Position data will be displayed here once loaded
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Enter wallet address to view positions</p>
              </div>
            )}
          </TabsContent>

          {/* AI Analyze Tab */}
          <TabsContent value="ai" className="space-y-3 mt-3 flex-1">
            <div className="space-y-1">
              <Label htmlFor="gemini-key" className="text-xs">Gemini API Key</Label>
              <div className="relative">
                <Input
                  id="gemini-key"
                  type={showGeminiKey ? "text" : "password"}
                  placeholder="Enter Gemini API key"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="text-xs h-8"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-8 px-2 hover:bg-transparent"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                >
                  {showGeminiKey ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </Button>
              </div>
              <Alert className="py-1">
                <AlertTriangle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  Keep your API key secure! It will be stored locally.
                </AlertDescription>
              </Alert>
            </div>

            {geminiApiKey ? (
              <>
                <Button 
                  onClick={handleAnalyze}
                  disabled={analysisLoading}
                  className="w-full h-7 text-xs"
                >
                  {analysisLoading ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Market'
                  )}
                </Button>

                {analysisLoading ? (
                  <div className="text-center py-2">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">AI is analyzing...</p>
                  </div>
                ) : (
                  <div className="border rounded-lg p-2 bg-muted/50">
                    <p className="text-xs text-muted-foreground text-center">
                      AI analysis will be displayed here
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Enter Gemini API key for AI analysis</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 