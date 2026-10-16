import { it, expect } from 'vitest'
import { TOKEN_SCRIPT } from '../src/scenes/river/tokenScript'

const { nodes, start } = TOKEN_SCRIPT

it('every next id exists', () => {
  for (const n of Object.values(nodes))
    for (const c of n.candidates) if (c.next !== null) expect(nodes[c.next], `${n.id} → ${c.next}`).toBeDefined()
  expect(nodes[start]).toBeDefined()
})

it('every path ends within 8 steps (acyclic)', () => {
  const depth = (id: string, seen: Set<string>): number => {
    expect(seen.has(id), `cycle at ${id}`).toBe(false)
    const next = new Set([...seen, id])
    return 1 + Math.max(...nodes[id].candidates.map((c) => (c.next === null ? 0 : depth(c.next, next))))
  }
  expect(depth(start, new Set())).toBeLessThanOrEqual(8)
})

it('every node has 3-5 candidates', () => {
  for (const n of Object.values(nodes)) {
    expect(n.candidates.length).toBeGreaterThanOrEqual(3)
    expect(n.candidates.length).toBeLessThanOrEqual(5)
  }
})

it('includes at least one reachable continuation token', () => {
  const reach = new Set<string>()
  const walk = (id: string) => { if (reach.has(id)) return; reach.add(id); nodes[id].candidates.forEach((c) => c.next && walk(c.next)) }
  walk(start)
  const has = [...reach].some((id) => nodes[id].candidates.some((c) => c.joinsPrevious))
  expect(has).toBe(true)
})
