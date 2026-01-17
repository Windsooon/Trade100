/**
 * 测试 Dome API 连接
 * 用于调试 API 调用问题
 */

const testWallet = process.argv[2] || '0x7c3db723f1d4d8cb9c550095203b686cb11e5c6b'

async function testDomeAPI() {
  console.log('Testing Dome API connection...')
  console.log('Wallet address:', testWallet)
  console.log('')

  const apiKey = process.env.DOME_API_KEY
  if (!apiKey) {
    console.error('❌ DOME_API_KEY not found in environment variables!')
    console.error('')
    console.error('Please set DOME_API_KEY:')
    console.error('  export DOME_API_KEY=your_api_key_here')
    console.error('')
    console.error('Or add it to .env.local file:')
    console.error('  DOME_API_KEY=your_api_key_here')
    console.error('')
    console.error('Get an API key at: https://dashboard.domeapi.io')
    process.exit(1)
  }

  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...')
  console.log('')

  const baseUrl = 'https://api.domeapi.io/v1/polymarket'
  const url = `${baseUrl}/orders?user=${testWallet}&limit=10&offset=0`

  console.log('Request URL:', url)
  console.log('')

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    console.log('Response Status:', response.status, response.statusText)
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()))
    console.log('')

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error Response:', errorText)
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.message) {
          console.error('Error Message:', errorData.message)
        }
      } catch {
        // Not JSON, already printed
      }
      return
    }

    const data = await response.json()
    console.log('✅ Success! Response Data:')
    console.log(JSON.stringify(data, null, 2))
    console.log('')
    console.log('Orders count:', data.orders?.length || 0)
    console.log('Pagination:', data.pagination || 'N/A')

  } catch (error) {
    console.error('❌ Request failed:', error)
    console.error('Error details:', error.message)
    if (error.stack) {
      console.error('Stack:', error.stack)
    }
  }
}

testDomeAPI()
