import { isValidEthereumAddress } from './utils'

/**
 * 钱包地址配置
 */
export interface WalletConfig {
  address: string                  // Ethereum地址
  alias?: string                  // 用户设置的别名
  enabled: boolean                // 是否启用
  createdAt: number               // 创建时间戳
}

/**
 * 钱包管理器接口
 */
export interface IWalletManager {
  /**
   * 获取所有钱包配置
   */
  getWallets(): WalletConfig[]
  
  /**
   * 获取启用的钱包地址列表
   */
  getEnabledWallets(): string[]
  
  /**
   * 添加钱包地址
   */
  addWallet(address: string, alias?: string): void
  
  /**
   * 删除钱包地址
   */
  removeWallet(address: string): void
  
  /**
   * 更新钱包配置
   */
  updateWallet(address: string, updates: Partial<WalletConfig>): void
  
  /**
   * 验证Ethereum地址格式
   */
  validateAddress(address: string): boolean
}

/**
 * 钱包管理器实现
 * 使用 localStorage 持久化钱包配置
 */
export class WalletManager implements IWalletManager {
  private readonly STORAGE_KEY = 'wallet_addresses'

  /**
   * 获取所有钱包配置
   * 从 localStorage 加载已保存的钱包配置
   */
  getWallets(): WalletConfig[] {
    if (typeof window === 'undefined') {
      return []
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) {
        return []
      }
      const wallets = JSON.parse(stored) as WalletConfig[]
      console.log(`[WalletManager] Loaded ${wallets.length} wallet(s) from localStorage`)
      return wallets
    } catch (error) {
      console.error('Error reading wallets from localStorage:', error)
      return []
    }
  }

  /**
   * 获取启用的钱包地址列表
   */
  getEnabledWallets(): string[] {
    return this.getWallets()
      .filter(wallet => wallet.enabled)
      .map(wallet => wallet.address)
  }

  /**
   * 添加钱包地址
   */
  addWallet(address: string, alias?: string): void {
    const trimmedAddress = address.trim()
    
    if (!this.validateAddress(trimmedAddress)) {
      throw new Error('Invalid Ethereum address format')
    }

    const wallets = this.getWallets()
    const normalizedAddress = trimmedAddress.toLowerCase()
    
    // 检查是否已存在（不区分大小写）
    if (wallets.some(w => w.address.toLowerCase() === normalizedAddress)) {
      throw new Error('Wallet address already exists')
    }

    // 添加新钱包
    const newWallet: WalletConfig = {
      address: normalizedAddress,
      alias: alias?.trim() || undefined,
      enabled: true,
      createdAt: Date.now(),
    }

    wallets.push(newWallet)
    this.saveWallets(wallets)
  }

  /**
   * 删除钱包地址
   */
  removeWallet(address: string): void {
    const wallets = this.getWallets()
    const filtered = wallets.filter(
      w => w.address.toLowerCase() !== address.toLowerCase()
    )
    
    if (filtered.length === wallets.length) {
      throw new Error('Wallet address not found')
    }

    this.saveWallets(filtered)
  }

  /**
   * 更新钱包配置
   */
  updateWallet(address: string, updates: Partial<WalletConfig>): void {
    const wallets = this.getWallets()
    const index = wallets.findIndex(
      w => w.address.toLowerCase() === address.toLowerCase()
    )

    if (index === -1) {
      throw new Error('Wallet address not found')
    }

    // 更新钱包配置（不允许修改地址）
    wallets[index] = {
      ...wallets[index],
      ...updates,
      address: wallets[index].address, // 保持地址不变
    }

    this.saveWallets(wallets)
  }

  /**
   * 验证Ethereum地址格式
   */
  validateAddress(address: string): boolean {
    return isValidEthereumAddress(address)
  }

  /**
   * 保存钱包配置到 localStorage
   * 钱包配置会自动持久化，在浏览器刷新后仍然可用
   */
  private saveWallets(wallets: WalletConfig[]): void {
    if (typeof window === 'undefined') {
      return
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(wallets))
      console.log(`[WalletManager] Saved ${wallets.length} wallet(s) to localStorage`)
    } catch (error) {
      console.error('Error saving wallets to localStorage:', error)
      throw new Error('Failed to save wallet configuration')
    }
  }
}

// 单例模式，全局共享钱包管理器
export const walletManager = new WalletManager()
