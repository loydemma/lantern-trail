import { describe, it, expect } from 'vitest'
import { createRiverState } from '../src/scenes/river/riverState'
import type { TokenNode } from '../src/scenes/river/tokenScript'

const nodes: Record<string, TokenNode> = {
  a: { id: 'a', candidates: [
    { text: 'glowed', logit: 3, next: 'b' },
    { text: 'flickered', logit: 1, next: 'b' },
    { text: 'un', logit: 0, next: 'c' },
  ] },
  b: { id: 'b', candidates: [
    { text: 'softly', logit: 2, next: null },
    { text: 'bright', logit: 1, next: null },
    { text: 'once', logit: 0, next: null },
  ] },
  c: { id: 'c', candidates: [
    { text: 'lit', logit: 2, next: null, joinsPrevious: true },
    { text: 'seen', logit: 1, next: null, joinsPrevious: true },
    { text: 'done', logit: 0, next: null, joinsPrevious: true },
  ] },
}
const script = { start: 'a', prompt: 'The lantern', nodes }

describe('river state', () => {
  it('starts with the prompt', () => {
    expect(createRiverState(script, () => 0).sentence()).toBe('The lantern')
  })
  it('grows the sentence after a completed step', () => {
    const s = createRiverState(script, () => 0)
    expect(s.step(0.8)).toEqual({ chosen: 0 })
    s.finishStep()
    expect(s.sentence()).toBe('The lantern glowed')
  })
  it('ignores a step while busy', () => {
    const s = createRiverState(script, () => 0)
    s.step(0.8)
    expect(s.isBusy()).toBe(true)
    expect(s.step(0.8)).toBeNull()
    s.finishStep()
    expect(s.sentence()).toBe('The lantern glowed')
  })
  it('offers new candidates after a step', () => {
    const s = createRiverState(script, () => 0)
    const before = s.candidates(0.8).map((c) => c.text)
    s.step(0.8); s.finishStep()
    expect(s.candidates(0.8).map((c) => c.text)).not.toEqual(before)
  })
  it('joins continuation tokens without a space', () => {
    const s = createRiverState(script, () => 0.99)
    s.step(0.8); s.finishStep()
    s.step(0.8); s.finishStep()
    expect(s.sentence()).toBe('The lantern undone')
  })
  it('completes at a terminal and refuses further steps', () => {
    const s = createRiverState(script, () => 0)
    s.step(0.8); s.finishStep(); s.step(0.8); s.finishStep()
    expect(s.isComplete()).toBe(true)
    expect(s.step(0.8)).toBeNull()
  })
  it('reset restores the prompt', () => {
    const s = createRiverState(script, () => 0)
    s.step(0.8); s.finishStep(); s.reset()
    expect(s.sentence()).toBe('The lantern')
    expect(s.isComplete()).toBe(false)
  })
})
