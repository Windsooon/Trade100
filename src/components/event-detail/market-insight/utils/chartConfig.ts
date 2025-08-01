import { ColorType, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts'

export const getChartOptions = () => ({
  layout: { 
    textColor: 'rgba(255, 255, 255, 0.9)', 
    background: { type: ColorType.Solid, color: 'transparent' },
    attributionLogo: false
  },
  grid: {
    vertLines: { color: 'rgba(197, 203, 206, 0.1)' },
    horzLines: { color: 'rgba(197, 203, 206, 0.1)' },
  },
  crosshair: {
    mode: 1,
  },
  rightPriceScale: {
    borderColor: 'rgba(197, 203, 206, 0.8)',
  },
  timeScale: {
    borderColor: 'rgba(197, 203, 206, 0.8)',
    timeVisible: true,
    secondsVisible: false,
    rightOffset: 20,
    barSpacing: 6,
    minBarSpacing: 2,
  },
  height: 384,
})

export const getCandlestickSeriesOptions = () => ({
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderVisible: false,
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
})

export const getLineSeriesOptions = (color: string = '#26a69a') => ({
  color,
  lineWidth: 2,
})

export const getVolumeSeriesOptions = () => ({
  color: '#26a69a',
  priceFormat: {
    type: 'volume' as const,
  },
  priceScaleId: '',
})

export const getPriceSeriesScaleOptions = () => ({
  scaleMargins: {
    top: 0.1,
    bottom: 0.4,
  },
})

export const getVolumeSeriesScaleOptions = () => ({
  scaleMargins: {
    top: 0.7,
    bottom: 0,
  },
})

export const getSeriesConfig = (chartType: 'candle' | 'line') => {
  return {
    seriesType: chartType === 'candle' ? CandlestickSeries : LineSeries,
    seriesOptions: chartType === 'candle' ? getCandlestickSeriesOptions() : getLineSeriesOptions(),
  }
}