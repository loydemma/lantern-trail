import { detectQuality } from './engine/quality'
import { mountWhenVisible } from './engine/sceneHost'
import { setStatus } from './engine/renderer'
import { createRiverController } from './scenes/river/riverController'

const q = detectQuality()
setStatus('LOADING')

const heroCanvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null
if (heroCanvas) mountWhenVisible(heroCanvas, () => import('./scenes/hero').then((m) => m.createHeroScene(heroCanvas, q)))

// The controls work on their own; the 3D scene attaches when it scrolls into view.
const river = createRiverController()
const riverCanvas = document.getElementById('river-canvas') as HTMLCanvasElement | null
if (riverCanvas)
  mountWhenVisible(riverCanvas, async () => {
    const scene = await import('./scenes/river/riverScene').then((m) => m.createRiverScene(riverCanvas, q))
    river.attach(scene)
    return scene
  })
