import { Color, PerspectiveCamera, Vector3, Scene, RenderPipeline, PCFShadowMap, NeutralToneMapping, Timer } from 'three/webgpu'
import { pass } from 'three/tsl'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { createRenderer, setStatus } from './renderer'
import type { Quality } from './quality'
import type { SceneHandle } from './sceneHost'
import type { WebGPURenderer } from 'three/webgpu'

export type FrameFn = (dt: number, t: number) => void

export type Stage = SceneHandle & {
  renderer: WebGPURenderer
  scene: Scene
  camera: PerspectiveCamera
  onFrame(fn: FrameFn): void
}

// Shared renderer + camera + bloom + loop for every scene.
export async function createStage(
  canvas: HTMLCanvasElement,
  q: Quality,
  opts: { fov?: number; background?: Color; bloom?: { strength: number; radius: number; threshold: number }; exposure?: number } = {},
): Promise<Stage> {
  const { renderer, backend } = await createRenderer(canvas, q)
  setStatus(backend === 'webgpu' ? 'WEBGPU · LIVE' : 'WEBGL · LIVE')
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.toneMapping = NeutralToneMapping
  renderer.toneMappingExposure = opts.exposure ?? 1

  const scene = new Scene()
  if (opts.background) scene.background = opts.background
  const camera = new PerspectiveCamera(opts.fov ?? 40, 1, 0.1, 400)

  let pipeline: RenderPipeline | null = null
  if (opts.bloom && q.tier === 'high') {
    pipeline = new RenderPipeline(renderer)
    const color = pass(scene, camera).getTextureNode('output')
    pipeline.outputNode = color.add(bloom(color, opts.bloom.strength, opts.bloom.radius, opts.bloom.threshold))
  }

  const frames: FrameFn[] = []
  const timer = new Timer()
  const tick = () => {
    timer.update()
    const dt = Math.min(timer.getDelta(), 1 / 20)
    const t = timer.getElapsed()
    for (const f of frames) f(dt, t)
    if (pipeline) pipeline.render()
    else renderer.render(scene, camera)
  }

  const resize = (w: number, h: number) => {
    if (w === 0 || h === 0) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(() => resize(canvas.clientWidth, canvas.clientHeight))
  ro.observe(canvas)
  resize(canvas.clientWidth, canvas.clientHeight)

  return {
    renderer,
    scene,
    camera,
    onFrame: (fn) => frames.push(fn),
    start: () => { timer.reset(); renderer.setAnimationLoop(tick) },
    stop: () => renderer.setAnimationLoop(null),
    resize,
    dispose: () => { ro.disconnect(); renderer.setAnimationLoop(null); renderer.dispose() },
  }
}

// The dioramas are framed for a ~5:4 canvas. On narrower canvases (phones), pull the camera
// back along its view line so the whole island width still fits.
export const DIORAMA_ASPECT = 1.25
// `strength` > 1 pulls back harder for extra-wide islands; desktop framing is unchanged.
export function fitDistance(camera: PerspectiveCamera, base: Vector3, target: Vector3, strength = 1): Vector3 {
  const k = Math.pow(Math.max(1, DIORAMA_ASPECT / camera.aspect), strength)
  return target.clone().add(base.clone().sub(target).multiplyScalar(k))
}
