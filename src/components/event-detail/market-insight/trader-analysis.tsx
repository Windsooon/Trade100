import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, Users } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TraderAnalysisProps } from './types'
import { HolderCard } from './holder-card'

// Trader Analysis Component
export function TraderAnalysis({ selectedMarket }: TraderAnalysisProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [holdersData, setHoldersData] = useState<any>(null)
  
  // Component instance ID to track if we get multiple instances
  const instanceId = useRef(Math.random().toString(36).substr(2, 9))
  
  // Enhanced duplicate prevention using a global registry
  const activeRequestsRef = useRef<Set<string>>(new Set())

  // Fetch holders data
  const fetchHolders = useCallback(async () => {
    if (!selectedMarket?.conditionId) {
      setError('No market selected')
      return
    }

    const conditionId = selectedMarket.conditionId

    // Check if this exact request is already active (StrictMode protection)
    if (activeRequestsRef.current.has(conditionId)) {
      return
    }

    // Mark this request as active immediately
    activeRequestsRef.current.add(conditionId)
    setLoading(true)
    setError(null)

    try {
      const url = `/api/holders?market=${encodeURIComponent(selectedMarket.conditionId)}&limit=10`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch holders: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch holders')
      }

      setHoldersData(data.data)
    } catch (err) {
      console.error('Holders fetch error:', err)
      setError('Failed to load traders data')
    } finally {
      // Always clean up the active request marker
      activeRequestsRef.current.delete(conditionId)
      setLoading(false)
    }
  }, [selectedMarket?.conditionId])

  // Fetch data when market changes
  useEffect(() => {
    if (selectedMarket?.conditionId) {
      // Use a small delay to handle StrictMode double execution
      const timeoutId = setTimeout(() => {
        fetchHolders()
      }, 10) // 10ms delay to let StrictMode settle
      
      return () => {
        clearTimeout(timeoutId)
      }
    } else {
      // Clear all active requests and reset state when no market selected
      activeRequestsRef.current.clear()
      setHoldersData(null)
      setError(null)
    }
  }, [selectedMarket?.conditionId, fetchHolders])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRequestsRef.current.clear()
    }
  }, [])

  const formatShares = (amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`
    }
    return amount.toFixed(0)
  }

  const getDefaultAvatar = (name: string): string => {
    const initials = name ? name.slice(0, 2).toUpperCase() : '?'
    return `data:image/svg+xml,${encodeURIComponent(`
      <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" fill="#e5e7eb"/>
        <text x="20" y="26" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="14" font-weight="600">${initials}</text>
      </svg>
    `)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" style={{ minHeight: '500px' }}>
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading top traders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12" style={{ minHeight: '500px' }}>
        <div className="text-center space-y-4">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!holdersData) {
    return (
      <div className="flex items-center justify-center py-12" style={{ minHeight: '500px' }}>
        <div className="text-center space-y-4">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No market selected</p>
        </div>
      </div>
    )
  }

  // Extract YES and NO holders data and filter out holders with empty names
  const yesHolders = holdersData && holdersData.length > 0 
    ? (holdersData[0]?.holders || []).filter((holder: any) => holder.name && holder.name.trim() !== '')
    : []
  const noHolders = holdersData && holdersData.length > 1 
    ? (holdersData[1]?.holders || []).filter((holder: any) => holder.name && holder.name.trim() !== '')
    : []

  return (
    <div className="space-y-6" style={{ minHeight: '500px' }}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium">Top Holders</h3>
      </div>

      {/* Nested Tabs for YES/NO Token Holders */}
      <Tabs defaultValue="yes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-transparent">
          <TabsTrigger value="yes" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>YES Token Holders</span>
          </TabsTrigger>
          <TabsTrigger value="no" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>NO Token Holders</span>
          </TabsTrigger>
        </TabsList>

        {/* YES Token Holders Tab */}
        <TabsContent value="yes" className="mt-6">
          <div className="space-y-3">
            {yesHolders.length > 0 ? (
              yesHolders.map((holder: any, holderIndex: number) => (
                <HolderCard 
                  key={`yes-${holderIndex}`} 
                  holder={holder} 
                  selectedMarket={selectedMarket}
                  formatShares={formatShares}
                  getDefaultAvatar={getDefaultAvatar}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No YES token holders data available</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* NO Token Holders Tab */}
        <TabsContent value="no" className="mt-6">
          <div className="space-y-3">
            {noHolders.length > 0 ? (
              noHolders.map((holder: any, holderIndex: number) => (
                <HolderCard 
                  key={`no-${holderIndex}`} 
                  holder={holder} 
                  selectedMarket={selectedMarket}
                  formatShares={formatShares}
                  getDefaultAvatar={getDefaultAvatar}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No NO token holders data available</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 