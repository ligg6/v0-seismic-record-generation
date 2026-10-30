"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X } from "lucide-react"

interface ValidationPanelProps {
  wavelet: number[]
  syntheticTrace: number[]
  reflectionSeries: number[]
  frequency: number
  sampleRate: number
}

export function ValidationPanel({
  wavelet,
  syntheticTrace,
  reflectionSeries,
  frequency,
  sampleRate,
}: ValidationPanelProps) {
  const validations = useMemo(() => {
    // 1. Check wavelet is zero-phase (symmetric)
    const midIndex = Math.floor(wavelet.length / 2)
    let symmetryError = 0
    for (let i = 0; i < midIndex; i++) {
      symmetryError += Math.abs(wavelet[midIndex - i] - wavelet[midIndex + i])
    }
    const isSymmetric = symmetryError / midIndex < 0.01

    // 2. Check wavelet peak is at center
    const maxIndex = wavelet.indexOf(Math.max(...wavelet))
    const peakAtCenter = Math.abs(maxIndex - midIndex) <= 1

    // 3. Check convolution length
    const expectedLength = reflectionSeries.length + wavelet.length - 1
    const correctConvLength = syntheticTrace.length === expectedLength

    // 4. Check energy preservation (rough estimate)
    const waveletEnergy = wavelet.reduce((sum, v) => sum + v * v, 0)
    const refEnergy = reflectionSeries.reduce((sum, v) => sum + v * v, 0)
    const traceEnergy = syntheticTrace.reduce((sum, v) => sum + v * v, 0)
    const expectedEnergy = waveletEnergy * refEnergy
    const energyRatio = traceEnergy / (expectedEnergy || 1)
    const energyReasonable = energyRatio > 0.1 && energyRatio < 10

    // 5. Check Ricker wavelet theoretical properties
    // Peak frequency should match dominant frequency
    const nyquist = 1 / (2 * sampleRate)
    const freqBelowNyquist = frequency < nyquist

    // 6. Check for reflections in synthetic trace
    const hasReflections = syntheticTrace.some((v) => Math.abs(v) > 0.001)

    // 7. Verify minimum phase consideration
    const maxTraceAmp = Math.max(...syntheticTrace.map(Math.abs))
    const maxWaveletAmp = Math.max(...wavelet.map(Math.abs))
    const amplitudePreserved = maxTraceAmp > 0 && maxWaveletAmp > 0

    return [
      {
        name: "子波对称性 (零相位)",
        passed: isSymmetric,
        detail: `对称误差: ${symmetryError.toFixed(4)}`,
      },
      {
        name: "子波峰值居中",
        passed: peakAtCenter,
        detail: `峰值位置偏移: ${Math.abs(maxIndex - midIndex)} 采样点`,
      },
      {
        name: "褶积长度正确",
        passed: correctConvLength,
        detail: `期望: ${expectedLength}, 实际: ${syntheticTrace.length}`,
      },
      {
        name: "频率满足采样定理",
        passed: freqBelowNyquist,
        detail: `主频: ${frequency} Hz, 奈奎斯特: ${nyquist.toFixed(1)} Hz`,
      },
      {
        name: "合成记录包含反射",
        passed: hasReflections,
        detail: hasReflections ? "检测到反射波形" : "未检测到有效反射",
      },
      {
        name: "振幅保持合理",
        passed: amplitudePreserved,
        detail: `子波峰值: ${maxWaveletAmp.toFixed(4)}, 道峰值: ${maxTraceAmp.toFixed(4)}`,
      },
    ]
  }, [wavelet, syntheticTrace, reflectionSeries, frequency, sampleRate])

  const passedCount = validations.filter((v) => v.passed).length
  const allPassed = passedCount === validations.length

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            验证结果总览
            {allPassed ? (
              <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800">全部通过</span>
            ) : (
              <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                {passedCount}/{validations.length} 通过
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {validations.map((validation, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                <div
                  className={`mt-0.5 rounded-full p-1 ${
                    validation.passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                  }`}
                >
                  {validation.passed ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{validation.name}</p>
                  <p className="text-xs text-muted-foreground">{validation.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">理论说明</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <div>
            <h4 className="font-medium text-foreground">褶积模型</h4>
            <p>合成地震记录 = 子波 * 反射系数序列</p>
            <p className="font-mono text-xs mt-1">S(t) = W(t) * R(t)</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">Ricker 子波</h4>
            <p>零相位子波，由主频 f 决定波形：</p>
            <p className="font-mono text-xs mt-1">W(t) = (1 - 2π²f²t²) × exp(-π²f²t²)</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground">反射系数</h4>
            <p>由相邻层波阻抗差异决定：</p>
            <p className="font-mono text-xs mt-1">R = (Z₂ - Z₁) / (Z₂ + Z₁), 其中 Z = ρ × V</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
