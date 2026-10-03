import { createSignal, Show } from 'solid-js'
import { parseNote } from '../lib/notes.ts'
import { data } from '../stores/data.ts'
import { midi } from '../stores/midi.ts'
import { resetSettings, settings, updateSetting, type Settings } from '../stores/settings.ts'

function NumberField(props: { k: keyof Settings; label: string; help?: string; min?: number; max?: number; step?: number }) {
  return (
    <div class="field">
      <label for={props.k}>{props.label}</label>
      <input
        id={props.k}
        type="number"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={settings[props.k] as number}
        onChange={(e) => {
          const v = Number(e.currentTarget.value)
          if (!Number.isNaN(v)) updateSetting(props.k, Math.min(props.max ?? Infinity, Math.max(props.min ?? -Infinity, v)) as never)
        }}
      />
      <Show when={props.help}>
        <div class="help">{props.help}</div>
      </Show>
    </div>
  )
}

function TextField(props: { k: keyof Settings; label: string; help?: string; validate?: (v: string) => string | null }) {
  const [err, setErr] = createSignal<string | null>(null)
  return (
    <div class="field">
      <label for={props.k}>{props.label}</label>
      <input
        id={props.k}
        type="text"
        value={settings[props.k] as string}
        onChange={(e) => {
          const v = e.currentTarget.value.trim()
          const problem = props.validate?.(v) ?? null
          setErr(problem)
          if (!problem) updateSetting(props.k, v as never)
        }}
      />
      <Show when={err()}>
        <div class="error">{err()}</div>
      </Show>
      <Show when={props.help}>
        <div class="help">{props.help}</div>
      </Show>
    </div>
  )
}

function Toggle(props: { k: keyof Settings; label: string; help?: string }) {
  return (
    <div class="field inline">
      <input id={props.k} type="checkbox" checked={settings[props.k] as boolean} onChange={(e) => updateSetting(props.k, e.currentTarget.checked as never)} />
      <label for={props.k}>
        {props.label}
        <Show when={props.help}>
          <div class="help">{props.help}</div>
        </Show>
      </label>
    </div>
  )
}

const validNote = (v: string) => {
  try {
    parseNote(v)
    return null
  } catch (e) {
    return e instanceof Error ? e.message : 'invalid note'
  }
}

export default function SettingsPanel() {
  return (
    <div class="grid wide">
      <div class="card">
        <h2>Basic</h2>
        <div class="fields">
          <TextField k="player" label="Player name" help="Goes on every saved session. Keep it a nickname, the repo is public." validate={(v) => (v ? null : 'cannot be empty')} />
          <TextField k="splitNote" label="Hand split" help="Notes below this count as left hand. C4 is middle C." validate={validNote} />
          <NumberField k="idleSeconds" label="Silence that ends a session (s)" min={10} max={900} help="90 s is the Python logger's default." />
          <NumberField k="leftCh" label="Left-hand light channel" min={1} max={16} help="Casio navigate channel for the left hand, default 3." />
          <NumberField k="rightCh" label="Right-hand light channel" min={1} max={16} help="Casio navigate channel for the right hand, default 4." />
        </div>
        <div style={{ 'margin-top': '14px', display: 'grid', gap: '10px' }}>
          <Toggle k="autoLog" label="Auto-log sessions" help="Save every session that passes the practice threshold, no button needed. Turn off if the Python logger is running at the same time." />
          <Toggle k="advanced" label="Show advanced settings and data" help="Raw MIDI monitor, thresholds, polling, extra table columns." />
        </div>
      </div>

      <Show when={settings.advanced}>
        <div class="card">
          <h2>Advanced</h2>
          <div class="fields">
            <NumberField k="minNotes" label="Minimum notes to count" min={1} max={500} help="Below this a session is discarded as noodling." />
            <NumberField k="minSeconds" label="Minimum seconds to count" min={1} max={3600} />
            <NumberField k="pollSeconds" label="Refresh logs every (s)" min={2} max={120} />
            <NumberField k="chartDays" label="Chart window (days)" min={7} max={365} />
            <NumberField k="monitorSize" label="MIDI monitor length" min={20} max={2000} />
            <NumberField k="lightVelocity" label="Light test velocity" min={1} max={127} help="The lit note also sounds at this level." />
            <TextField k="portMatch" label="Port name match" help="Substring that identifies the keyboard's ports. Case-insensitive." validate={(v) => (v ? null : 'cannot be empty')} />
          </div>
          <div style={{ 'margin-top': '14px', display: 'grid', gap: '10px' }}>
            <Toggle k="listenAllInputs" label="Listen to every MIDI input" help="Off: only the matched keyboard feeds the dashboard." />
          </div>
          <div class="row" style={{ 'margin-top': '14px' }}>
            <button class="btn" onClick={() => midi.refreshPorts()}>Re-scan ports</button>
            <button class="btn" onClick={() => data.refetch()}>Reload logs now</button>
            <button class="btn danger" onClick={() => resetSettings()}>Reset all settings</button>
          </div>
        </div>

        <div class="card">
          <h2>Data sources</h2>
          <Show when={data.status()} fallback={<p class="empty">API not reachable. Is this page served by <code>npm run dev</code>?</p>}>
            {(s) => (
              <dl class="kv">
                <dt>repo root</dt>
                <dd class="mono small">{s().root}</dd>
                <dt>practice log</dt>
                <dd class="small">{s().practiceLog.exists ? `keyboard/practice_log.json, updated ${s().practiceLog.modified}` : 'not created yet'}</dd>
                <dt>trainer log</dt>
                <dd class="small">{s().trainerLog.exists ? `keyboard/trainer_log.json, updated ${s().trainerLog.modified}` : 'not created yet'}</dd>
                <dt>session files</dt>
                <dd class="small">{s().sessions} in keyboard/sessions/</dd>
                <dt>settings</dt>
                <dd class="small">this browser's localStorage</dd>
              </dl>
            )}
          </Show>
        </div>
      </Show>
    </div>
  )
}
