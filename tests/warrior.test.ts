import { describe, it, expect, vi } from 'vitest'
import { headLookAngles, loadWarrior } from '../src/world/warrior'

const deg = (d: number) => (d * Math.PI) / 180
const q = { tier: 'high' as const, reducedMotion: false, pixelRatio: 1, software: false }

describe('headLookAngles', () => {
  it('is neutral at the centre', () => {
    const a = headLookAngles({ x: 0, y: 0 })
    expect(a.yaw).toBeCloseTo(0)
    expect(a.pitch).toBeCloseTo(0)
  })
  it('turns fully at the right edge', () => {
    expect(headLookAngles({ x: 1, y: 0 }).yaw).toBeCloseTo(deg(60))
  })
  it('clamps beyond the edges', () => {
    const a = headLookAngles({ x: 5, y: -5 })
    expect(a.yaw).toBeCloseTo(deg(60))
    expect(a.pitch).toBeCloseTo(deg(-30))
  })
})

describe('loadWarrior', () => {
  it('resolves null instead of throwing when the model fails to load', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const loader = { loadAsync: () => Promise.reject(new Error('404')) }
    await expect(loadWarrior('/missing.glb', q, loader)).resolves.toBeNull()
    expect(warn).toHaveBeenCalled()
  })
})

describe('head tracking', () => {
  it('holds a steady angle instead of accumulating when the clip does not drive the head', async () => {
    const { Group, Object3D, Mesh, BoxGeometry, MeshStandardMaterial } = await import('three/webgpu')
    const scene = new Group()
    const body = new Mesh(new BoxGeometry(1, 2, 1), new MeshStandardMaterial())
    const head = new Object3D()
    head.name = 'head'
    scene.add(body, head)
    const loader = { loadAsync: async () => ({ scene, animations: [] }) }
    const w = (await loadWarrior('/x.glb', q, loader))!
    w.lookAt({ x: 1, y: 0 })
    for (let i = 0; i < 200; i++) w.update(1 / 60)
    const settled = head.rotation.y
    for (let i = 0; i < 200; i++) w.update(1 / 60)
    expect(head.rotation.y).toBeCloseTo(settled, 3)
    expect(Math.abs(head.rotation.y)).toBeLessThanOrEqual(deg(60) + 1e-6)
  })
})
