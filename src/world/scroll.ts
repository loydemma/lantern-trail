import {
  BufferAttribute, Color, CylinderGeometry, Group, Mesh, MeshStandardMaterial, OctahedronGeometry, PlaneGeometry,
  SphereGeometry,
} from 'three/webgpu'

const PAGE_LIGHT = new Color('#e6d4ad')
const PAGE_DARK = new Color('#a88a5c')
const ROLLER = '#2e2428'
const CAP = '#4a3c40'

// An open, upright scroll: an aged parchment page (darker toward the edges, gently waved)
// between two dark rollers with ornate end caps, a topic-coloured ornament under the top
// roller, and faint lines of script. Centred on the page; faces +z. `glow` materials take an
// emissive boost to show relevance.
export function createScroll(topic: string, width = 0.28, height = 0.36): { group: Group; glow: MeshStandardMaterial[] } {
  const group = new Group()
  const tint = new Color(topic)

  const pageGeo = new PlaneGeometry(width, height, 8, 8)
  const pos = pageGeo.getAttribute('position')
  const colors = new Float32Array(pos.count * 3)
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (width / 2)
    const y = pos.getY(i) / (height / 2)
    pos.setZ(i, Math.sin(y * Math.PI * 1.5) * 0.006 + x * x * 0.01)
    const edge = Math.max(Math.abs(x), Math.abs(y))
    c.copy(PAGE_LIGHT).lerp(PAGE_DARK, Math.pow(edge, 3) * 0.85)
    colors.set([c.r, c.g, c.b], i * 3)
  }
  pageGeo.setAttribute('color', new BufferAttribute(colors, 3))
  pageGeo.computeVertexNormals()
  const page = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: 2, emissive: '#ffcf8a', emissiveIntensity: 0 })
  const pageMesh = new Mesh(pageGeo, page)
  pageMesh.castShadow = true
  group.add(pageMesh)

  const roller = new MeshStandardMaterial({ color: ROLLER, roughness: 0.6 })
  const cap = new MeshStandardMaterial({ color: CAP, roughness: 0.4, metalness: 0.3 })
  for (const s of [-1, 1]) {
    const rod = new Mesh(new CylinderGeometry(0.022, 0.022, width + 0.02, 10), roller)
    rod.rotation.z = Math.PI / 2
    rod.position.set(0, s * (height / 2 + 0.012), 0.008)
    rod.castShadow = true
    group.add(rod)
    for (const e of [-1, 1]) {
      const knob = new Mesh(new SphereGeometry(0.026, 10, 8), cap)
      knob.scale.set(0.8, 1, 1)
      knob.position.set(e * (width / 2 + 0.03), s * (height / 2 + 0.012), 0.008)
      const disc = new Mesh(new CylinderGeometry(0.03, 0.03, 0.008, 10), cap)
      disc.rotation.z = Math.PI / 2
      disc.position.set(e * (width / 2 + 0.012), s * (height / 2 + 0.012), 0.008)
      group.add(knob, disc)
    }
  }

  const ornament = new MeshStandardMaterial({ color: tint, roughness: 0.4, emissive: tint, emissiveIntensity: 0 })
  const gem = new Mesh(new OctahedronGeometry(0.022, 0), ornament)
  gem.scale.set(1.4, 0.9, 0.4)
  gem.position.set(0, height / 2 - 0.035, 0.012)
  group.add(gem)

  const ink = new MeshStandardMaterial({ color: '#6d5a48', roughness: 1 })
  for (let i = 0; i < 6; i++) {
    const line = new Mesh(new PlaneGeometry(width * (0.5 + ((i * 37) % 5) * 0.06), 0.008), ink)
    line.position.set(0, height / 2 - 0.08 - i * 0.04, 0.013)
    group.add(line)
  }

  return { group, glow: [page, ornament] }
}
