// Pre-written knowledge base for the Archive (RAG) chapter. Each tablet is one chunk of a
// longer valley document. Relevance scores stand in for embedding similarity and are
// hand-authored per question. Nothing here calls a live model.

export type Topic = 'ferry' | 'bridge' | 'herbs' | 'festival'
export type Tablet = { id: string; topic: Topic; source: string; text: string }

export const TOPIC_COLORS: Record<Topic, string> = {
  ferry: '#5d7fa6',
  bridge: '#8a6a9e',
  herbs: '#6f8f5e',
  festival: '#c48a4a',
}

export const TABLETS: Tablet[] = [
  { id: 'F1', topic: 'ferry', source: 'Ferry Timetable', text: 'The day ferry crosses from the west dock every hour from first light until the sixth bell.' },
  { id: 'F2', topic: 'ferry', source: 'Ferry Timetable', text: 'The night ferry leaves the east dock at the ninth bell, once each night.' },
  { id: 'F3', topic: 'ferry', source: 'Ferry Timetable', text: 'On festival nights the night ferry runs every hour until the lanterns are out.' },
  { id: 'F4', topic: 'ferry', source: 'Ferryman’s Notes', text: 'Fog over the river can delay the ferry; the ferryman rings twice before casting off.' },
  { id: 'F5', topic: 'ferry', source: 'Ferryman’s Notes', text: 'Passengers carrying open flames must shutter their lanterns while aboard.' },
  { id: 'F6', topic: 'ferry', source: 'Dock Rules', text: 'The east dock is closed for repairs during the first week of the thaw.' },
  { id: 'B1', topic: 'bridge', source: 'Bridge Charter', text: 'Travelers on foot may cross the stone bridge freely at any hour.' },
  { id: 'B2', topic: 'bridge', source: 'Bridge Charter', text: 'Carts and wagons pay a toll of two copper to the bridge keeper.' },
  { id: 'B3', topic: 'bridge', source: 'Bridge Charter', text: 'The bridge lanterns are lit by the keeper at dusk and trimmed at midnight.' },
  { id: 'B4', topic: 'bridge', source: 'Keeper’s Log', text: 'The keeper’s house stands at the north end and keeps spare lantern oil.' },
  { id: 'B5', topic: 'bridge', source: 'Keeper’s Log', text: 'After heavy rain the lowest arch floods; carts are turned back until it drains.' },
  { id: 'B6', topic: 'bridge', source: 'Keeper’s Log', text: 'The painted railings are repainted every third summer.' },
  { id: 'H1', topic: 'herbs', source: 'Herbalist’s Guide', text: 'Ember-moss, dried and pressed into the wick, makes a lantern burn half again as long.' },
  { id: 'H2', topic: 'herbs', source: 'Herbalist’s Guide', text: 'Ember-moss grows on the north face of river stones and is gathered after rain.' },
  { id: 'H3', topic: 'herbs', source: 'Herbalist’s Guide', text: 'Silverleaf tea settles the stomach before a long crossing.' },
  { id: 'H4', topic: 'herbs', source: 'Herbalist’s Guide', text: 'Never burn duskroot indoors; its smoke stings the eyes.' },
  { id: 'H5', topic: 'herbs', source: 'Market Prices', text: 'A bundle of dried ember-moss sells for one copper at the market stall.' },
  { id: 'H6', topic: 'herbs', source: 'Market Prices', text: 'Silverleaf is scarce in winter and doubles in price.' },
  { id: 'L1', topic: 'festival', source: 'Festival Almanac', text: 'The Lantern Festival begins on the first full moon after the harvest.' },
  { id: 'L2', topic: 'festival', source: 'Festival Almanac', text: 'On the festival’s last night, sky lanterns are released from the meadow.' },
  { id: 'L3', topic: 'festival', source: 'Festival Almanac', text: 'Each household hangs one lantern by its door for every traveler it hosts.' },
  { id: 'L4', topic: 'festival', source: 'Festival Almanac', text: 'Festival lanterns are traditionally burned with ember-moss wicks.' },
  { id: 'L5', topic: 'festival', source: 'Town Notices', text: 'Market stalls stay open until the twelfth bell during the festival.' },
  { id: 'L6', topic: 'festival', source: 'Town Notices', text: 'The bridge keeper hands out free lantern oil on the festival’s first night.' },
]

export type Question = {
  id: string
  text: string
  scores: Record<string, number> // tablet id → similarity (0..1); unlisted = low
  grounded: { answer: string; cites: string[] }
  madeUp: string
}

export const QUESTIONS: Question[] = [
  {
    id: 'ferry',
    text: 'When does the night ferry leave?',
    scores: { F2: 0.94, F3: 0.88, F1: 0.71, F4: 0.62, F6: 0.55, F5: 0.41, L5: 0.33, B3: 0.3 },
    grounded: {
      answer: 'The night ferry leaves the east dock at the ninth bell, once a night — but on festival nights it runs every hour until the lanterns are out.',
      cites: ['F2', 'F3'],
    },
    madeUp: 'The night ferry leaves the west dock at midnight, every night of the year.',
  },
  {
    id: 'toll',
    text: 'What does it cost to cross the stone bridge?',
    scores: { B1: 0.93, B2: 0.91, B5: 0.58, B4: 0.47, B3: 0.44, B6: 0.36, L6: 0.31, H5: 0.29 },
    grounded: {
      answer: 'Nothing on foot — travelers cross freely at any hour. Carts and wagons pay the keeper two copper.',
      cites: ['B1', 'B2'],
    },
    madeUp: 'Every traveler pays three silver coins to cross, collected at the south end.',
  },
  {
    id: 'herb',
    text: 'Which herb makes a lantern burn longer?',
    scores: { H1: 0.95, L4: 0.82, H2: 0.74, H5: 0.6, H4: 0.43, H3: 0.35, B4: 0.33, L6: 0.3 },
    grounded: {
      answer: 'Ember-moss: dried and pressed into the wick, it makes a lantern burn about half again as long. It’s the traditional festival wick, too.',
      cites: ['H1', 'L4'],
    },
    madeUp: 'Lavender oil — a few drops in the reservoir doubles a lantern’s burn time.',
  },
]

// The context window: how many retrieved chunks fit into the prompt.
export const CONTEXT_SLOTS = 3

export function retrieve(q: Question, k = CONTEXT_SLOTS): { id: string; score: number }[] {
  return TABLETS.map((t) => ({ id: t.id, score: q.scores[t.id] ?? 0.1 + ((t.id.charCodeAt(1) * 7) % 10) / 100 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}
