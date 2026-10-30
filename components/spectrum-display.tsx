"use client"

import { useRef, useEffect } from "react"
import { maxOf } from "@/lib/seismic-utils"

// 画布无法解析 CSS 变量（hsl(var(--card)) 会被静默忽略而画成黑底），这里直接使用与亮色主题一致的颜色
const CHART = { background: "#ffffff", grid: "#e5e7eb", axis: "#9ca3af", text: "#6b7280" }

interface SpectrumDisplayProps {
  spectrum: { frequencies: number[]; amplitudes: number[] }
  title: string
  color: string
  height?: number
  /** 显示的最高频率 (Hz)，默认 150 */
  maxFrequency?: number
}

export function SpectrumDisplay({ spectrum, title, color, height = 180, maxFrequency = 150 }: SpectrumDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const width = rect.width
      const padding = { top: 20, right: 20, bottom: 35, left: 50 }
      const plotWidth = width - padding.left - padding.right
      const plotHeight = height - padding.top - padding.bottom

      // Clear canvas
      ctx.fillStyle = CHART.background
      ctx.fillRect(0, 0, width, height)

      const { frequencies, amplitudes } = spectrum
      if (frequencies.length === 0) return

      // Find max frequency to display
      const maxFreqDisplay = maxFrequency
      const maxFreqIndex = frequencies.findIndex((f) => f > maxFreqDisplay)
      const displayFreqs = frequencies.slice(0, maxFreqIndex > 0 ? maxFreqIndex : undefined)
      const displayAmps = amplitudes.slice(0, maxFreqIndex > 0 ? maxFreqIndex : undefined)

      const maxAmp = maxOf(displayAmps) || 1
      const maxFreq = maxOf(displayFreqs)

      // Draw grid
      ctx.strokeStyle = CHART.grid
      ctx.lineWidth = 0.5
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (plotHeight * i) / 4
        ctx.beginPath()
        ctx.moveTo(padding.left, y)
        ctx.lineTo(padding.left + plotWidth, y)
        ctx.stroke()
      }

      // Draw spectrum
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      displayFreqs.forEach((freq, i) => {
        const x = padding.left + (freq / maxFreq) * plotWidth
        const y = padding.top + plotHeight - (displayAmps[i] / maxAmp) * plotHeight
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.stroke()

      // Fill under curve
      ctx.fillStyle = color + "30"
      ctx.beginPath()
      ctx.moveTo(padding.left, padding.top + plotHeight)
      displayFreqs.forEach((freq, i) => {
        const x = padding.left + (freq / maxFreq) * plotWidth
        const y = padding.top + plotHeight - (displayAmps[i] / maxAmp) * plotHeight
        ctx.lineTo(x, y)
      })
      ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight)
      ctx.closePath()
      ctx.fill()

      // Draw axes labels
      ctx.fillStyle = CHART.text
      ctx.font = "11px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("频率 (Hz)", padding.left + plotWidth / 2, height - 5)

      ctx.save()
      ctx.translate(12, padding.top + plotHeight / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText("幅值", 0, 0)
      ctx.restore()

      // Draw tick labels
      ctx.font = "10px sans-serif"
      ctx.textAlign = "center"
      for (let i = 0; i <= 5; i++) {
        const f = (maxFreq * i) / 5
        const x = padding.left + (plotWidth * i) / 5
        ctx.fillText(f.toFixed(0), x, height - 20)
      }
    }

    draw()
    // 容器宽度变化（窗口缩放、切换页签）时按新尺寸重绘，避免拉伸模糊
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [spectrum, color, height, maxFrequency])

  return <canvas ref={canvasRef} style={{ width: "100%", height }} className="rounded" />
}
