import {
  CanvasTexture, CylinderGeometry, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PlaneGeometry, Vector3, DoubleSide,
} from 'three/webgpu'
import { createStage, fitDistance } from '../../engine/stage'
import type { Quality } from '../../engine/quality'
import type { SceneHandle } from '../../engine/sceneHost'
import type { Cand, RiverView } from './riverController'
import { PALETTE } from '../../world/palette'
import { createIslandSlab } from '../../world/islandSlab'
import { createLanterns, createLanternPost } from '../../world/lantern'
import { createWater } from '../../world/water'
import { createRocks } from '../../world/props'
import { createGrassTufts, createPebbles } from '../../world/grass'
import { loadWarrior } from '../../world/warrior'
import { mulberry32 } from '../../world/rand'
import { labelTexture } from '../../world/label'

const W = 6.4
const D = 4.2
const RIVER_W = 2.6
const START_X = -2.7
const STEP_X = 0.95
const WATER_Y = 0.02
const stoneRadius = (p: number) => 0.16 + 0.34 * Math.sqrt(p) // footprint area ∝ probability
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

type Stone = { mesh: Group; top: Mesh; label: Mesh; r: number; targetR: number; y: number; targetY: number; z: number; glow: number }

function stoneGeometry(seed: number): CylinderGeometry {
  const geo = new CylinderGeometry(1, 1.08, 0.22, 18, 2)
  const rng = mulberry32(seed)
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const k = 1 + (rng() - 0.5) * 0.08
    pos.setX(i, pos.getX(i) * k)
    pos.setZ(i, pos.getZ(i) * k)
    if (pos.getY(i) > 0) pos.setY(i, pos.getY(i) + (rng() - 0.5) * 0.03)
  }
  geo.computeVertexNormals()
  return geo
}

export async function createRiverScene(canvas: HTMLCanvasElement, q: Quality): Promise<SceneHandle & RiverView> {
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

  // Island: grassy banks either side of a river channel that runs the length of the slab.
  const slab = createIslandSlab({ width: W, depth: D, topColor: PALETTE.grass })
  scene.add(slab.group)
  // The water sits just above the slab's grassy top; the banks hide its edges.
  // Plane uv.y runs across the river (bank to bank) once the plane is laid flat.
  const waterGeo = new PlaneGeometry(W - 0.02, RIVER_W, 14, 6)
  waterGeo.rotateX(-Math.PI / 2)
  waterGeo.translate(0, WATER_Y, 0)
  scene.add(createWater(waterGeo, (_, v) => v, { y: WATER_Y, reflect: q.tier === 'high' }))

  // Banks: raised grassy strips that hide the channel edges.
  const bankMat = new MeshStandardMaterial({ color: PALETTE.grass, roughness: 0.95 })
  for (const s of [-1, 1]) {
    const bank = new Mesh(new CylinderGeometry(0.2, 0.26, W - 0.08, 10, 1), bankMat)
    bank.rotation.z = Math.PI / 2
    bank.scale.set(1, 1, 0.6)
    bank.position.set(0, 0.03, s * (RIVER_W / 2 + 0.05))
    bank.receiveShadow = true
    scene.add(bank)
  }

  const rng = mulberry32(31)
  const bankSpots = (n: number) =>
    Array.from({ length: n }, () => {
      const s = rng() < 0.5 ? -1 : 1
      return { x: (rng() - 0.5) * (W - 0.4), y: 0, z: s * (RIVER_W / 2 + 0.25 + rng() * (D / 2 - RIVER_W / 2 - 0.4)) }
    })
  scene.add(createGrassTufts(bankSpots(q.tier === 'high' ? 60 : 36)))
  scene.add(createRocks(bankSpots(10).map((p) => ({ ...p, s: 0.25 + rng() * 0.3 }))))
  const edge = Array.from({ length: 140 }, () => ({
    x: (rng() - 0.5) * (W - 0.3), y: WATER_Y + 0.01, z: (rng() < 0.5 ? -1 : 1) * (RIVER_W / 2 - 0.12 + rng() * 0.2),
  }))
  scene.add(createPebbles(edge))

  const lanternSpots: Vector3[] = []
  for (const [x, z] of [[-2.7, -1.7], [2.6, 1.7]] as const) {
    const post = createLanternPost(1.1)
    post.group.position.set(x, 0, z)
    post.group.rotation.y = x < 0 ? -0.4 : Math.PI - 0.4
    scene.add(post.group)
    post.group.updateMatrixWorld()
    lanternSpots.push(post.lanternAt.clone().applyMatrix4(post.group.matrixWorld))
  }
  const lanterns = createLanterns(lanternSpots, q)
  scene.add(lanterns.group)

  // Mist: drifting translucent sheets over the water; density follows temperature.
  const mistTex = (() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const g = c.getContext('2d')!
    for (let i = 0; i < 40; i++) {
      const x = rng() * 256, y = rng() * 256, r = 30 + rng() * 60
      const grad = g.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, 'rgba(240,232,246,0.5)')
      grad.addColorStop(1, 'rgba(240,232,246,0)')
      g.fillStyle = grad
      g.fillRect(0, 0, 256, 256)
    }
    const t = new CanvasTexture(c)
    t.wrapS = t.wrapT = 1000 // RepeatWrapping
    return t
  })()
  const mists = [0.12, 0.3, 0.5].map((y, i) => {
    const m = new Mesh(
      new PlaneGeometry(W - 0.1, RIVER_W - 0.2),
      new MeshBasicMaterial({ map: mistTex.clone(), transparent: true, depthWrite: false, opacity: 0.3, side: DoubleSide }),
    )
    m.rotation.x = -Math.PI / 2
    m.position.y = y
    m.renderOrder = 2 + i
    scene.add(m)
    return m
  })
  let mistTarget = 0.1
  let mistNow = 0.1

  // Stones.
  const stoneMat = new MeshStandardMaterial({ color: PALETTE.stoneWet, roughness: 0.75 })
  const topMat = () => new MeshStandardMaterial({ color: PALETTE.stoneTop, roughness: 0.9, emissive: PALETTE.lanternGlow, emissiveIntensity: 0 })
  let seed = 100
  const makeStone = (text: string, prob: number | null, z: number): Stone => {
    const mesh = new Group()
    const geo = stoneGeometry(seed++)
    const body = new Mesh(geo, stoneMat)
    body.castShadow = body.receiveShadow = true
    const top = new Mesh(new CylinderGeometry(0.94, 0.94, 0.02, 18), topMat())
    top.position.y = 0.115
    top.receiveShadow = true
    const label = new Mesh(
      new PlaneGeometry(1.2, 0.3),
      new MeshBasicMaterial({ map: labelTexture(text, prob === null ? '' : `${Math.round(prob * 100)}%`), transparent: true, depthWrite: false }),
    )
    label.renderOrder = 10
    mesh.add(body, top)
    scene.add(mesh, label)
    return { mesh, top, label, r: 0.01, targetR: 0, y: WATER_Y - 0.3, targetY: WATER_Y + 0.02, z, glow: 0 }
  }
  const setLabel = (s: Stone, text: string, prob: number) => {
    const mat = s.label.material as MeshBasicMaterial
    mat.map?.dispose()
    mat.map = labelTexture(text, `${Math.round(prob * 100)}%`)
    mat.needsUpdate = true
  }

  // Free a sunk stone's GPU resources (each has its own geometry, top material and label texture).
  const disposeStone = (s: Stone) => {
    s.mesh.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      m.geometry.dispose()
      if (m.material !== stoneMat) (m.material as MeshStandardMaterial).dispose()
    })
    const lm = s.label.material as MeshBasicMaterial
    lm.map?.dispose()
    lm.dispose()
    s.label.geometry.dispose()
  }

  let path: Stone[] = []
  let cands: Stone[] = []
  let candTexts: string[] = []
  let sinking: Stone[] = []
  let headX = START_X
  const start = makeStone('', null, 0)
  start.targetR = 0.42
  start.targetY = WATER_Y + 0.02
  start.mesh.position.x = START_X

  // Order candidates so the favourite sits mid-stream and the rest fan out.
  const zFor = (rank: number, n: number) => {
    const slots = [0, -1, 1, -2, 2].slice(0, n)
    return slots[rank] * (n > 3 ? 0.66 : 0.86)
  }

  const showCandidates = (list: Cand[]) => {
    const texts = list.map((c) => c.text)
    const same = texts.join('|') === candTexts.join('|')
    if (!same) {
      cands.forEach((s) => (s.targetY = WATER_Y - 0.4, sinking.push(s)))
      const ranked = list.map((c, i) => ({ c, i })).sort((a, b) => b.c.prob - a.c.prob)
      const byIndex: Stone[] = []
      ranked.forEach(({ c, i }, rank) => {
        const s = makeStone(c.text, c.prob, zFor(rank, list.length))
        // Fan into a shallow arc: outer stones sit slightly further ahead.
        s.mesh.position.x = headX + STEP_X + Math.abs(s.z) * 0.45 + (c.joinsPrevious ? -0.22 : 0)
        byIndex[i] = s
      })
      cands = byIndex
      candTexts = texts
    }
    list.forEach((c, i) => {
      cands[i].targetR = stoneRadius(c.prob)
      if (same) setLabel(cands[i], c.text, c.prob)
    })
  }

  // Warrior.
  const traveler = new Group()
  traveler.position.set(START_X, WATER_Y + 0.14, 0)
  traveler.rotation.y = Math.PI / 2
  scene.add(traveler)
  const warrior = await loadWarrior('/models/warrior.glb', q)
  if (warrior) {
    warrior.root.scale.setScalar(0.62)
    traveler.add(warrior.root)
  }

  let walk: { from: Vector3; to: Vector3; t: number; done: () => void; stone: Stone } | null = null
  const animateStep = (chosen: number, done: () => void) => {
    const stone = cands[chosen]
    stone.glow = 1
    const to = new Vector3(stone.mesh.position.x, WATER_Y + 0.14, stone.z)
    walk = { from: traveler.position.clone(), to, t: 0, done, stone }
    warrior?.play('walk')
  }
  const finishWalk = () => {
    if (!walk) return
    const { stone, done } = walk
    walk = null
    warrior?.play('idle')
    cands.forEach((s) => { if (s !== stone) { s.targetY = WATER_Y - 0.4; sinking.push(s) } })
    path.push(stone)
    stone.glow = 0.35
    headX = stone.mesh.position.x
    cands = []
    candTexts = []
    done()
  }

  const pointer = { x: 0, y: 0 }
  const onPointer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1)
    warrior?.lookAt({ x: pointer.x * 0.6, y: pointer.y })
  }
  canvas.addEventListener('pointermove', onPointer)

  let followX = 0
  const camBase = new Vector3(0.6, 5.0, 7.4)
  const lookAt = new Vector3(0.1, -0.35, 0.2)
  stage.onFrame((dt, t) => {
    lanterns.update(t)
    // Stones ease toward their target size and height.
    const all = [start, ...path, ...cands, ...sinking]
    for (const s of all) {
      s.r += (s.targetR - s.r) * (1 - Math.exp(-7 * dt))
      s.y += (s.targetY - s.y) * (1 - Math.exp(-5 * dt))
      s.mesh.scale.set(s.r, 1, s.r)
      s.mesh.position.y = s.y + (q.reducedMotion ? 0 : Math.sin(t * 1.3 + s.z * 3) * 0.008)
      s.mesh.position.z = s.z
      s.label.position.set(s.mesh.position.x, s.mesh.position.y + 0.5, s.z + s.r * 0.25)
      s.label.quaternion.copy(camera.quaternion)
      s.label.scale.setScalar(camera.aspect < 1.1 ? 1.45 : 1)
      // Fade with height as stones rise/sink; crossed stones dim, and the one underfoot hides.
      const rise = Math.min(1, Math.max(0, (s.y - (WATER_Y - 0.2)) / 0.2))
      const crossed = path.includes(s) ? (s === path[path.length - 1] && !walk ? 0 : 0.5) : 1
      ;(s.label.material as MeshBasicMaterial).opacity = rise * crossed
      ;(s.top.material as MeshStandardMaterial).emissiveIntensity = s.glow * 0.9
    }
    sinking = sinking.filter((s) => {
      if (s.y < WATER_Y - 0.35) {
        scene.remove(s.mesh, s.label)
        disposeStone(s)
        return false
      }
      return true
    })
    if (walk) {
      walk.t = Math.min(1, walk.t + dt / 0.9)
      const k = ease(walk.t)
      traveler.position.lerpVectors(walk.from, walk.to, k)
      traveler.position.y += Math.sin(k * Math.PI) * 0.18
      traveler.rotation.y = Math.atan2(walk.to.x - walk.from.x, walk.to.z - walk.from.z)
      if (walk.t >= 1) finishWalk()
    } else {
      traveler.rotation.y += (Math.PI / 2 - traveler.rotation.y) * (1 - Math.exp(-4 * dt))
    }
    warrior?.update(dt)
    mistNow += (mistTarget - mistNow) * (1 - Math.exp(-3 * dt))
    mists.forEach((m, i) => {
      const mat = m.material as MeshBasicMaterial
      mat.opacity = mistNow * (1 - i * 0.25)
    })
    const sway = q.reducedMotion ? 0 : 1
    // Narrow canvases (phones): stay close and follow the traveler and the stones ahead,
    // instead of shrinking the whole island to fit.
    const narrow = camera.aspect < 1.1
    followX += ((narrow ? traveler.position.x + 0.9 : 0) - followX) * (1 - Math.exp(-3 * dt))
    const aim = lookAt.clone().setX(lookAt.x + followX)
    const cam = fitDistance(camera, camBase.clone().setX(camBase.x + followX), aim, narrow ? 0.6 : 1)
    camera.position.set(cam.x + pointer.x * 0.35 * sway, cam.y + pointer.y * 0.2 * sway, cam.z)
    camera.lookAt(aim)
  })

  return {
    ...stage,
    showCandidates,
    animateStep,
    complete: () => warrior?.play('cheer'),
    reset() {
      ;[...path, ...cands].forEach((s) => { s.targetY = WATER_Y - 0.4; sinking.push(s) })
      path = []
      cands = []
      candTexts = []
      headX = START_X
      walk = null
      traveler.position.set(START_X, WATER_Y + 0.14, 0)
      warrior?.play('idle')
    },
    setTemperature(tmp: number) {
      // Thicker mist at higher temperature: 0.2 → nearly clear, 2.0 → heavy.
      mistTarget = 0.01 + ((tmp - 0.2) / 1.8) * 0.24
    },
    dispose() {
      canvas.removeEventListener('pointermove', onPointer)
      stage.dispose()
    },
  }
}
