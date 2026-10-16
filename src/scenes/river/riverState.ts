import { softmax, sample } from './llm'
import type { TokenScript, Candidate } from './tokenScript'

export type RiverState = ReturnType<typeof createRiverState>

export function createRiverState(script: TokenScript, rng: () => number = Math.random) {
  let nodeId: string | null = script.start
  let text = script.prompt
  let tokens = 0
  let pending: Candidate | null = null

  const current = () => (nodeId ? script.nodes[nodeId].candidates : [])

  return {
    candidates(temperature: number): { text: string; prob: number; joinsPrevious: boolean }[] {
      const cands = current()
      const probs = softmax(cands.map((c) => c.logit), temperature)
      return cands.map((c, i) => ({ text: c.text, prob: probs[i], joinsPrevious: !!c.joinsPrevious }))
    },
    step(temperature: number): { chosen: number } | null {
      if (pending || !nodeId) return null
      const cands = current()
      const chosen = sample(softmax(cands.map((c) => c.logit), temperature), rng)
      pending = cands[chosen]
      return { chosen }
    },
    finishStep(): void {
      if (!pending) return
      text += pending.joinsPrevious ? pending.text : ` ${pending.text}`
      nodeId = pending.next
      tokens++
      pending = null
    },
    isBusy: () => pending !== null,
    isComplete: () => nodeId === null,
    sentence: () => text,
    tokenCount: () => tokens,
    reset(): void {
      nodeId = script.start
      text = script.prompt
      tokens = 0
      pending = null
    },
  }
}
