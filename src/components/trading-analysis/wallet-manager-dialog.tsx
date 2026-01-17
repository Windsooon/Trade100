"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useWalletManager } from "@/hooks/use-wallet-manager"
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { truncateWalletAddress } from "@/lib/utils"

export function WalletManagerDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [newAddress, setNewAddress] = React.useState("")
  const [newAlias, setNewAlias] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const { wallets, addWallet, removeWallet, updateWallet } = useWalletManager()

  const handleAddWallet = async () => {
    setError(null)
    setSuccess(null)

    const trimmedAddress = newAddress.trim()
    if (!trimmedAddress) {
      setError("Please enter a wallet address")
      return
    }

    // 检查是否已存在（不区分大小写）
    const normalizedAddress = trimmedAddress.toLowerCase()
    const exists = wallets.some(w => w.address.toLowerCase() === normalizedAddress)
    if (exists) {
      setError("Wallet address already exists")
      return
    }

    try {
      addWallet(trimmedAddress, newAlias.trim() || undefined)
      setNewAddress("")
      setNewAlias("")
      setSuccess("Wallet added successfully")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add wallet"
      setError(errorMessage)
      console.error('Error adding wallet:', err)
    }
  }

  const handleRemoveWallet = (address: string) => {
    try {
      removeWallet(address)
      setSuccess("Wallet removed successfully")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove wallet")
    }
  }

  const handleToggleEnabled = (address: string, enabled: boolean) => {
    try {
      updateWallet(address, { enabled: !enabled })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update wallet")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Wallets</DialogTitle>
          <DialogDescription>
            Add and manage multiple wallet addresses for aggregated analysis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new wallet */}
          <div className="space-y-2">
            <Label htmlFor="address">Wallet Address</Label>
            <Input
              id="address"
              placeholder="0x..."
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
            />
            <Label htmlFor="alias">Alias (Optional)</Label>
            <Input
              id="alias"
              placeholder="My Main Wallet"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
            />
            <Button onClick={handleAddWallet} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Wallet
            </Button>
          </div>

          {/* Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Wallet list */}
          <div className="space-y-2">
            <Label>Wallets ({wallets.length})</Label>
            <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
              {wallets.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No wallets added yet. Add a wallet address above to get started.
                </div>
              ) : (
                wallets.map((wallet) => (
                  <div key={wallet.address} className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {wallet.alias || truncateWalletAddress(wallet.address)}
                        </span>
                        {wallet.alias && (
                          <Badge variant="outline" className="text-xs">
                            {truncateWalletAddress(wallet.address)}
                          </Badge>
                        )}
                      </div>
                      {wallet.alias && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {wallet.address}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`enabled-${wallet.address}`}
                          checked={wallet.enabled}
                          onCheckedChange={() => handleToggleEnabled(wallet.address, wallet.enabled)}
                        />
                        <Label htmlFor={`enabled-${wallet.address}`} className="text-xs cursor-pointer">
                          Enabled
                        </Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveWallet(wallet.address)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
