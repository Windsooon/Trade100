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
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          <span className="hidden sm:inline">Operations</span>
          <span className="sm:hidden">Ops</span>
          <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="trading" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-transparent">
            <TabsTrigger value="trading" className="flex items-center gap-1 sm:gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Trading</span>
              <span className="sm:hidden">Trade</span>
              <Badge variant="outline" className="ml-1 text-xs hidden sm:inline">Soon</Badge>
            </TabsTrigger>
            <TabsTrigger value="position" className="flex items-center gap-1 sm:gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Position</span>
              <span className="sm:hidden">Pos</span>
              <Badge variant="outline" className="ml-1 text-xs hidden sm:inline">Soon</Badge>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1 sm:gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">AI Analyze</span>
              <span className="sm:hidden">AI</span>
              <Badge variant="outline" className="ml-1 text-xs hidden sm:inline">Soon</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Trading Tab */}
          <TabsContent value="trading" className="space-y-4 mt-4 sm:mt-6">
            {/* Private Key Input */}
            <div className="space-y-2">
              <Label htmlFor="private-key">Private Key</Label>
              <div className="relative">
                <Input
                  id="private-key"
                  type={showPrivateKey ? "text" : "password"}
                  placeholder="Enter private key"
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Keep your private key safe! Never share it with anyone. It will be stored locally on your device.
                </AlertDescription>
              </Alert>
            </div>

            {privateKey ? (
              <>
                {/* Token Selection */}
                <div className="space-y-2">
                  <Label>Token</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant={selectedToken === 'yes' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onTokenChange('yes')}
                    >
                      YES
                    </Button>
                    <Button 
                      variant={selectedToken === 'no' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onTokenChange('no')}
                    >
                      NO
                    </Button>
                  </div>
                </div>

                {/* Order Type Nested Tabs */}
                <div className="space-y-2">
                  <Label>Order Type</Label>
                  <Tabs value={orderType} onValueChange={(value) => setOrderType(value as 'market' | 'limit')}>
                    <TabsList className="grid w-full grid-cols-2 bg-transparent">
                      <TabsTrigger value="market">Market</TabsTrigger>
                      <TabsTrigger value="limit">Limit</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="market" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="market-shares">Shares</Label>
                        <Input
                          id="market-shares"
                          type="number"
                          placeholder="Enter number of shares"
                          value={shares}
                          onChange={(e) => setShares(e.target.value)}
                        />
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="limit" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="limit-price">Price</Label>
                        <Input
                          id="limit-price"
                          type="number"
                          step="0.0001"
                          placeholder="0.5000"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="limit-shares">Shares</Label>
                        <Input
                          id="limit-shares"
                          type="number"
                          placeholder="Enter number of shares"
                          value={shares}
                          onChange={(e) => setShares(e.target.value)}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                <Separator />

                {/* Buy/Sell Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleTrade}
                    disabled={!shares || (orderType === 'limit' && !price)}
                  >
                    Buy {selectedToken.toUpperCase()}
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleTrade}
                    disabled={!shares || (orderType === 'limit' && !price)}
                  >
                    Sell {selectedToken.toUpperCase()}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter your private key to start trading</p>
              </div>
            )}
          </TabsContent>

          {/* Position Tab */}
          <TabsContent value="position" className="space-y-4 mt-4 sm:mt-6">
            <div className="space-y-2">
              <Label htmlFor="wallet-address">Wallet Address</Label>
              <Input
                id="wallet-address"
                placeholder="0x..."
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
            </div>

            {walletAddress ? (
              <>
                <Button 
                  onClick={handleLoadPosition}
                  disabled={positionLoading}
                  className="w-full"
                >
                  {positionLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading Position...
                    </>
                  ) : (
                    'Load Position'
                  )}
                </Button>

                {positionLoading && (
                  <div className="text-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Fetching your positions...</p>
                  </div>
                )}

                {!positionLoading && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground text-center">
                      Position data will be displayed here once loaded
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter your wallet address to view positions</p>
              </div>
            )}
          </TabsContent>

          {/* AI Analyze Tab */}
          <TabsContent value="ai" className="space-y-4 mt-4 sm:mt-6">
            <div className="space-y-2">
              <Label htmlFor="gemini-key">Gemini API Key</Label>
              <div className="relative">
                <Input
                  id="gemini-key"
                  type={showGeminiKey ? "text" : "password"}
                  placeholder="Enter Gemini API key"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                >
                  {showGeminiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Keep your API key secure! It will be stored locally on your device and never shared.
                </AlertDescription>
              </Alert>
            </div>

            {geminiApiKey ? (
              <>
                <Button 
                  onClick={handleAnalyze}
                  disabled={analysisLoading}
                  className="w-full"
                >
                  {analysisLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Market'
                  )}
                </Button>

                {analysisLoading && (
                  <div className="text-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">AI is analyzing the market...</p>
                  </div>
                )}

                {!analysisLoading && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground text-center">
                      AI analysis will be displayed here once generated
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter your Gemini API key to get AI analysis</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 