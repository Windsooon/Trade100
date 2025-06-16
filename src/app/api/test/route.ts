import { NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

export async function GET() {
  try {
    const response = await proxyFetch(
      'https://gamma-api.polymarket.com/events/pagination?limit=2&offset=0&active=true&archived=false&closed=false',
      {
        headers: {
          'User-Agent': 'Polymarket Dashboard',
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      status: response.status,
      dataCount: data.data?.length || 0,
      message: 'API connection successful'
    })

  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to connect to Polymarket API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 