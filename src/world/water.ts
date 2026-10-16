import { BufferAttribute, Color, Group, Mesh, MeshStandardMaterial, MeshStandardNodeMaterial } from 'three/webgpu'
import type { BufferGeometry, Texture } from 'three/webgpu'
import {
  cameraPosition, clamp, dot, float, normalize, positionWorld, pow, reflector, vec3, vertexColor,
} from 'three/tsl'
import { valueNoise2 } from './rand'

const SHALLOW = new Color('#8796bd')
const DEEP = new Color('#3d4a74')

// Bake a static bank-to-bank gradient into vertex colours, one tone per facet so it matches
// the flat-shaded trees. `across(u, v)` is 0 at one bank and 1 at the other.
function paintGradient(geo: BufferGeometry, across: (u: number, v: number) => number): BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo
  const uv = g.getAttribute('uv')
  const pos = g.getAttribute('position')
  const colors = new Float32Array(pos.count * 3)
  const noise = valueNoise2(41)
  const c = new Color()
  for (let i = 0; i < pos.count; i += 3) {
    let depth = 0
    for (let k = 0; k < 3; k++) depth += 1 - Math.abs(across(uv.getX(i + k), uv.getY(i + k)) * 2 - 1)
    c.copy(SHALLOW).lerp(DEEP, Math.pow(depth / 3, 0.8))
    c.offsetHSL(0, 0, noise(pos.getX(i) * 1.7, pos.getZ(i) * 1.7 + pos.getY(i)) * 0.03)
    for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (i + k) * 3)
  }
  g.setAttribute('color', new BufferAttribute(colors, 3))
  g.computeVertexNormals()
  return g
}

export type WaterOptions = {
  y: number // world height of the (flat) water surface
  reflect: boolean // true mirror reflections; false = gradient only (phones)
  envMap?: Texture
}

// Still water. With `reflect`, a soft, low-resolution mirror of the scene is blended in
// more strongly at grazing angles (Fresnel), the way real
// water looks. Nothing animates. Returns a group holding the mesh and the reflector target.
export function createWater(geo: BufferGeometry, across: (u: number, v: number) => number, o: WaterOptions): Group {
  const group = new Group()
  const g = paintGradient(geo, across)

  if (!o.reflect) {
    const mesh = new Mesh(g, new MeshStandardMaterial({
      vertexColors: true, flatShading: true, roughness: 0.3, metalness: 0.15, envMap: o.envMap ?? null, envMapIntensity: 0.6,
    }))
    mesh.receiveShadow = true
    group.add(mesh)
    return group
  }

  // Low resolution on purpose: the upscaled mirror reads as a soft, blurry reflection.
  const mirror = reflector({ resolutionScale: 0.2, bounces: false })
  mirror.target.rotateX(-Math.PI / 2)
  mirror.target.position.y = o.y
  group.add(mirror.target)

  // Almost no reflection looking straight down (near the camera); it builds only toward
  // grazing angles in the distance, so foreground water keeps its own gradient.
  const view = normalize(cameraPosition.sub(positionWorld))
  const facing = clamp(dot(vec3(0, 1, 0), view), 0, 1)
  const fresnel = clamp(float(0.03).add(pow(facing.oneMinus(), 4).mul(0.6)), 0, 0.55)

  const m = new MeshStandardNodeMaterial({ roughness: 0.35, metalness: 0, flatShading: true })
  m.colorNode = vertexColor().rgb.mul(fresnel.oneMinus())
  // Reflections go in emissive so mirrored lanterns still glow faintly at dusk.
  m.emissiveNode = mirror.rgb.mul(vec3(0.6, 0.63, 0.82)).mul(fresnel)
  const mesh = new Mesh(g, m)
  mesh.receiveShadow = true
  group.add(mesh)
  return group
}
