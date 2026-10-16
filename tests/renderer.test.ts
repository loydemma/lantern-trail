import { it, expect, beforeEach } from 'vitest'
import { showFallback } from '../src/engine/renderer'

beforeEach(() => {
  document.body.innerHTML = '<span id="status-pill">LOADING</span><div id="fallback-card" hidden></div>'
})

it('showFallback reveals the fallback card and marks the pill unavailable', () => {
  showFallback()
  expect(document.getElementById('fallback-card')!.hidden).toBe(false)
  expect(document.getElementById('status-pill')!.textContent).toBe('UNAVAILABLE')
})
