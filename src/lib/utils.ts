import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Truncates a wallet address to show first 6 and last 4 characters
 * e.g., "0x3B1F15f55716197399247392A280DEEE45806500" -> "0x3B1F...6500"
 */
export function truncateWalletAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
