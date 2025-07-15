"use client"

import { useState, useEffect } from "react"

export function useWalletAddress() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check localStorage for wallet address
    const checkWalletAddress = () => {
      try {
        const savedAddress = localStorage.getItem("polymarket_wallet_address")
        if (savedAddress && savedAddress.trim() !== "") {
          setWalletAddress(savedAddress.trim())
        } else {
          setWalletAddress(null)
        }
      } catch (error) {
        console.error("Error reading wallet address from localStorage:", error)
        setWalletAddress(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkWalletAddress()

    // Listen for storage changes (when user updates settings)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "polymarket_wallet_address") {
        checkWalletAddress()
      }
    }

    window.addEventListener("storage", handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [])

  const refetchWalletAddress = () => {
    setIsLoading(true)
    const savedAddress = localStorage.getItem("polymarket_wallet_address")
    if (savedAddress && savedAddress.trim() !== "") {
      setWalletAddress(savedAddress.trim())
    } else {
      setWalletAddress(null)
    }
    setIsLoading(false)
  }

  return {
    walletAddress,
    hasWalletAddress: walletAddress !== null,
    isLoading,
    refetchWalletAddress
  }
} 