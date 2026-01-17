import { TradeHistoryQuery, TradeHistoryResponse, TradeRecord } from './interfaces/trade-history.interface'
import { ActivityQuery, ActivityResponse, ActivityRecord } from './interfaces/activity.interface'
import { CandlesticksQuery, CandlestickResponse } from './interfaces/candlesticks.interface'

/**
 * API客户端抽象接口
 * 所有API适配器必须实现此接口
 */
export interface IPolymarketApiClient {
  /**
   * 获取交易历史
   */
  getTradeHistory(query: TradeHistoryQuery): Promise<TradeHistoryResponse>
  
  /**
   * 获取活动记录
   */
  getActivity(query: ActivityQuery): Promise<ActivityResponse>
  
  /**
   * 获取所有交易历史（自动处理分页）
   * @param query 查询参数
   * @param maxRecords 最大记录数限制（可选）
   */
  getAllTradeHistory(query: Omit<TradeHistoryQuery, 'limit' | 'offset'>, maxRecords?: number): Promise<TradeRecord[]>
  
  /**
   * 获取所有活动记录（自动处理分页）
   */
  getAllActivity(query: Omit<ActivityQuery, 'limit' | 'offset'>): Promise<ActivityRecord[]>
  
  /**
   * 获取Candlesticks数据
   */
  getCandlesticks(query: CandlesticksQuery): Promise<CandlestickResponse>
}
