import { detectQuality } from './engine/quality'
import { mountWhenVisible } from './engine/sceneHost'
import { setStatus } from './engine/renderer'
import { createRiverController } from './scenes/river/riverController'
import { createArchiveController } from './scenes/archive/archiveController'
import { createVillageController } from './scenes/village/villageController'
import { createHallController } from './scenes/hall/hallController'

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

const archive = createArchiveController()
const archiveCanvas = document.getElementById('archive-canvas') as HTMLCanvasElement | null
if (archiveCanvas)
  mountWhenVisible(archiveCanvas, async () => {
    const scene = await import('./scenes/archive/archiveScene').then((m) => m.createArchiveScene(archiveCanvas, q))
    archive.attach(scene)
    return scene
  })

const village = createVillageController()
const villageCanvas = document.getElementById('village-canvas') as HTMLCanvasElement | null
if (villageCanvas)
  mountWhenVisible(villageCanvas, async () => {
    const scene = await import('./scenes/village/villageScene').then((m) => m.createVillageScene(villageCanvas, q))
    village.attach(scene)
    return scene
  })

const hall = createHallController()
const hallCanvas = document.getElementById('hall-canvas') as HTMLCanvasElement | null
if (hallCanvas)
  mountWhenVisible(hallCanvas, async () => {
    const scene = await import('./scenes/hall/hallScene').then((m) => m.createHallScene(hallCanvas, q))
    hall.attach(scene)
    return scene
  })
