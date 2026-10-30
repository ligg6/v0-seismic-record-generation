/**
 * Generate a Ricker (Mexican Hat) wavelet
 * @param frequency - Dominant frequency in Hz
 * @param dt - Sample interval in seconds
 * @param length - Wavelet length in seconds
 */
export function generateRickerWavelet(frequency: number, dt: number, length: number): number[] {
  const numSamples = Math.floor(length / dt)
  const halfLength = Math.floor(numSamples / 2)
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
 */
export function convolve(signal: number[], kernel: number[]): number[] {
  const resultLength = signal.length + kernel.length - 1
  const result = new Array(resultLength).fill(0)

  for (let i = 0; i < signal.length; i++) {
    for (let j = 0; j < kernel.length; j++) {
      result[i + j] += signal[i] * kernel[j]
    }
  }

  return result
}

/**
 * Calculate amplitude spectrum using DFT
 */
export function calculateSpectrum(signal: number[], dt: number): { frequencies: number[]; amplitudes: number[] } {
  const n = signal.length
  const frequencies: number[] = []
  const amplitudes: number[] = []

  // Calculate frequency resolution
  const df = 1 / (n * dt)

  // Only compute positive frequencies (up to Nyquist)
  const numFreqs = Math.floor(n / 2)

  for (let k = 0; k < numFreqs; k++) {
    let real = 0
    let imag = 0

    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n
      real += signal[t] * Math.cos(angle)
      imag -= signal[t] * Math.sin(angle)
    }

    frequencies.push(k * df)
    amplitudes.push(Math.sqrt(real * real + imag * imag) / n)
  }

  return { frequencies, amplitudes }
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
