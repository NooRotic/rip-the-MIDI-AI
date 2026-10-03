import { For } from 'solid-js'
import { handOf, isBlackKey, KEY_HIGH, KEY_LOW, noteName } from '../lib/notes.ts'

const W = 20
const H = 92

interface Key {
  note: number
  black: boolean
  x: number
}

/** 61 keys, C2..C7, laid out once. */
function layout(): Key[] {
  const keys: Key[] = []
  let whites = 0
  for (let n = KEY_LOW; n <= KEY_HIGH; n++) {
    if (isBlackKey(n)) keys.push({ note: n, black: true, x: whites * W - W * 0.3 })
    else keys.push({ note: n, black: false, x: whites++ * W })
  }
  return keys
}
const KEYS = layout()
const WHITE_COUNT = KEYS.filter((k) => !k.black).length

export default function KeyboardView(props: {
  active: Record<number, number>
  split: number
  onKey?: (note: number) => void
}) {
  const cls = (k: Key) => {
    const v = props.active[k.note]
    const on = v !== undefined ? `on-${handOf(k.note, props.split)}` : ''
    return `${k.black ? 'black' : 'white'} ${on}`
  }
  const splitX = () => {
    const k = KEYS.find((k) => k.note === props.split)
    return k ? (k.black ? k.x + W * 0.3 : k.x) : -10
  }
  return (
    <div class="keyboard-wrap">
      <svg class="keyboard" viewBox={`0 0 ${WHITE_COUNT * W} ${H + 14}`} role="img" aria-label="61-key keyboard, pressed keys highlighted">
        <For each={KEYS.filter((k) => !k.black)}>
          {(k) => (
            <rect class={cls(k)} x={k.x} y={0} width={W} height={H} rx={2} onClick={() => props.onKey?.(k.note)}>
              <title>{noteName(k.note)}</title>
            </rect>
          )}
        </For>
        <For each={KEYS.filter((k) => k.black)}>
          {(k) => (
            <rect class={cls(k)} x={k.x} y={0} width={W * 0.6} height={H * 0.62} rx={2} onClick={() => props.onKey?.(k.note)}>
              <title>{noteName(k.note)}</title>
            </rect>
          )}
        </For>
        <line class="split" x1={splitX()} x2={splitX()} y1={-2} y2={H + 2} />
        <For each={KEYS.filter((k) => !k.black && k.note % 12 === 0)}>
          {(k) => (
            <text class="label" x={k.x + 3} y={H + 11}>
              {noteName(k.note)}
            </text>
          )}
        </For>
      </svg>
    </div>
  )
}
