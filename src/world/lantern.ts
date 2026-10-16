import {
  Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D, PointLight, SphereGeometry, CylinderGeometry, Vector3,
} from 'three/webgpu'
import { PALETTE } from './palette'
import type { Quality } from '../engine/quality'

// Paper lanterns: emissive instanced bodies; only the first few carry real point lights.
export function createLanterns(positions: Vector3[], q: Quality, scale = 1): { group: Group; update(t: number): void } {
  const group = new Group()
  const n = positions.length

  const bodyGeo = new SphereGeometry(0.16 * scale, 16, 12)
  bodyGeo.scale(1, 1.25, 1)
  const bodyMat = new MeshStandardMaterial({
    color: PALETTE.lantern,
    emissive: PALETTE.lanternGlow,
    emissiveIntensity: 2.4,
    roughness: 0.9,
  })
  const capGeo = new CylinderGeometry(0.07 * scale, 0.09 * scale, 0.05 * scale, 12)
  const capMat = new MeshStandardMaterial({ color: '#2a1e1a', roughness: 0.8 })

  const bodies = new InstancedMesh(bodyGeo, bodyMat, n)
  const tops = new InstancedMesh(capGeo, capMat, n)
  const bottoms = new InstancedMesh(capGeo, capMat, n)
  group.add(bodies, tops, bottoms)

  const maxLights = q.tier === 'high' ? 4 : 2
  const lights: PointLight[] = []
  for (let i = 0; i < Math.min(maxLights, n); i++) {
    const l = new PointLight(PALETTE.lanternGlow, 3.2 * scale, 6 * scale, 1.6)
    group.add(l)
    lights.push(l)
  }
  // Spread the real lights across the set rather than bunching them at the start.
  const lightIdx = lights.map((_, i) => Math.floor(((i + 0.5) * n) / lights.length))

  const dummy = new Object3D()
  const phases = positions.map((_, i) => i * 1.7)
  const place = (t: number) => {
    for (let i = 0; i < n; i++) {
      const p = positions[i]
      const sway = q.reducedMotion ? 0 : Math.sin(t * 0.9 + phases[i]) * 0.035 * scale
      const bob = q.reducedMotion ? 0 : Math.sin(t * 0.6 + phases[i] * 0.5) * 0.02 * scale
      dummy.position.set(p.x + sway, p.y + bob, p.z)
      dummy.rotation.set(0, 0, sway * 0.8)
      dummy.updateMatrix()
      bodies.setMatrixAt(i, dummy.matrix)
      dummy.position.y += 0.2 * scale
      dummy.updateMatrix()
      tops.setMatrixAt(i, dummy.matrix)
      dummy.position.y -= 0.4 * scale
      dummy.updateMatrix()
      bottoms.setMatrixAt(i, dummy.matrix)
    }
    bodies.instanceMatrix.needsUpdate = true
    tops.instanceMatrix.needsUpdate = true
    bottoms.instanceMatrix.needsUpdate = true
    lights.forEach((l, k) => l.position.copy(positions[lightIdx[k]]))
  }
  place(0)

  return { group, update: (t) => { if (!q.reducedMotion) place(t) } }
}

// A wooden post with a lantern hanging from its arm (for trails).
export function createLanternPost(height = 1.4): { group: Group; lanternAt: Vector3 } {
  const group = new Group()
  const wood = new MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.95 })
  const post = new Mesh(new CylinderGeometry(0.035, 0.045, height, 8), wood)
  post.position.y = height / 2
  post.castShadow = true
  const arm = new Mesh(new CylinderGeometry(0.02, 0.02, 0.32, 6), wood)
  arm.rotation.z = Math.PI / 2
  arm.position.set(0.14, height - 0.04, 0)
  group.add(post, arm)
  return { group, lanternAt: new Vector3(0.27, height - 0.26, 0) }
}
