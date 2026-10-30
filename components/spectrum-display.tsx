"use client"

import { useRef, useEffect } from "react"

interface SpectrumDisplayProps {
  spectrum: { frequencies: number[]; amplitudes: number[] }
  title: string
  color: string
  height?: number
}

export function SpectrumDisplay({ spectrum, title, color, height = 180 }: SpectrumDisplayProps) {
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

    const { frequencies, amplitudes } = spectrum
    if (frequencies.length === 0) return

    // Find max frequency to display (up to 150 Hz)
    const maxFreqDisplay = 150
    const maxFreqIndex = frequencies.findIndex((f) => f > maxFreqDisplay)
    const displayFreqs = frequencies.slice(0, maxFreqIndex > 0 ? maxFreqIndex : undefined)
    const displayAmps = amplitudes.slice(0, maxFreqIndex > 0 ? maxFreqIndex : undefined)

    const maxAmp = Math.max(...displayAmps) || 1
    const maxFreq = Math.max(...displayFreqs)

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
    ctx.fillStyle = "hsl(var(--muted-foreground))"
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
  }, [spectrum, color, height])

  return <canvas ref={canvasRef} style={{ width: "100%", height }} className="rounded" />
}
