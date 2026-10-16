import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three/webgpu'
import { createIslandStage } from '../../engine/islandStage'
import type { Quality } from '../../engine/quality'
import type { SceneHandle } from '../../engine/sceneHost'
import type { ArchiveView } from './archiveController'
import { TABLETS, TOPIC_COLORS, CONTEXT_SLOTS } from './archiveData'
import type { Topic } from './archiveData'
import { PALETTE } from '../../world/palette'
import { createLabel } from '../../world/label'
import { createRocks } from '../../world/props'
import { createGrassTufts } from '../../world/grass'
import { loadWarrior } from '../../world/warrior'
import { mulberry32 } from '../../world/rand'
import { createScroll } from '../../world/scroll'

const W = 6.2
const D = 4.2
const TOPICS: Topic[] = ['ferry', 'bridge', 'herbs', 'festival']
const TOPIC_NAMES: Record<Topic, string> = { ferry: 'Ferry', bridge: 'Bridge', herbs: 'Herbs', festival: 'Festival' }
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

type T = { mesh: Group; glowMats: MeshStandardMaterial[]; home: Vector3; homeRot: number; glow: number; target: number; flight: null | { from: Vector3; to: Vector3; t: number; delay: number; back: boolean } }

export async function createArchiveScene(canvas: HTMLCanvasElement, q: Quality): Promise<SceneHandle & ArchiveView> {
  const stage = await createIslandStage(canvas, q, {
    width: W, depth: D, camera: new Vector3(0.4, 5.2, 8.4), lookAt: new Vector3(0, 0.25, -0.2), posts: [[-2.8, 1.7], [2.8, 1.7]],
  })
  const { scene, camera } = stage
  const wood = new MeshStandardMaterial({ color: PALETTE.wood, roughness: 0.9 })
  const stone = new MeshStandardMaterial({ color: '#8a8290', roughness: 0.95, flatShading: true })

  // Paved floor for the archive.
  const floor = new Mesh(new BoxGeometry(W - 1.2, 0.05, 2.4), stone)
  floor.position.set(0, 0.025, -0.6)
  floor.receiveShadow = true
  scene.add(floor)

  // Four shelf racks in a shallow arc, one per topic; each holds six tablets.
  const tablets = new Map<string, T>()
  const labels: Mesh[] = []
  TOPICS.forEach((topic, r) => {
    const rack = new Group()
    const angle = (r - 1.5) * 0.28
    rack.position.set((r - 1.5) * 1.25, 0.05, -1.35 + Math.abs(r - 1.5) * 0.25)
    rack.rotation.y = -angle
    for (const sx of [-0.5, 0.5]) {
      const upright = new Mesh(new BoxGeometry(0.07, 1.55, 0.32), wood)
      upright.position.set(sx, 0.775, 0)
      upright.castShadow = true
      rack.add(upright)
    }
    for (let s = 0; s < 4; s++) {
      const board = new Mesh(new BoxGeometry(1.06, 0.045, 0.34), wood)
      board.position.set(0, 0.08 + s * 0.48, 0)
      board.castShadow = board.receiveShadow = true
      rack.add(board)
    }
    const trim = new Mesh(new BoxGeometry(1.12, 0.06, 0.36), new MeshStandardMaterial({ color: TOPIC_COLORS[topic] }))
    trim.position.set(0, 1.58, 0)
    rack.add(trim)
    scene.add(rack)
    rack.updateMatrixWorld()

    const label = createLabel(TOPIC_NAMES[topic], '', 1.1)
    label.position.copy(new Vector3(0, 1.9, 0).applyMatrix4(rack.matrixWorld))
    scene.add(label)
    labels.push(label)

    TABLETS.filter((t) => t.topic === topic).forEach((t, i) => {
      const shelf = Math.floor(i / 2)
      const local = new Vector3(i % 2 ? 0.23 : -0.23, 0.33 + shelf * 0.48, 0.02)
      const scroll = createScroll(TOPIC_COLORS[topic])
      const home = local.applyMatrix4(rack.matrixWorld)
      scroll.group.position.copy(home)
      scroll.group.rotation.y = -angle
      scene.add(scroll.group)
      tablets.set(t.id, { mesh: scroll.group, glowMats: scroll.glow, home, homeRot: -angle, glow: 0, target: 0, flight: null })
    })
  })

  // Reading table at the front with a tray: the context window, three slots.
  const table = new Mesh(new BoxGeometry(2.2, 0.08, 0.8), wood)
  table.position.set(0.2, 0.62, 0.95)
  table.castShadow = table.receiveShadow = true
  scene.add(table)
  for (const [x, z] of [[-0.8, 0.65], [1.2, 0.65], [-0.8, 1.25], [1.2, 1.25]]) {
    const leg = new Mesh(new BoxGeometry(0.07, 0.6, 0.07), wood)
    leg.position.set(x, 0.3, z)
    scene.add(leg)
  }
  const tray = new Mesh(new BoxGeometry(1.6, 0.04, 0.55), new MeshStandardMaterial({ color: '#3d3a6b', roughness: 0.6 }))
  tray.position.set(0.2, 0.68, 0.95)
  scene.add(tray)
  const slots = Array.from({ length: CONTEXT_SLOTS }, (_, i) => new Vector3(-0.32 + i * 0.52, 0.73, 0.95))
  const trayLabel = createLabel('Context', `${CONTEXT_SLOTS} slots`, 0.95)
  trayLabel.position.set(0.2, 1.12, 1.25)
  scene.add(trayLabel)
  labels.push(trayLabel)

  const rng = mulberry32(51)
  const edgeSpots = Array.from({ length: q.tier === 'high' ? 50 : 30 }, () => {
    const front = rng() < 0.6
    return front
      ? { x: (rng() - 0.5) * (W - 0.4), y: 0, z: 1.55 + rng() * 0.45 }
      : { x: (rng() < 0.5 ? -1 : 1) * (W / 2 - 0.2 - rng() * 0.3), y: 0, z: (rng() - 0.5) * (D - 0.6) }
  })
  scene.add(createGrassTufts(edgeSpots, 8))
  scene.add(createRocks(edgeSpots.slice(0, 6).map((p) => ({ ...p, s: 0.2 + rng() * 0.25 }))))

  const warrior = await loadWarrior('/models/warrior.glb', q)
  const holder = new Group()
  holder.position.set(-1.45, 0.05, 1.0)
  holder.rotation.y = 0.9
  scene.add(holder)
  if (warrior) {
    warrior.root.scale.setScalar(0.7)
    holder.add(warrior.root)
  }

  let done: (() => void) | null = null
  let doneAt = 0
  let clock = 0

  stage.onFrame((dt) => {
    clock += dt
    for (const t of tablets.values()) {
      t.glow += (t.target - t.glow) * (1 - Math.exp(-6 * dt))
      t.glowMats.forEach((m, i) => (m.emissiveIntensity = t.glow * (i === 0 ? 0.3 : 1.2)))
      const f = t.flight
      if (!f) continue
      if (f.delay > 0) { f.delay -= dt; continue }
      f.t = Math.min(1, f.t + dt / 0.9)
      const k = ease(f.t)
      t.mesh.position.lerpVectors(f.from, f.to, k)
      t.mesh.position.y += Math.sin(k * Math.PI) * 0.6
      // Lie flat in the tray; stand back up on the shelf.
      t.mesh.rotation.x = (f.back ? 1 - k : k) * -Math.PI / 2
      t.mesh.rotation.y = f.back ? t.homeRot * k : t.homeRot * (1 - k)
      if (f.t >= 1) t.flight = null
    }
    if (done && clock >= doneAt) { const d = done; done = null; d(); warrior?.play('idle') }
    for (const l of labels) l.quaternion.copy(camera.quaternion)
    warrior?.lookAt(stage.pointer)
    warrior?.update(dt)
  })

  const sendHome = () => {
    for (const t of tablets.values()) {
      if (!t.mesh.position.equals(t.home)) t.flight = { from: t.mesh.position.clone(), to: t.home.clone(), t: 0, delay: 0, back: true }
    }
  }

  return {
    ...stage,
    showRelevance(scores) {
      // Glow tracks similarity: strongly relevant chunks light up, weak ones barely.
      for (const [id, t] of tablets) t.target = scores ? Math.pow(scores[id] ?? 0.1, 3) * 2.6 : 0
    },
    retrieve(ids, finish) {
      sendHome()
      // Relevance glow (set by showRelevance) stays on; the top-k fly into the tray.
      ids.forEach((id, i) => {
        const t = tablets.get(id)!
        t.target = 2.2
        t.flight = { from: t.home.clone(), to: slots[i].clone(), t: 0, delay: 0.7 + i * 0.25, back: false }
      })
      warrior?.play('interact')
      done = finish
      doneAt = clock + 0.7 + ids.length * 0.25 + 0.95
    },
    clear() {
      done = null
      for (const t of tablets.values()) t.target = 0
      sendHome()
    },
  }
}
