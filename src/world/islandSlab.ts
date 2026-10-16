import { CanvasTexture, Color, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from 'three/webgpu'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { PALETTE } from './palette'

export type SlabOptions = {
  width: number
  depth: number
  strata?: Color[]
  topColor?: Color
  layerHeight?: number
  floorGap?: number
}

// Atoll/Pirate-style cut-away block: a soft top surface, layered strata on the cut faces,
// and a contact shadow on the cream page below. The top surface sits at y = 0.
export function createIslandSlab(opts: SlabOptions): { group: Group; height: number } {
  const strata = opts.strata ?? [PALETTE.strataSand, PALETTE.strataClay, PALETTE.strataEarth, PALETTE.bedrock]
  const layerH = opts.layerHeight ?? 0.32
  const group = new Group()

  const top = new Mesh(
    new RoundedBoxGeometry(opts.width, 0.16, opts.depth, 3, 0.06),
    new MeshStandardMaterial({ color: opts.topColor ?? PALETTE.grass, roughness: 0.95 }),
  )
  top.position.y = -0.08
  top.receiveShadow = true
  group.add(top)

  let y = -0.16
  strata.forEach((color, i) => {
    // Each layer is slightly thicker and inset than the last, like cake strata.
    const h = layerH * (1 + i * 0.18)
    const inset = 1 - i * 0.012
    const layer = new Mesh(
      new RoundedBoxGeometry(opts.width * inset, h, opts.depth * inset, 2, 0.04),
      new MeshStandardMaterial({ color, roughness: 1 }),
    )
    layer.position.y = y - h / 2
    layer.receiveShadow = true
    group.add(layer)
    y -= h
  })
  const height = -y

  const shadow = new Mesh(
    new PlaneGeometry(opts.width * 1.9, opts.depth * 1.9),
    new MeshBasicMaterial({ map: radialShadowTexture(), transparent: true, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = -height - (opts.floorGap ?? 0.55)
  shadow.renderOrder = -1
  group.add(shadow)

  return { group, height }
}

function radialShadowTexture(): CanvasTexture {
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(60, 40, 50, 0.42)')
  grad.addColorStop(0.5, 'rgba(60, 40, 50, 0.16)')
  grad.addColorStop(1, 'rgba(60, 40, 50, 0)')
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  return tex
}
