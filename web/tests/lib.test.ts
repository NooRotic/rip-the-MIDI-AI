import { describe, expect, it } from 'vitest'
import { analyse, median, round } from '../src/lib/analyse.ts'
import { handOf, isBlackKey, noteName, parseNote } from '../src/lib/notes.ts'
import { SessionTracker } from '../src/lib/session.ts'
import { vlq, writeSmf } from '../api/smf.ts'
import { parseLessonTable, sessionStem } from '../api/plugin.ts'

describe('notes', () => {
  it('names and parses like midi_core.py', () => {
    expect(noteName(60)).toBe('C4')
    expect(noteName(21)).toBe('A0')
    expect(noteName(108)).toBe('C8')
    for (let n = 0; n < 128; n++) expect(parseNote(noteName(n))).toBe(n)
    expect(parseNote('F#3')).toBe(54)
    expect(parseNote('Bb2')).toBe(46)
    expect(parseNote(' 60 ')).toBe(60)
    for (const bad of ['H4', 'C', 'C10', '128', '-1', '']) expect(() => parseNote(bad)).toThrow()
  })
  it('knows black keys and hands', () => {
    expect([60, 61, 62, 63, 64, 65, 66].map(isBlackKey)).toEqual([false, true, false, true, false, false, true])
    expect(handOf(59)).toBe('left')
    expect(handOf(60)).toBe('right')
  })
})

describe('analyse', () => {
  it('matches the Python analysis keys and arithmetic', () => {
    // 8 notes, one every 0.5 s, 3 of them below middle C
    const notes = Array.from({ length: 8 }, (_, i): [number, number, number] => [i * 0.5, i < 3 ? 48 + i : 60 + i, 100])
    const a = analyse(notes)
    expect(a).toMatchObject({
      notes: 8,
      span_sec: 3.5,
      notes_per_min: null, // span <= 5 s
      low: 'C3',
      high: 'G4',
      distinct_pitches: 8,
      left_hand_pct: 38,
      median_gap_sec: 0.5,
      timing_spread: 0,
    })
    const long = Array.from({ length: 13 }, (_, i): [number, number, number] => [i, 60, 100])
    expect(analyse(long).notes_per_min).toBe(65) // 13 notes over 12 s
  })
  it('median and round helpers', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(round(1.23456, 2)).toBe(1.23)
  })
})

describe('SessionTracker', () => {
  const cfg = () => ({ idleSeconds: 90, minNotes: 20, minSeconds: 30 })
  it('opens on the first note, closes after the idle gap, discards noodling', () => {
    const t = new SessionTracker(cfg)
    expect(t.active).toBe(false)
    expect(t.noteOn(60, 100, 1000)).toBe('started')
    expect(t.noteOn(62, 100, 1001)).toBe('added')
    expect(t.tick(1050)).toBeNull()
    const closed = t.tick(1092)!
    expect(closed.discarded).toBe(true)
    expect(closed.reason).toMatch(/below the practice threshold/)
    expect(closed.notes).toEqual([
      [0, 60, 100],
      [1, 62, 100],
    ])
    expect(t.active).toBe(false)
  })
  it('keeps a real session', () => {
    const t = new SessionTracker(cfg)
    for (let i = 0; i < 25; i++) t.noteOn(60 + (i % 5), 100, 2000 + i * 2)
    const closed = t.close(2060)!
    expect(closed.discarded).toBe(false)
    expect(closed.span).toBe(48)
    expect(closed.startedAt).toBe(2000)
  })
})

describe('writeSmf', () => {
  it('encodes variable-length quantities per the spec', () => {
    expect(vlq(0)).toEqual([0x00])
    expect(vlq(127)).toEqual([0x7f])
    expect(vlq(128)).toEqual([0x81, 0x00])
    expect(vlq(0x3fff)).toEqual([0xff, 0x7f])
    expect(vlq(0x4000)).toEqual([0x81, 0x80, 0x00])
    expect(() => vlq(-1)).toThrow()
  })
  it('writes a format-0 file with sorted events and no negative deltas for fast notes', () => {
    const bytes = writeSmf(
      [
        [0, 60, 100],
        [0.1, 62, 100], // starts before the first note's 0.25 s note_off
      ],
      { bpm: 100, ticksPerBeat: 480 },
    )
    const b = Array.from(bytes)
    expect(b.slice(0, 14)).toEqual([0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xe0])
    expect(b.slice(14, 18)).toEqual([0x4d, 0x54, 0x72, 0x6b])
    const trackLen = (b[18]! << 24) | (b[19]! << 16) | (b[20]! << 8) | b[21]!
    expect(trackLen).toBe(b.length - 22)
    // tempo meta for 100 bpm = 600000 us
    expect(b.slice(22, 29)).toEqual([0x00, 0xff, 0x51, 0x03, 0x09, 0x27, 0xc0])
    // then: on C4 @0, on D4 @80 ticks (0.1 s), off C4 @200, off D4 @280, end of track
    expect(b.slice(29)).toEqual([
      0x00, 0x90, 60, 100,
      80, 0x90, 62, 100,
      120, 0x80, 60, 0,
      80, 0x80, 62, 0,
      0x00, 0xff, 0x2f, 0x00,
    ])
  })
})

describe('api helpers', () => {
  it('builds the same session stem as practice_log.py', () => {
    expect(sessionStem(new Date(2026, 9, 3, 1, 7, 9), 'me')).toBe('20261003_0107_me')
    expect(sessionStem(new Date(2026, 0, 1, 23, 59), 'a b/c')).toBe('20260101_2359_a_b_c')
  })
  it('parses the lessons table', () => {
    const md = [
      '| # | Lesson | Status |',
      '|---|---|---|',
      '| 00 | [First contact](00-first-contact/README.md): plug in, prove the lights work | not started |',
      '| 01 | [Wu-Tang / Underdog snippet](01-wu-tang-underdog/README.md): the first real passage | snippet still to be identified |',
    ].join('\n')
    expect(parseLessonTable(md)).toEqual([
      { num: '00', title: 'First contact', path: 'lessons/00-first-contact/README.md', blurb: 'plug in, prove the lights work', status: 'not started' },
      { num: '01', title: 'Wu-Tang / Underdog snippet', path: 'lessons/01-wu-tang-underdog/README.md', blurb: 'the first real passage', status: 'snippet still to be identified' },
    ])
  })
})

describe('capture', () => {
  it('groups near-simultaneous notes into chords and prints trainer notation', async () => {
    const { groupCaptured, toNotesString } = await import('../src/lib/capture.ts')
    const items = [
      { at: 10.0, note: 60 },
      { at: 10.5, note: 67 },
      { at: 10.52, note: 64 }, // 20 ms after the G: same chord
      { at: 11.2, note: 72 },
    ]
    expect(groupCaptured(items)).toEqual([[60], [64, 67], [72]])
    expect(toNotesString(items)).toBe('C4 E4+G4 C5')
    expect(toNotesString([])).toBe('')
  })
})
