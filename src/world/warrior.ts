import {
  AnimationMixer, Box3, CanvasTexture, Group, SRGBColorSpace, Mesh, MeshStandardMaterial, Object3D, PointLight, Quaternion, SphereGeometry, Vector3,
} from 'three/webgpu'
import type { AnimationAction, AnimationClip, Texture } from 'three/webgpu'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { PALETTE } from './palette'
import type { Quality } from '../engine/quality'

const MAX_YAW = (60 * Math.PI) / 180
const MAX_PITCH = (30 * Math.PI) / 180
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// Pointer in normalized device coords (-1..1) → head yaw/pitch, clamped.
export function headLookAngles(pointer: { x: number; y: number }): { yaw: number; pitch: number } {
  return { yaw: clamp(pointer.x, -1, 1) * MAX_YAW, pitch: clamp(pointer.y, -1, 1) * MAX_PITCH }
}

export type WarriorClip = 'idle' | 'walk' | 'interact' | 'cheer'
export type Warrior = {
  root: Object3D
  play(name: WarriorClip): void
  lookAt(pointer: { x: number; y: number }): void
  update(dt: number): void
}

const CLIP_NAMES: Record<WarriorClip, string> = {
  idle: 'Idle',
  walk: 'Walking_A',
  interact: 'Interact',
  cheer: 'Cheer',
}
const HIDDEN_PROPS = ['Knife', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable']

type Loader = { loadAsync(url: string): Promise<{ scene: Group; animations: AnimationClip[] }> }

// Loads the KayKit rogue, normalizes it to 1 unit tall, tints it into the dusk palette and
// gives it a hand lantern. Resolves null on failure so scenes still render without it.
export async function loadWarrior(url: string, q: Quality, loader: Loader = new GLTFLoader()): Promise<Warrior | null> {
  let gltf: { scene: Group; animations: AnimationClip[] }
  try {
    gltf = await loader.loadAsync(url)
  } catch (err) {
    console.warn('Warrior failed to load; continuing without it.', err)
    return null
  }

  const model = gltf.scene
  for (const name of HIDDEN_PROPS) {
    const prop = model.getObjectByName(name)
    if (prop) prop.visible = false
  }
  model.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    const mat = mesh.material as MeshStandardMaterial
    if (mat?.map) {
      mat.map = regradeTexture(mat.map)
      mat.roughness = 0.85
    }
  })

  const box = new Box3().setFromObject(model)
  const size = box.getSize(new Vector3())
  const root = new Group()
  model.scale.setScalar(1 / size.y)
  model.position.y = -box.min.y / size.y
  root.add(model)

  let lanternHolder: Group | null = null
  // GLTFLoader strips dots from node names: 'handslot.l' becomes 'handslotl'.
  const hand = model.getObjectByName('handslotl') ?? model.getObjectByName('handslot.l')
  if (hand) {
    // Bones carry their own scale; size the lantern in root units regardless.
    root.updateMatrixWorld(true)
    const handScale = hand.getWorldScale(new Vector3()).y
    const holder = new Group()
    holder.scale.setScalar(1 / handScale)
    hand.add(holder)
    lanternHolder = holder
    const lantern = new Mesh(
      new SphereGeometry(0.075, 14, 10),
      new MeshStandardMaterial({ color: PALETTE.lantern, emissive: PALETTE.lanternGlow, emissiveIntensity: 2.6 }),
    )
    lantern.name = 'hand-lantern'
    lantern.scale.y = 1.25
    lantern.position.set(0, -0.12, 0)
    holder.add(lantern)
    if (q.tier === 'high') {
      const glow = new PointLight(PALETTE.lanternGlow, 1.2, 1.6, 1.8)
      glow.position.copy(lantern.position)
      holder.add(glow)
    }
  }

  const mixer = new AnimationMixer(model)
  const actions = new Map<WarriorClip, AnimationAction>()
  for (const [key, clipName] of Object.entries(CLIP_NAMES) as [WarriorClip, string][]) {
    const clip = gltf.animations.find((a) => a.name === clipName)
    if (clip) actions.set(key, mixer.clipAction(clip))
  }
  let current: AnimationAction | null = null
  const play = (name: WarriorClip) => {
    const next = actions.get(name)
    if (!next || next === current) return
    next.reset().play()
    if (current) next.crossFadeFrom(current, 0.25, false)
    current = next
  }
  play('idle')

  const head = model.getObjectByName('head')
  const headRest = head ? head.quaternion.clone() : null
  const handQuat = new Quaternion()
  const rootQuat = new Quaternion()
  const target = { yaw: 0, pitch: 0 }
  const look = { yaw: 0, pitch: 0 }

  return {
    root,
    play,
    lookAt: (pointer) => Object.assign(target, headLookAngles(pointer)),
    update(dt) {
      // Reset the head first: if the clip has no head track, the mixer won't, and the
      // offset below would accumulate every frame.
      if (head && headRest) head.quaternion.copy(headRest)
      mixer.update(dt)
      const k = 1 - Math.exp(-8 * dt)
      look.yaw += (target.yaw - look.yaw) * k
      look.pitch += (target.pitch - look.pitch) * k
      // Applied after the mixer so it layers on top of the animated pose.
      if (head) {
        head.rotateY(look.yaw)
        head.rotateX(-look.pitch)
      }
      // Keep the hand lantern hanging straight down whatever the arm is doing.
      if (lanternHolder?.parent) {
        lanternHolder.parent.updateWorldMatrix(true, false)
        lanternHolder.parent.getWorldQuaternion(handQuat)
        root.getWorldQuaternion(rootQuat)
        lanternHolder.quaternion.copy(handQuat.invert().multiply(rootQuat))
      }
    },
  }
}

// Mute the stock texture's candy colours so the teal cloak and brown leather sit in the
// dusk palette: shift teal/green swatches toward indigo, and pull everything 20% toward grey.
function regradeTexture(tex: Texture): Texture {
  const img = tex.image as CanvasImageSource & { width: number; height: number }
  if (!img?.width || typeof document === 'undefined') return tex
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const g = c.getContext('2d')!
  g.drawImage(img, 0, 0)
  const data = g.getImageData(0, 0, c.width, c.height)
  const px = data.data
  for (let i = 0; i < px.length; i += 4) {
    let r = px[i], gr = px[i + 1], b = px[i + 2]
    if (gr > r * 1.25 && gr >= b * 0.8) {
      // teal/green → dusky indigo
      ;[r, gr, b] = [r * 0.6 + gr * 0.25, gr * 0.45, b * 0.5 + gr * 0.55]
    }
    const lum = 0.2126 * r + 0.7152 * gr + 0.0722 * b
    px[i] = r * 0.8 + lum * 0.2
    px[i + 1] = gr * 0.8 + lum * 0.2
    px[i + 2] = b * 0.8 + lum * 0.2
  }
  g.putImageData(data, 0, 0)
  const out = new CanvasTexture(c)
  out.flipY = tex.flipY
  out.colorSpace = SRGBColorSpace
  out.magFilter = tex.magFilter
  out.minFilter = tex.minFilter
  return out
}
