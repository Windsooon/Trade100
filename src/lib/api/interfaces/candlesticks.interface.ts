/**
 * Candlesticks查询参数
 */
export interface CandlesticksQuery {
  conditionId: string
  startTime: number              // Unix时间戳（秒）
  endTime: number                // Unix时间戳（秒）
  interval?: 1 | 60 | 1440       // 1 = 1m, 60 = 1h, 1440 = 1d
}

/**
 * Candlestick价格数据
 */
export interface CandlestickPrice {
  open: number
  high: number
  low: number
  close: number
  open_dollars: string
  high_dollars: string
  low_dollars: string
  close_dollars: string
  mean: number
  mean_dollars: string
  previous: number
  previous_dollars: string
}

/**
 * Candlestick Yes Ask/Bid数据
 */
export interface CandlestickYesPrice {
  open: number
  close: number
  high: number
  low: number
  open_dollars: string
  close_dollars: string
  high_dollars: string
  low_dollars: string
}

/**
 * 单个Candlestick数据
 */
export interface CandlestickData {
  end_period_ts: number
  open_interest: number
  price: CandlestickPrice
  volume: number
  yes_ask: CandlestickYesPrice
  yes_bid: CandlestickYesPrice
}

/**
 * Token元数据
 */
export interface CandlestickTokenMetadata {
  token_id: string
  side: 'Yes' | 'No'
}

/**
 * Candlestick响应（API返回的格式）
 */
export type CandlestickResponse = Array<[
  CandlestickData[],
  CandlestickTokenMetadata
]>
