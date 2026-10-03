/** Minimal Standard MIDI File (format 0) writer, byte-compatible with what mido reads.
 *
 * Mirrors keyboard/practice_log.py::save_midi: one track, tempo meta, every captured note_on
 * written at its real time with a fixed note length. Events are sorted by absolute tick so fast
 * playing (next note before the previous one's note_off) never produces a negative delta.
 */
export type NoteTuple = [time: number, note: number, velocity: number]

export interface SmfOptions {
  bpm?: number
  ticksPerBeat?: number
  noteLength?: number // seconds
  channel?: number // 0-based
}

/** Variable-length quantity, as the SMF spec defines it. */
export function vlq(n: number): number[] {
  if (!Number.isFinite(n) || n < 0) throw new RangeError(`delta must be >= 0, got ${n}`)
  let v = Math.floor(n)
  const out = [v & 0x7f]
  v = Math.floor(v / 128)
  while (v > 0) {
    out.unshift((v & 0x7f) | 0x80)
    v = Math.floor(v / 128)
  }
  return out
}

const u32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
const u16 = (n: number) => [(n >>> 8) & 255, n & 255]

export function writeSmf(notes: NoteTuple[], opts: SmfOptions = {}): Uint8Array {
  const { bpm = 100, ticksPerBeat = 480, noteLength = 0.25, channel = 0 } = opts
  const tempo = Math.round(60_000_000 / bpm)
  const toTick = (s: number) => Math.round((s * ticksPerBeat * bpm) / 60)

  const events: { tick: number; order: number; bytes: number[] }[] = []
  for (const [t, n, v] of notes) {
    const note = Math.max(0, Math.min(127, Math.round(n)))
    const vel = Math.max(1, Math.min(127, Math.round(v)))
    events.push({ tick: toTick(t), order: 1, bytes: [0x90 | channel, note, vel] })
    events.push({ tick: toTick(t + noteLength), order: 0, bytes: [0x80 | channel, note, 0] })
  }
  events.sort((a, b) => a.tick - b.tick || a.order - b.order)

  const track: number[] = [0x00, 0xff, 0x51, 0x03, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255]
  let prev = 0
  for (const e of events) {
    for (const b of vlq(e.tick - prev)) track.push(b)
    for (const b of e.bytes) track.push(b)
    prev = e.tick
  }
  track.push(0x00, 0xff, 0x2f, 0x00)

  const header = [0x4d, 0x54, 0x68, 0x64, ...u32(6), ...u16(0), ...u16(1), ...u16(ticksPerBeat)]
  const chunk = [0x4d, 0x54, 0x72, 0x6b, ...u32(track.length)]
  return Uint8Array.from(header.concat(chunk, track))
}
