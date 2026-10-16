import {
  BoxGeometry, CylinderGeometry, DodecahedronGeometry, Group, IcosahedronGeometry, InstancedMesh, Mesh,
  MeshStandardMaterial, Object3D, PointLight, Color, Vector3,
} from 'three/webgpu'
import { PALETTE } from './palette'
import { mulberry32 } from './rand'

const mat = (color: Color | string, extra: Partial<MeshStandardMaterial> = {}) =>
  Object.assign(new MeshStandardMaterial({ color, roughness: 0.95 }), extra)

// A storybook cottage: plaster walls, a steep shingled roof, a chimney and lit windows.
export function createCottage(seed: number, withLight: boolean): Group {
  const rng = mulberry32(seed)
  const g = new Group()
  const w = 1.1 + rng() * 0.5, d = 0.9 + rng() * 0.3, h = 0.75 + rng() * 0.25
  const walls = new Mesh(new BoxGeometry(w, h, d), mat(PALETTE.wall))
  walls.position.y = h / 2
  walls.castShadow = walls.receiveShadow = true
  const roofGeo = new CylinderGeometry(0.02, 1, 1, 4, 1)
  roofGeo.rotateY(Math.PI / 4)
  const roof = new Mesh(roofGeo, mat(PALETTE.roof))
  roof.scale.set(w * 0.82, 0.7 + rng() * 0.3, d * 0.82)
  roof.position.y = h + roof.scale.y / 2 - 0.02
  roof.castShadow = true
  const chimney = new Mesh(new BoxGeometry(0.14, 0.4, 0.14), mat('#6d5a55'))
  chimney.position.set(w * 0.25, h + 0.45, -d * 0.15)
  const windowMat = mat(PALETTE.window, { emissive: PALETTE.window, emissiveIntensity: 2.2 })
  for (const x of [-w * 0.25, w * 0.25]) {
    const win = new Mesh(new BoxGeometry(0.16, 0.2, 0.02), windowMat)
    win.position.set(x, h * 0.55, d / 2 + 0.01)
    g.add(win)
  }
  const door = new Mesh(new BoxGeometry(0.2, 0.36, 0.02), mat(PALETTE.wood))
  door.position.set(0, 0.18, d / 2 + 0.012)
  g.add(walls, roof, chimney, door)
  if (withLight) {
    const l = new PointLight(PALETTE.window, 2.4, 5, 1.8)
    l.position.set(0, h * 0.6, d / 2 + 0.6)
    g.add(l)
  }
  return g
}

// Rounded storybook trees as instanced canopies + trunks.
export function createTrees(spots: { x: number; y: number; z: number; s: number }[], seed = 5): Group {
  const rng = mulberry32(seed)
  const g = new Group()
  const canopyColors = [new Color('#3c4a4a'), new Color('#4a3f55'), new Color('#35473f')]
  const trunks = new InstancedMesh(new CylinderGeometry(0.06, 0.1, 1, 6), mat(PALETTE.wood), spots.length)
  const canopies = new InstancedMesh(new IcosahedronGeometry(0.6, 1), mat('#ffffff', { flatShading: true }), spots.length * 2)
  const d = new Object3D()
  spots.forEach((p, i) => {
    d.position.set(p.x, p.y + 0.5 * p.s, p.z)
    d.scale.set(p.s, p.s, p.s)
    d.rotation.set(0, 0, 0)
    d.updateMatrix()
    trunks.setMatrixAt(i, d.matrix)
    for (let k = 0; k < 2; k++) {
      d.position.set(p.x + (rng() - 0.5) * 0.3 * p.s, p.y + (1.15 + k * 0.45) * p.s, p.z + (rng() - 0.5) * 0.3 * p.s)
      const s = p.s * (1 - k * 0.3) * (0.9 + rng() * 0.25)
      d.scale.set(s, s * 0.9, s)
      d.rotation.set(rng(), rng(), rng())
      d.updateMatrix()
      canopies.setMatrixAt(i * 2 + k, d.matrix)
      canopies.setColorAt(i * 2 + k, canopyColors[Math.floor(rng() * canopyColors.length)])
    }
  })
  trunks.castShadow = canopies.castShadow = true
  canopies.receiveShadow = true
  g.add(trunks, canopies)
  return g
}

export function createRocks(spots: { x: number; y: number; z: number; s: number }[], seed = 9): InstancedMesh {
  const rng = mulberry32(seed)
  const rocks = new InstancedMesh(new DodecahedronGeometry(0.5, 0), mat(PALETTE.stoneWet, { flatShading: true }), spots.length)
  const d = new Object3D()
  spots.forEach((p, i) => {
    d.position.set(p.x, p.y + 0.12 * p.s, p.z)
    d.scale.set(p.s * (0.8 + rng() * 0.5), p.s * (0.45 + rng() * 0.3), p.s * (0.8 + rng() * 0.4))
    d.rotation.set(rng() * 0.4, rng() * 6, rng() * 0.4)
    d.updateMatrix()
    rocks.setMatrixAt(i, d.matrix)
  })
  rocks.castShadow = rocks.receiveShadow = true
  return rocks
}

// An arched stone bridge with a curved timber deck and painted railings, loosely inspired by
// Korean stone arch bridges (secular architecture only). Lantern caps glow on the end posts;
// their local positions are returned so the scene can light them with the trail lanterns.
export function createBridge(length: number): { group: Group; lanternAt: Vector3[] } {
  const g = new Group()
  const rise = 0.5
  const deckY = 0.28
  const archY = (x: number) => deckY + rise * (1 - Math.pow((2 * x) / length, 2))
  const slope = (x: number) => (-8 * rise * x) / (length * length)

  const stone = mat('#7a7280', { flatShading: true })
  const stoneDark = mat('#5e5660', { flatShading: true })
  const teal = mat('#3f6b6a')
  const red = mat('#8a3b34')
  const wood = mat(PALETTE.wood)

  // Curved deck: planks follow the arch.
  const planks = 16
  for (let i = 0; i < planks; i++) {
    const x = -length / 2 + (i + 0.5) * (length / planks)
    const plank = new Mesh(new BoxGeometry(length / planks - 0.015, 0.06, 0.92), wood)
    plank.position.set(x, archY(x), 0)
    plank.rotation.z = Math.atan(slope(x))
    plank.castShadow = plank.receiveShadow = true
    g.add(plank)
  }

  // Stone arch ring (voussoirs) under the deck, plus spandrel walls either side.
  const R = length * 0.34
  const cy = archY(0) - R - 0.12
  const blocks = 13
  for (let i = 0; i < blocks; i++) {
    const a = Math.PI * (i + 0.5) / blocks
    const b = new Mesh(new BoxGeometry(0.2, 0.16, 0.86), i % 2 ? stone : stoneDark)
    b.position.set(Math.cos(a) * R, cy + Math.sin(a) * R, 0)
    b.rotation.z = a - Math.PI / 2
    b.castShadow = true
    g.add(b)
  }
  for (const side of [-1, 1]) {
    const wall = new Mesh(new BoxGeometry(length * 0.22, 0.42, 0.8), stone)
    wall.position.set(side * (length / 2 - length * 0.11), deckY - 0.12, 0)
    wall.castShadow = wall.receiveShadow = true
    g.add(wall)
  }

  // Railings: teal posts with red caps, a rail that follows the curve.
  const lanternAt: Vector3[] = []
  const postsPerSide = 9
  for (const z of [-0.43, 0.43]) {
    let prev: Vector3 | null = null
    for (let i = 0; i < postsPerSide; i++) {
      const x = -length / 2 + 0.08 + (i / (postsPerSide - 1)) * (length - 0.16)
      const end = i === 0 || i === postsPerSide - 1
      const h = end ? 0.48 : 0.3
      const post = new Mesh(new BoxGeometry(end ? 0.1 : 0.055, h, end ? 0.1 : 0.055), teal)
      post.position.set(x, archY(x) + h / 2, z)
      post.castShadow = true
      const cap = new Mesh(new BoxGeometry(end ? 0.14 : 0.08, 0.035, end ? 0.14 : 0.08), red)
      cap.position.set(x, archY(x) + h + 0.017, z)
      g.add(post, cap)
      if (end && z > 0) lanternAt.push(new Vector3(x, archY(x) + h + 0.16, z))
      const top = new Vector3(x, archY(x) + 0.26, z)
      if (prev) {
        const mid = prev.clone().add(top).multiplyScalar(0.5)
        const len = prev.distanceTo(top)
        const rail = new Mesh(new BoxGeometry(len, 0.03, 0.035), red)
        rail.position.copy(mid)
        rail.rotation.z = Math.atan2(top.y - prev.y, top.x - prev.x)
        g.add(rail)
      }
      prev = top
    }
  }
  return { group: g, lanternAt }
}
