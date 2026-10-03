/** Live keyboard state through the Web MIDI API (Chrome/Edge): ports, pressed keys, a raw message
 * monitor, and the silence-defined practice session that gets saved through /api/practice-log. */
import { createRoot, createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { analyse } from '../lib/analyse.ts'
import { noteName, parseNote } from '../lib/notes.ts'
import { SessionTracker, type ClosedSession } from '../lib/session.ts'
import { refetchData } from './data.ts'
import { settings } from './settings.ts'

export type Permission = 'idle' | 'unsupported' | 'requesting' | 'granted' | 'denied'

export interface PortInfo {
  id: string
  name: string
  manufacturer: string
  state: string
  connection: string
  kind: 'input' | 'output'
  preferred: boolean
}

export interface MidiMsg {
  at: number
  port: string
  bytes: number[]
  text: string
}

export interface SessionView {
  active: boolean
  startedAt: number
  notes: number
  span: number
  quietFor: number | null
  lastClosed: ClosedSession | null
  lastSaved: string | null
  saving: boolean
  error: string | null
}

const now = () => Date.now() / 1000
const pad = (n: number) => String(n).padStart(2, '0')
/** Local time without zone, like Python's datetime.isoformat(timespec="seconds"). */
export function isoLocal(epochSeconds: number) {
  const d = new Date(epochSeconds * 1000)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function describe(bytes: number[]) {
  const [status = 0, a = 0, b = 0] = bytes
  const type = status & 0xf0
  const ch = (status & 0x0f) + 1
  if (status >= 0xf8) return `system realtime 0x${status.toString(16)}`
  if (type === 0x90 && b > 0) return `note_on  ch${ch} ${noteName(a)} vel=${b}`
  if (type === 0x80 || type === 0x90) return `note_off ch${ch} ${noteName(a)}`
  if (type === 0xb0) return `control  ch${ch} cc${a}=${b}`
  if (type === 0xc0) return `program  ch${ch} ${a}`
  if (type === 0xe0) return `pitchbend ch${ch} ${((b << 7) | a) - 8192}`
  if (type === 0xd0) return `aftertouch ch${ch} ${a}`
  return `0x${bytes.map((x) => x.toString(16).padStart(2, '0')).join(' ')}`
}

export const midi = createRoot(() => {
  const [permission, setPermission] = createSignal<Permission>('idle')
  const [ports, setPorts] = createSignal<PortInfo[]>([])
  const [lastEventAt, setLastEventAt] = createSignal<number | null>(null)
  const [lastVelocity, setLastVelocity] = createSignal<number | null>(null)
  const [velocityHistogram, setVelocityHistogram] = createSignal<Record<number, number>>({})
  const [monitor, setMonitor] = createSignal<MidiMsg[]>([])
  const [totalNotes, setTotalNotes] = createSignal(0)
  const [probeChannel, setProbeChannel] = createSignal<number | null>(null)
  const [recent, setRecent] = createSignal<{ at: number; note: number }[]>([])
  const RECENT_MAX = 64
  const [active, setActive] = createStore<Record<number, number>>({})
  const [session, setSession] = createStore<SessionView>({
    active: false,
    startedAt: 0,
    notes: 0,
    span: 0,
    quietFor: null,
    lastClosed: null,
    lastSaved: null,
    saving: false,
    error: null,
  })

  let access: MIDIAccess | null = null
  const tracker = new SessionTracker(() => ({
    idleSeconds: settings.idleSeconds,
    minNotes: settings.minNotes,
    minSeconds: settings.minSeconds,
  }))

  const matches = (name: string) => name.toUpperCase().includes(settings.portMatch.toUpperCase())
  const preferredInput = () => ports().find((p) => p.kind === 'input' && p.preferred && p.state === 'connected') ?? null
  const preferredOutput = () => ports().find((p) => p.kind === 'output' && p.preferred && p.state === 'connected') ?? null
  const connected = () => preferredInput() !== null

  function syncSession() {
    setSession({ active: tracker.active, startedAt: tracker.startedAt ?? 0, notes: tracker.notes.length, span: tracker.span, quietFor: tracker.quietFor(now()) })
  }

  async function save(closed: ClosedSession) {
    setSession({ saving: true, error: null })
    try {
      const split = parseNote(settings.splitNote)
      const row = {
        started: isoLocal(closed.startedAt),
        player: settings.player || 'me',
        minutes: Math.round((closed.span / 60) * 10) / 10,
        ...analyse(closed.notes, split),
      }
      const r = await fetch('/api/practice-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row, notes: closed.notes }),
      })
      const body = (await r.json()) as { ok: boolean; midi?: string; error?: string }
      if (!r.ok || !body.ok) throw new Error(body.error ?? `HTTP ${r.status}`)
      setSession({ lastSaved: body.midi ?? null })
      refetchData()
    } catch (e) {
      setSession({ error: e instanceof Error ? e.message : String(e) })
    } finally {
      setSession({ saving: false })
    }
  }

  function handleClosed(closed: ClosedSession | null) {
    if (!closed) return
    setSession({ lastClosed: closed })
    if (!closed.discarded && settings.autoLog) void save(closed)
    syncSession()
  }

  function onMessage(portName: string, e: MIDIMessageEvent) {
    if (!e.data) return
    const bytes = Array.from(e.data)
    const [status = 0, a = 0, b = 0] = bytes
    const type = status & 0xf0
    const t = now()
    if (status < 0xf8) {
      setLastEventAt(t)
      setMonitor((m) => {
        const next = m.length >= settings.monitorSize ? m.slice(m.length - settings.monitorSize + 1) : m.slice()
        next.push({ at: t, port: portName, bytes, text: describe(bytes) })
        return next
      })
    }
    if (type === 0x90 && b > 0) {
      setActive(a, b)
      setLastVelocity(b)
      setVelocityHistogram((h) => ({ ...h, [b]: (h[b] ?? 0) + 1 }))
      setTotalNotes((n) => n + 1)
      setRecent((r) => (r.length >= RECENT_MAX ? r.slice(r.length - RECENT_MAX + 1) : r.slice()).concat({ at: t, note: a }))
      tracker.noteOn(a, b, t)
      syncSession()
    } else if (type === 0x80 || (type === 0x90 && b === 0)) {
      setActive(a, undefined!)
    }
  }

  function refreshPorts() {
    if (!access) return
    const list: PortInfo[] = []
    access.inputs.forEach((p) => {
      const name = p.name ?? p.id
      const preferred = matches(name)
      list.push({ id: p.id, name, manufacturer: p.manufacturer ?? '', state: p.state, connection: p.connection, kind: 'input', preferred })
      p.onmidimessage = preferred || settings.listenAllInputs ? (e) => onMessage(name, e) : null
    })
    access.outputs.forEach((p) => {
      const name = p.name ?? p.id
      list.push({ id: p.id, name, manufacturer: p.manufacturer ?? '', state: p.state, connection: p.connection, kind: 'output', preferred: matches(name) })
    })
    setPorts(list)
  }

  let ticker: number | undefined
  async function init() {
    if (permission() !== 'idle' && permission() !== 'denied') return
    if (!('requestMIDIAccess' in navigator)) {
      setPermission('unsupported')
      return
    }
    setPermission('requesting')
    try {
      access = await navigator.requestMIDIAccess({ sysex: false })
      access.onstatechange = () => refreshPorts()
      refreshPorts()
      setPermission('granted')
      if (ticker === undefined) {
        ticker = window.setInterval(() => {
          handleClosed(tracker.tick(now()))
          if (tracker.active) syncSession()
          else if (session.quietFor !== null) syncSession()
        }, 1000)
      }
    } catch {
      setPermission('denied')
    }
  }

  function output(): MIDIOutput | null {
    const info = preferredOutput()
    if (!access || !info) return null
    return access.outputs.get(info.id) ?? null
  }

  function sendNote(note: number, channel1: number, velocity: number, ms = 600) {
    const out = output()
    if (!out) return false
    const ch = Math.min(16, Math.max(1, channel1)) - 1
    out.send([0x90 | ch, note & 0x7f, Math.max(1, Math.min(127, velocity))])
    window.setTimeout(() => out.send([0x80 | ch, note & 0x7f, 0]), ms)
    return true
  }

  function allNotesOff() {
    const out = output()
    if (!out) return
    for (let ch = 0; ch < 16; ch++) out.send([0xb0 | ch, 123, 0])
  }

  /** Same as `light_keys.py --probe`: C4 on channels 1..16, one second each. */
  async function probeChannels(note = 60) {
    if (!output()) return
    for (let ch = 1; ch <= 16; ch++) {
      setProbeChannel(ch)
      sendNote(note, ch, 100, 1000)
      await new Promise((r) => setTimeout(r, 1400))
    }
    setProbeChannel(null)
  }

  return {
    permission,
    ports,
    lastEventAt,
    lastVelocity,
    velocityHistogram,
    monitor,
    totalNotes,
    probeChannel,
    active,
    session,
    preferredInput,
    preferredOutput,
    connected,
    init,
    sendNote,
    allNotesOff,
    probeChannels,
    saveNow: () => handleClosed(tracker.close(now())),
    discard: () => {
      tracker.discard()
      syncSession()
    },
    clearMonitor: () => setMonitor([]),
    recent,
    clearRecent: () => setRecent([]),
    refreshPorts,
  }
})
