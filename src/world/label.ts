import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three/webgpu'

// Editorial label: italic serif word with an optional small sans line beneath.
export function labelTexture(text: string, sub = ''): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const g = c.getContext('2d')!
  g.textAlign = 'center'
  g.fillStyle = '#2b2233'
  // Shrink long words to fit the canvas instead of clipping them.
  let size = 112
  do {
    g.font = `italic ${size}px "Instrument Serif", Georgia, serif`
    size -= 6
  } while (g.measureText(text).width > 488 && size > 40)
  g.fillText(text, 256, 140)
  if (sub) {
    g.font = '600 44px Inter, system-ui, sans-serif'
    g.fillStyle = '#6b5f70'
    g.fillText(sub, 256, 214)
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

// A camera-facing label plane; call face(camera) each frame.
export function createLabel(text: string, sub = '', width = 0.84): Mesh {
  const m = new Mesh(
    new PlaneGeometry(width, width / 2),
    new MeshBasicMaterial({ map: labelTexture(text, sub), transparent: true, depthWrite: false }),
  )
  m.renderOrder = 10
  return m
}
