import { NextRequest } from 'next/server'
import { proxyFetch } from '@/lib/fetch'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request body is an array of token objects
    if (!Array.isArray(body)) {
      return Response.json({ error: 'Request body must be an array' }, { status: 400 })
    }

    // Validate each item has token_id
    for (const item of body) {
      if (!item.token_id || typeof item.token_id !== 'string') {
        return Response.json({ error: 'Each item must have a token_id string' }, { status: 400 })
      }
    }

    // Call Polymarket CLOB API
    const response = await proxyFetch('https://clob.polymarket.com/last-trades-prices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Polymarket Dashboard',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      console.error('CLOB API error:', response.status, response.statusText)
      return Response.json(
        { error: `CLOB API error: ${response.status} ${response.statusText}` }, 
        { status: response.status }
      )
    }

    const data = await response.json()
    return Response.json(data)

  } catch (error) {
    console.error('Last trade prices API error:', error)
    return Response.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}