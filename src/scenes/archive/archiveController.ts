import { QUESTIONS, TABLETS, CONTEXT_SLOTS, retrieve } from './archiveData'
import type { Question } from './archiveData'

export type ArchiveView = {
  showRelevance(scores: Record<string, number> | null): void
  retrieve(ids: string[], done: () => void): void
  clear(): void
}

export function createArchiveController(root: Document = document) {
  const $ = <T extends HTMLElement>(id: string) => root.getElementById(id) as T
  const list = $('archive-questions')
  const rag = $<HTMLInputElement>('archive-rag')
  const ask = $<HTMLButtonElement>('archive-ask')
  const answer = $('archive-answer')
  const tag = $('archive-tag')
  const cites = $('archive-cites')
  const readout = (k: string) => root.querySelector(`#archive-readouts [data-readout="${k}"]`) as HTMLElement

  let view: ArchiveView | null = null
  let current: Question = QUESTIONS[0]
  let busy = false

  QUESTIONS.forEach((q, i) => {
    const label = document.createElement('label')
    label.className = 'choice'
    label.innerHTML = `<input type="radio" name="archive-q" value="${q.id}" ${i === 0 ? 'checked' : ''} /><span></span>`
    label.querySelector('span')!.textContent = q.text
    list.append(label)
  })

  const setReadouts = (retrieved: number, grounded: boolean | null) => {
    readout('retrieved').textContent = String(retrieved)
    readout('slots').textContent = `${retrieved} / ${CONTEXT_SLOTS}`
    readout('grounded').textContent = grounded === null ? '—' : grounded ? 'Yes' : 'No'
  }
  const resetAnswer = () => {
    answer.textContent = 'Pick a question and ask the archive.'
    answer.classList.remove('is-madeup')
    tag.textContent = ''
    cites.replaceChildren()
    setReadouts(0, null)
  }

  const showGrounded = (ids: string[]) => {
    answer.textContent = current.grounded.answer
    answer.classList.remove('is-madeup')
    tag.textContent = `Grounded · cites ${current.grounded.cites.join(', ')}`
    cites.replaceChildren(
      ...ids.map((id) => {
        const t = TABLETS.find((x) => x.id === id)!
        const li = document.createElement('li')
        if (current.grounded.cites.includes(id)) li.className = 'is-cited'
        li.innerHTML = '<b></b><span></span>'
        li.querySelector('b')!.textContent = `${t.id} · ${t.source}`
        li.querySelector('span')!.textContent = t.text
        return li
      }),
    )
    setReadouts(ids.length, true)
  }

  list.addEventListener('change', (e) => {
    current = QUESTIONS.find((q) => q.id === (e.target as HTMLInputElement).value) ?? current
    view?.clear()
    resetAnswer()
  })
  rag.addEventListener('change', () => {
    view?.clear()
    resetAnswer()
  })
  ask.addEventListener('click', () => {
    if (busy) return
    if (!rag.checked) {
      view?.clear()
      answer.textContent = current.madeUp
      answer.classList.add('is-madeup')
      tag.textContent = 'No sources · confidently made up'
      cites.replaceChildren()
      setReadouts(0, false)
      return
    }
    const top = retrieve(current).map((r) => r.id)
    busy = true
    ask.disabled = true
    answer.textContent = 'Searching the archive…'
    tag.textContent = ''
    const finish = () => {
      busy = false
      ask.disabled = false
      showGrounded(top)
    }
    if (view) {
      view.showRelevance(current.scores)
      view.retrieve(top, finish)
    } else finish()
  })

  resetAnswer()
  return { attach: (v: ArchiveView) => (view = v) }
}
