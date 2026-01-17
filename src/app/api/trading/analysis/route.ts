import { NextRequest, NextResponse } from 'next/server'
import { TradingAnalysisService, DateRange } from '@/lib/services/trading-analysis.service'
import { DomeApiAdapter } from '@/lib/api/adapters/dome-api.adapter'
import { isValidEthereumAddress } from '@/lib/utils'

/**
 * GET /api/trading/analysis
 * 获取所有交易分析数据（市场汇总、总体统计、交易行为）
 * 只调用一次 Dome API 获取交易历史，然后计算所有分析结果
 */
export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  const startTime = Date.now()
  console.log(`[API trading/analysis] Request ${requestId} started:`, request.url)
  
  try {
    const { searchParams } = new URL(request.url)
    const walletsParam = searchParams.get('wallets')
    const startTimeParam = searchParams.get('startTime')
    const endTimeParam = searchParams.get('endTime')
    
    console.log(`[API trading/analysis] Request ${requestId} params:`, {
      wallets: walletsParam,
      startTime: startTimeParam,
      endTime: endTimeParam,
    })

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

    // 解析日期范围
    const dateRange: DateRange = {}
    if (startTimeParam) {
      dateRange.startTime = parseInt(startTimeParam, 10)
    }
    if (endTimeParam) {
      dateRange.endTime = parseInt(endTimeParam, 10)
    }

    // 创建服务实例
    const apiClient = new DomeApiAdapter()
    const analysisService = new TradingAnalysisService(apiClient)

    console.log(`[API trading/analysis] Request ${requestId} fetching all analyses (SINGLE API CALL to Dome)`)

    // 一次性获取所有分析数据（只调用一次 Dome API 获取交易数据，然后计算所有分析）
    try {
      const result = await analysisService.getAllAnalysis(walletAddresses, dateRange)

      const duration = Date.now() - startTime
      console.log(`[API trading/analysis] Request ${requestId} completed in ${duration}ms - fetched once, calculated all analyses`)

      return NextResponse.json({
        success: true,
        walletCount: walletAddresses.length,
        marketSummaries: result.marketSummaries,
        overallStats: result.overallStats,
        tradingBehavior: result.tradingBehavior,
      })
    } catch (serviceError) {
      // Re-throw to be caught by outer catch block
      throw serviceError
    }
  } catch (error) {
    console.error(`[API trading/analysis] Request ${requestId} error:`, error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Check for timeout errors
    let userFriendlyMessage = errorMessage
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout') || errorMessage.includes('UND_ERR_CONNECT_TIMEOUT')) {
      userFriendlyMessage = 'Connection timeout: The API request took too long. This may be due to network issues or the API being slow. Please try again or check your network connection.'
    } else if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      userFriendlyMessage = 'Network error: Unable to connect to the API. Please check your internet connection and try again.'
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch trading analysis',
        details: userFriendlyMessage,
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {})
      },
      { status: 500 }
    )
  }
}
