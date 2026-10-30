"use client"

import { useRef, useEffect } from "react"

interface WaveformDisplayProps {
  data: number[]
  timeAxis: number[]
  title: string
  color: string
  xLabel?: string
  yLabel?: string
  height?: number
  isImpulse?: boolean
}

export function WaveformDisplay({
  data,
  timeAxis,
  title,
  color,
  xLabel = "Time",
  yLabel = "Amplitude",
  height = 150,
  isImpulse = false,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const width = rect.width
    const padding = { top: 20, right: 20, bottom: 35, left: 50 }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom

    // Clear canvas
    ctx.fillStyle = "hsl(var(--card))"
    ctx.fillRect(0, 0, width, height)

    // Find data range
    const maxAbs = Math.max(...data.map(Math.abs)) || 1
    const minTime = Math.min(...timeAxis)
    const maxTime = Math.max(...timeAxis)
    const timeRange = maxTime - minTime || 1

    // Draw grid
    ctx.strokeStyle = "hsl(var(--border))"
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (plotHeight * i) / 4
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + plotWidth, y)
      ctx.stroke()
    }

    // Draw zero line
    ctx.strokeStyle = "hsl(var(--muted-foreground))"
    ctx.lineWidth = 1
    const zeroY = padding.top + plotHeight / 2
    ctx.beginPath()
    ctx.moveTo(padding.left, zeroY)
    ctx.lineTo(padding.left + plotWidth, zeroY)
    ctx.stroke()

    // Draw waveform
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 1.5

    if (isImpulse) {
      // Draw impulses
      data.forEach((val, i) => {
        if (Math.abs(val) > 0.001) {
          const x = padding.left + ((timeAxis[i] - minTime) / timeRange) * plotWidth
          const y = padding.top + plotHeight / 2 - (val / maxAbs) * (plotHeight / 2)
          ctx.beginPath()
          ctx.moveTo(x, zeroY)
          ctx.lineTo(x, y)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(x, y, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    } else {
      // Draw continuous line
      ctx.beginPath()
      data.forEach((val, i) => {
        const x = padding.left + ((timeAxis[i] - minTime) / timeRange) * plotWidth
        const y = padding.top + plotHeight / 2 - (val / maxAbs) * (plotHeight / 2)
        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.stroke()

      // Fill positive side
      ctx.fillStyle = color + "40"
      ctx.beginPath()
      ctx.moveTo(padding.left, zeroY)
      data.forEach((val, i) => {
        const x = padding.left + ((timeAxis[i] - minTime) / timeRange) * plotWidth
        const y = padding.top + plotHeight / 2 - (Math.max(0, val) / maxAbs) * (plotHeight / 2)
        ctx.lineTo(x, y)
      })
      ctx.lineTo(padding.left + plotWidth, zeroY)
      ctx.closePath()
      ctx.fill()
    }

    // Draw axes labels
    ctx.fillStyle = "hsl(var(--muted-foreground))"
    ctx.font = "11px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(xLabel, padding.left + plotWidth / 2, height - 5)

    ctx.save()
    ctx.translate(12, padding.top + plotHeight / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(yLabel, 0, 0)
    ctx.restore()

    // Draw tick labels
    ctx.font = "10px sans-serif"
    ctx.textAlign = "center"
    for (let i = 0; i <= 4; i++) {
      const t = minTime + (timeRange * i) / 4
      const x = padding.left + (plotWidth * i) / 4
      ctx.fillText(t.toFixed(3), x, height - 20)
    }

    ctx.textAlign = "right"
    ctx.fillText(maxAbs.toFixed(2), padding.left - 5, padding.top + 4)
    ctx.fillText((-maxAbs).toFixed(2), padding.left - 5, height - padding.bottom)
    ctx.fillText("0", padding.left - 5, zeroY + 4)
  }, [data, timeAxis, color, height, isImpulse, xLabel, yLabel])

  return <canvas ref={canvasRef} style={{ width: "100%", height }} className="rounded" />
}
