// Pre-written next-token tree. Logits are hand-authored so the default temperature (0.8)
// has a clear favourite with real alternatives. joinsPrevious = continuation token (no space).
export type Candidate = { text: string; logit: number; next: string | null; joinsPrevious?: boolean }
export type TokenNode = { id: string; candidates: Candidate[] }
export type TokenScript = { start: string; prompt: string; nodes: Record<string, TokenNode> }

const c = (text: string, logit: number, next: string | null, joinsPrevious = false): Candidate =>
  joinsPrevious ? { text, logit, next, joinsPrevious } : { text, logit, next }

const raw: Record<string, Candidate[]> = {
  start: [c('saw', 3.0, 'see'), c('whispered', 1.7, 'whisper'), c('un', 1.0, 'un'), c('smiled', 0.8, 'smile')],

  see: [c('the', 2.8, 'seeThe'), c('a', 1.9, 'seeA'), c('its', 0.6, 'seeIts')],
  seeThe: [c('river', 2.6, 'place'), c('path', 2.0, 'place'), c('bridge', 1.4, 'place'), c('stars', 0.4, 'sky')],
  seeA: [c('stone', 2.4, 'place'), c('bridge', 1.8, 'place'), c('shadow', 1.0, 'place'), c('fox', 0.5, 'place')],
  seeIts: [c('light', 2.5, 'place'), c('reflection', 1.6, 'place'), c('flame', 1.2, 'place')],
  place: [c('ahead', 2.5, 'end'), c('below', 1.7, 'end'), c('waiting', 1.2, 'end'), c('glowing', 0.9, 'end')],
  sky: [c('above', 2.5, 'end'), c('waking', 1.0, 'end'), c('falling', 0.8, 'end')],

  whisper: [c('to', 1.8, 'whisperTo'), c('a', 1.5, 'whisperA'), c('softly', 1.2, 'end')],
  whisperTo: [c('the', 2.5, 'toThe'), c('itself', 1.4, 'end'), c('no', 0.6, 'toNo')],
  toThe: [c('river', 2.2, 'end'), c('dark', 1.6, 'end'), c('stones', 1.0, 'end')],
  toNo: [c('one', 2.8, 'end'), c('stranger', 1.0, 'end'), c('spirit', 0.8, 'end')],
  whisperA: [c('wish', 2.4, 'end'), c('name', 1.8, 'end'), c('secret', 1.4, 'end')],

  un: [c('locked', 2.6, 'unObj', true), c('folded', 1.6, 'unObj', true), c('veiled', 0.8, 'unObj', true)],
  unObj: [c('the', 2.6, 'unThe'), c('a', 1.8, 'unA'), c('their', 0.9, 'unTheir')],
  unThe: [c('gate', 2.4, 'end'), c('map', 1.8, 'end'), c('door', 1.5, 'end')],
  unA: [c('map', 2.3, 'end'), c('letter', 1.6, 'end'), c('door', 1.0, 'end')],
  unTheir: [c('map', 2.2, 'end'), c('journal', 1.5, 'end'), c('courage', 0.6, 'end')],

  smile: [c('at', 2.4, 'smileAt'), c('quietly', 1.2, 'end'), c('back', 1.0, 'end')],
  smileAt: [c('the', 2.4, 'toThe'), c('nothing', 1.2, 'end'), c('it', 1.0, 'end')],

  end: [c('.', 3.0, null, true), c('…', 0.9, null, true), c('!', 0.6, null, true)],
}

export const TOKEN_SCRIPT: TokenScript = {
  start: 'start',
  prompt: 'The traveler lifted the lantern and',
  nodes: Object.fromEntries(Object.entries(raw).map(([id, candidates]) => [id, { id, candidates }])),
}
