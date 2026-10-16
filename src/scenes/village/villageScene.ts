import {
  BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, Vector3,
} from 'three/webgpu'
import { createIslandStage } from '../../engine/islandStage'
import type { Quality } from '../../engine/quality'
import type { SceneHandle } from '../../engine/sceneHost'
import type { VillageView } from './villageController'
import type { Place, Step } from './villageData'
import { PALETTE } from '../../world/palette'
import { createLabel } from '../../world/label'
import { createCottage } from '../../world/props'
import { createGrassTufts, createPebbles } from '../../world/grass'
import { loadWarrior } from '../../world/warrior'
import { mulberry32 } from '../../world/rand'

const W = 6.6
const D = 4.6
const STAND: Record<Place, Vector3> = {
  start: new Vector3(0.4, 0.05, 1.55),
  map: new Vector3(1.95, 0.05, -0.25),
  oldMill: new Vector3(1.75, 0.05, 1.35),
  scout: new Vector3(-1.55, 0.05, -0.45),
  abacus: new Vector3(0.1, 0.05, -0.55),
  detour: new Vector3(-0.5, 0.05, 2.05),
  miller: new Vector3(-1.6, 0.05, 1.3),
}

const mat = (color: string, extra: Partial<MeshStandardMaterial> = {}) =>
  Object.assign(new MeshStandardMaterial({ color, roughness: 0.9 }), extra)

function stall(awning: string): Group {
  const g = new Group()
  const wood = mat('#5a4030')
  const counter = new Mesh(new BoxGeometry(1.0, 0.45, 0.45), wood)
  counter.position.y = 0.225
  counter.castShadow = counter.receiveShadow = true
  g.add(counter)
  for (const x of [-0.46, 0.46]) {
    const pole = new Mesh(new BoxGeometry(0.05, 1.05, 0.05), wood)
    pole.position.set(x, 0.52, -0.18)
    g.add(pole)
  }
  const roof = new Mesh(new BoxGeometry(1.15, 0.05, 0.7), mat(awning))
  roof.position.set(0, 1.05, 0.02)
  roof.rotation.x = 0.28
  roof.castShadow = true
  g.add(roof)
  return g
}

export async function createVillageScene(canvas: HTMLCanvasElement, q: Quality): Promise<SceneHandle & VillageView> {
  const stage = await createIslandStage(canvas, q, {
    width: W, depth: D, camera: new Vector3(0.3, 6.6, 9.8), lookAt: new Vector3(0, 0.3, 0.0), posts: [[-3.0, -1.9], [3.0, 1.9]],
  })
  const { scene, camera } = stage
  const labels: Mesh[] = []
  const signs = new Map<NonNullable<Step['tool']>, MeshStandardMaterial>()
  const sign = (tool: NonNullable<Step['tool']>, text: string, pos: Vector3) => {
    const l = createLabel(text, 'tool', 0.72)
    l.position.copy(pos)
    scene.add(l)
    labels.push(l)
    const m = mat('#ffcf7a', { emissive: PALETTE.lanternGlow, emissiveIntensity: 0.2 })
    const bulb = new Mesh(new SphereGeometry(0.06, 10, 8), m)
    bulb.position.copy(pos).add(new Vector3(0, -0.28, 0))
    scene.add(bulb)
    signs.set(tool, m)
  }

  // Scout tower — search.
  const tower = new Group()
  const stoneM = mat('#8a8290', { flatShading: true })
  const shaft = new Mesh(new CylinderGeometry(0.28, 0.36, 1.7, 8), stoneM)
  shaft.position.y = 0.85
  shaft.castShadow = true
  const deck = new Mesh(new CylinderGeometry(0.46, 0.46, 0.08, 8), mat('#5a4030'))
  deck.position.y = 1.72
  const cap = new Mesh(new ConeGeometry(0.5, 0.5, 8), mat('#4d3a4f'))
  cap.position.y = 2.2
  cap.castShadow = true
  tower.add(shaft, deck, cap)
  tower.position.set(-2.1, 0, -1.25)
  scene.add(tower)
  sign('search', 'Search', new Vector3(-2.1, 2.75, -1.25))

  // Abacus stall — calculator.
  const abacusStall = stall('#3f6b6a')
  abacusStall.position.set(0.1, 0, -1.25)
  scene.add(abacusStall)
  const frame = new Mesh(new BoxGeometry(0.5, 0.32, 0.03), mat('#5a4030'))
  frame.position.set(0.1, 0.62, -1.1)
  scene.add(frame)
  const bead = new SphereGeometry(0.025, 8, 6)
  for (let r = 0; r < 4; r++) for (let b = 0; b < 6; b++) {
    const m = new Mesh(bead, mat(b < 2 + r ? '#c48a4a' : '#e6dccb'))
    m.position.set(-0.09 + b * 0.05 + (b < 2 + r ? 0 : 0.08), 0.52 + r * 0.065, -1.08)
    scene.add(m)
  }
  sign('calculator', 'Calculator', new Vector3(0.1, 1.75, -1.25))

  // Map stall — map.
  const mapStall = stall('#8a3b34')
  mapStall.position.set(2.05, 0, -0.95)
  scene.add(mapStall)
  const board = new Mesh(new BoxGeometry(0.7, 0.5, 0.03), mat('#e2cfa6'))
  board.position.set(2.05, 0.75, -1.12)
  board.rotation.x = -0.15
  scene.add(board)
  sign('map', 'Map', new Vector3(2.05, 1.75, -0.95))

  // The miller's (current) cottage, west by the bridge.
  const miller = createCottage(61, true)
  miller.position.set(-2.25, 0.02, 1.25)
  miller.rotation.y = 0.9
  miller.scale.setScalar(0.8)
  scene.add(miller)
  const doorLantern = mat('#ffcf7a', { emissive: PALETTE.lanternGlow, emissiveIntensity: 0 })
  const dl = new Mesh(new SphereGeometry(0.07, 10, 8), doorLantern)
  dl.position.set(-1.85, 0.62, 1.55)
  scene.add(dl)

  // The old mill, east: dark windows and a still wheel.
  const mill = createCottage(62, false)
  mill.position.set(2.45, 0.02, 1.35)
  mill.rotation.y = -0.6
  mill.scale.setScalar(0.85)
  mill.traverse((o) => {
    const m = (o as Mesh).material as MeshStandardMaterial | undefined
    if (m?.emissiveIntensity) { m.emissiveIntensity = 0; m.color.set('#3a3440') }
  })
  scene.add(mill)
  const wheel = new Mesh(new TorusGeometry(0.32, 0.05, 6, 14), mat('#5e5660'))
  wheel.position.set(2.95, 0.38, 1.05)
  wheel.rotation.y = -0.6
  scene.add(wheel)

  // A lane of paving and a riverside path along the front edge.
  const paveM = mat('#8a7461')
  const rng = mulberry32(71)
  for (let k = 0; k < 26; k++) {
    const t = k / 25
    const p = new Vector3().lerpVectors(STAND.abacus, STAND.miller, t)
    const slab = new Mesh(new BoxGeometry(0.22, 0.03, 0.18), paveM)
    slab.position.set(p.x + (rng() - 0.5) * 0.1, 0.02, p.z + (rng() - 0.5) * 0.1)
    slab.rotation.y = rng()
    slab.receiveShadow = true
    scene.add(slab)
  }
  const river = new Mesh(new BoxGeometry(W - 0.1, 0.03, 0.35), mat('#6f7fae', { roughness: 0.3 }))
  river.position.set(0, 0.02, D / 2 - 0.2)
  scene.add(river)

  // The fallen cart (obstacle).
  const cart = new Group()
  const bed = new Mesh(new BoxGeometry(0.6, 0.12, 0.36), mat('#6b4f3a'))
  bed.position.y = 0.14
  bed.rotation.z = 0.5
  const w1 = new Mesh(new CylinderGeometry(0.15, 0.15, 0.04, 12), mat('#4a3a33'))
  w1.rotation.x = Math.PI / 2
  w1.position.set(-0.2, 0.15, 0.2)
  cart.add(bed, w1)
  cart.position.set(-0.75, 0.02, 0.38)
  cart.visible = false
  scene.add(cart)

  scene.add(createGrassTufts(Array.from({ length: q.tier === 'high' ? 50 : 30 }, () => ({
    x: (rng() - 0.5) * (W - 0.6), y: 0, z: (rng() - 0.5) * (D - 0.8),
  })).filter((p) => Math.abs(p.x) > 0.9 || p.z > 0.6), 9))
  scene.add(createPebbles(Array.from({ length: 50 }, () => ({ x: (rng() - 0.5) * (W - 0.4), y: 0, z: D / 2 - 0.42 + rng() * 0.1 }))))

  const holder = new Group()
  holder.position.copy(STAND.start)
  scene.add(holder)
  const warrior = await loadWarrior('/models/warrior.glb', q)
  if (warrior) {
    warrior.root.scale.setScalar(0.62)
    holder.add(warrior.root)
  }

  let walk: { from: Vector3; to: Vector3; t: number; dur: number; done: () => void } | null = null
  let celebrating = false

  stage.onFrame((dt) => {
    if (walk) {
      walk.t = Math.min(1, walk.t + dt / walk.dur)
      holder.position.lerpVectors(walk.from, walk.to, walk.t)
      if (walk.t >= 1) {
        const d = walk.done
        walk = null
        if (!celebrating) warrior?.play('idle')
        d()
      }
    }
    for (const l of labels) l.quaternion.copy(camera.quaternion)
    warrior?.lookAt(stage.pointer)
    warrior?.update(dt)
  })

  return {
    ...stage,
    moveTo(place, done) {
      const to = STAND[place].clone()
      const from = holder.position.clone()
      const dist = from.distanceTo(to)
      if (dist < 0.01) { done(); return }
      holder.rotation.y = Math.atan2(to.x - from.x, to.z - from.z)
      warrior?.play('walk')
      walk = { from, to, t: 0, dur: Math.max(0.5, dist / 1.5), done }
    },
    useTool(tool) {
      for (const [k, m] of signs) m.emissiveIntensity = k === tool ? 3 : 0.2
    },
    setObstacle(on) {
      cart.visible = on
    },
    finish() {
      celebrating = true
      doorLantern.emissiveIntensity = 3
      warrior?.play('cheer')
    },
    reset() {
      walk = null
      celebrating = false
      holder.position.copy(STAND.start)
      holder.rotation.y = 0
      doorLantern.emissiveIntensity = 0
      for (const m of signs.values()) m.emissiveIntensity = 0.2
      warrior?.play('idle')
    },
  }
}
