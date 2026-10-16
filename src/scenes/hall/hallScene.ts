import {
  BoxGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry, TorusGeometry, Vector3,
} from 'three/webgpu'
import { createIslandStage } from '../../engine/islandStage'
import type { Quality } from '../../engine/quality'
import type { SceneHandle } from '../../engine/sceneHost'
import type { HallView } from './hallController'
import { SKILLS, TOOLS } from './hallData'
import type { ToolId } from './hallData'
import { PALETTE } from '../../world/palette'
import { createLabel } from '../../world/label'
import { createGrassTufts } from '../../world/grass'
import { loadWarrior } from '../../world/warrior'
import { mulberry32 } from '../../world/rand'

const W = 6.2
const D = 4.2
const mat = (color: string, extra: Partial<MeshStandardMaterial> = {}) =>
  Object.assign(new MeshStandardMaterial({ color, roughness: 0.85 }), extra)

function toolMesh(id: ToolId): Group {
  const g = new Group()
  const metal = mat('#8d8a96', { metalness: 0.4, roughness: 0.5 })
  const wood = mat('#6b4f3a')
  if (id === 'oilcan') {
    const body = new Mesh(new CylinderGeometry(0.1, 0.12, 0.2, 12), metal)
    const spout = new Mesh(new CylinderGeometry(0.012, 0.02, 0.18, 6), metal)
    spout.position.set(0.1, 0.08, 0)
    spout.rotation.z = -0.9
    g.add(body, spout)
  } else if (id === 'shears') {
    for (const r of [0.35, -0.35]) {
      const blade = new Mesh(new BoxGeometry(0.03, 0.3, 0.01), metal)
      blade.rotation.z = r
      g.add(blade)
    }
  } else if (id === 'chisel') {
    const handle = new Mesh(new CylinderGeometry(0.025, 0.025, 0.14, 8), wood)
    handle.position.y = 0.08
    const blade = new Mesh(new BoxGeometry(0.04, 0.14, 0.012), metal)
    blade.position.y = -0.06
    g.add(handle, blade)
  } else if (id === 'clay') {
    const pot = new Mesh(new SphereGeometry(0.12, 12, 10), mat('#a8674a'))
    pot.scale.y = 0.85
    g.add(pot)
  } else if (id === 'staff') {
    const staff = new Mesh(new CylinderGeometry(0.02, 0.025, 0.95, 8), wood)
    g.add(staff)
  } else {
    const rope = new Mesh(new TorusGeometry(0.11, 0.025, 6, 16), mat('#b59a6a'))
    g.add(rope)
  }
  g.traverse((o) => { (o as Mesh).castShadow = true })
  return g
}

export async function createHallScene(canvas: HTMLCanvasElement, q: Quality): Promise<SceneHandle & HallView> {
  const stage = await createIslandStage(canvas, q, {
    width: W, depth: D, camera: new Vector3(0.6, 4.4, 7.4), lookAt: new Vector3(0, 0.55, -0.2), posts: [[-2.8, 1.7], [2.8, 1.7]],
  })
  const { scene, camera } = stage

  // Timber floor, a back wall with a tool rack, and two corner posts.
  const floor = new Mesh(new BoxGeometry(W - 1.0, 0.08, 3.0), mat('#7a5a44'))
  floor.position.set(0, 0.04, -0.4)
  floor.receiveShadow = true
  scene.add(floor)
  const wall = new Mesh(new BoxGeometry(W - 1.2, 1.6, 0.12), mat(PALETTE.wall.getStyle()))
  wall.position.set(0, 0.88, -1.85)
  wall.receiveShadow = true
  scene.add(wall)
  const beam = new Mesh(new BoxGeometry(W - 1.0, 0.12, 0.2), mat('#3f6b6a'))
  beam.position.set(0, 1.72, -1.82)
  scene.add(beam)
  for (const x of [-(W - 1.0) / 2, (W - 1.0) / 2]) {
    const post = new Mesh(new BoxGeometry(0.14, 1.75, 0.14), mat('#8a3b34'))
    post.position.set(x, 0.88, -1.8)
    post.castShadow = true
    scene.add(post)
  }

  // Tools on pegs along the wall, each with a soft glow disc behind it when in use.
  const toolIds = Object.keys(TOOLS) as ToolId[]
  const tools = new Map<ToolId, { group: Group; halo: MeshBasicMaterial; pos: Vector3 }>()
  const labels: Mesh[] = []
  toolIds.forEach((id, i) => {
    const x = -1.9 + i * 0.76
    const group = toolMesh(id)
    group.position.set(x, id === 'staff' ? 0.75 : 1.02, -1.72)
    scene.add(group)
    const halo = new MeshBasicMaterial({ color: '#ffcf7a', transparent: true, opacity: 0, depthWrite: false })
    const disc = new Mesh(new CylinderGeometry(0.26, 0.26, 0.01, 24), halo)
    disc.rotation.x = Math.PI / 2
    disc.position.set(x, 1.0, -1.785)
    scene.add(disc)
    const label = createLabel(TOOLS[id], '', 0.72)
    label.position.set(x, 1.42, -1.6)
    scene.add(label)
    labels.push(label)
    tools.set(id, { group, halo, pos: new Vector3(x, 0.08, -1.1) })
  })

  // Lectern with the manual.
  const lectern = new Group()
  const stand = new Mesh(new BoxGeometry(0.16, 0.8, 0.16), mat('#5a4030'))
  stand.position.y = 0.48
  const top = new Mesh(new BoxGeometry(0.62, 0.05, 0.46), mat('#5a4030'))
  top.position.y = 0.9
  top.rotation.x = 0.35
  lectern.add(stand, top)
  lectern.position.set(0.9, 0.08, 0.5)
  scene.add(lectern)
  const pages = new Mesh(new BoxGeometry(0.5, 0.04, 0.36), mat('#efe3cf'))
  pages.position.set(0.9, 1.02, 0.5)
  pages.rotation.x = 0.35
  scene.add(pages)
  const hinge = new Group()
  hinge.position.set(0.65, 1.04, 0.5)
  hinge.rotation.x = 0.35
  const cover = new Mesh(new BoxGeometry(0.52, 0.025, 0.38), mat('#3d3a6b', { emissive: PALETTE.indigo, emissiveIntensity: 0 }))
  cover.position.x = 0.26
  hinge.add(cover)
  scene.add(hinge)

  // Chapter titles float above the book — the only part the agent sees until it picks one.
  const chapters = SKILLS.map((s, i) => {
    // One row above the wall, clear of the tool labels.
    const l = createLabel(s.title, `ch. ${i + 1}`, 1.0)
    l.position.set(0.3 + (i - 1.5) * 1.12, 2.6, 0.6)
    scene.add(l)
    labels.push(l)
    return l
  })

  const rng = mulberry32(81)
  scene.add(createGrassTufts(Array.from({ length: q.tier === 'high' ? 40 : 24 }, () => ({
    x: (rng() - 0.5) * (W - 0.4), y: 0, z: 1.3 + rng() * 0.6,
  })), 10))

  const holder = new Group()
  const home = new Vector3(-0.6, 0.08, 0.7)
  holder.position.copy(home)
  holder.rotation.y = 0.8
  scene.add(holder)
  const warrior = await loadWarrior('/models/warrior.glb', q)
  if (warrior) {
    warrior.root.scale.setScalar(0.7)
    holder.add(warrior.root)
  }

  let scan: { chosen: number; t: number; done: () => void } | null = null
  let walk: { from: Vector3; to: Vector3; t: number; dur: number } | null = null
  let coverTarget = 0
  let chosenIdx = -1
  let active = new Set<ToolId>()
  const walkTo = (to: Vector3) => {
    const from = holder.position.clone()
    holder.rotation.y = Math.atan2(to.x - from.x, to.z - from.z)
    walk = { from, to: to.clone(), t: 0, dur: Math.max(0.5, from.distanceTo(to) / 1.4) }
    warrior?.play('walk')
  }

  stage.onFrame((dt, t) => {
    // Scan the titles one by one, then settle on the chosen chapter and open the cover.
    chapters.forEach((l, i) => {
      const m = l.material as MeshBasicMaterial
      let lit = 0.55
      if (scan) {
        const cursor = Math.floor(scan.t / 0.35)
        lit = cursor < SKILLS.length ? (i === cursor ? 1 : 0.35) : i === scan.chosen ? 1 : 0.25
      } else if (coverTarget > 0) lit = i === chosenIdx ? 1 : 0.25
      m.opacity += (lit - m.opacity) * (1 - Math.exp(-10 * dt))
      l.scale.setScalar(0.9 + m.opacity * 0.15)
    })
    if (scan) {
      scan.t += dt
      if (scan.t > SKILLS.length * 0.35 + 0.4) {
        coverTarget = 1
        const d = scan.done
        scan = null
        d()
      }
    }
    hinge.rotation.z += (coverTarget * Math.PI * 0.92 - hinge.rotation.z) * (1 - Math.exp(-5 * dt))
    ;(cover.material as MeshStandardMaterial).emissiveIntensity = coverTarget * 0.6
    if (walk) {
      walk.t = Math.min(1, walk.t + dt / walk.dur)
      holder.position.lerpVectors(walk.from, walk.to, walk.t)
      if (walk.t >= 1) { walk = null; warrior?.play(active.size ? 'interact' : 'idle') }
    }
    for (const [id, tool] of tools) {
      const on = active.has(id)
      tool.halo.opacity += ((on ? 0.55 + Math.sin(t * 3) * 0.1 * (q.reducedMotion ? 0 : 1) : 0) - tool.halo.opacity) * (1 - Math.exp(-6 * dt))
    }
    for (const l of labels) l.quaternion.copy(camera.quaternion)
    warrior?.lookAt(stage.pointer)
    warrior?.update(dt)
  })

  return {
    ...stage,
    scanTitles(chosen, done) {
      active = new Set()
      coverTarget = 0
      chosenIdx = chosen
      scan = { chosen, t: 0, done }
      walkTo(new Vector3(0.35, 0.08, 0.75))
    },
    useTools(list) {
      active = new Set(list)
      if (list.length) {
        const xs = list.map((id) => tools.get(id)!.pos.x)
        walkTo(new Vector3(xs.reduce((a, b) => a + b, 0) / xs.length, 0.08, -1.0))
      }
    },
    reset() {
      scan = null
      walk = null
      active = new Set()
      coverTarget = 0
      chosenIdx = -1
      holder.position.copy(home)
      holder.rotation.y = 0.8
      warrior?.play('idle')
    },
  }
}
