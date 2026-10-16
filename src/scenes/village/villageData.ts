// Pre-written agent run for the Village chapter: an LLM in a loop with tools.
// Each entry is one line of the agent's log; `at` moves the traveler to a place.

export type Place = 'start' | 'map' | 'oldMill' | 'scout' | 'abacus' | 'detour' | 'miller'
export type LogKind = 'goal' | 'thought' | 'action' | 'observation' | 'done'
export type Step = { kind: LogKind; text: string; at?: Place; tool?: 'map' | 'search' | 'calculator'; mistake?: boolean }

export const QUEST = 'Deliver the lantern oil to the miller before the night ferry leaves.'

export const BEFORE_LANE: Step[] = [
  { kind: 'goal', text: QUEST, at: 'start' },
  { kind: 'thought', text: 'I need to know where the miller lives. The map stall should show the mill.' },
  { kind: 'action', text: 'map("mill")', at: 'map', tool: 'map' },
  { kind: 'observation', text: 'The map marks a mill on the east bank.' },
  { kind: 'action', text: 'walk_to("east mill")', at: 'oldMill' },
  { kind: 'observation', text: 'The east mill is boarded up. Nobody has worked here in years.', mistake: true },
  { kind: 'thought', text: 'That map is out of date. I should check a newer source before walking anywhere else.' },
  { kind: 'action', text: 'search("where does the miller live now?")', at: 'scout', tool: 'search' },
  { kind: 'observation', text: 'From the tower: the miller moved to the west cottage by the bridge last spring.' },
  { kind: 'thought', text: 'Will I make it before the ferry? Let me work out the time.' },
  { kind: 'action', text: 'calculator("60 min until ferry − 25 min walk")', at: 'abacus', tool: 'calculator' },
  { kind: 'observation', text: '35 minutes to spare.' },
]

export const LANE_CLEAR: Step[] = [
  { kind: 'action', text: 'walk_to("west cottage")', at: 'miller' },
]

export const LANE_BLOCKED: Step[] = [
  { kind: 'action', text: 'walk_to("west cottage")' },
  { kind: 'observation', text: 'A fallen cart blocks the lane.' },
  { kind: 'thought', text: 'New plan needed. Is there another way around, and do I still have time?' },
  { kind: 'action', text: 'map("route to west cottage avoiding the lane")', at: 'map', tool: 'map' },
  { kind: 'observation', text: 'Take the riverside path: +10 minutes. Still 25 minutes to spare.' },
  { kind: 'action', text: 'walk_to("west cottage", via="riverside path")', at: 'detour' },
  { kind: 'action', text: 'walk_to("west cottage")', at: 'miller' },
]

export const FINISH: Step[] = [
  { kind: 'observation', text: 'The miller takes the oil and lights the lantern by the door.' },
  { kind: 'done', text: 'Goal done, so the agent stops. 3 tools used, 1 wrong turn fixed.' },
]

export function buildRun(blocked: boolean): Step[] {
  return [...BEFORE_LANE, ...(blocked ? LANE_BLOCKED : LANE_CLEAR), ...FINISH]
}
