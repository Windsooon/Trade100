import { NextRequest, NextResponse } from 'next/server'
import { DomeApiAdapter } from '@/lib/api/adapters/dome-api.adapter'

/**
 * GET /api/trading/candlesticks
 * 获取Candlesticks数据
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const conditionId = searchParams.get('conditionId')
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const interval = searchParams.get('interval')

    if (!conditionId) {
      return NextResponse.json(
        { error: 'conditionId is required' },
        { status: 400 }
      )
    }

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'startTime and endTime are required' },
        { status: 400 }
      )
    }

    const query: any = {
      conditionId,
      startTime: parseInt(startTime, 10),
      endTime: parseInt(endTime, 10),
    }

    if (interval) {
      const intervalValue = parseInt(interval, 10)
      if ([1, 60, 1440].includes(intervalValue)) {
        query.interval = intervalValue as 1 | 60 | 1440
      }
    }

    const adapter = new DomeApiAdapter()
    const candlesticks = await adapter.getCandlesticks(query)
    
    console.log('[API candlesticks] Response:', {
      candlesticksLength: candlesticks?.length,
      firstCandlestick: candlesticks?.[0],
    })
    
    return NextResponse.json({
      success: true,
      candlesticks: candlesticks || [],
    })
  } catch (error) {
    console.error('Candlesticks API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch candlesticks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
