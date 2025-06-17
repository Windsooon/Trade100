import { NextRequest, NextResponse } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

interface PolymarketTag {
  id: string
  label: string
  slug: string
  forceShow: boolean
  forceHide?: boolean
}

export async function GET(request: NextRequest) {
  try {
    // Use the correct Polymarket API URL
    const tagsUrl = 'https://polymarket.com/api/tags/filtered?tag=100221&status=active'
    
    const response = await proxyFetch(tagsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`Tags API responded with status: ${response.status}`)
    }

    const tags: PolymarketTag[] = await response.json()
    
    // Filter out hidden tags and the "All" tag, then sort alphabetically
    const filteredTags = tags
      .filter(tag => 
        !tag.forceHide && 
        tag.label !== 'All' && 
        tag.label.trim().length > 0
      )
      .map(tag => ({
        id: tag.id,
        label: tag.label,
        slug: tag.slug
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
    
    return NextResponse.json({
      tags: filteredTags,
      success: true,
      count: filteredTags.length
    })

  } catch (error) {
    // Return fallback tags if API fails
    const fallbackTags = [
      { id: 'politics', label: 'Politics', slug: 'politics' },
      { id: 'sports', label: 'Sports', slug: 'sports' },
      { id: 'crypto', label: 'Crypto', slug: 'crypto' },
      { id: 'tech', label: 'Tech', slug: 'tech' },
      { id: 'culture', label: 'Culture', slug: 'culture' },
      { id: 'world', label: 'World', slug: 'world' },
      { id: 'economy', label: 'Economy', slug: 'economy' },
      { id: 'trump', label: 'Trump', slug: 'trump' }
    ]
    
    return NextResponse.json({
      tags: fallbackTags,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: true
    })
  }
} 