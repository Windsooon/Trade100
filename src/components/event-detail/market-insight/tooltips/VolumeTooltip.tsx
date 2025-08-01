import { useRef, useEffect } from 'react'
import { MarketHistoryDataPoint } from '../types'

export interface VolumeTooltipProps {
  container: HTMLElement
  volumeData: MarketHistoryDataPoint[]
  position: { x: number; y: number } | null
  timestamp: number | null
  isVisible: boolean
  formatVolume: (value: number, isDollar?: boolean) => string
}

export function VolumeTooltip({ 
  container, 
  volumeData, 
  position, 
  timestamp, 
  isVisible,
  formatVolume
}: VolumeTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!container) return

    // Remove existing tooltip if any
    const existingTooltip = container.querySelector('.volume-tooltip')
    if (existingTooltip) {
      existingTooltip.remove()
    }

    // Create volume tooltip element
    const tooltip = document.createElement('div')
    tooltip.className = 'volume-tooltip'
    tooltip.style.cssText = `
      width: 180px; 
      height: auto; 
      position: absolute; 
      display: none; 
      padding: 10px; 
      box-sizing: border-box; 
      font-size: 12px; 
      text-align: left; 
      z-index: 1001; 
      pointer-events: none; 
      border: 1px solid; 
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif; 
      -webkit-font-smoothing: antialiased; 
      -moz-osx-font-smoothing: grayscale;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      border-color: #26a69a;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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
    if (!tooltipRef.current || !isVisible || !volumeData || !position || !timestamp) {
      if (tooltipRef.current) {
        tooltipRef.current.style.display = 'none'
      }
      return
    }

    const tooltip = tooltipRef.current
    
    // Find the volume data for this timestamp
    const volumePoint = volumeData.find(vol => vol.timestamp === timestamp)
    
    if (!volumePoint) {
      tooltip.style.display = 'none'
      return
    }

    const date = new Date(timestamp * 1000)
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    tooltip.innerHTML = `
      <div style="color: #26a69a; font-weight: 600; margin-bottom: 6px; border-bottom: 1px solid rgba(38, 166, 154, 0.3); padding-bottom: 4px;">
        📊 Volume Data
      </div>
      <div style="margin: 6px 0px;">
        <div style="font-size: 11px; color: white; margin-bottom: 3px; display: flex; justify-content: space-between;">
          <span>Total Size:</span>
          <span style="color: #26a69a; font-weight: 500;">${formatVolume(volumePoint.volume.totalSize)}</span>
        </div>
        <div style="font-size: 11px; color: white; margin-bottom: 3px; display: flex; justify-content: space-between;">
          <span>Dollar Volume:</span>
          <span style="color: #26a69a; font-weight: 500;">${formatVolume(volumePoint.volume.totalDollarVolume, true)}</span>
        </div>
      </div>
      <div style="color: #888; font-size: 10px; text-align: center; margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(136, 136, 136, 0.3);">
        ${dateStr}
      </div>
    `

    // Position volume tooltip
    const tooltipWidth = 180
    const tooltipHeight = 80
    const tooltipMargin = 15

    let left = position.x + tooltipMargin
    if (left > container.clientWidth - tooltipWidth) {
      left = position.x - tooltipMargin - tooltipWidth
    }

    let top = position.y + tooltipMargin
    if (top > container.clientHeight - tooltipHeight) {
      top = position.y - tooltipHeight - tooltipMargin
    }

    tooltip.style.left = left + 'px'
    tooltip.style.top = top + 'px'
    tooltip.style.display = 'block'
  }, [volumeData, position, timestamp, isVisible, formatVolume])

  return null
}