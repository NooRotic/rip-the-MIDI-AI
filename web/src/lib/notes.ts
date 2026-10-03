/** Note naming shared with keyboard/midi_core.py: 60 = C4 (middle C). */
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const BASE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

export const MIDDLE_C = 60
/** The LK-175 has 61 keys, C2..C7. */
export const KEY_LOW = 36
export const KEY_HIGH = 96

export function noteName(n: number): string {
  return `${NOTE_NAMES[((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`
}

/** 'C4' -> 60; accepts F#3, Bb2 and raw numbers. Throws on anything else. */
export function parseNote(token: string): number {
  const t = token.trim()
  let n: number
  if (/^-?\d+$/.test(t)) {
    n = Number(t)
  } else {
    const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(t)
    if (!m) throw new Error(`not a note: "${token}" (use C4, F#3, Bb2 or 0..127)`)
    n = (Number(m[3]) + 1) * 12 + BASE[m[1]!.toUpperCase()]! + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
  }
  if (n < 0 || n > 127) throw new Error(`note out of MIDI range 0..127: "${token}"`)
  return n
}

export const isBlackKey = (n: number) => [1, 3, 6, 8, 10].includes(((n % 12) + 12) % 12)

export type Hand = 'left' | 'right'
export const handOf = (n: number, split = MIDDLE_C): Hand => (n < split ? 'left' : 'right')
