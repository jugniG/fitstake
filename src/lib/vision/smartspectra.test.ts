import { describe, expect, it } from 'vitest'
import { SmartSpectraSensor } from './smartspectra'

describe('SmartSpectraSensor', () => {
  it('initializes with default physiological baselines', () => {
    const sensor = new SmartSpectraSensor()
    sensor.setBaseline(70, 15, 60)
    const reading = sensor.processFrame(null, 1000)

    expect(reading.pulseBpm).toBe(70)
    expect(reading.breathingRate).toBe(15)
    expect(reading.exertionZone).toBe('Resting')
  })

  it('adjusts heart rate and exertion zones during active workout reps', () => {
    const sensor = new SmartSpectraSensor()
    sensor.setBaseline(70)

    let reading = sensor.processFrame(null, 1000, false, 10)
    expect(reading.pulseBpm).toBeGreaterThanOrEqual(70)

    // Simulate sustained workout reps over time
    for (let t = 1100; t <= 3000; t += 100) {
      reading = sensor.processFrame(null, t, false, 15)
    }

    expect(reading.pulseBpm).toBeGreaterThan(80)
    expect(reading.exertionZone).toMatch(/Warm-up|Aerobic/)
  })

  it('models heart rate recovery drop during rest phase', () => {
    const sensor = new SmartSpectraSensor()
    sensor.setBaseline(70)

    // Push up heart rate with reps
    for (let t = 1000; t <= 3000; t += 100) {
      sensor.processFrame(null, t, false, 15)
    }
    const peakReading = sensor.processFrame(null, 3100, false, 15)

    // Enter rest phase
    for (let t = 3200; t <= 8000; t += 100) {
      sensor.processFrame(null, t, true, 0)
    }
    const restedReading = sensor.processFrame(null, 8100, true, 0)

    expect(restedReading.pulseBpm).toBeLessThan(peakReading.pulseBpm)

    const summary = sensor.getSummary()
    expect(summary.recoveryBpmDrop).toBeGreaterThan(0)
    expect(summary.cardioExertionScore).toBeGreaterThanOrEqual(20)
  })
})
