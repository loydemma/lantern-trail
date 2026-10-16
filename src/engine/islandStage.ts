import { DirectionalLight, HemisphereLight, Vector3 } from 'three/webgpu'
import { createStage, fitDistance } from './stage'
import type { Stage } from './stage'
import type { Quality } from './quality'
import { PALETTE } from '../world/palette'
import { createIslandSlab } from '../world/islandSlab'
import { createLanterns, createLanternPost } from '../world/lantern'

// Shared setup for the chapter dioramas: cream page, warm key light, a cut-away island slab,
// lantern posts at two corners, and a pointer-parallax camera.
export async function createIslandStage(
  canvas: HTMLCanvasElement,
  q: Quality,
  o: { width: number; depth: number; camera: Vector3; lookAt: Vector3; posts?: [number, number][] },
): Promise<Stage & { pointer: { x: number; y: number } }> {
  const stage = await createStage(canvas, q, {
    fov: 32,
    background: PALETTE.cream,
    exposure: 1.1,
    bloom: { strength: 0.45, radius: 0.4, threshold: 0.9 },
  })
  const { scene, camera } = stage
  scene.add(new HemisphereLight('#c9b8e6', '#5a4048', 1.5))
  const key = new DirectionalLight('#ffd7b0', 2.0)
  key.position.set(-4, 7, 5)
  key.castShadow = true
  key.shadow.mapSize.setScalar(q.tier === 'high' ? 2048 : 1024)
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 })
  scene.add(key)
  scene.add(createIslandSlab({ width: o.width, depth: o.depth, topColor: PALETTE.grass }).group)

  const spots: Vector3[] = []
  for (const [x, z] of o.posts ?? []) {
    const post = createLanternPost(1.1)
    post.group.position.set(x, 0, z)
    post.group.rotation.y = x < 0 ? -0.4 : Math.PI - 0.4
    scene.add(post.group)
    post.group.updateMatrixWorld()
    spots.push(post.lanternAt.clone().applyMatrix4(post.group.matrixWorld))
  }
  const lanterns = createLanterns(spots, q)
  scene.add(lanterns.group)

  const pointer = { x: 0, y: 0 }
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect()
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1)
  })
  stage.onFrame((_, t) => {
    lanterns.update(t)
    const sway = q.reducedMotion ? 0 : 1
    const cam = fitDistance(camera, o.camera, o.lookAt)
    camera.position.set(cam.x + pointer.x * 0.35 * sway, cam.y + pointer.y * 0.2 * sway, cam.z)
    camera.lookAt(o.lookAt)
  })
  return { ...stage, pointer }
}
