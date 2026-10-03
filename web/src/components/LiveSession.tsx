import { Show } from 'solid-js'
import { fmtDuration } from '../lib/format.ts'
import { midi } from '../stores/midi.ts'
import { settings } from '../stores/settings.ts'

export default function LiveSession() {
  const s = midi.session
  const notesPerMin = () => (s.span > 5 ? Math.round((s.notes / s.span) * 60) : null)
  const countsAsPractice = () => s.notes >= settings.minNotes && s.span >= settings.minSeconds
  const pct = (v: number, max: number) => `${Math.min(100, Math.round((100 * v) / max))}%`

  return (
    <div class="card">
      <h2>Practice session</h2>
      <Show
        when={midi.connected()}
        fallback={<p class="muted">Plug in the keyboard and play. A session opens on the first note and closes by itself after {settings.idleSeconds} s of silence.</p>}
      >
        <Show
          when={s.active}
          fallback={
            <p class="muted">
              Waiting for the first note. Sessions close after {settings.idleSeconds} s of quiet and need {settings.minNotes} notes over{' '}
              {settings.minSeconds} s to count. {settings.autoLog ? 'Auto-log is on.' : 'Auto-log is off: use Save now when you finish.'}
            </p>
          }
        >
          <div class="tiles" style={{ 'margin-bottom': '10px' }}>
            <div class="tile">
              <div class="label">playing for</div>
              <div class="value">{fmtDuration(s.span)}</div>
            </div>
            <div class="tile">
              <div class="label">notes</div>
              <div class="value">{s.notes}</div>
            </div>
            <div class="tile">
              <div class="label">notes / min</div>
              <div class="value">{notesPerMin() ?? '–'}</div>
            </div>
            <div class="tile">
              <div class="label">quiet for</div>
              <div class="value">{Math.round(s.quietFor ?? 0)} s</div>
              <div class="hint">closes at {settings.idleSeconds} s</div>
            </div>
          </div>
          <Show when={!countsAsPractice()}>
            <div class="small muted" style={{ 'margin-bottom': '6px' }}>
              Counts as practice at {settings.minNotes} notes and {settings.minSeconds} s:
            </div>
            <div class="row small" style={{ 'margin-bottom': '10px' }}>
              <div style={{ flex: '1', 'min-width': '120px' }}>
                <div class="progress"><div style={{ width: pct(s.notes, settings.minNotes) }} /></div>
                <span class="faint">{s.notes}/{settings.minNotes} notes</span>
              </div>
              <div style={{ flex: '1', 'min-width': '120px' }}>
                <div class="progress"><div style={{ width: pct(s.span, settings.minSeconds) }} /></div>
                <span class="faint">{Math.round(s.span)}/{settings.minSeconds} s</span>
              </div>
            </div>
          </Show>
          <div class="row">
            <button class="btn primary" onClick={() => midi.saveNow()} disabled={s.saving}>
              Save now
            </button>
            <button class="btn" onClick={() => midi.discard()}>Discard</button>
          </div>
        </Show>
      </Show>

      <Show when={s.error}>
        <div class="banner bad" style={{ 'margin-top': '10px' }}>Save failed: {s.error}</div>
      </Show>
      <Show when={s.lastClosed && !s.error}>
        {(() => {
          const c = s.lastClosed!
          return c.discarded ? (
            <div class="banner" style={{ 'margin-top': '10px' }}>
              Last session discarded: {c.reason}.
            </div>
          ) : (
            <div class="banner good" style={{ 'margin-top': '10px' }}>
              Last session: {c.notes.length} notes over {fmtDuration(c.span)}
              {s.saving ? ', saving…' : s.lastSaved ? `, saved as ${s.lastSaved}` : settings.autoLog ? '' : ' (not saved: auto-log is off)'}
            </div>
          )
        })()}
      </Show>
    </div>
  )
}
