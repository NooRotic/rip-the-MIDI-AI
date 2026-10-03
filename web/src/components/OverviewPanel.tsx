import { createMemo, Show } from 'solid-js'
import { fmtWhen } from '../lib/format.ts'
import { parseNote } from '../lib/notes.ts'
import { data } from '../stores/data.ts'
import { midi } from '../stores/midi.ts'
import { settings } from '../stores/settings.ts'
import KeyboardView from './KeyboardView.tsx'
import LiveSession from './LiveSession.tsx'
import { connectionState } from './StatusBar.tsx'
import { streakDays } from './ProgressPanel.tsx'

export default function OverviewPanel(props: { go: (tab: string) => void }) {
  const rows = () => data.practiceLog() ?? []
  const quick = createMemo(() => {
    const r = rows()
    const last = r[r.length - 1]
    return {
      sessions: r.length,
      minutes: Math.round(r.reduce((a, x) => a + x.minutes, 0)),
      streak: streakDays(r),
      last: last ? fmtWhen(last.started) : null,
    }
  })
  const nextLesson = () => (data.lessons() ?? []).find((l) => !/done|complete/i.test(l.status))
  const split = () => {
    try {
      return parseNote(settings.splitNote)
    } catch {
      return 60
    }
  }
  return (
    <div class="grid wide">
      <div class="card">
        <div class="row" style={{ 'justify-content': 'space-between', 'margin-bottom': '8px' }}>
          <h2>Keyboard</h2>
          <span class={`pill ${connectionState().cls}`}>
            <span class="dot" />
            {connectionState().text}
          </span>
        </div>
        <Show when={midi.permission() === 'idle' || midi.permission() === 'denied'}>
          <div class="banner warn" style={{ 'margin-bottom': '10px' }}>
            The browser needs permission to see MIDI devices.{' '}
            <button class="btn primary" style={{ 'margin-left': '8px' }} onClick={() => void midi.init()}>
              Allow MIDI access
            </button>
            {midi.permission() === 'denied' ? ' If nothing happens, allow MIDI for this site in the address-bar site settings and reload.' : ''}
          </div>
        </Show>
        <Show when={midi.permission() === 'unsupported'}>
          <div class="banner bad" style={{ 'margin-bottom': '10px' }}>This browser has no Web MIDI. Open the same address in Chrome or Edge.</div>
        </Show>
        <KeyboardView active={midi.active} split={split()} />
        <Show when={midi.permission() === 'granted' && !midi.connected()}>
          <p class="muted small" style={{ 'margin-bottom': 0 }}>
            No port matching "{settings.portMatch}". Turn the keyboard on with the USB cable in; it appears here within a second or two, no reload needed.
            {midi.ports().length ? ` Visible now: ${midi.ports().map((p) => p.name).join(', ')}.` : ''}
          </p>
        </Show>
      </div>

      <div class="grid">
        <LiveSession />
        <div class="card">
          <h2>At a glance</h2>
          <div class="tiles">
            <div class="tile">
              <div class="label">sessions</div>
              <div class="value">{quick().sessions}</div>
            </div>
            <div class="tile">
              <div class="label">minutes</div>
              <div class="value">{quick().minutes}</div>
            </div>
            <div class="tile">
              <div class="label">streak</div>
              <div class="value">{quick().streak}</div>
              <div class="hint">days</div>
            </div>
          </div>
          <p class="small muted" style={{ 'margin-bottom': 0 }}>
            {quick().last ? `Last session ${quick().last}.` : 'No sessions logged yet.'}{' '}
            <a href="#Progress" onClick={(e) => (e.preventDefault(), props.go('Progress'))}>
              Progress
            </a>
          </p>
        </div>
        <div class="card">
          <h2>Up next</h2>
          <Show when={nextLesson()} fallback={<p class="empty">No open lesson.</p>}>
            {(l) => (
              <>
                <p style={{ margin: '0 0 6px' }}>
                  <strong>Lesson {l().num}: {l().title}</strong>
                </p>
                <p class="muted small" style={{ margin: '0 0 6px' }}>{l().blurb}</p>
                <p class="small faint" style={{ margin: 0 }}>
                  status: {l().status} · <span class="mono">{l().path}</span>
                </p>
              </>
            )}
          </Show>
        </div>
        <Show when={!data.apiOk()}>
          <div class="card">
            <h2>Data</h2>
            <p class="muted small" style={{ margin: 0 }}>
              {data.apiOk() === null ? 'Loading logs…' : 'The /api endpoints are not answering. Start the dashboard with npm run dev from the web folder so the Vite middleware can read the logs.'}
            </p>
          </div>
        </Show>
      </div>
    </div>
  )
}
