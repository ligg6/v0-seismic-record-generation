"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, X } from "lucide-react"
import { maxAbsOf } from "@/lib/seismic-utils"

interface ValidationPanelProps {
  wavelet: number[]
  syntheticTrace: number[]
  reflectionSeries: number[]
  waveletSpectrum: { frequencies: number[]; amplitudes: number[] }
  /** 记录时长内各界面的双程时 (s) */
  interfaceTimes: number[]
  frequency: number
  sampleRate: number
}

export function ValidationPanel({
  wavelet,
  syntheticTrace,
  reflectionSeries,
  waveletSpectrum,
  interfaceTimes,
  frequency,
  sampleRate,
}: ValidationPanelProps) {
  const validations = useMemo(() => {
    const waveletPeak = maxAbsOf(wavelet) || 1

    // 1. 子波窗口是否足够长：窗口边缘振幅应可忽略，否则截断会给频谱引入直流分量
    const edgeRatio = Math.max(Math.abs(wavelet[0]), Math.abs(wavelet[wavelet.length - 1])) / waveletPeak
    const notTruncated = edgeRatio < 0.01

    // 2. 实测子波频谱峰值应等于设定主频（Ricker 子波振幅谱峰值即主频）
    const { frequencies, amplitudes } = waveletSpectrum
    let peakIndex = 1
    for (let k = 1; k < amplitudes.length; k++) if (amplitudes[k] > amplitudes[peakIndex]) peakIndex = k
    const peakFrequency = frequencies[peakIndex] ?? 0
    const df = frequencies[1] ?? 0
    const peakMatches = Math.abs(peakFrequency - frequency) <= Math.max(0.05 * frequency, df)

    // 3. 采样是否充分：Ricker 振幅谱 A(f)/A(fm) = (f/fm)² · exp(1 − (f/fm)²)，奈奎斯特频率处应低于 5%（约需 f_N ≥ 2.5 fm）
    const nyquist = 1 / (2 * sampleRate)
    const ratio = nyquist / frequency
    const ampAtNyquist = ratio * ratio * Math.exp(1 - ratio * ratio)
    const wellSampled = ampAtNyquist < 0.05

    // 4. 反射时间：首个界面若与下一界面相距足够远（≥ 1/fm，无调谐干涉），合成道在该处的极值应正好落在界面双程时
    const firstTime = interfaceTimes[0]
    let timing: { passed: boolean; detail: string }
    if (firstTime === undefined) {
      timing = { passed: false, detail: "记录时长内没有反射界面" }
    } else if (interfaceTimes.length > 1 && interfaceTimes[1] - firstTime < 1 / frequency) {
      timing = { passed: true, detail: "首个界面与下一界面间距小于 1/主频，存在调谐干涉，不比较峰值位置" }
    } else {
      const center = Math.round(firstTime / sampleRate)
      const halfWindow = Math.max(1, Math.round(0.5 / frequency / sampleRate))
      let best = center
      for (let i = Math.max(0, center - halfWindow); i <= Math.min(syntheticTrace.length - 1, center + halfWindow); i++) {
        if (Math.abs(syntheticTrace[i]) > Math.abs(syntheticTrace[best])) best = i
      }
      const offsetMs = (best - firstTime / sampleRate) * sampleRate * 1000
      timing = {
        passed: best === center,
        detail: `首个界面 ${(firstTime * 1000).toFixed(1)} ms，合成道峰值 ${(best * sampleRate * 1000).toFixed(1)} ms（偏差 ${offsetMs.toFixed(1)} ms）`,
      }
    }

    // 5. 记录中应有非零反射
    const reflectionCount = reflectionSeries.filter((v) => v !== 0).length
    const hasReflections = reflectionCount > 0 && maxAbsOf(syntheticTrace) > 0

    return [
      {
        name: "子波窗口完整（未截断）",
        passed: notTruncated,
        detail: `窗口边缘振幅为峰值的 ${(edgeRatio * 100).toFixed(3)}%（应 < 1%）`,
      },
      {
        name: "子波频谱峰值与主频一致",
        passed: peakMatches,
        detail: `设定主频 ${frequency} Hz，实测频谱峰值 ${peakFrequency.toFixed(1)} Hz`,
      },
      {
        name: "采样充分（奈奎斯特频率处子波能量可忽略）",
        passed: wellSampled,
        detail: `奈奎斯特 ${nyquist.toFixed(1)} Hz 处子波振幅为峰值的 ${(ampAtNyquist * 100).toFixed(1)}%（应 < 5%，约需 ≥ ${(2.5 * frequency).toFixed(0)} Hz）`,
      },
      {
        name: "反射时间与模型一致",
        ...timing,
      },
      {
        name: "合成记录包含反射",
        passed: hasReflections,
        detail: hasReflections
          ? `记录时长内有 ${reflectionCount} 个非零反射`
          : "没有非零反射：界面超出记录时长，或相邻层波阻抗相同",
      },
    ]
  }, [wavelet, syntheticTrace, reflectionSeries, waveletSpectrum, interfaceTimes, frequency, sampleRate])

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
