import {
  BackSide, BufferAttribute, CatmullRomCurve3, Color, Float32BufferAttribute, Group, IcosahedronGeometry,
  InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, BufferGeometry,
  Shape, ShapeGeometry, SphereGeometry, Vector3,
} from 'three/webgpu'
import type { Texture } from 'three/webgpu'
import { PALETTE } from './palette'
import { mulberry32, valueNoise2 } from './rand'
import { createWater } from './water'

// The river winds from the far hills toward the viewer. x of its centre at depth z:
export const riverX = (z: number) => Math.sin(z * 0.11 + 0.6) * 3.2 - 2.4
const noise = valueNoise2(7)

// Ground height: a valley floor that rises away from the river, with soft noise.
export function groundHeight(x: number, z: number): number {
  const d = Math.abs(x - riverX(z))
  const bank = Math.max(0, d - 1.7)
  const rise = Math.pow(bank, 1.35) * 0.09
  const n = noise(x * 0.18, z * 0.18) * 0.35 + noise(x * 0.6, z * 0.6) * 0.08
  const channel = d < 1.7 ? -0.45 * (1 - d / 1.7) : 0
  return rise + n * Math.min(1, bank) + channel
}

export function createSky(): Group {
  const group = new Group()
  const geo = new SphereGeometry(180, 32, 24)
  const pos = geo.getAttribute('position')
  const colors = new Float32Array(pos.count * 3)
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i) / 180
    if (h > 0.25) c.copy(PALETTE.skyMid).lerp(PALETTE.skyTop, Math.min(1, (h - 0.25) / 0.5))
    else c.copy(PALETTE.skyHorizon).lerp(PALETTE.skyMid, Math.max(0, (h + 0.02) / 0.27))
    colors.set([c.r, c.g, c.b], i * 3)
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3))
  const sky = new Mesh(geo, new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false }))
  group.add(sky)

  const rng = mulberry32(3)
  const stars = new InstancedMesh(new IcosahedronGeometry(0.28, 0), new MeshBasicMaterial({ color: '#fff4e0', fog: false }), 160)
  const d = new Object3D()
  for (let i = 0; i < 160; i++) {
    const theta = rng() * Math.PI * 2
    const phi = 0.12 + rng() * 0.9
    d.position.setFromSphericalCoords(170, phi, theta)
    d.scale.setScalar(0.4 + rng() * 0.9)
    d.updateMatrix()
    stars.setMatrixAt(i, d.matrix)
  }
  group.add(stars)
  return group
}

// Three layers of ridge silhouettes; fog does the warm-to-cool fade with distance.
export function createRidges(): Group {
  const group = new Group()
  const layers = [
    { z: -38, color: PALETTE.hillMid, amp: 6, base: 1, seed: 11 },
    { z: -62, color: PALETTE.hillFar, amp: 11, base: 2, seed: 12 },
    { z: -95, color: new Color('#8a7590'), amp: 18, base: 4, seed: 13 },
  ]
  for (const L of layers) {
    const n = valueNoise2(L.seed)
    const shape = new Shape()
    const w = 180
    shape.moveTo(-w / 2, -10)
    for (let i = 0; i <= 120; i++) {
      const x = -w / 2 + (i / 120) * w
      const y = L.base + (n(x * 0.035, 0) * 0.5 + 0.5) * L.amp + n(x * 0.12, 3) * L.amp * 0.15
      shape.lineTo(x, y)
    }
    shape.lineTo(w / 2, -10)
    const mesh = new Mesh(new ShapeGeometry(shape), new MeshStandardMaterial({ color: L.color, roughness: 1 }))
    mesh.position.z = L.z
    group.add(mesh)
  }
  return group
}

export function createGround(): Mesh {
  const geo = new PlaneGeometry(90, 90, 150, 150)
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, 0, -30)
  const pos = geo.getAttribute('position')
  const colors = new Float32Array(pos.count * 3)
  const c = new Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i)
    const y = groundHeight(x, z)
    pos.setY(i, y)
    const d = Math.abs(x - riverX(z))
    c.copy(PALETTE.grassDusk).lerp(PALETTE.grass, Math.min(1, Math.max(0, y * 0.6 + 0.3)))
    if (d < 2.3) c.lerp(PALETTE.stoneWet, (2.3 - d) / 2.3 * 0.6)
    c.offsetHSL(0, 0, noise(x * 0.9, z * 0.9) * 0.025)
    colors.set([c.r, c.g, c.b], i * 3)
  }
  geo.setAttribute('color', new BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  const mesh = new Mesh(geo, new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }))
  mesh.receiveShadow = true
  return mesh
}

// A ribbon following the ground (for the trail) or a flat ribbon (for the river).
// `across` = number of strips across the width (more gives the water room for a gradient).
function ribbon(points: Vector3[], width: number, follow: boolean, lift: number, across = 1, segs = 160): BufferGeometry {
  const curve = new CatmullRomCurve3(points)
  const cols = across + 1
  const verts: number[] = []
  const uvs: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    const p = curve.getPoint(t)
    const tan = curve.getTangent(t)
    const side = new Vector3(-tan.z, 0, tan.x).normalize()
    const w = width * (0.85 + 0.15 * Math.sin(t * 17))
    for (let j = 0; j < cols; j++) {
      const u = j / across
      const q = p.clone().addScaledVector(side, (u - 0.5) * w)
      q.y = follow ? groundHeight(q.x, q.z) + lift : p.y
      verts.push(q.x, q.y, q.z)
      uvs.push(u, t)
    }
    if (i < segs) {
      for (let j = 0; j < across; j++) {
        const a = i * cols + j
        idx.push(a, a + 1, a + cols, a + 1, a + cols + 1, a + cols)
      }
    }
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(verts, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

export function createRiver(envMap: Texture | undefined, reflect: boolean): Group {
  const pts: Vector3[] = []
  for (let z = 8; z >= -60; z -= 4) pts.push(new Vector3(riverX(z), -0.22, z))
  return createWater(ribbon(pts, 3.0, false, 0, 6, 70), (u) => u, { y: -0.22, reflect, envMap })
}

// The lantern trail: from the foreground, curving to the bridge.
export const TRAIL_POINTS = [
  new Vector3(2.2, 0, 4.5),
  new Vector3(1.6, 0, 2.2),
  new Vector3(1.9, 0, -0.5),
  new Vector3(1.0, 0, -3.5),
  new Vector3(riverX(-7) + 2.4, 0, -7),
]
export function createTrail(): Mesh {
  const mesh = new Mesh(ribbon(TRAIL_POINTS, 0.75, true, 0.09), new MeshStandardMaterial({ color: PALETTE.path, roughness: 1 }))
  mesh.receiveShadow = true
  return mesh
}
