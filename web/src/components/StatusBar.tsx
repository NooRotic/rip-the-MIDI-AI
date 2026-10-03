import { createSignal, onCleanup, Show } from 'solid-js'
import { timeAgo } from '../lib/format.ts'
import { midi } from '../stores/midi.ts'

export function useClock(ms = 1000) {
  const [now, setNow] = createSignal(Date.now() / 1000)
  const id = setInterval(() => setNow(Date.now() / 1000), ms)
  onCleanup(() => clearInterval(id))
  return now
}

export function connectionState(): { cls: string; text: string } {
  switch (midi.permission()) {
    case 'unsupported':
      return { cls: 'bad', text: 'Web MIDI not supported here, use Chrome or Edge' }
    case 'denied':
      return { cls: 'bad', text: 'MIDI permission blocked' }
    case 'requesting':
      return { cls: 'warn', text: 'Waiting for MIDI permission' }
    case 'idle':
      return { cls: '', text: 'MIDI not started' }
    default:
      return midi.connected()
        ? { cls: 'good', text: `${midi.preferredInput()!.name} connected` }
        : { cls: 'warn', text: 'Keyboard not found' }
  }
}

export default function StatusBar() {
  const now = useClock()
  return (
    <div class="row" style={{ gap: '10px' }}>
      <span class={`pill ${connectionState().cls}`}>
        <span class="dot" />
        {connectionState().text}
      </span>
      <Show when={midi.connected()}>
        <span class="pill">
          <span class="faint">last note</span> {timeAgo(midi.lastEventAt(), now())}
        </span>
      </Show>
      <Show when={midi.session.active}>
        <span class="pill good">
          <span class="dot" />
          session {midi.session.notes} notes
        </span>
      </Show>
    </div>
  )
}
