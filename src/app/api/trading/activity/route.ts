import { NextRequest, NextResponse } from 'next/server'
import { DomeApiAdapter } from '@/lib/api/adapters/dome-api.adapter'
import { isValidEthereumAddress } from '@/lib/utils'

/**
 * GET /api/trading/activity
 * 获取活动记录
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // 解析查询参数
    const user = searchParams.get('user')
    const marketSlug = searchParams.get('marketSlug')
    const conditionId = searchParams.get('conditionId')
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // 验证用户地址格式（如果提供）
    if (user && !isValidEthereumAddress(user)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // 构建查询参数
    const query: any = {}
    if (user) query.user = user
    if (marketSlug) query.marketSlug = marketSlug
    if (conditionId) query.conditionId = conditionId
    if (startTime) query.startTime = parseInt(startTime, 10)
    if (endTime) query.endTime = parseInt(endTime, 10)
    if (limit) query.limit = parseInt(limit, 10)
    if (offset) query.offset = parseInt(offset, 10)

    // 调用 API 适配器
    const adapter = new DomeApiAdapter()
    const response = await adapter.getActivity(query)

    return NextResponse.json(response)
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
