/** Port of keyboard/practice_log.py::analyse so sessions saved from the browser carry the same
 * numbers as sessions saved by the Python logger. Keep the two in step. */
import { MIDDLE_C, noteName } from './notes.ts'

export type NoteTuple = [time: number, note: number, velocity: number]

export interface Analysis {
  notes: number
  span_sec: number
  notes_per_min: number | null
  low: string
  high: string
  distinct_pitches: number
  left_hand_pct: number
  median_gap_sec?: number
  timing_spread?: number | null
}

export const round = (x: number, digits = 0) => {
  const f = 10 ** digits
  return Math.round(x * f) / f
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

export function analyse(notes: NoteTuple[], split = MIDDLE_C): Analysis {
  const ts = notes.map((n) => n[0])
  const ns = notes.map((n) => n[1])
  const span = ts.length > 1 ? ts[ts.length - 1]! - ts[0]! : 0
  const gaps: number[] = []
  for (let i = 1; i < ts.length; i++) {
    const g = ts[i]! - ts[i - 1]!
    if (g > 0.02 && g < 4.0) gaps.push(g)
  }
  const left = ns.filter((n) => n < split).length
  const out: Analysis = {
    notes: notes.length,
    span_sec: round(span, 1),
    notes_per_min: span > 5 ? round((notes.length / span) * 60, 1) : null,
    low: noteName(Math.min(...ns)),
    high: noteName(Math.max(...ns)),
    distinct_pitches: new Set(ns).size,
    left_hand_pct: Math.round((100 * left) / ns.length),
  }
  if (gaps.length > 4) {
    const med = median(gaps)
    out.median_gap_sec = round(med, 3)
    // spread of inter-note gaps around the median = how EVEN the playing was. Lower is steadier.
    out.timing_spread = med ? round(median(gaps.map((g) => Math.abs(g - med))) / med, 2) : null
  }
  return out
}
