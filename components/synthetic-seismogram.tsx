"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayerModel } from "@/components/layer-model"
import { WaveformDisplay } from "@/components/waveform-display"
import { SpectrumDisplay } from "@/components/spectrum-display"
import { ValidationPanel } from "@/components/validation-panel"
import {
  generateRickerWavelet,
  calculateReflectionCoefficients,
  convolve,
  calculateSpectrum,
} from "@/lib/seismic-utils"

export interface Layer {
  id: string
  velocity: number // m/s
  density: number // kg/m³
  thickness: number // m
}

const defaultLayers: Layer[] = [
  { id: "1", velocity: 2000, density: 2000, thickness: 100 },
  { id: "2", velocity: 2500, density: 2200, thickness: 150 },
  { id: "3", velocity: 3000, density: 2400, thickness: 200 },
  { id: "4", velocity: 3500, density: 2600, thickness: 250 },
  { id: "5", velocity: 4000, density: 2800, thickness: 300 },
]

export function SyntheticSeismogram() {
  const [layers, setLayers] = useState<Layer[]>(defaultLayers)
  const [frequency, setFrequency] = useState(25) // Hz
  const [sampleRate, setSampleRate] = useState(0.001) // seconds
  const [duration, setDuration] = useState(1.0) // seconds

  const seismicData = useMemo(() => {
    // Generate Ricker wavelet
    const wavelet = generateRickerWavelet(frequency, sampleRate, 0.2)

    // Calculate reflection coefficients
    const { coefficients, times, depths, impedances } = calculateReflectionCoefficients(layers, sampleRate, duration)

    // Create reflection series (sparse impulse response)
    const numSamples = Math.floor(duration / sampleRate)
    const reflectionSeries = new Array(numSamples).fill(0)

    times.forEach((time, i) => {
      const sampleIndex = Math.floor(time / sampleRate)
      if (sampleIndex < numSamples) {
        reflectionSeries[sampleIndex] = coefficients[i]
      }
    })

    // Convolve wavelet with reflection series
    const syntheticTrace = convolve(reflectionSeries, wavelet)

    // Calculate spectra
    const waveletSpectrum = calculateSpectrum(wavelet, sampleRate)
    const traceSpectrum = calculateSpectrum(syntheticTrace, sampleRate)

    // Create time axis
    const timeAxis = Array.from({ length: syntheticTrace.length }, (_, i) => i * sampleRate)
    const waveletTimeAxis = Array.from(
      { length: wavelet.length },
      (_, i) => (i - Math.floor(wavelet.length / 2)) * sampleRate,
    )

    return {
      wavelet,
      waveletTimeAxis,
      reflectionSeries,
      syntheticTrace,
      timeAxis,
      waveletSpectrum,
      traceSpectrum,
      coefficients,
      times,
      depths,
      impedances,
    }
  }, [layers, frequency, sampleRate, duration])

  const handleAddLayer = useCallback(() => {
    const newId = String(Date.now())
    setLayers((prev) => [...prev, { id: newId, velocity: 3000, density: 2400, thickness: 100 }])
  }, [])

  const handleRemoveLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((layer) => layer.id !== id))
  }, [])

  const handleUpdateLayer = useCallback((id: string, updates: Partial<Layer>) => {
    setLayers((prev) => prev.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer)))
  }, [])

  const handleReset = useCallback(() => {
    setLayers(defaultLayers)
    setFrequency(25)
    setSampleRate(0.001)
    setDuration(1.0)
  }, [])

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Panel: Parameters */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">子波参数</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>主频 (Hz): {frequency}</Label>
              <Slider value={[frequency]} onValueChange={([v]) => setFrequency(v)} min={5} max={80} step={1} />
            </div>
            <div className="space-y-2">
              <Label>采样间隔 (ms)</Label>
              <Input
                type="number"
                value={sampleRate * 1000}
                onChange={(e) => setSampleRate(Number(e.target.value) / 1000)}
                min={0.1}
                max={10}
                step={0.1}
              />
            </div>
            <div className="space-y-2">
              <Label>记录时长 (s)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min={0.5}
                max={5}
                step={0.1}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">地层模型</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleAddLayer}>
                添加
              </Button>
              <Button size="sm" variant="outline" onClick={handleReset}>
                重置
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <LayerModel layers={layers} onUpdate={handleUpdateLayer} onRemove={handleRemoveLayer} />
          </CardContent>
        </Card>
      </div>

      {/* Right Panel: Visualization */}
      <div className="lg:col-span-2 space-y-6">
        <Tabs defaultValue="waveform" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="waveform">波形显示</TabsTrigger>
            <TabsTrigger value="spectrum">频谱分析</TabsTrigger>
            <TabsTrigger value="model">模型可视化</TabsTrigger>
            <TabsTrigger value="validation">验证分析</TabsTrigger>
          </TabsList>

          <TabsContent value="waveform" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ricker 子波</CardTitle>
                </CardHeader>
                <CardContent>
                  <WaveformDisplay
                    data={seismicData.wavelet}
                    timeAxis={seismicData.waveletTimeAxis}
                    title="Ricker Wavelet"
                    color="#3b82f6"
                    xLabel="时间 (s)"
                    yLabel="振幅"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">反射系数序列</CardTitle>
                </CardHeader>
                <CardContent>
                  <WaveformDisplay
                    data={seismicData.reflectionSeries}
                    timeAxis={seismicData.timeAxis.slice(0, seismicData.reflectionSeries.length)}
                    title="Reflection Coefficients"
                    color="#ef4444"
                    xLabel="时间 (s)"
                    yLabel="反射系数"
                    isImpulse
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">合成地震记录</CardTitle>
              </CardHeader>
              <CardContent>
                <WaveformDisplay
                  data={seismicData.syntheticTrace}
                  timeAxis={seismicData.timeAxis}
                  title="Synthetic Seismogram"
                  color="#10b981"
                  xLabel="时间 (s)"
                  yLabel="振幅"
                  height={200}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spectrum">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">子波频谱</CardTitle>
                </CardHeader>
                <CardContent>
                  <SpectrumDisplay spectrum={seismicData.waveletSpectrum} title="Wavelet Spectrum" color="#3b82f6" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">合成记录频谱</CardTitle>
                </CardHeader>
                <CardContent>
                  <SpectrumDisplay spectrum={seismicData.traceSpectrum} title="Trace Spectrum" color="#10b981" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="model">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">地层模型与波阻抗</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="mb-2 font-medium text-sm text-muted-foreground">地层剖面</h4>
                    <div className="space-y-1">
                      {layers.map((layer, i) => {
                        const impedance = layer.velocity * layer.density
                        const hue = 200 - layer.velocity / 50
                        return (
                          <div
                            key={layer.id}
                            className="flex items-center justify-between rounded px-3 py-2 text-sm text-white"
                            style={{
                              backgroundColor: `hsl(${hue}, 60%, 45%)`,
                              height: Math.max(30, layer.thickness / 5),
                            }}
                          >
                            <span>层 {i + 1}</span>
                            <span>V={layer.velocity} m/s</span>
                            <span>Z={(impedance / 1e6).toFixed(2)} MRayl</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 font-medium text-sm text-muted-foreground">反射系数表</h4>
                    <div className="rounded border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-2 py-1 text-left">界面</th>
                            <th className="px-2 py-1 text-right">深度 (m)</th>
                            <th className="px-2 py-1 text-right">时间 (ms)</th>
                            <th className="px-2 py-1 text-right">反射系数</th>
                          </tr>
                        </thead>
                        <tbody>
                          {seismicData.coefficients.map((coef, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-2 py-1">{i + 1}</td>
                              <td className="px-2 py-1 text-right">{seismicData.depths[i].toFixed(1)}</td>
                              <td className="px-2 py-1 text-right">{(seismicData.times[i] * 1000).toFixed(1)}</td>
                              <td className="px-2 py-1 text-right font-mono">{coef.toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation">
            <ValidationPanel
              wavelet={seismicData.wavelet}
              syntheticTrace={seismicData.syntheticTrace}
              reflectionSeries={seismicData.reflectionSeries}
              frequency={frequency}
              sampleRate={sampleRate}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
