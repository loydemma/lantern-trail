// Pre-written skills for the Training Hall chapter, shaped like Agent Skills: each chapter of
// the manual is a SKILL.md with a name + description (always visible to the agent) and a body
// of instructions that is only loaded when a task needs it.

export type ToolId = 'oilcan' | 'shears' | 'chisel' | 'clay' | 'staff' | 'rope'
export type Skill = { name: string; title: string; description: string; steps: string[]; tools: ToolId[] }

export const TOOLS: Record<ToolId, string> = {
  oilcan: 'Oil can',
  shears: 'Wick shears',
  chisel: 'Chisel',
  clay: 'Clay pot',
  staff: 'Walking staff',
  rope: 'Rope',
}

export const SKILLS: Skill[] = [
  {
    name: 'tending-lanterns',
    title: 'Tending lanterns',
    description: 'Use at dusk when trail lanterns need lighting, refilling or trimming.',
    steps: [
      'Check the oil; refill from the oil can if it is below a third.',
      'Trim the wick to a finger’s width with the shears; replace it with ember-moss if frayed.',
      'Light from the windward side and keep the shutter half-closed until the flame steadies.',
      'Note any cracked panes for the bridge keeper.',
    ],
    tools: ['oilcan', 'shears'],
  },
  {
    name: 'mending-tablets',
    title: 'Mending tablets',
    description: 'Use when an archive tablet is cracked or its carving has worn faint.',
    steps: [
      'Lay the tablet flat on cloth; never stand a cracked tablet back on the shelf.',
      'Press fresh clay into the crack and smooth it level.',
      'Re-cut worn letters with the chisel, following the original strokes.',
      'Let it cure overnight before reshelving it under the same topic.',
    ],
    tools: ['clay', 'chisel'],
  },
  {
    name: 'crossing-rivers',
    title: 'Crossing rivers',
    description: 'Use before fording, ferrying or crossing stepping stones at night.',
    steps: [
      'Check the ferry timetable and the bridge keeper’s flood notice first.',
      'If fording, test each stone with the staff before stepping.',
      'Shutter the lantern while crossing; open flames are not allowed aboard.',
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
  { id: 'crack', text: 'A ferry-timetable tablet has cracked.', skill: 'mending-tablets' },
  { id: 'flood', text: 'Carry the oil across the river before the bridge floods.', skill: 'crossing-rivers' },
]

const words = (s: string) => s.split(/\s+/).filter(Boolean).length
// Only names + descriptions are in context up front; one chapter body is added on demand.
export const INDEX_WORDS = SKILLS.reduce((n, s) => n + words(s.name) + words(s.description), 0)
export const bodyWords = (s: Skill) => s.steps.reduce((n, step) => n + words(step), 0)
