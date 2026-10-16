import {
  CylinderGeometry, Group, LatheGeometry, Mesh, MeshStandardMaterial, OctahedronGeometry, SphereGeometry, TorusGeometry,
  Vector2, BoxGeometry, ConeGeometry,
} from 'three/webgpu'
import type { MeshStandardMaterialParameters } from 'three/webgpu'
import type { ToolId } from '../scenes/hall/hallData'

const mat = (color: string, extra: MeshStandardMaterialParameters = {}) =>
  new MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, ...extra })

const IRON = () => mat('#7d7a86', { metalness: 0.55, roughness: 0.45 })
const BRASS = () => mat('#c8964a', { metalness: 0.6, roughness: 0.35 })
const WOOD = () => mat('#6b4a36')
const WOOD_DARK = () => mat('#4a3426')
const LEATHER = () => mat('#7a4b34', { roughness: 0.9 })

const lathe = (pts: [number, number][], seg = 12) => new LatheGeometry(pts.map(([r, y]) => new Vector2(r, y)), seg)

// Detailed, faceted training-hall tools, each roughly 0.3–0.9 units, centred on the group
// origin and facing +z. The staff is tall; the rest hang from a peg at the top.
export function createTool(id: ToolId): Group {
  const g = new Group()
  const add = (m: Mesh, x = 0, y = 0, z = 0) => { m.position.set(x, y, z); m.castShadow = true; g.add(m); return m }

  if (id === 'oilcan') {
    const iron = IRON()
    add(new Mesh(lathe([[0, -0.12], [0.11, -0.12], [0.13, -0.08], [0.13, 0.04], [0.09, 0.09], [0.035, 0.11], [0, 0.11]]), iron))
    for (const y of [-0.07, 0.02]) add(new Mesh(new TorusGeometry(0.131, 0.008, 4, 16), BRASS()), 0, y).rotation.x = Math.PI / 2
    const spout = add(new Mesh(new CylinderGeometry(0.008, 0.024, 0.26, 8), iron), 0.14, 0.06)
    spout.rotation.z = -1.0
    add(new Mesh(new CylinderGeometry(0.03, 0.035, 0.03, 10), BRASS()), 0, 0.125)
    add(new Mesh(new SphereGeometry(0.016, 8, 6), BRASS()), 0, 0.15)
    const handle = add(new Mesh(new TorusGeometry(0.07, 0.012, 6, 12, Math.PI), iron), -0.12, 0.0)
    handle.rotation.z = Math.PI / 2
  } else if (id === 'shears') {
    const iron = IRON()
    for (const s of [-1, 1]) {
      const arm = new Group()
      const blade = new Mesh(new ConeGeometry(0.022, 0.24, 4), iron)
      blade.scale.z = 0.3
      blade.position.y = 0.13
      const shank = new Mesh(new BoxGeometry(0.018, 0.1, 0.012), iron)
      shank.position.y = -0.04
      const ring = new Mesh(new TorusGeometry(0.04, 0.009, 6, 14), iron)
      ring.position.y = -0.12
      arm.add(blade, shank, ring)
      arm.rotation.z = s * 0.28
      arm.traverse((o) => { (o as Mesh).castShadow = true })
      g.add(arm)
    }
    add(new Mesh(new CylinderGeometry(0.016, 0.016, 0.03, 10), BRASS()), 0, 0.01).rotation.x = Math.PI / 2
  } else if (id === 'chisel') {
    add(new Mesh(lathe([[0, 0], [0.03, 0], [0.034, 0.05], [0.03, 0.14], [0.026, 0.17], [0, 0.17]], 8), WOOD()), 0, 0.02)
    add(new Mesh(new CylinderGeometry(0.031, 0.031, 0.03, 10), BRASS()), 0, 0.02)
    add(new Mesh(new CylinderGeometry(0.035, 0.035, 0.012, 10), IRON()), 0, 0.195)
    const blade = add(new Mesh(new BoxGeometry(0.05, 0.2, 0.014), IRON()), 0, -0.09)
    blade.scale.x = 0.9
    const edge = add(new Mesh(new BoxGeometry(0.056, 0.03, 0.01), mat('#b8b6c2', { metalness: 0.7, roughness: 0.25 })), 0, -0.19)
    edge.rotation.x = 0.35
  } else if (id === 'clay') {
    add(new Mesh(lathe([[0, -0.13], [0.08, -0.13], [0.13, -0.06], [0.14, 0.01], [0.1, 0.08], [0.06, 0.1], [0.07, 0.125], [0.0, 0.125]], 12), mat('#a8674a', { roughness: 0.95 })))
    add(new Mesh(new TorusGeometry(0.068, 0.012, 6, 14), mat('#8f553c')), 0, 0.122).rotation.x = Math.PI / 2
    add(new Mesh(new CylinderGeometry(0.05, 0.045, 0.05, 10), mat('#c9a77a')), 0, 0.15)
    add(new Mesh(new TorusGeometry(0.103, 0.007, 4, 16), mat('#d8c39a')), 0, 0.07).rotation.x = Math.PI / 2
    const tail = add(new Mesh(new BoxGeometry(0.012, 0.09, 0.006), mat('#d8c39a')), 0.09, 0.03)
    tail.rotation.z = 0.3
    add(new Mesh(new TorusGeometry(0.11, 0.006, 4, 16, Math.PI * 0.6), mat('#cbb48a')), 0, -0.01).rotation.set(Math.PI / 2, 0, 0.4)
  } else if (id === 'staff') {
    const wood = WOOD()
    add(new Mesh(new CylinderGeometry(0.022, 0.03, 1.0, 7), wood))
    for (const [y, r] of [[-0.25, 0.034], [0.12, 0.031], [0.3, 0.029]] as const) add(new Mesh(new SphereGeometry(r, 7, 5), WOOD_DARK()), 0.01, y)
    for (let k = 0; k < 6; k++) {
      const wrap = add(new Mesh(new TorusGeometry(0.03, 0.007, 4, 10), LEATHER()), 0, -0.02 + k * 0.025)
      wrap.rotation.x = Math.PI / 2 + (k % 2 ? 0.15 : -0.15)
    }
    for (const y of [0.42, -0.48]) add(new Mesh(new CylinderGeometry(0.03, 0.03, 0.025, 8), BRASS()), 0, y)
    add(new Mesh(new TorusGeometry(0.05, 0.012, 5, 10, Math.PI * 1.2), wood), 0.02, 0.5).rotation.z = 0.4
    add(new Mesh(new OctahedronGeometry(0.035, 0), mat('#bfa6ff', { emissive: '#9a7fe0', emissiveIntensity: 1.6, flatShading: true })), 0.0, 0.53)
  } else {
    const rope = mat('#b59a6a', { roughness: 0.95 })
    for (let k = 0; k < 5; k++) {
      const loop = add(new Mesh(new TorusGeometry(0.115 - k * 0.006, 0.016, 6, 18), rope), 0, -0.03 + k * 0.022, k * 0.004)
      loop.rotation.set(0.12 * (k % 2 ? 1 : -1), 0, k * 0.4)
    }
    add(new Mesh(new TorusGeometry(0.03, 0.017, 6, 10), rope), 0, 0.11).rotation.x = Math.PI / 2
    const end = add(new Mesh(new CylinderGeometry(0.016, 0.014, 0.2, 6), rope), 0.08, -0.14)
    end.rotation.z = 0.35
    add(new Mesh(new SphereGeometry(0.02, 6, 5), mat('#9a8058')), 0.115, -0.235)
  }

  // A wooden peg on the wall behind (except the staff, which leans on its own bracket).
  const peg = new Mesh(new CylinderGeometry(0.014, 0.018, 0.08, 6), WOOD_DARK())
  peg.rotation.x = Math.PI / 2
  peg.position.set(0, id === 'staff' ? 0.36 : 0.17, -0.05)
  g.add(peg)
  return g
}
