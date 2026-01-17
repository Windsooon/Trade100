import { IPolymarketApiClient } from '../api-client'
import { TradeHistoryQuery, TradeHistoryResponse, TradeRecord } from '../interfaces/trade-history.interface'
import { ActivityQuery, ActivityResponse, ActivityRecord } from '../interfaces/activity.interface'
import { domeApiRateLimiter } from '../rate-limiter'
import { proxyFetch } from '@/lib/fetch'
import { API_CONFIG } from '@/lib/config'

/**
 * Dome API 适配器实现
 * 封装 Dome API 调用逻辑，通过限流器控制请求频率
 */
export class DomeApiAdapter implements IPolymarketApiClient {
  private baseUrl: string
  private apiKey?: string

  constructor() {
    this.baseUrl = API_CONFIG.DOME_API.BASE_URL
    this.apiKey = API_CONFIG.DOME_API.API_KEY
  }

  /**
   * 处理 API 响应错误，包括 429 限流错误的自动重试
   */
  private async handleApiResponse<T>(
    response: Response,
    retryFn: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    if (response.ok) {
      return await response.json() as T
    }

    const errorText = await response.text()
    let errorMessage = `Dome API error: ${response.status} ${response.statusText}`
    let retryAfter: number | null = null

    // 处理 429 限流错误
    if (response.status === 429) {
      try {
        const errorData = JSON.parse(errorText)
        retryAfter = errorData.retry_after || (errorData.rate_limit?.reset_time 
          ? Math.max(1, errorData.rate_limit.reset_time - Math.floor(Date.now() / 1000))
          : 6) // 默认等待 6 秒
        
        if (maxRetries > 0) {
          console.warn(`[Dome API] Rate limit exceeded (429). Retrying after ${retryAfter}s (${maxRetries} retries left)`)
          // 等待指定时间后重试（重试也会通过限流器）
          await new Promise(resolve => setTimeout(resolve, retryAfter! * 1000))
          return retryFn()
        }
        
        errorMessage = `Dome API rate limit exceeded. Please wait ${retryAfter} seconds before retrying.`
      } catch {
        // 如果无法解析 JSON，使用默认重试逻辑
        if (maxRetries > 0) {
          console.warn(`[Dome API] Rate limit exceeded (429). Retrying after 6s (${maxRetries} retries left)`)
          await new Promise(resolve => setTimeout(resolve, 6000))
          return retryFn()
        }
      }
    }
    
    // 处理 403 认证错误
    if (response.status === 403) {
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.message?.includes('Authentication required')) {
          errorMessage = 'Dome API authentication required. Please set DOME_API_KEY environment variable. Get an API key at https://dashboard.domeapi.io'
        }
      } catch {
        errorMessage = `Dome API authentication required (403). Please set DOME_API_KEY. Get an API key at https://dashboard.domeapi.io`
      }
    }
    
    console.error('[Dome API] Error response:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText,
      message: errorMessage,
    })
    throw new Error(errorMessage)
  }

  /**
   * 获取交易历史
   */
  async getTradeHistory(query: TradeHistoryQuery): Promise<TradeHistoryResponse> {
    // 通过限流器执行请求
    return domeApiRateLimiter.execute(async () => {
      const url = this.buildUrl('/orders', this.convertTradeHistoryQuery(query))
      
      console.log('[Dome API] Fetching trade history:', {
        url,
        query: this.convertTradeHistoryQuery(query),
      })
      
      const response = await proxyFetch(url, {
        headers: this.getHeaders(),
      })
      
      const data = await this.handleApiResponse<TradeHistoryResponse>(
        response,
        (retriesLeft) => {
          // 重试时也需要通过限流器
          return domeApiRateLimiter.execute(async () => {
            const retryResponse = await proxyFetch(url, {
              headers: this.getHeaders(),
            })
            return this.handleApiResponse<TradeHistoryResponse>(
              retryResponse,
              (r) => this.handleApiResponse<TradeHistoryResponse>(
                retryResponse,
                () => Promise.reject(new Error('Max retries exceeded')),
                r
              ),
              retriesLeft
            )
          })
        },
        3 // 最多重试 3 次
      )
      
      console.log('[Dome API] Response received:', {
        ordersCount: data.orders?.length || 0,
        pagination: data.pagination,
      })
      
      // 转换响应格式（Dome API格式 -> 统一接口格式）
      return this.transformTradeHistoryResponse(data)
    })
  }

  /**
   * 获取活动记录
   */
  async getActivity(query: ActivityQuery): Promise<ActivityResponse> {
    return domeApiRateLimiter.execute(async () => {
      const url = this.buildUrl('/activity', this.convertActivityQuery(query))
      const response = await proxyFetch(url, {
        headers: this.getHeaders(),
      })
      
      const data = await this.handleApiResponse<ActivityResponse>(
        response,
        () => {
          // 重试时也需要通过限流器重新执行整个请求
          return this.getActivity(query)
        },
        3 // 最多重试 3 次
      )
      
      return this.transformActivityResponse(data)
    })
  }

  /**
   * 获取所有交易历史（自动处理分页）
   */
  async getAllTradeHistory(query: Omit<TradeHistoryQuery, 'limit' | 'offset'>): Promise<TradeRecord[]> {
    const allRecords: TradeRecord[] = []
    let offset = 0
    const limit = 100 // 使用较小的limit，避免单次请求过大
    
    console.log('[Dome API] Starting to fetch all trade history:', { query, limit })
    
    try {
      while (true) {
        const response = await this.getTradeHistory({
          ...query,
          limit,
          offset,
        })
        
        console.log('[Dome API] Fetched page:', {
          offset,
          limit,
          ordersInPage: response.orders.length,
          hasMore: response.pagination.hasMore,
          total: response.pagination.total,
        })
        
        allRecords.push(...response.orders)
        
        // 如果没有更多数据或返回空，停止
        if (!response.pagination.hasMore || response.orders.length === 0) {
          console.log('[Dome API] Finished fetching all trade history. Total:', allRecords.length)
          break
        }
        
        // 如果已经获取了所有数据（根据total判断）
        if (response.pagination.total > 0 && allRecords.length >= response.pagination.total) {
          console.log('[Dome API] Reached total count. Stopping.')
          break
        }
        
        offset += limit
        
        // 安全限制：最多获取10000条记录
        if (allRecords.length >= 10000) {
          console.warn('[Dome API] Reached maximum record limit (10000). Stopping.')
          break
        }
      }
    } catch (error) {
      console.error('[Dome API] Error in getAllTradeHistory:', error)
      // 如果已经获取了一些数据，返回已获取的数据
      if (allRecords.length > 0) {
        console.warn('[Dome API] Returning partial data due to error:', allRecords.length, 'records')
        return allRecords
      }
      throw error
    }
    
    return allRecords
  }

  /**
   * 获取所有活动记录（自动处理分页）
   */
  async getAllActivity(query: Omit<ActivityQuery, 'limit' | 'offset'>): Promise<ActivityRecord[]> {
    const allRecords: ActivityRecord[] = []
    let offset = 0
    const limit = 1000 // Dome API 最大限制
    
    while (true) {
      const response = await this.getActivity({
        ...query,
        limit,
        offset,
      })
      
      allRecords.push(...response.activities)
      
      if (!response.pagination.hasMore || response.activities.length === 0) {
        break
      }
      
      offset += limit
    }
    
    return allRecords
  }

  /**
   * 构建请求URL
   */
  private buildUrl(endpoint: string, params: Record<string, any>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
    return url.toString()
  }

  /**
   * 获取请求头
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/json',
    }
    
    // Dome API 需要 API Key
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    } else {
      // 如果没有 API Key，尝试使用 X-API-Key header（某些 API 使用这种方式）
      // 但根据文档，应该使用 Authorization: Bearer
      console.warn('[Dome API] No API key provided. API calls may fail with 403 Forbidden.')
      console.warn('[Dome API] Get an API key at: https://dashboard.domeapi.io')
    }
    
    return headers
  }

  /**
   * 转换交易历史查询参数（统一接口 -> Dome API格式）
   */
  private convertTradeHistoryQuery(query: TradeHistoryQuery): Record<string, any> {
    const params: Record<string, any> = {}
    
    if (query.user) params.user = query.user
    if (query.marketSlug) params.market_slug = query.marketSlug
    if (query.conditionId) params.condition_id = query.conditionId
    if (query.tokenId) params.token_id = query.tokenId
    if (query.startTime !== undefined) params.start_time = query.startTime
    if (query.endTime !== undefined) params.end_time = query.endTime
    if (query.limit !== undefined) params.limit = query.limit
    if (query.offset !== undefined) params.offset = query.offset
    
    return params
  }

  /**
   * 转换活动查询参数（统一接口 -> Dome API格式）
   */
  private convertActivityQuery(query: ActivityQuery): Record<string, any> {
    const params: Record<string, any> = {}
    
    if (query.user) params.user = query.user
    if (query.marketSlug) params.market_slug = query.marketSlug
    if (query.conditionId) params.condition_id = query.conditionId
    if (query.startTime !== undefined) params.start_time = query.startTime
    if (query.endTime !== undefined) params.end_time = query.endTime
    if (query.limit !== undefined) params.limit = query.limit
    if (query.offset !== undefined) params.offset = query.offset
    
    return params
  }

  /**
   * 转换交易历史响应（Dome API格式 -> 统一接口格式）
   */
  private transformTradeHistoryResponse(data: any): TradeHistoryResponse {
    // 处理可能的响应格式差异
    if (!data) {
      console.warn('[Dome API] Empty response received')
      return {
        orders: [],
        pagination: {
          limit: 0,
          offset: 0,
          total: 0,
          hasMore: false,
        },
      }
    }

    // Dome API 可能返回 orders 数组或直接是数组
    const orders = data.orders || (Array.isArray(data) ? data : [])
    
    return {
      orders: orders.map((order: any) => ({
        tokenId: order.token_id || order.tokenId || '',
        tokenLabel: order.token_label || order.tokenLabel || '',
        side: (order.side || 'BUY') as 'BUY' | 'SELL',
        marketSlug: order.market_slug || order.marketSlug || '',
        conditionId: order.condition_id || order.conditionId || '',
        shares: order.shares || 0,
        sharesNormalized: order.shares_normalized || order.sharesNormalized || 0,
        price: order.price || 0,
        blockNumber: order.block_number || order.blockNumber || 0,
        logIndex: order.log_index || order.logIndex || 0,
        txHash: order.tx_hash || order.txHash || '',
        title: order.title || '',
        timestamp: order.timestamp || 0,
        orderHash: order.order_hash || order.orderHash || '',
        user: order.user || '',
        taker: order.taker,
      })),
      pagination: {
        limit: data.pagination?.limit || data.limit || 0,
        offset: data.pagination?.offset || data.offset || 0,
        total: data.pagination?.total || data.total || orders.length,
        hasMore: data.pagination?.has_more !== undefined 
          ? data.pagination.has_more 
          : (data.pagination?.hasMore !== undefined ? data.pagination.hasMore : false),
      },
    }
  }

  /**
   * 转换活动响应（Dome API格式 -> 统一接口格式）
   */
  private transformActivityResponse(data: any): ActivityResponse {
    return {
      activities: (data.activities || []).map((activity: any) => ({
        tokenId: activity.token_id,
        tokenLabel: activity.token_label,
        side: activity.side || '',
        marketSlug: activity.market_slug,
        conditionId: activity.condition_id,
        shares: activity.shares,
        sharesNormalized: activity.shares_normalized,
        price: activity.price,
        blockNumber: activity.block_number,
        logIndex: activity.log_index,
        txHash: activity.tx_hash,
        title: activity.title,
        timestamp: activity.timestamp,
        orderHash: activity.order_hash || '',
        user: activity.user,
        type: activity.type,
      })),
      pagination: {
        limit: data.pagination?.limit || 0,
        offset: data.pagination?.offset || 0,
        count: data.pagination?.count || 0,
        hasMore: data.pagination?.has_more || false,
      },
    }
  }
}
