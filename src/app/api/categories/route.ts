import { NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

const POLYMARKET_API_URL = 'https://polymarket.com/api'

interface TagData {
  id: string
  name: string
  slug: string
  count?: number
}

export async function GET() {
  try {
    // Fetch tags from Polymarket API
    const response = await proxyFetch(`${POLYMARKET_API_URL}/tags/filtered?status=active`, {
      headers: {
        'User-Agent': 'Polymarket Dashboard',
      },
    })

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`)
    }

    const data: TagData[] = await response.json()
    
    // Transform tags data into categories
    const categories = data.map((tag: TagData) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      count: tag.count || 0,
    }))

    return NextResponse.json({ categories })

  } catch (error) {
    console.error('Categories API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' }, 
      { status: 500 }
    )
  }
} 