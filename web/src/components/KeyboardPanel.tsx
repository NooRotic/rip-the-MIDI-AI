import { createMemo, createSignal, For, Show } from 'solid-js'
import { toNotesString } from '../lib/capture.ts'
import { noteName, parseNote } from '../lib/notes.ts'
import { midi } from '../stores/midi.ts'
import { settings } from '../stores/settings.ts'
import KeyboardView from './KeyboardView.tsx'
import { connectionState } from './StatusBar.tsx'

export default function KeyboardPanel() {
  const split = () => {
    try {
      return parseNote(settings.splitNote)
    } catch {
      return 60
    }
  }
  const pressed = () =>
    Object.keys(midi.active)
      .map(Number)
      .sort((a, b) => a - b)
  const [testNote, setTestNote] = createSignal('C4')
  const [testCh, setTestCh] = createSignal(settings.rightCh)
  const [lightMsg, setLightMsg] = createSignal<string | null>(null)
  const [copied, setCopied] = createSignal(false)
  const velocities = createMemo(() => {
    const h = midi.velocityHistogram()
    const entries = Object.entries(h)
      .map(([v, n]) => [Number(v), n] as const)
      .sort((a, b) => b[1] - a[1])
    return entries
  })

  const light = (note: number, ch: number) => {
    const ok = midi.sendNote(note, ch, settings.lightVelocity, 700)
    setLightMsg(ok ? `${noteName(note)} sent on channel ${ch}` : 'No output port for the keyboard')
  }

  return (
    <div class="grid wide">
      <div class="card">
        <div class="row" style={{ 'justify-content': 'space-between' }}>
          <h2>Keys</h2>
          <div class="legend">
            <span><span class="sw" style={{ background: 'var(--left)' }} />left hand</span>
            <span><span class="sw" style={{ background: 'var(--right)' }} />right hand</span>
            <span class="faint">split at {noteName(split())}</span>
          </div>
        </div>
        <KeyboardView active={midi.active} split={split()} onKey={(n) => light(n, n < split() ? settings.leftCh : settings.rightCh)} />
        <div class="row small" style={{ 'margin-top': '8px' }}>
          <span class="muted">
            pressed: <span class="mono">{pressed().length ? pressed().map(noteName).join(' ') : '–'}</span>
          </span>
          <span class="muted">
            last velocity: <span class="mono">{midi.lastVelocity() ?? '–'}</span>
          </span>
          <span class="muted">
            notes this visit: <span class="mono">{midi.totalNotes()}</span>
          </span>
          <span class="faint">click a key to light it on the Casio</span>
        </div>
      </div>

      <div class="card">
        <div class="row" style={{ 'justify-content': 'space-between' }}>
          <h2>Capture</h2>
          <div class="row">
            <button
              class="btn"
              disabled={!midi.recent().length}
              onClick={() => {
                void navigator.clipboard?.writeText(toNotesString(midi.recent()))
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
            >
              {copied() ? 'Copied' : 'Copy for --notes'}
            </button>
            <button class="btn" disabled={!midi.recent().length} onClick={() => midi.clearRecent()}>
              Clear
            </button>
          </div>
        </div>
        <p class="muted small">
          Work a passage out by ear and the last {64} notes appear here in the trainer's notation (notes struck together join with +). Paste it into{' '}
          <code>snippet_trainer.py --notes "…"</code> to drill it, or <code>light_keys.py --notes "…"</code> to hear it with the keys lighting.
        </p>
        <Show when={midi.recent().length} fallback={<p class="empty">Nothing captured yet.</p>}>
          <p class="mono" style={{ 'word-break': 'break-word', 'line-height': '1.8', margin: 0 }}>
            {toNotesString(midi.recent())}
          </p>
        </Show>
      </div>

      <div class="grid">
        <div class="card">
          <h2>Connection</h2>
          <p>
            <span class={`pill ${connectionState().cls}`}>
              <span class="dot" />
              {connectionState().text}
            </span>
          </p>
          <Show when={midi.permission() === 'idle' || midi.permission() === 'denied'}>
            <button class="btn primary" onClick={() => void midi.init()}>Allow MIDI access</button>
          </Show>
          <Show when={midi.ports().length} fallback={<p class="empty">No MIDI ports visible.</p>}>
            <table class="data">
              <thead>
                <tr>
                  <th>port</th>
                  <th>dir</th>
                  <th>state</th>
                  <Show when={settings.advanced}>
                    <th>manufacturer</th>
                    <th>id</th>
                  </Show>
                </tr>
              </thead>
              <tbody>
                <For each={midi.ports()}>
                  {(p) => (
                    <tr>
                      <td>
                        {p.name} {p.preferred ? <span class="faint">(keyboard)</span> : ''}
                      </td>
                      <td>{p.kind === 'input' ? 'in' : 'out'}</td>
                      <td>
                        {p.state}
                        {p.connection === 'open' ? ', open' : ''}
                      </td>
                      <Show when={settings.advanced}>
                        <td class="small">{p.manufacturer || '–'}</td>
                        <td class="small mono">{p.id.slice(0, 18)}</td>
                      </Show>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </Show>
          <p class="small faint" style={{ 'margin-bottom': 0 }}>
            Windows gives a MIDI port to one program at a time. If the Python trainer or logger has the keyboard open, the browser will not get notes until it stops, and the other way round.
          </p>
        </div>

        <div class="card">
          <h2>Light test</h2>
          <p class="muted small">
            The LK series lights a key when it receives a note on a navigate channel (3 left, 4 right by default). Use the probe to confirm which channels light on this unit, then put the numbers in Settings.
          </p>
          <div class="row">
            <div class="field" style={{ width: '90px' }}>
              <label>note</label>
              <input type="text" value={testNote()} onChange={(e) => setTestNote(e.currentTarget.value)} />
            </div>
            <div class="field" style={{ width: '90px' }}>
              <label>channel</label>
              <input type="number" min={1} max={16} value={testCh()} onChange={(e) => setTestCh(Number(e.currentTarget.value))} />
            </div>
            <button
              class="btn"
              disabled={!midi.preferredOutput()}
              onClick={() => {
                try {
                  light(parseNote(testNote()), testCh())
                } catch (e) {
                  setLightMsg(e instanceof Error ? e.message : String(e))
                }
              }}
            >
              Light it
            </button>
            <button class="btn" disabled={!midi.preferredOutput() || midi.probeChannel() !== null} onClick={() => void midi.probeChannels()}>
              {midi.probeChannel() ? `Probing channel ${midi.probeChannel()}…` : 'Probe channels 1–16'}
            </button>
            <button class="btn" disabled={!midi.preferredOutput()} onClick={() => midi.allNotesOff()}>
              All notes off
            </button>
          </div>
          <Show when={lightMsg()}>
            <p class="small muted">{lightMsg()}</p>
          </Show>
          <Show when={!midi.preferredOutput()}>
            <p class="small faint">Needs the keyboard's output port, which appears once it is connected.</p>
          </Show>
        </div>
      </div>

      <Show when={settings.advanced}>
        <div class="grid">
          <div class="card">
            <h2>Velocity</h2>
            <Show when={velocities().length} fallback={<p class="empty">Play something to see the velocity distribution.</p>}>
              <p class="muted small">
                The LK-175 is not touch-sensitive, so this should be a single value. {velocities().length === 1 ? 'It is.' : `${velocities().length} distinct values seen.`}
              </p>
              <table class="data">
                <thead>
                  <tr>
                    <th class="num">velocity</th>
                    <th class="num">notes</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={velocities().slice(0, 8)}>
                    {([v, n]) => (
                      <tr>
                        <td class="num">{v}</td>
                        <td class="num">{n}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </Show>
          </div>
          <div class="card">
            <div class="row" style={{ 'justify-content': 'space-between' }}>
              <h2>MIDI monitor</h2>
              <button class="btn" onClick={() => midi.clearMonitor()}>Clear</button>
            </div>
            <Show when={midi.monitor().length} fallback={<p class="empty">No messages yet.</p>}>
              <div class="monitor mono">
                <For each={[...midi.monitor()].reverse()}>
                  {(m) => (
                    <div>
                      <span class="faint">{new Date(m.at * 1000).toLocaleTimeString()}</span>
                      <span>
                        {m.text} <span class="faint">[{m.bytes.map((b) => b.toString(16).padStart(2, '0')).join(' ')}]</span>
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}
