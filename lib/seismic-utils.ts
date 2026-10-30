/**
 * Ricker 子波窗口长度（秒）：至少 0.2 s，低主频时加长到 2.5/f，
 * 保证窗口边缘振幅可忽略（|t| = 1.25/f 处约为峰值的 6e-6），避免截断引入直流分量
 */
export function rickerWindowLength(frequency: number): number {
  return Math.max(0.2, 2.5 / frequency)
}

/**
 * Generate a Ricker (Mexican Hat) wavelet
 * @param frequency - Dominant frequency in Hz
 * @param dt - Sample interval in seconds
 * @param length - Wavelet length in seconds
 * @returns 奇数个样点的零相位子波，峰值位于中点
 */
export function generateRickerWavelet(frequency: number, dt: number, length: number): number[] {
  if (!(dt > 0) || !(length > 0) || !(frequency > 0)) {
    throw new RangeError(`invalid wavelet parameters: f=${frequency}, dt=${dt}, length=${length}`)
  }
  const halfLength = Math.floor(length / dt / 2)
  const wavelet: number[] = []

  for (let i = -halfLength; i <= halfLength; i++) {
    const t = i * dt
    const piFreqT = Math.PI * frequency * t
    const piFreqT2 = piFreqT * piFreqT
    const amplitude = (1 - 2 * piFreqT2) * Math.exp(-piFreqT2)
    wavelet.push(amplitude)
  }

  return wavelet
}

/**
 * Calculate reflection coefficients from layer model
 * 最后一层视为半空间，其厚度不参与计算
 */
export function calculateReflectionCoefficients(
  layers: { velocity: number; density: number; thickness: number }[],
  dt: number,
  duration: number,
): {
  coefficients: number[]
  times: number[]
  depths: number[]
  impedances: number[]
} {
  const coefficients: number[] = []
  const times: number[] = []
  const depths: number[] = []
  const impedances: number[] = []

  let cumulativeTime = 0
  let cumulativeDepth = 0

  for (let i = 0; i < layers.length - 1; i++) {
    const layer1 = layers[i]
    const layer2 = layers[i + 1]

    // Calculate acoustic impedance (Z = ρ × V)
    const z1 = layer1.density * layer1.velocity
    const z2 = layer2.density * layer2.velocity

    // Store impedances
    if (i === 0) impedances.push(z1)
    impedances.push(z2)

    // Calculate reflection coefficient at interface
    const rc = (z2 - z1) / (z2 + z1)

    // Calculate two-way travel time to this interface
    cumulativeTime += (2 * layer1.thickness) / layer1.velocity
    cumulativeDepth += layer1.thickness

    if (cumulativeTime < duration) {
      coefficients.push(rc)
      times.push(cumulativeTime)
      depths.push(cumulativeDepth)
    }
  }

  return { coefficients, times, depths, impedances }
}

/**
 * Perform convolution of two signals
 * 跳过 signal 中的零值样点：反射系数序列是稀疏的，计算量从 O(N·M) 降到 O(K·M)（K 为反射界面数）
 */
export function convolve(signal: number[], kernel: number[]): number[] {
  const resultLength = signal.length + kernel.length - 1
  const result = new Array(resultLength).fill(0)

  for (let i = 0; i < signal.length; i++) {
    const s = signal[i]
    if (s === 0) continue
    for (let j = 0; j < kernel.length; j++) {
      result[i + j] += s * kernel[j]
    }
  }

  return result
}

/** 原地迭代 radix-2 FFT，re/im 长度须为 2 的幂 */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    const wr = Math.cos(ang)
    const wi = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < len / 2; k++) {
        const a = i + k
        const b = a + len / 2
        const xr = re[b] * cr - im[b] * ci
        const xi = re[b] * ci + im[b] * cr
        re[b] = re[a] - xr
        im[b] = im[a] - xi
        re[a] += xr
        im[a] += xi
        const nr = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = nr
      }
    }
  }
}

/**
 * Calculate amplitude spectrum (FFT)
 * 补零到至少 minLength 点（2 的幂）以细化频率采样；幅值按原始长度归一化，取 0 到奈奎斯特频率
 */
export function calculateSpectrum(
  signal: number[],
  dt: number,
  minLength = 4096,
): { frequencies: number[]; amplitudes: number[] } {
  const n = signal.length
  let nfft = 1
  while (nfft < Math.max(n, minLength)) nfft <<= 1

  const re = new Float64Array(nfft)
  const im = new Float64Array(nfft)
  re.set(signal)
  fft(re, im)

  const df = 1 / (nfft * dt)
  const frequencies: number[] = []
  const amplitudes: number[] = []
  for (let k = 0; k <= nfft / 2; k++) {
    frequencies.push(k * df)
    amplitudes.push(Math.hypot(re[k], im[k]) / n)
  }

  return { frequencies, amplitudes }
}

/** 数组最大值（不用展开运算符，避免大数组超出函数参数上限） */
export function maxOf(values: number[]): number {
  let m = -Infinity
  for (const v of values) if (v > m) m = v
  return m
}

/** 数组最小值 */
export function minOf(values: number[]): number {
  let m = Infinity
  for (const v of values) if (v < m) m = v
  return m
}

/** 数组绝对值最大值 */
export function maxAbsOf(values: number[]): number {
  let m = 0
  for (const v of values) {
    const a = Math.abs(v)
    if (a > m) m = a
  }
  return m
}

/**
 * Convert time to depth given velocity model
 */
export function timeToDepth(time: number, layers: { velocity: number; thickness: number }[]): number {
  let remainingTime = time / 2 // Convert to one-way time
  let depth = 0

  for (const layer of layers) {
    const layerTime = layer.thickness / layer.velocity
    if (remainingTime <= layerTime) {
      depth += remainingTime * layer.velocity
      break
    }
    depth += layer.thickness
    remainingTime -= layerTime
  }

  return depth
}
