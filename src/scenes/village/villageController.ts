import { buildRun } from './villageData'
import type { Step, Place } from './villageData'
import { completeWithin } from '../complete'

export type VillageView = {
  moveTo(place: Place, done: () => void): void
  useTool(tool: Step['tool'] | null): void
  setObstacle(on: boolean): void
  finish(): void
  reset(): void
}

const KIND_LABEL: Record<Step['kind'], string> = {
  goal: 'Goal', thought: 'Thought', action: 'Action', observation: 'Result', done: 'Stop',
}

export function createVillageController(root: Document = document) {
  const $ = <T extends HTMLElement>(id: string) => root.getElementById(id) as T
  const next = $<HTMLButtonElement>('village-step')
  const reset = $<HTMLButtonElement>('village-reset')
  const block = $<HTMLInputElement>('village-block')
  const log = $('village-log')
  const readout = (k: string) => root.querySelector(`#village-readouts [data-readout="${k}"]`) as HTMLElement

  let view: VillageView | null = null
  let run = buildRun(block.checked)
  let i = 0
  let busy = false
  let tools = 0
  let cancel: () => void = () => {}

  const update = () => {
    readout('step').textContent = `${i} / ${run.length}`
    readout('tools').textContent = String(tools)
    readout('loops').textContent = String(run.slice(0, i).filter((s) => s.kind === 'thought').length)
    next.disabled = busy || i >= run.length
    next.textContent = i === 0 ? 'Start the quest' : i >= run.length ? 'Quest complete' : 'Next step'
    // The lane can only be blocked before the agent sets off for the cottage.
    block.disabled = i > run.findIndex((s) => s.text.startsWith('walk_to("west cottage"'))
  }

  const append = (s: Step) => {
    const li = document.createElement('li')
    li.className = `log-${s.kind}${s.mistake ? ' is-mistake' : ''}`
    li.innerHTML = '<b></b><span></span>'
    li.querySelector('b')!.textContent = KIND_LABEL[s.kind]
    li.querySelector('span')!.textContent = s.text
    log.append(li)
    log.scrollTop = log.scrollHeight
  }

  next.addEventListener('click', () => {
    if (busy || i >= run.length) return
    const s = run[i++]
    append(s)
    if (s.tool) tools++
    view?.useTool(s.tool ?? null)
    if (s.kind === 'done') view?.finish()
    if (s.at && view) {
      busy = true
      update()
      const v = view
      cancel = completeWithin(5000, (done) => v.moveTo(s.at!, done), () => { busy = false; update() })
    } else update()
  })
  reset.addEventListener('click', () => {
    cancel()
    run = buildRun(block.checked)
    i = 0
    tools = 0
    busy = false
    log.replaceChildren()
    view?.reset()
    update()
  })
  block.addEventListener('change', () => {
    // Swap the rest of the run without losing what has already happened.
    const done = run.slice(0, i)
    run = [...done, ...buildRun(block.checked).slice(done.length)]
    view?.setObstacle(block.checked)
    update()
  })

  update()
  return {
    attach(v: VillageView) {
      view = v
      v.setObstacle(block.checked)
    },
  }
}
