import { ProxyAgent } from 'undici'

// Enhanced fetch wrapper that automatically detects and uses proxy when needed
export async function proxyFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Only attempt proxy setup on server side
  if (typeof window === 'undefined') {
    // Check for any proxy environment variables
    const proxyUrl = process.env.ALL_PROXY || 
                     process.env.HTTP_PROXY || 
                     process.env.HTTPS_PROXY ||
                     process.env.http_proxy ||
                     process.env.https_proxy

    if (proxyUrl) {
      try {
        const proxyAgent = new ProxyAgent(proxyUrl)
        
        console.log(`[Proxy] Using proxy: ${proxyUrl}`)
        
        // Use undici dispatcher with Node.js fetch
        return fetch(url, {
          ...options,
          // @ts-expect-error - TypeScript doesn't know about dispatcher option in fetch
          dispatcher: proxyAgent,
          // Add timeout to prevent hanging
          signal: options.signal || AbortSignal.timeout(30000)
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.warn(`[Proxy] Failed to setup proxy (${proxyUrl}), falling back to direct fetch:`, errorMessage)
        // Continue to fallback
      }
    }
  }
  
  // Fallback to regular fetch (client-side or when proxy fails)
  return fetch(url, {
    ...options,
    // Add timeout for direct fetch too
    signal: options.signal || AbortSignal.timeout(30000)
  })
}

// Helper function to check if we're using proxy
export function isUsingProxy(): boolean {
  if (typeof window !== 'undefined') return false
  
  return !!(process.env.ALL_PROXY || 
           process.env.HTTP_PROXY || 
           process.env.HTTPS_PROXY ||
           process.env.http_proxy ||
           process.env.https_proxy)
}

// Helper function to get proxy info for debugging
export function getProxyInfo(): string | null {
  if (typeof window !== 'undefined') return null
  
  return process.env.ALL_PROXY || 
         process.env.HTTP_PROXY || 
         process.env.HTTPS_PROXY ||
         process.env.http_proxy ||
         process.env.https_proxy ||
         null
} 