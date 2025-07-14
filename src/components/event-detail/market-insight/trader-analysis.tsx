import { useState, useEffect, useCallback } from 'react'
import { Loader2, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TraderAnalysisProps } from './types'
import { HolderCard } from './holder-card'

// Trader Analysis Component
export function TraderAnalysis({ selectedMarket }: TraderAnalysisProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [holdersData, setHoldersData] = useState<any>(null)

  // Fetch holders data
  const fetchHolders = useCallback(async () => {
    if (!selectedMarket?.conditionId) {
      setError('No market selected')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/holders?market=${encodeURIComponent(selectedMarket.conditionId)}&limit=10`)
      
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
      setLoading(false)
    }
  }, [selectedMarket?.conditionId])

  // Fetch data when market changes
  useEffect(() => {
    if (selectedMarket?.conditionId) {
      fetchHolders()
    } else {
      setHoldersData(null)
      setError(null)
    }
  }, [selectedMarket?.conditionId, fetchHolders])

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

  return (
    <div className="space-y-6" style={{ minHeight: '500px' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Top Holders</h3>
          <p className="text-sm text-muted-foreground">Leading traders in this market</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {holdersData?.length || 0} holders
        </Badge>
      </div>

      {/* Holders List */}
      <div className="space-y-3">
        {holdersData && holdersData.length > 0 ? (
          holdersData.map((tokenData: any, tokenIndex: number) => (
            <div key={tokenIndex} className="space-y-3">
              {/* Token Header */}
              <div className="text-sm font-medium text-muted-foreground border-b pb-2">
                {tokenIndex === 0 ? 'YES Token Holders' : 'NO Token Holders'}
              </div>
              
              {/* Holders for this token */}
              {tokenData.holders && tokenData.holders.map((holder: any, holderIndex: number) => (
                <HolderCard 
                  key={`${tokenIndex}-${holderIndex}`} 
                  holder={holder} 
                  selectedMarket={selectedMarket}
                  formatShares={formatShares}
                  getDefaultAvatar={getDefaultAvatar}
                />
              ))}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No holders data available</p>
          </div>
        )}
      </div>
    </div>
  )
} 