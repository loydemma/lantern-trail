import {
  CatmullRomCurve3, DirectionalLight, Fog, Group, HemisphereLight, PMREMGenerator, Scene, IcosahedronGeometry, InstancedMesh, MeshBasicMaterial, Object3D, Vector3,
} from 'three/webgpu'
import { createStage } from '../engine/stage'
import type { Quality } from '../engine/quality'
import type { SceneHandle } from '../engine/sceneHost'
import { PALETTE } from '../world/palette'
import { mulberry32 } from '../world/rand'
import { createSky, createRidges, createGround, createRiver, createTrail, groundHeight, riverX, TRAIL_POINTS } from '../world/valley'
import { createCottage, createTrees, createRocks, createBridge } from '../world/props'
import { createGrassTufts, createPebbles } from '../world/grass'
import { createLanterns, createLanternPost } from '../world/lantern'
import { loadWarrior } from '../world/warrior'

const at = (x: number, z: number, lift = 0) => new Vector3(x, groundHeight(x, z) + lift, z)

export async function createHeroScene(canvas: HTMLCanvasElement, q: Quality): Promise<SceneHandle> {
  const stage = await createStage(canvas, q, { fov: 38, exposure: 1.05, bloom: { strength: 0.7, radius: 0.5, threshold: 0.8 } })
  const { scene, camera } = stage
  scene.fog = new Fog(PALETTE.fog, 14, 85)
  // The whole valley is mirrored so the busy side (bridge, hamlet) sits away from the title
  // and the calmer hillside plus the traveler sit under it.
  const world = new Group()
  world.scale.x = -1
  scene.add(world)

  // The river reflects a blurred copy of the sky and far ridges.
  const sky = createSky()
  const ridges = createRidges()
  const reflectScene = new Scene()
  reflectScene.add(sky.clone(), ridges.clone(), new HemisphereLight('#9d8fc4', '#2a2030', 1.2))
  const env = new PMREMGenerator(stage.renderer).fromScene(reflectScene, 0.02).texture
  world.add(sky, ridges, createGround(), createRiver(env, q.tier === 'high'), createTrail())

  // Moonlight from upper left, cool; blue-hour fill. Warm light lives only at lanterns and windows.
  world.add(new HemisphereLight('#9d8fc4', '#2a2030', 1.1))
  const moon = new DirectionalLight('#c3c8f0', 1.0)
  moon.position.set(-8, 12, 6)
  moon.castShadow = true
  moon.shadow.mapSize.setScalar(q.tier === 'high' ? 2048 : 1024)
  Object.assign(moon.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 })
  world.add(moon)

  // Midground hamlet across the river, beyond the bridge.
  const cottages = [
    { x: riverX(-12) - 3.2, z: -12, r: 0.5 },
    { x: riverX(-15) - 5.4, z: -15.5, r: -0.3 },
    { x: riverX(-10) + 4.6, z: -11, r: -0.6 },
    { x: riverX(-19) - 2.4, z: -19, r: 0.2 },
  ]
  cottages.forEach((c, i) => {
    const h = createCottage(20 + i, i < (q.tier === 'high' ? 3 : 1))
    h.position.copy(at(c.x, c.z, -0.05))
    h.rotation.y = c.r
    world.add(h)
  })

  const bridge = createBridge(3.8)
  bridge.group.position.set(riverX(-7), -0.12, -7)
  bridge.group.rotation.y = -Math.atan2(riverX(-6) - riverX(-8), 2)
  world.add(bridge.group)
  bridge.group.updateMatrix()

  // Lantern posts along the trail, alternating sides.
  const lanternSpots: Vector3[] = bridge.lanternAt.map((p) => p.clone().applyMatrix4(bridge.group.matrix))
  TRAIL_POINTS.slice(2).forEach((p, i) => {
    const post = createLanternPost(1.35)
    const side = i % 2 === 0 ? 0.85 : -0.85
    post.group.position.copy(at(p.x + side, p.z))
    post.group.rotation.y = side > 0 ? Math.PI : 0
    world.add(post.group)
    post.group.updateMatrix()
    lanternSpots.push(post.lanternAt.clone().applyMatrix4(post.group.matrix))
  })
  const trailLanterns = createLanterns(lanternSpots, q)
  world.add(trailLanterns.group)

  // Sky lanterns drifting up over the valley.
  const rng = mulberry32(17)
  const skyCount = q.tier === 'high' ? 14 : 7
  const skySpots = Array.from({ length: skyCount }, () => new Vector3(-10 + rng() * 18, 3 + rng() * 9, -8 - rng() * 22))
  const skyLanterns = createLanterns(skySpots, { ...q, tier: 'light' }, 1.6)
  world.add(skyLanterns.group)

  // Trees: framing clumps on the hillsides; rocks and grass in the foreground.
  const treeSpots: { x: number; y: number; z: number; s: number }[] = []
  for (let i = 0; i < 46; i++) {
    const z = -4 - rng() * 30
    const side = rng() < 0.5 ? -1 : 1
    const x = riverX(z) + side * (4 + rng() * 12)
    if (Math.abs(x - 1.5) < 1.5 && z > -8) continue
    treeSpots.push({ x, y: groundHeight(x, z), z, s: 0.9 + rng() * 1.1 })
  }
  treeSpots.push({ x: -3.6, y: groundHeight(-3.6, 1.2), z: 1.2, s: 1.9 }, { x: 5.4, y: groundHeight(5.4, -1), z: -1, s: 1.6 })
  world.add(createTrees(treeSpots))

  const rockSpots = [
    { x: 3.4, z: 3.2, s: 0.9 }, { x: 3.9, z: 2.6, s: 0.5 }, { x: -0.6, z: 3.6, s: 0.6 },
    { x: riverX(-3) + 1.6, z: -3, s: 0.7 }, { x: riverX(-5) - 1.7, z: -5, s: 0.8 }, { x: riverX(0) + 1.8, z: 0, s: 0.6 },
  ].map((r) => ({ ...r, y: groundHeight(r.x, r.z) }))
  world.add(createRocks(rockSpots))
  // A scattering of static grass tufts, kept off the trail and the water; pebbles on the banks.
  const trailCurve = new CatmullRomCurve3(TRAIL_POINTS).getSpacedPoints(80)
  const offTrail = (x: number, z: number) => trailCurve.every((p) => (p.x - x) ** 2 + (p.z - z) ** 2 > 0.45 ** 2)
  const tuftSpots = Array.from({ length: q.tier === 'high' ? 140 : 70 }, () => {
    const x = -5 + rng() * 12, z = -6 + rng() * 11
    return { x, y: groundHeight(x, z), z }
  }).filter((p) => Math.abs(p.x - riverX(p.z)) > 1.8 && offTrail(p.x, p.z))
  world.add(createGrassTufts(tuftSpots))
  const bank = Array.from({ length: 90 }, () => {
    const z = -12 + rng() * 17
    const x = riverX(z) + (rng() < 0.5 ? -1 : 1) * (1.3 + rng() * 0.6)
    return { x, y: groundHeight(x, z), z }
  })
  world.add(createPebbles(bank))

  // Fireflies near the water.
  const flyCount = q.tier === 'high' ? 60 : 24
  const flies = new InstancedMesh(new IcosahedronGeometry(0.03, 0), new MeshBasicMaterial({ color: '#ffe6a3' }), flyCount)
  const flyBase = Array.from({ length: flyCount }, () => {
    const z = 2 - rng() * 14
    return new Vector3(riverX(z) + (rng() - 0.5) * 6, 0.4 + rng() * 1.4, z)
  })
  world.add(flies)
  const dummy = new Object3D()
  const moveFlies = (t: number) => {
    flyBase.forEach((b, i) => {
      dummy.position.set(b.x + Math.sin(t * 0.7 + i) * 0.3, b.y + Math.sin(t * 1.1 + i * 2) * 0.15, b.z + Math.cos(t * 0.5 + i) * 0.3)
      dummy.scale.setScalar(0.6 + 0.4 * Math.sin(t * 3 + i * 1.3))
      dummy.updateMatrix()
      flies.setMatrixAt(i, dummy.matrix)
    })
    flies.instanceMatrix.needsUpdate = true
  }
  moveFlies(0)

  // The traveler, on the trail in the foreground, turned toward us.
  const warriorHolder = new Group()
  warriorHolder.position.copy(at(1.55, 1.4))
  warriorHolder.rotation.y = 0.25
  world.add(warriorHolder)
  const warrior = await loadWarrior('/models/warrior.glb', q)
  if (warrior) {
    warrior.root.scale.setScalar(0.95)
    warriorHolder.add(warrior.root)
  }

  const pointer = { x: 0, y: 0 }
  const onPointer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1)
    // The world is mirrored, so mirror the pointer for the head-turn too.
    warrior?.lookAt({ x: -pointer.x, y: pointer.y })
  }
  window.addEventListener('pointermove', onPointer)
  window.addEventListener('pointerdown', onPointer)

  // Frame the traveler just right of the title column, whatever the window shape: each frame,
  // nudge the camera sideways until the traveler lands at the target screen position.
  // On portrait screens the title sits above, so the traveler is centred instead.
  const camBase = new Vector3(-0.2, 1.75, 6.6)
  const look = new Vector3(0.0, 1.0, -2)
  const portrait = () => canvas.clientWidth < canvas.clientHeight
  const masthead = document.querySelector('.masthead')
  const focus = new Vector3()
  let shift = 0
  const targetX = () => {
    if (portrait() || !masthead) return 0
    const r = canvas.getBoundingClientRect()
    const textRight = (masthead.getBoundingClientRect().right - r.left) / r.width
    const frac = Math.min(0.8, Math.max(0.5, textRight + (1 - textRight) * 0.3))
    return frac * 2 - 1
  }
  camera.position.copy(camBase)
  camera.lookAt(look)

  stage.onFrame((dt, t) => {
    trailLanterns.update(t)
    if (!q.reducedMotion) {
      skySpots.forEach((p, i) => {
        p.y += dt * (0.12 + (i % 3) * 0.04)
        if (p.y > 14) p.y = 3
      })
      skyLanterns.update(t)
      moveFlies(t)
    }
    warrior?.update(dt)
    const sway = q.reducedMotion ? 0 : 1
    const base = portrait() ? new Vector3(-1.4, 1.9, 8.2) : camBase
    const aim = portrait() ? new Vector3(-1.4, 1.0, -2) : look
    warriorHolder.getWorldPosition(focus)
    focus.y += 0.5
    const ndc = focus.project(camera).x
    // Moving the camera left slides the scene right on screen.
    shift -= (targetX() - ndc) * Math.min(1, dt * 4)
    shift = Math.max(-4, Math.min(4, shift))
    camera.position.set(base.x + shift + pointer.x * 0.25 * sway, base.y + pointer.y * 0.12 * sway, base.z)
    camera.lookAt(aim.x + shift, aim.y, aim.z)
  })

  return {
    ...stage,
    dispose() {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      stage.dispose()
    },
  }
}
