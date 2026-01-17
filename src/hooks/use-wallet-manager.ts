"use client"

import { useState, useEffect, useCallback } from 'react'
import { walletManager, WalletConfig } from '@/lib/wallet-manager'

/**
 * React Hook 封装钱包管理器
 * 提供响应式状态管理和自动同步 localStorage
 */
export function useWalletManager() {
  const [wallets, setWallets] = useState<WalletConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 加载钱包列表
  const loadWallets = useCallback(() => {
    try {
      const loadedWallets = walletManager.getWallets()
      setWallets(loadedWallets)
    } catch (error) {
      console.error('Error loading wallets:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初始化加载
  useEffect(() => {
    loadWallets()
  }, [loadWallets])

  // 监听 localStorage 变化（跨标签页同步）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wallet_addresses') {
        loadWallets()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [loadWallets])

  // 添加钱包
  const addWallet = useCallback((address: string, alias?: string) => {
    try {
      walletManager.addWallet(address, alias)
      loadWallets()
      // 触发自定义事件，通知其他组件钱包列表已更新
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wallets-updated'))
      }
    } catch (error) {
      console.error('Error adding wallet:', error)
      throw error
    }
  }, [loadWallets])

  // 删除钱包
  const removeWallet = useCallback((address: string) => {
    try {
      walletManager.removeWallet(address)
      loadWallets()
      // 触发自定义事件，通知其他组件钱包列表已更新
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wallets-updated'))
      }
    } catch (error) {
      console.error('Error removing wallet:', error)
      throw error
    }
  }, [loadWallets])

  // 更新钱包
  const updateWallet = useCallback((address: string, updates: Partial<WalletConfig>) => {
    try {
      walletManager.updateWallet(address, updates)
      loadWallets()
      // 触发自定义事件，通知其他组件钱包列表已更新
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wallets-updated'))
      }
    } catch (error) {
      console.error('Error updating wallet:', error)
      throw error
    }
  }, [loadWallets])

  // 获取启用的钱包地址列表
  const getEnabledWallets = useCallback(() => {
    return walletManager.getEnabledWallets()
  }, [])

  return {
    wallets,
    isLoading,
    addWallet,
    removeWallet,
    updateWallet,
    getEnabledWallets,
    refresh: loadWallets,
  }
}
