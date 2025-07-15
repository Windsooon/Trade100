import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

interface ActivityAPIResponse {
  activities: ActivityItem[]
  error?: string
}

export interface ActivityItem {
  proxyWallet: string
  timestamp: number
  conditionId: string
  type: 'TRADE' | 'SPLIT' | 'MERGE' | 'REDEEM' | 'REWARD' | 'CONVERSION'
  size: number
  usdcSize: number
  transactionHash: string
  price: number
  asset: string
  side: 'BUY' | 'SELL' | ''
  outcomeIndex: number
  title: string
  slug: string
  icon: string
  eventSlug: string
  outcome: string
  name: string
  pseudonym: string
  bio: string
  profileImage: string
  profileImageOptimized: string
}

// Validate Ethereum address format
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userAddress = searchParams.get('user')
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    const limit = searchParams.get('limit') || '200'
    const sortBy = searchParams.get('sortBy') || 'TIMESTAMP'
    const sortDirection = searchParams.get('sortDirection') || 'DESC'

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

    // Validate timestamps
    if (start && isNaN(Number(start))) {
      return NextResponse.json(
        { error: 'Invalid start timestamp' },
        { status: 400 }
      )
    }

    if (end && isNaN(Number(end))) {
      return NextResponse.json(
        { error: 'Invalid end timestamp' },
        { status: 400 }
      )
    }

    // Build activity API URL using the correct data-api endpoint
    const baseUrl = 'https://data-api.polymarket.com/activity'
    const params = new URLSearchParams({
      user: userAddress,
      limit,
      sortBy,
      sortDirection
    })

    if (start) params.append('start', start)
    if (end) params.append('end', end)

    const activityUrl = `${baseUrl}?${params.toString()}`

    try {
      const activityResponse = await proxyFetch(activityUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Portfolio-API/1.0)',
          'Accept': 'application/json',
        }
      })
      
      if (!activityResponse.ok) {
        const errorText = await activityResponse.text()
        throw new Error(`Activity API returned ${activityResponse.status}: ${errorText}`)
      }
      
      const activityData: ActivityItem[] = await activityResponse.json()
      
      if (!Array.isArray(activityData)) {
        throw new Error('Invalid activity data format')
      }

      const response: ActivityAPIResponse = {
        activities: activityData
      }
      
      return NextResponse.json(response)

    } catch (error) {
      console.error('Error fetching activity data:', error)
      return NextResponse.json(
        { error: 'Network error: Failed to fetch activity data' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Activity API unexpected error:', error)
    
    return NextResponse.json(
      { error: 'Network error: Unable to fetch activity data' },
      { status: 500 }
    )
  }
} 