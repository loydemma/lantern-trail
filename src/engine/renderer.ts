import { WebGPURenderer } from 'three/webgpu'
import type { Quality } from './quality'

export type Backend = 'webgpu' | 'webgl'

export async function createRenderer(
  canvas: HTMLCanvasElement,
  q: Quality,
): Promise<{ renderer: WebGPURenderer; backend: Backend }> {
  // WebGPURenderer falls back to WebGL2 on its own when WebGPU is unavailable.
  const renderer = new WebGPURenderer({ canvas, antialias: true, alpha: true })
  await renderer.init()
  renderer.setPixelRatio(q.pixelRatio)
  const backend: Backend = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'webgpu' : 'webgl'
  return { renderer, backend }
}

export function setStatus(text: string, state: 'live' | 'paused' | 'unavailable' = 'live'): void {
  const pill = document.getElementById('status-pill')
  if (!pill) return
  pill.textContent = text
  pill.dataset.state = state
}

export function showFallback(): void {
  const card = document.getElementById('fallback-card')
  if (card) card.hidden = false
  setStatus('UNAVAILABLE', 'unavailable')
}
