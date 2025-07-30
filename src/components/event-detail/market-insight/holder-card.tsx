import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { HolderCardProps } from './types'
import { TradeHistoryDialog } from './trade-history-dialog'

// Holder Card Component
export function HolderCard({ 
  holder, 
  selectedMarket,
  selectedToken,
  formatShares, 
  getDefaultAvatar 
}: HolderCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-center justify-between">
        {/* Left side - User info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {holder.profileImage ? (
              <img
                src={holder.profileImage}
                alt={`${holder.name || 'User'} profile`}
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = getDefaultAvatar(holder.name || 'User')
                }}
              />
            ) : (
              <img
                src={getDefaultAvatar(holder.name || 'User')}
                alt={`${holder.name || 'User'} profile`}
                className="w-10 h-10 rounded-full"
              />
            )}
          </div>
          
          {/* User details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {holder.displayUsernamePublic && holder.name ? (
                <span className="font-medium text-sm">{holder.name}</span>
              ) : (
                <span className="font-medium text-sm">Anonymous User</span>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground mt-1">
              {holder.proxyWallet.slice(0, 6)}...{holder.proxyWallet.slice(-4)}
            </div>
          </div>
        </div>
        
        {/* Right side - Amount and trade history button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-sm font-medium">
              {formatShares(holder.amount)} shares
            </div>
            <div className="text-xs text-muted-foreground">
              {holder.outcomeIndex === 0 ? 'YES' : 'NO'} position
            </div>
          </div>
          
          {/* Trade History Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                Trade History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Trade History - {holder.displayUsernamePublic && holder.name ? holder.name : 'Anonymous User'}
                </DialogTitle>
                <DialogDescription>
                  Trading activity and price chart for {selectedMarket?.question}
                </DialogDescription>
              </DialogHeader>
              
              <TradeHistoryDialog 
                holder={holder} 
                selectedMarket={selectedMarket}
                selectedToken={selectedToken}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
} 