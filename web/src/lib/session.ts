/** The session model from keyboard/practice_log.py, as a pure class the browser can drive.
 *
 * A session is defined by silence, not buttons: it opens on the first note and closes after
 * `idleSeconds` of quiet. Anything shorter than `minNotes` / `minSeconds` is discarded as noodling so
 * the history stays honest. All times are seconds (wall clock, Date.now()/1000).
 */
import type { NoteTuple } from './analyse.ts'

export interface SessionConfig {
  idleSeconds: number
  minNotes: number
  minSeconds: number
}

export interface ClosedSession {
  notes: NoteTuple[]
  startedAt: number // epoch seconds
  closedAt: number
  span: number
  discarded: boolean
  reason?: string
}

export class SessionTracker {
  notes: NoteTuple[] = []
  startedAt: number | null = null
  lastNoteAt: number | null = null

  private readonly config: () => SessionConfig

  constructor(config: () => SessionConfig) {
    this.config = config
  }

  get active() {
    return this.startedAt !== null
  }

  get span() {
    return this.notes.length ? this.notes[this.notes.length - 1]![0] : 0
  }

  /** Seconds since the last note, or null when idle. */
  quietFor(now: number) {
    return this.lastNoteAt === null ? null : now - this.lastNoteAt
  }

  noteOn(note: number, velocity: number, now: number): 'started' | 'added' {
    let result: 'started' | 'added' = 'added'
    if (this.startedAt === null) {
      this.startedAt = now
      result = 'started'
    }
    this.notes.push([now - this.startedAt, note, velocity])
    this.lastNoteAt = now
    return result
  }

  /** Call about once a second; returns a closed session once the idle gap has passed. */
  tick(now: number): ClosedSession | null {
    if (this.startedAt === null || this.lastNoteAt === null) return null
    return now - this.lastNoteAt > this.config().idleSeconds ? this.close(now) : null
  }

  /** Force the current session closed (a "save now" button). */
  close(now: number): ClosedSession | null {
    if (this.startedAt === null) return null
    const { minNotes, minSeconds } = this.config()
    const span = this.span
    const result: ClosedSession = {
      notes: this.notes,
      startedAt: this.startedAt,
      closedAt: now,
      span,
      discarded: this.notes.length < minNotes || span < minSeconds,
    }
    if (result.discarded) {
      result.reason = `${this.notes.length} notes / ${Math.round(span)}s is below the practice threshold (${minNotes} notes, ${minSeconds}s)`
    }
    this.notes = []
    this.startedAt = null
    this.lastNoteAt = null
    return result
  }

  discard() {
    this.notes = []
    this.startedAt = null
    this.lastNoteAt = null
  }
}
