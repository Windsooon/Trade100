import PQueue from 'p-queue'

/**
 * 限流器状态
 */
export interface RateLimiterStatus {
  size: number              // 队列中等待的请求数
  pending: number           // 正在处理的请求数
}

/**
 * API 限流器接口
 * 用于控制 Dome API 的请求频率（1 QPS）
 */
export interface IApiRateLimiter {
  /**
   * 执行限流的API请求
   * @param fn 要执行的异步函数
   * @param priority 优先级（可选，数字越大优先级越高）
   */
  execute<T>(fn: () => Promise<T>, priority?: number): Promise<T>
  
  /**
   * 获取限流器状态
   */
  getStatus(): RateLimiterStatus
  
  /**
   * 清空队列（取消所有等待的请求）
   */
  clear(): void
}

/**
 * Dome API 限流器实现
 * 使用 p-queue 实现 1 QPS 限流
 * 注意：使用 1200ms 间隔以增加安全边际，避免触发 429 错误
 */
export class DomeApiRateLimiter implements IApiRateLimiter {
  private queue: PQueue
  private readonly MIN_INTERVAL_MS = 1200 // 1.2秒，增加安全边际以应对 Dome API 的时间窗口限制
  private lastRequestTime: number = 0

  constructor() {
    this.queue = new PQueue({
      concurrency: 1,        // 同时只处理1个请求
      interval: 1200,        // 每1200ms（1.2秒），增加安全边际以应对 Dome API 的时间窗口限制
      intervalCap: 1,        // 最多1个请求
      timeout: 60000,        // 60秒超时（增加超时时间）
    })
  }

  /**
   * 执行限流的API请求
   * 添加额外的延迟确保请求间隔至少 1.2 秒
   */
  async execute<T>(fn: () => Promise<T>, priority: number = 0): Promise<T> {
    return this.queue.add(async () => {
      // 额外的安全检查：确保距离上次请求至少 1.1 秒
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequestTime
      
      if (timeSinceLastRequest < this.MIN_INTERVAL_MS) {
        const waitTime = this.MIN_INTERVAL_MS - timeSinceLastRequest
        console.log(`[RateLimiter] Waiting ${waitTime}ms to ensure 1.2s interval`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
      
      // 执行请求
      const result = await fn()
      
      // 在请求完成后更新时间，确保实际请求间隔准确
      this.lastRequestTime = Date.now()
      return result
    }, { 
      priority 
    })
  }

  /**
   * 获取限流器状态
   */
  getStatus(): RateLimiterStatus {
    return {
      size: this.queue.size,
      pending: this.queue.pending,
    }
  }

  /**
   * 清空队列（取消所有等待的请求）
   */
  clear(): void {
    this.queue.clear()
  }
}

// 单例模式，全局共享限流器
export const domeApiRateLimiter = new DomeApiRateLimiter()
