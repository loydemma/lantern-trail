import { AmbientLight, DirectionalLight, HemisphereLight, Vector3 } from 'three/webgpu'
import { createStage } from '../src/engine/stage'
import { detectQuality } from '../src/engine/quality'
import { createIslandSlab } from '../src/world/islandSlab'
import { createLanterns, createLanternPost } from '../src/world/lantern'
import { loadWarrior } from '../src/world/warrior'
import { PALETTE } from '../src/world/palette'

const canvas = document.getElementById('c') as HTMLCanvasElement
const q = detectQuality()
const stage = await createStage(canvas, q, { background: PALETTE.cream, exposure: 1.15, bloom: { strength: 0.5, radius: 0.4, threshold: 0.9 } })
stage.camera.position.set(4.2, 3.4, 5.2)
stage.camera.lookAt(0, -0.3, 0)

stage.scene.add(new HemisphereLight('#c9b8e6', '#5a4048', 1.6), new AmbientLight('#ffe9d6', 0.35))
const sun = new DirectionalLight('#ffd2a8', 2.2)
sun.position.set(-3, 5, 2)
sun.castShadow = true
stage.scene.add(sun)

const slab = createIslandSlab({ width: 4, depth: 3 })
stage.scene.add(slab.group)

const post = createLanternPost()
post.group.position.set(-1.2, 0, -0.6)
stage.scene.add(post.group)
const lanterns = createLanterns([post.lanternAt.clone().add(post.group.position), new Vector3(1.2, 0.9, -0.9)], q)
stage.scene.add(lanterns.group)
stage.onFrame((_, t) => lanterns.update(t))

const warrior = await loadWarrior('/models/warrior.glb', q)
if (warrior) {
  warrior.root.scale.setScalar(0.9)
  stage.scene.add(warrior.root)
  stage.onFrame((dt) => warrior.update(dt))
  addEventListener('pointermove', (e) => warrior.lookAt({ x: (e.clientX / innerWidth) * 2 - 1, y: -(e.clientY / innerHeight) * 2 + 1 }))
}
stage.start()
