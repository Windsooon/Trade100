import { NextRequest, NextResponse } from 'next/server'
import { DomeApiAdapter } from '@/lib/api/adapters/dome-api.adapter'
import { isValidEthereumAddress } from '@/lib/utils'

/**
 * GET /api/trading/activity
 * 获取活动记录（REDEEM, MERGE, SPLIT等）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 解析查询参数
    const user = searchParams.get('user')
    const wallets = searchParams.get('wallets') // 支持多个钱包（逗号分隔）
    const marketSlug = searchParams.get('marketSlug')
    const conditionId = searchParams.get('conditionId')
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
    if (startTime) query.startTime = parseInt(startTime, 10)
    if (endTime) query.endTime = parseInt(endTime, 10)
    if (limit) query.limit = parseInt(limit, 10)
    if (offset) query.offset = parseInt(offset, 10)

    // 调用 API 适配器
    const adapter = new DomeApiAdapter()
    
    // 如果有多个钱包，合并结果
    if (walletAddresses.length > 1) {
      const allActivities: any[] = []
      let totalCount = 0
      let hasMore = false
      
      for (const wallet of walletAddresses) {
        const response = await adapter.getActivity({ ...query, user: wallet })
        allActivities.push(...response.activities)
        totalCount += response.pagination.count
        hasMore = hasMore || response.pagination.hasMore
      }
      
      // 按时间戳排序（最新的在前）
      allActivities.sort((a, b) => b.timestamp - a.timestamp)
      
      // 应用 limit 和 offset
      const start = offset ? parseInt(offset, 10) : 0
      const end = limit ? start + parseInt(limit, 10) : undefined
      const paginatedActivities = allActivities.slice(start, end)
      
      return NextResponse.json({
        activities: paginatedActivities,
        pagination: {
          limit: limit ? parseInt(limit, 10) : 100,
          offset: offset ? parseInt(offset, 10) : 0,
          count: allActivities.length,
          hasMore: end ? end < allActivities.length : false,
        }
      })
    } else if (walletAddresses.length === 1) {
      // 单个钱包
      const response = await adapter.getActivity({ ...query, user: walletAddresses[0] })
      return NextResponse.json(response)
    } else {
      // 没有钱包，但有 marketSlug 或 conditionId
      const response = await adapter.getActivity(query)
      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('Activity API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch activity',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
