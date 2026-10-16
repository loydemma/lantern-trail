import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three/webgpu'

const W = 1024
const H = 256 // labels are 4:1

// A small dusk-coloured pill with a softly glowing lantern-gold border and upright cream
// text; an optional secondary value sits on the same line ("saw · 74%").
export function labelTexture(text: string, sub = ''): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  if (!text && !sub) return new CanvasTexture(c) // nothing to show (e.g. the starting stone)

  const main = `600 ${150}px Inter, system-ui, sans-serif`
  const small = `500 ${108}px Inter, system-ui, sans-serif`
  g.font = main
  let mainW = g.measureText(text).width
  g.font = small
  const subW = sub ? g.measureText(`  ${sub}`).width : 0
  // Shrink long labels to fit.
  const scale = Math.min(1, (W - 140) / (mainW + subW))
  mainW *= scale
  const pillW = (mainW + subW * scale) + 104
  const pillH = 206
  const x = (W - pillW) / 2
  const y = (H - pillH) / 2

  g.shadowColor = 'rgba(255, 179, 71, 0.85)'
  g.shadowBlur = 22
  g.fillStyle = 'rgba(34, 26, 46, 0.82)'
  g.beginPath()
  g.roundRect(x, y, pillW, pillH, pillH / 2)
  g.fill()
  g.lineWidth = 6
  g.strokeStyle = 'rgba(255, 207, 122, 0.95)'
  g.stroke()
  g.shadowBlur = 0

  g.textBaseline = 'middle'
  g.textAlign = 'left'
  g.font = `600 ${150 * scale}px Inter, system-ui, sans-serif`
  g.fillStyle = '#fff2dc'
  g.fillText(text, x + 52, H / 2 + 6)
  if (sub) {
    g.font = `500 ${108 * scale}px Inter, system-ui, sans-serif`
    g.fillStyle = 'rgba(255, 214, 150, 0.85)'
    g.fillText(`  ${sub}`, x + 52 + mainW, H / 2 + 8)
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  return t
}

// A camera-facing label plane; call quaternion.copy(camera.quaternion) each frame.
export function createLabel(text: string, sub = '', width = 1.0): Mesh {
  const m = new Mesh(
    new PlaneGeometry(width, width / 4),
    new MeshBasicMaterial({ map: labelTexture(text, sub), transparent: true, depthWrite: false, depthTest: false }),
  )
  m.renderOrder = 10
  return m
}
