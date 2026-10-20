import { it, expect, beforeEach } from 'vitest'
import { showFallback } from '../src/engine/renderer'

beforeEach(() => {
  document.body.innerHTML = '<div id="fallback-card" hidden></div>'
})

it('showFallback reveals the fallback card', () => {
  showFallback()
  expect(document.getElementById('fallback-card')!.hidden).toBe(false)
})
