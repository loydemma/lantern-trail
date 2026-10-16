import { SKILLS, TASKS, TOOLS, INDEX_WORDS, bodyWords } from './hallData'
import type { Skill } from './hallData'

export type HallView = {
  scanTitles(chosen: number, done: () => void): void
  useTools(tools: Skill['tools']): void
  reset(): void
}

export function createHallController(root: Document = document) {
  const $ = <T extends HTMLElement>(id: string) => root.getElementById(id) as T
  const list = $('hall-tasks')
  const go = $<HTMLButtonElement>('hall-go')
  const card = $('hall-skill')
  const readout = (k: string) => root.querySelector(`#hall-readouts [data-readout="${k}"]`) as HTMLElement

  let view: HallView | null = null
  let task = TASKS[0]
  let busy = false

  TASKS.forEach((t, i) => {
    const label = document.createElement('label')
    label.className = 'choice'
    label.innerHTML = `<input type="radio" name="hall-task" value="${t.id}" ${i === 0 ? 'checked' : ''} /><span></span>`
    label.querySelector('span')!.textContent = t.text
    list.append(label)
  })

  const showIndex = () => {
    // What the agent sees before choosing: titles and one-line descriptions only.
    const pre = document.createElement('pre')
    pre.textContent = SKILLS.map((s) => `${s.name}: ${s.description}`).join('\n')
    const p = document.createElement('p')
    p.className = 'skill-note'
    p.textContent = 'Right now the agent only sees each skill’s name and description.'
    card.replaceChildren(p, pre)
    readout('context').textContent = `~${INDEX_WORDS} words`
    readout('loaded').textContent = '0 of 4'
    readout('tools').textContent = '—'
  }

  const showSkill = (s: Skill) => {
    const pre = document.createElement('pre')
    pre.textContent = [
      '---',
      `name: ${s.name}`,
      `description: ${s.description}`,
      '---',
      '',
      `# ${s.title}`,
      '',
      ...s.steps.map((step, i) => `${i + 1}. ${step}`),
    ].join('\n')
    const p = document.createElement('p')
    p.className = 'skill-note'
    p.textContent = `Opened ${s.name}/SKILL.md. The other chapters stay closed.`
    card.replaceChildren(p, pre)
    readout('context').textContent = `~${INDEX_WORDS + bodyWords(s)} words`
    readout('loaded').textContent = '1 of 4'
    readout('tools').textContent = s.tools.map((t) => TOOLS[t]).join(', ') || 'none'
  }

  list.addEventListener('change', (e) => {
    task = TASKS.find((t) => t.id === (e.target as HTMLInputElement).value) ?? task
    view?.reset()
    showIndex()
  })
  go.addEventListener('click', () => {
    if (busy) return
    const idx = SKILLS.findIndex((s) => s.name === task.skill)
    const skill = SKILLS[idx]
    busy = true
    go.disabled = true
    showIndex()
    const finish = () => {
      busy = false
      go.disabled = false
      showSkill(skill)
      view?.useTools(skill.tools)
    }
    if (view) view.scanTitles(idx, finish)
    else finish()
  })

  showIndex()
  return { attach: (v: HallView) => (view = v) }
}
