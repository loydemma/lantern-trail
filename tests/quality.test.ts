import { describe, it, expect } from 'vitest'
import { detectQuality } from '../src/engine/quality'

describe('detectQuality', () => {
  it('uses light tier with capped pixel ratio on touch devices', () => {
    const q = detectQuality({ coarsePointer: true, reducedMotion: false, cores: 8, dpr: 3 })
    expect(q.tier).toBe('light')
    expect(q.pixelRatio).toBeLessThanOrEqual(1.5)
  })
  it('uses high tier on a capable desktop', () => {
    const q = detectQuality({ coarsePointer: false, reducedMotion: false, cores: 8, dpr: 2 })
    expect(q.tier).toBe('high')
    expect(q.pixelRatio).toBe(2)
  })
  it('uses light tier on low-core machines', () => {
    expect(detectQuality({ coarsePointer: false, reducedMotion: false, cores: 2, dpr: 1 }).tier).toBe('light')
  })
  it('passes reduced motion through', () => {
    expect(detectQuality({ coarsePointer: false, reducedMotion: true, cores: 8, dpr: 1 }).reducedMotion).toBe(true)
  })
})
