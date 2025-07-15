import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

interface PositionValueResponse {
  user: string
  value: number
}

interface PnLDataPoint {
  t: number // timestamp
  p: number // P/L value
}

interface PortfolioAPIResponse {
  positionValue: number
  pnlData: PnLDataPoint[]
  error?: string
}

// Validate Ethereum address format
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('user')

    // Validate user address
    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      )
    }

    if (!isValidEthereumAddress(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Fetch position value
    const positionValueUrl = `https://data-api.polymarket.com/value?user=${userAddress}`
    
    let positionValue = 0

    try {
      const positionResponse = await proxyFetch(positionValueUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Portfolio-API/1.0)',
          'Accept': 'application/json',
        }
      })
      
      if (!positionResponse.ok) {
        const errorText = await positionResponse.text()
        throw new Error(`Position API returned ${positionResponse.status}: ${errorText}`)
      }
      
      const positionData: PositionValueResponse[] = await positionResponse.json()
      
      if (Array.isArray(positionData) && positionData.length > 0 && typeof positionData[0].value === 'number') {
        positionValue = positionData[0].value
      }

    } catch (error) {
      console.error('Error fetching position value:', error)
      return NextResponse.json(
        { error: 'Network error: Failed to fetch position value' },
        { status: 500 }
      )
    }

    // Fetch P/L data
    const pnlUrl = `https://user-pnl-api.polymarket.com/user-pnl?user_address=${userAddress}&interval=1m&fidelity=1d`
    
    let pnlData: PnLDataPoint[] = []

    try {
      const pnlResponse = await proxyFetch(pnlUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Portfolio-API/1.0)',
          'Accept': 'application/json',
        }
      })
      
      if (!pnlResponse.ok) {
        const errorText = await pnlResponse.text()
        throw new Error(`P/L API returned ${pnlResponse.status}: ${errorText}`)
      }
      
      const pnlResponseData = await pnlResponse.json()
      
      if (Array.isArray(pnlResponseData)) {
        pnlData = pnlResponseData
      }

    } catch (error) {
      console.error('Error fetching P/L data:', error)
      return NextResponse.json(
        { error: 'Network error: Failed to fetch P/L data' },
        { status: 500 }
      )
    }

    // Check if we have any data
    if (positionValue === 0 && pnlData.length === 0) {
      return NextResponse.json(
        { error: 'No data available for this wallet address' },
        { status: 404 }
      )
    }

    const response: PortfolioAPIResponse = {
      positionValue,
      pnlData
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Portfolio API unexpected error:', error)
    
    return NextResponse.json(
      { error: 'Network error: Unable to fetch portfolio data' },
      { status: 500 }
    )
  }
} 