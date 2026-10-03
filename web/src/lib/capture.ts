/** Turn the last notes played into the trainer's text notation: "C4 E4+G4 C5". */
import { noteName } from './notes.ts'

export interface Captured {
  at: number // epoch seconds
  note: number
}

/** Notes whose onsets fall within `window` seconds of the group's first note are one chord. */
export function groupCaptured(items: Captured[], window = 0.05): number[][] {
  const groups: { at: number; notes: Set<number> }[] = []
  for (const it of items) {
    const last = groups[groups.length - 1]
    if (last && it.at - last.at <= window) last.notes.add(it.note)
    else groups.push({ at: it.at, notes: new Set([it.note]) })
  }
  return groups.map((g) => [...g.notes].sort((a, b) => a - b))
}

export function toNotesString(items: Captured[], window = 0.05): string {
  return groupCaptured(items, window)
    .map((g) => g.map(noteName).join('+'))
    .join(' ')
}
