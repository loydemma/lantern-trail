import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createArchiveController } from '../src/scenes/archive/archiveController'
import { createHallController } from '../src/scenes/hall/hallController'
import { createVillageController } from '../src/scenes/village/villageController'
import { buildRun } from '../src/scenes/village/villageData'

const body = readFileSync('index.html', 'utf8').match(/<body[^>]*>([\s\S]*)<\/body>/)![1]
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const select = (name: string, value: string) => {
  const input = document.querySelector(`input[name="${name}"][value="${value}"]`) as HTMLInputElement
  input.checked = true
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

beforeEach(() => {
  document.body.innerHTML = body
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('archive controller', () => {
  it('re-enables Ask when the question changes mid-retrieval', () => {
    const c = createArchiveController()
    c.attach({ showRelevance() {}, retrieve() {}, clear() {} }) // never calls done
    $<HTMLButtonElement>('archive-ask').click()
    expect($<HTMLButtonElement>('archive-ask').disabled).toBe(true)
    select('archive-q', 'toll')
    expect($<HTMLButtonElement>('archive-ask').disabled).toBe(false)
  })
  it('finishes even if the scene stops before its animation completes', () => {
    const c = createArchiveController()
    c.attach({ showRelevance() {}, retrieve() {}, clear() {} })
    $<HTMLButtonElement>('archive-ask').click()
    vi.advanceTimersByTime(6000)
    expect($<HTMLButtonElement>('archive-ask').disabled).toBe(false)
    expect($('archive-answer').textContent).toContain('ninth bell')
  })
})

describe('hall controller', () => {
  it('re-enables Give the task when the task changes mid-scan', () => {
    const c = createHallController()
    c.attach({ scanTitles() {}, useTools() {}, reset() {} })
    $<HTMLButtonElement>('hall-go').click()
    expect($<HTMLButtonElement>('hall-go').disabled).toBe(true)
    select('hall-task', 'crack')
    expect($<HTMLButtonElement>('hall-go').disabled).toBe(false)
  })
  it('finishes even if the scene stops mid-scan', () => {
    const c = createHallController()
    c.attach({ scanTitles() {}, useTools() {}, reset() {} })
    $<HTMLButtonElement>('hall-go').click()
    vi.advanceTimersByTime(6000)
    expect($<HTMLButtonElement>('hall-go').disabled).toBe(false)
  })
})

describe('village', () => {
  it('reports the right tool count when the lane is blocked', () => {
    const run = buildRun(true)
    const tools = run.filter((s) => s.tool).length
    expect(run[run.length - 1].text).toContain(`${tools} tools used`)
  })
  it('advances even if the scene stops mid-walk', () => {
    const c = createVillageController()
    c.attach({ moveTo() {}, useTool() {}, setObstacle() {}, finish() {}, reset() {} })
    const next = $<HTMLButtonElement>('village-step')
    next.click()
    expect(next.disabled).toBe(true)
    vi.advanceTimersByTime(6000)
    expect(next.disabled).toBe(false)
  })
})

describe('river controller', () => {
  it('finishes a step even if the scene stops mid-walk', async () => {
    const { createRiverController } = await import('../src/scenes/river/riverController')
    const c = createRiverController()
    c.attach({ showCandidates() {}, animateStep() {}, complete() {}, reset() {} })
    $<HTMLButtonElement>('river-step').click()
    vi.advanceTimersByTime(6000)
    expect(document.querySelector('[data-readout="tokens"]')!.textContent).toBe('1')
  })
})
