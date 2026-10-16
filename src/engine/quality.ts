export type Quality = { tier: 'high' | 'light'; reducedMotion: boolean; pixelRatio: number }

type Env = { coarsePointer: boolean; reducedMotion: boolean; cores: number; dpr: number }

function readEnv(): Env {
  return {
    coarsePointer: matchMedia('(pointer: coarse)').matches,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    cores: navigator.hardwareConcurrency ?? 4,
    dpr: window.devicePixelRatio || 1,
  }
}

export function detectQuality(env: Env = readEnv()): Quality {
  const light = env.coarsePointer || env.cores <= 4
  return {
    tier: light ? 'light' : 'high',
    reducedMotion: env.reducedMotion,
    pixelRatio: Math.min(env.dpr, light ? 1.5 : 2),
  }
}
