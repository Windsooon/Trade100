import { Info } from 'lucide-react'
import { InfoTabProps } from './types'

// Info Tab Component
export function InfoTab({ selectedMarket }: InfoTabProps) {
  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  return (
    <div style={{ minHeight: '500px' }}>
      {selectedMarket ? (
        <div className="space-y-6">
          {/* Market Question */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Market Question</h3>
            <p className="text-sm text-foreground leading-relaxed">{selectedMarket.question}</p>
          </div>

          {/* Market Description */}
          {selectedMarket.description && (
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Description</h3>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {selectedMarket.description}
              </div>
            </div>
          )}
          
          {/* Date Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Start Date</h3>
              <p className="text-sm text-muted-foreground">
                {selectedMarket.startDate ? formatDate(selectedMarket.startDate) : 'N/A'}
              </p>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium">End Date</h3>
              <p className="text-sm text-muted-foreground">
                {selectedMarket.endDate ? formatDate(selectedMarket.endDate) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Additional Market Details */}
          {(selectedMarket.liquidity || selectedMarket.volume24hr) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedMarket.liquidity && (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Liquidity</h3>
                  <p className="text-sm text-muted-foreground">
                    ${parseFloat(selectedMarket.liquidity.toString()).toLocaleString()}
                  </p>
                </div>
              )}
              
              {selectedMarket.volume24hr && (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">24h Volume</h3>
                  <p className="text-sm text-muted-foreground">
                    ${selectedMarket.volume24hr.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No market selected</p>
        </div>
      )}
    </div>
  )
} 