import { describe, it, expect } from 'vitest'
import { softmax, sample } from '../src/scenes/river/llm'

const l = [2, 1, 0.5, -1]
const spread = (p: number[]) => Math.max(...p) - Math.min(...p)

describe('softmax', () => {
  it('sums to 1', () => {
    expect(softmax(l, 0.8).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
  })
  it('sharpens at low temperature', () => {
    expect(Math.max(...softmax(l, 0.2))).toBeGreaterThan(Math.max(...softmax(l, 2.0)))
  })
  it('flattens at high temperature', () => {
    expect(spread(softmax(l, 2.0))).toBeLessThan(spread(softmax(l, 0.8)))
  })
  it('stays finite for huge logits', () => {
    expect(softmax([1000, 999], 1).every(Number.isFinite)).toBe(true)
  })
})

describe('sample', () => {
  it('picks by cumulative probability', () => {
    expect(sample([0.5, 0.3, 0.2], () => 0)).toBe(0)
    expect(sample([0.5, 0.3, 0.2], () => 0.6)).toBe(1)
    expect(sample([0.5, 0.3, 0.2], () => 0.9999)).toBe(2)
  })
})
