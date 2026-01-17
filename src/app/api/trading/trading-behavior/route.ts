import { NextRequest, NextResponse } from 'next/server'
import { TradingAnalysisService } from '@/lib/services/trading-analysis.service'
import { DomeApiAdapter } from '@/lib/api/adapters/dome-api.adapter'
import { isValidEthereumAddress } from '@/lib/utils'

/**
 * GET /api/trading/trading-behavior
 * 获取交易行为分析（支持多钱包聚合）
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletsParam = searchParams.get('wallets')

    if (!walletsParam || walletsParam.trim() === '') {
      return NextResponse.json(
        { error: 'wallets parameter is required and cannot be empty' },
        { status: 400 }
      )
    }

    // 解析钱包地址列表（逗号分隔）
    const walletAddresses = walletsParam.split(',').map(addr => addr.trim()).filter(addr => addr.length > 0)
    
    if (walletAddresses.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid wallet address is required' },
        { status: 400 }
      )
    }

    // 验证所有地址格式
    for (const address of walletAddresses) {
      if (!isValidEthereumAddress(address)) {
        return NextResponse.json(
          { error: `Invalid wallet address format: ${address}` },
          { status: 400 }
        )
      }
    }

    // 创建服务实例
    const apiClient = new DomeApiAdapter()
    const analysisService = new TradingAnalysisService(apiClient)

    // 获取交易行为分析
    const behavior = await analysisService.getTradingBehavior(walletAddresses)

    return NextResponse.json({
      success: true,
      walletCount: walletAddresses.length,
      behavior,
    })
  } catch (error) {
    console.error('Trading behavior API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch trading behavior',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
