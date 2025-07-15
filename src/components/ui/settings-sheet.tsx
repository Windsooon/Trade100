"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Settings, CheckCircle, XCircle } from "lucide-react"
import { useState, useEffect } from "react"

interface SettingsData {
  privateKey: string
  walletAddress: string
}

type SaveStatus = "success" | "error" | null

export function SettingsSheet() {
  const [settings, setSettings] = useState<SettingsData>({
    privateKey: "",
    walletAddress: ""
  })
  const [errors, setErrors] = useState<Partial<SettingsData>>({})
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null)

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedPrivateKey = localStorage.getItem("polymarket_private_key") || ""
    const savedWalletAddress = localStorage.getItem("polymarket_wallet_address") || ""
    
    setSettings({
      privateKey: savedPrivateKey,
      walletAddress: savedWalletAddress
    })
  }, [])

  // Validation functions
  const validatePrivateKey = (key: string): boolean => {
    if (!key) return true // Optional field
    // Remove 0x prefix if present for validation
    const cleanKey = key.startsWith("0x") ? key.slice(2) : key
    // Check if it's 64 hex characters
    return /^[a-fA-F0-9]{64}$/.test(cleanKey)
  }

  const validateWalletAddress = (address: string): boolean => {
    if (!address) return true // Optional field
    // Check if it's a valid Ethereum address (42 characters, starts with 0x)
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  const handleInputChange = (field: keyof SettingsData, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    
    // Clear error and save status when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
    if (saveStatus) {
      setSaveStatus(null)
    }
  }

  const handleSave = () => {
    const newErrors: Partial<SettingsData> = {}

    // Validate private key
    if (!validatePrivateKey(settings.privateKey)) {
      newErrors.privateKey = "Invalid private key format (must be 64 hex characters)"
    }

    // Validate wallet address
    if (!validateWalletAddress(settings.walletAddress)) {
      newErrors.walletAddress = "Invalid wallet address format (must start with 0x and be 42 characters)"
    }

    setErrors(newErrors)

    // If no errors, save to localStorage
    if (Object.keys(newErrors).length === 0) {
      try {
        localStorage.setItem("polymarket_private_key", settings.privateKey)
        localStorage.setItem("polymarket_wallet_address", settings.walletAddress)
        setSaveStatus("success")
      } catch (error) {
        setSaveStatus("error")
        console.error("Failed to save settings:", error)
      }
    } else {
      setSaveStatus("error")
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Configure your wallet credentials. These will be stored locally in your browser.
          </SheetDescription>
        </SheetHeader>
        
        {/* Security Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ <strong>Security Warning:</strong> Your private key and wallet address will be stored in your browser's local storage. Only enter these on trusted devices and ensure your browser is secure.
          </p>
        </div>

        {/* Save Status Alert */}
        {saveStatus && (
          <Alert variant={saveStatus === "success" ? "default" : "destructive"} className="mb-4">
            {saveStatus === "success" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {saveStatus === "success" 
                ? "Settings saved successfully!" 
                : "Failed to save settings. Please check your inputs and try again."}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid flex-1 auto-rows-min gap-6 px-4">
          <div className="grid gap-3">
            <Label htmlFor="private-key">Private Key (Optional)</Label>
            <Input
              id="private-key"
              type="password"
              placeholder="Enter your private key (optional)"
              value={settings.privateKey}
              onChange={(e) => handleInputChange("privateKey", e.target.value)}
              className={errors.privateKey ? "border-red-500" : ""}
            />
            {errors.privateKey && (
              <p className="text-sm text-red-500">{errors.privateKey}</p>
            )}
          </div>
          
          <div className="grid gap-3">
            <Label htmlFor="wallet-address">Wallet Address (Optional)</Label>
            <Input
              id="wallet-address"
              type="password"
              placeholder="0x... (optional)"
              value={settings.walletAddress}
              onChange={(e) => handleInputChange("walletAddress", e.target.value)}
              className={errors.walletAddress ? "border-red-500" : ""}
            />
            {errors.walletAddress && (
              <p className="text-sm text-red-500">{errors.walletAddress}</p>
            )}
          </div>
        </div>
        
        <SheetFooter>
          <Button onClick={handleSave}>Save Settings</Button>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
} 