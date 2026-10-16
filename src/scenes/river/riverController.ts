import { createRiverState } from './riverState'
import { TOKEN_SCRIPT } from './tokenScript'
import { completeWithin } from '../complete'

export type Cand = { text: string; prob: number; joinsPrevious: boolean }

// What the 3D scene does with the state; the controller works without one.
export type RiverView = {
  showCandidates(cands: Cand[]): void
  animateStep(chosen: number, done: () => void): void
  complete(): void
  reset(): void
  setTemperature?(t: number): void
}

export function createRiverController(root: Document = document) {
  const $ = <T extends HTMLElement>(id: string) => root.getElementById(id) as T
  const sentenceEl = $('river-sentence')
  const stepBtn = $<HTMLButtonElement>('river-step')
  const resetBtn = $<HTMLButtonElement>('river-reset')
  const mist = $<HTMLInputElement>('river-mist')
  const mistOut = $('river-mist-value')
  const closing = $('river-closing')
  const readout = (k: string) => root.querySelector(`[data-readout="${k}"]`) as HTMLElement

  const state = createRiverState(TOKEN_SCRIPT)
  let view: RiverView | null = null
  let temperature = parseFloat(mist.value)
  let lastToken = ''
  let cancel: () => void = () => {}

  const render = () => {
    const full = state.sentence()
    if (lastToken && full.endsWith(lastToken)) {
      sentenceEl.textContent = full.slice(0, full.length - lastToken.length)
      const span = document.createElement('span')
      span.className = 'tok-new'
      span.textContent = lastToken
      sentenceEl.append(span)
    } else sentenceEl.textContent = full
    const cands = state.candidates(temperature)
    readout('temperature').textContent = temperature.toFixed(2)
    readout('topProb').textContent = cands.length ? `${Math.round(Math.max(...cands.map((c) => c.prob)) * 100)}%` : '—'
    readout('tokens').textContent = String(state.tokenCount())
    mistOut.textContent = temperature.toFixed(2)
    stepBtn.disabled = state.isBusy() || state.isComplete()
    closing.classList.toggle('is-lit', state.isComplete())
    view?.showCandidates(cands)
  }

  stepBtn.addEventListener('click', () => {
    const before = state.sentence()
    const r = state.step(temperature)
    if (!r) return
    stepBtn.disabled = true
    const finish = () => {
      state.finishStep()
      lastToken = state.sentence().slice(before.length)
      render()
      if (state.isComplete()) view?.complete()
    }
    if (view) {
      const v = view
      cancel = completeWithin(3000, (done) => v.animateStep(r.chosen, done), finish)
    } else finish()
  })
  resetBtn.addEventListener('click', () => {
    cancel()
    state.reset()
    lastToken = ''
    view?.reset()
    render()
  })
  mist.addEventListener('input', () => {
    temperature = parseFloat(mist.value)
    view?.setTemperature?.(temperature)
    render()
  })

  render()
  return {
    attach(v: RiverView) {
      view = v
      v.setTemperature?.(temperature)
      render()
    },
  }
}
