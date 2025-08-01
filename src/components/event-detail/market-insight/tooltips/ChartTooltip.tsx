import { useRef, useEffect } from 'react'

export interface TooltipPosition {
  x: number
  y: number
}

export interface PriceData {
  value?: number
  open?: number
  high?: number
  low?: number
  close?: number
}

export interface ChartTooltipProps {
  container: HTMLElement
  data: PriceData | null
  position: TooltipPosition | null
  timestamp: number | null
  selectedToken: 'yes' | 'no'
  isVisible: boolean
}

export function ChartTooltip({ 
  container, 
  data, 
  position, 
  timestamp, 
  selectedToken, 
  isVisible 
}: ChartTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!container) return

    // Remove existing tooltip if any
    const existingTooltip = container.querySelector('.chart-tooltip')
    if (existingTooltip) {
      existingTooltip.remove()
    }

    // Create tooltip element
    const tooltip = document.createElement('div')
    tooltip.className = 'chart-tooltip'
    tooltip.style.cssText = `
      width: 160px; 
      height: auto; 
      position: absolute; 
      display: none; 
      padding: 8px; 
      box-sizing: border-box; 
      font-size: 12px; 
      text-align: left; 
      z-index: 1000; 
      pointer-events: none; 
      border: 1px solid; 
      border-radius: 4px;
      font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif; 
      -webkit-font-smoothing: antialiased; 
      -moz-osx-font-smoothing: grayscale;
      background: white;
      color: black;
      border-color: #26a69a;
    `
    
    container.appendChild(tooltip)
    tooltipRef.current = tooltip

    return () => {
      if (tooltip && tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip)
      }
    }
  }, [container])

  useEffect(() => {
    if (!tooltipRef.current || !isVisible || !data || !position || !timestamp) {
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none'
      }
      return
    }

    const tooltip = tooltipRef.current
    const date = new Date(timestamp * 1000)
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const formatPrice = (price: number) => price.toFixed(4)
    
    // Determine if this is line data or candlestick data
    const isLineData = 'value' in data && data.value !== undefined
    
    let priceContent = ''
    let priceChangeColor = '#26a69a'
    
    if (isLineData) {
      const price = data.value!
      priceContent = `
        <div style="font-size: 11px; color: black;">
          Price: <span style="color: ${priceChangeColor};">${formatPrice(price)}</span>
        </div>
      `
    } else {
      const { open = 0, high = 0, low = 0, close = 0 } = data
      priceChangeColor = close >= open ? '#26a69a' : '#ef5350'
      
      priceContent = `
        <div style="font-size: 11px; color: black;">
          Open: <span style="color: ${priceChangeColor};">${formatPrice(open)}</span>
        </div>
        <div style="font-size: 11px; color: black;">
          High: <span style="color: #26a69a;">${formatPrice(high)}</span>
        </div>
        <div style="font-size: 11px; color: black;">
          Low: <span style="color: #ef5350;">${formatPrice(low)}</span>
        </div>
        <div style="font-size: 11px; color: black;">
          Close: <span style="color: ${priceChangeColor};">${formatPrice(close)}</span>
        </div>
      `
    }

    tooltip.innerHTML = `
      <div style="color: #26a69a; font-weight: 500;">
        ${selectedToken.toUpperCase()} Token
      </div>
      <div style="margin: 4px 0px;">
        ${priceContent}
      </div>
      <div style="color: black; font-size: 10px;">
        ${dateStr}
      </div>
    `

    // Position tooltip
    const toolTipWidth = 160
    const toolTipHeight = 80
    const toolTipMargin = 15

    let left = position.x + toolTipMargin
    if (left > container.clientWidth - toolTipWidth) {
      left = position.x - toolTipMargin - toolTipWidth
    }

    let top = position.y + toolTipMargin
    if (top > container.clientHeight - toolTipHeight) {
      top = position.y - toolTipHeight - toolTipMargin
    }

    tooltip.style.left = left + 'px'
    tooltip.style.top = top + 'px'
    tooltip.style.display = 'block'
  }, [data, position, timestamp, selectedToken, isVisible])

  return null
}