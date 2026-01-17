import { NextRequest, NextResponse } from 'next/server'
import { DomeApiAdapter } from '@/lib/api/adapters/dome-api.adapter'
import { isValidEthereumAddress } from '@/lib/utils'

/**
 * GET /api/trading/trade-history
 * 获取交易历史记录
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 解析查询参数
    const user = searchParams.get('user')
    const wallets = searchParams.get('wallets') // 支持多个钱包（逗号分隔）
    const marketSlug = searchParams.get('marketSlug')
    const conditionId = searchParams.get('conditionId')
    const tokenId = searchParams.get('tokenId')
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // 处理钱包地址（支持单个 user 或多个 wallets）
    const walletAddresses: string[] = []
    if (wallets) {
      const walletList = wallets.split(',').map(w => w.trim())
      for (const wallet of walletList) {
        if (isValidEthereumAddress(wallet)) {
          walletAddresses.push(wallet)
        }
      }
    } else if (user) {
      if (!isValidEthereumAddress(user)) {
        return NextResponse.json(
          { error: 'Invalid wallet address format' },
          { status: 400 }
        )
      }
      walletAddresses.push(user)
    }

    // 如果没有提供钱包地址，返回错误
    if (walletAddresses.length === 0 && !marketSlug && !conditionId) {
      return NextResponse.json(
        { error: 'Either user/wallets, marketSlug, or conditionId must be provided' },
        { status: 400 }
      )
    }

    // 构建查询参数
    const query: any = {}
    if (marketSlug) query.marketSlug = marketSlug
    if (conditionId) query.conditionId = conditionId
    if (tokenId) query.tokenId = tokenId
    if (startTime) query.startTime = parseInt(startTime, 10)
    if (endTime) query.endTime = parseInt(endTime, 10)
    if (limit) query.limit = parseInt(limit, 10)
    if (offset) query.offset = parseInt(offset, 10)

    // 调用 API 适配器
    const adapter = new DomeApiAdapter()
    
    // 如果有多个钱包，合并结果
    if (walletAddresses.length > 1) {
      const allTrades: any[] = []
      let totalCount = 0
      let hasMore = false
      
      for (const wallet of walletAddresses) {
        const response = await adapter.getTradeHistory({ ...query, user: wallet })
        allTrades.push(...response.orders)
        totalCount += response.pagination.total
        hasMore = hasMore || response.pagination.hasMore
      }
      
      // 按时间戳排序（最新的在前）
      allTrades.sort((a, b) => b.timestamp - a.timestamp)
      
      // 应用 limit 和 offset
      const start = offset ? parseInt(offset, 10) : 0
      const end = limit ? start + parseInt(limit, 10) : undefined
      const paginatedTrades = allTrades.slice(start, end)
      
      return NextResponse.json({
        orders: paginatedTrades,
        pagination: {
          limit: limit ? parseInt(limit, 10) : 100,
          offset: offset ? parseInt(offset, 10) : 0,
          total: allTrades.length,
          hasMore: end ? end < allTrades.length : false,
        }
      })
    } else if (walletAddresses.length === 1) {
      // 单个钱包
      const response = await adapter.getTradeHistory({ ...query, user: walletAddresses[0] })
      return NextResponse.json(response)
    } else {
      // 没有钱包，但有 marketSlug 或 conditionId
      const response = await adapter.getTradeHistory(query)
      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('Trade history API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch trade history',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
