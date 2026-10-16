import { Color, ConeGeometry, DodecahedronGeometry, InstancedMesh, MeshStandardMaterial, Object3D } from 'three/webgpu'
import { mulberry32 } from './rand'
import { PALETTE } from './palette'

type Spot = { x: number; y: number; z: number }

// Static low-poly grass tufts: each spot gets a small clump of flat-shaded blades,
// tinted from the same muted greens as the tree canopies.
export function createGrassTufts(spots: Spot[], seed = 4): InstancedMesh {
  const rng = mulberry32(seed)
  const perTuft = 5
  const blades = new InstancedMesh(
    new ConeGeometry(0.035, 0.34, 3),
    new MeshStandardMaterial({ roughness: 0.95, flatShading: true }),
    spots.length * perTuft,
  )
  const tones = [new Color('#4d5d47'), new Color('#5e6b4c'), new Color('#3f4f45'), new Color('#6b7350')]
  const d = new Object3D()
  spots.forEach((p, i) => {
    const tone = tones[Math.floor(rng() * tones.length)]
    for (let k = 0; k < perTuft; k++) {
      const a = (k / perTuft) * Math.PI * 2 + rng()
      d.position.set(p.x + Math.cos(a) * 0.05, p.y + 0.1, p.z + Math.sin(a) * 0.05)
      d.rotation.set(Math.sin(a) * 0.35, rng() * 6, -Math.cos(a) * 0.35)
      d.scale.setScalar(0.6 + rng() * 0.7)
      d.updateMatrix()
      blades.setMatrixAt(i * perTuft + k, d.matrix)
      blades.setColorAt(i * perTuft + k, tone)
    }
  })
  blades.castShadow = true
  return blades
}

// Rounded pebbles for banks and shallows.
export function createPebbles(spots: Spot[], seed = 17): InstancedMesh {
  const rng = mulberry32(seed)
  const mesh = new InstancedMesh(new DodecahedronGeometry(0.05, 1), new MeshStandardMaterial({ roughness: 0.7, flatShading: true }), spots.length)
  const tones = [PALETTE.stoneWet, PALETTE.stoneTop, new Color('#8a8088'), new Color('#5b5560')]
  const d = new Object3D()
  spots.forEach((p, i) => {
    d.position.set(p.x, p.y + 0.01, p.z)
    d.rotation.set(rng(), rng() * 6, rng())
    const s = 0.5 + rng() * 1.4
    d.scale.set(s, s * (0.4 + rng() * 0.3), s * (0.7 + rng() * 0.4))
    d.updateMatrix()
    mesh.setMatrixAt(i, d.matrix)
    mesh.setColorAt(i, tones[Math.floor(rng() * tones.length)])
  })
  mesh.castShadow = mesh.receiveShadow = true
  return mesh
}
