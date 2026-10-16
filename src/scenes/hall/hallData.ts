// Pre-written skills for the Training Hall chapter, shaped like Agent Skills: each chapter of
// the manual is a SKILL.md with a name + description (always visible to the agent) and a body
// of instructions that is only loaded when a task needs it.

export type ToolId = 'oilcan' | 'shears' | 'chisel' | 'clay' | 'staff' | 'rope'
export type Skill = { name: string; title: string; description: string; steps: string[]; tools: ToolId[] }

export const TOOLS: Record<ToolId, string> = {
  oilcan: 'Oil can',
  shears: 'Wick shears',
  chisel: 'Chisel',
  clay: 'Paste pot',
  staff: 'Walking staff',
  rope: 'Rope',
}

export const SKILLS: Skill[] = [
  {
    name: 'tending-lanterns',
    title: 'Tending lanterns',
    description: 'Use at dusk when trail lanterns need lighting, refilling or trimming.',
    steps: [
      'Check the oil. Refill it from the oil can if it’s below a third.',
      'Trim the wick to a finger’s width with the shears. Replace it with ember-moss if it’s frayed.',
      'Light from the windward side and keep the shutter half-closed until the flame steadies.',
      'Note any cracked panes for the bridge keeper.',
    ],
    tools: ['oilcan', 'shears'],
  },
  {
    name: 'mending-scrolls',
    title: 'Mending scrolls',
    description: 'Use when an archive scroll is torn or its ink has faded.',
    steps: [
      'Lay the scroll flat on a clean cloth. Don’t roll a torn scroll back up.',
      'Trim loose fibers along the tear with the shears.',
      'Brush paste from the paste pot along the tear and press a thin patch over it from behind.',
      'Let it dry overnight, then shelve it under the same topic.',
    ],
    tools: ['shears', 'clay'],
  },
  {
    name: 'crossing-rivers',
    title: 'Crossing rivers',
    description: 'Use before fording, ferrying or crossing stepping stones at night.',
    steps: [
      'Check the ferry timetable and the bridge keeper’s flood notice first.',
      'If fording, test each stone with the staff before stepping.',
      'Close the lantern’s shutter while crossing. Open flames aren’t allowed on the ferry.',
      'Tie the pack to the rope so it can be pulled across if you slip.',
    ],
    tools: ['staff', 'rope'],
  },
  {
    name: 'reading-stars',
    title: 'Reading the stars',
    description: 'Use to find north at night when there is no map or trail.',
    steps: [
      'Find the three bright stars of the Lantern-Bearer.',
      'Follow the line of its hand to the still star; that way is north.',
    ],
    tools: [],
  },
]

export type Task = { id: string; text: string; skill: string }

export const TASKS: Task[] = [
  { id: 'dark', text: 'The trail lanterns are going dark at dusk.', skill: 'tending-lanterns' },
  { id: 'crack', text: 'A ferry-timetable scroll is torn.', skill: 'mending-scrolls' },
  { id: 'flood', text: 'Carry the oil across the river before the bridge floods.', skill: 'crossing-rivers' },
]

const words = (s: string) => s.split(/\s+/).filter(Boolean).length
// Only names + descriptions are in context up front; one chapter body is added on demand.
export const INDEX_WORDS = SKILLS.reduce((n, s) => n + words(s.name) + words(s.description), 0)
export const bodyWords = (s: Skill) => s.steps.reduce((n, step) => n + words(step), 0)
