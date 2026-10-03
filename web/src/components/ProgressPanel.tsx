import { createMemo, createSignal, For, Show } from 'solid-js'
import { dayKey, fmtDayShort, fmtWhen, shiftDay } from '../lib/format.ts'
import { data, type PracticeRow } from '../stores/data.ts'
import { settings } from '../stores/settings.ts'

interface DayBar {
  day: string
  minutes: number
  sessions: number
}

export function minutesPerDay(rows: PracticeRow[], days: number, today = dayKey()): DayBar[] {
  const byDay = new Map<string, DayBar>()
  for (const r of rows) {
    const day = r.started.slice(0, 10)
    const cur = byDay.get(day) ?? { day, minutes: 0, sessions: 0 }
    cur.minutes += r.minutes
    cur.sessions += 1
    byDay.set(day, cur)
  }
  const out: DayBar[] = []
  for (let i = days - 1; i >= 0; i--) {
    const day = shiftDay(today, -i)
    out.push(byDay.get(day) ?? { day, minutes: 0, sessions: 0 })
  }
  return out
}

export function streakDays(rows: PracticeRow[], today = dayKey()): number {
  const days = new Set(rows.map((r) => r.started.slice(0, 10)))
  let cursor = days.has(today) ? today : shiftDay(today, -1)
  let n = 0
  while (days.has(cursor)) {
    n++
    cursor = shiftDay(cursor, -1)
  }
  return n
}

function BarChart(props: { bars: DayBar[] }) {
  const W = 720
  const H = 170
  const padL = 34
  const padB = 22
  const padT = 14
  const [tip, setTip] = createSignal<{ x: number; y: number; bar: DayBar } | null>(null)
  const max = () => Math.max(5, ...props.bars.map((b) => b.minutes))
  const plotW = W - padL - 6
  const slot = () => plotW / props.bars.length
  const barW = () => Math.max(2, slot() - 2) // 2px surface gap between neighbours
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max())
  const maxIdx = () => {
    let best = -1
    props.bars.forEach((b, i) => {
      if (b.minutes > 0 && (best < 0 || b.minutes > props.bars[best]!.minutes)) best = i
    })
    return best
  }
  const ticks = () => [0, max() / 2, max()]
  return (
    <>
      <svg class="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Minutes practised per day">
        <For each={ticks()}>
          {(t) => (
            <>
              <line class="grid-line" x1={padL} x2={W - 6} y1={y(t)} y2={y(t)} />
              <text class="axis" x={padL - 6} y={y(t) + 3} text-anchor="end">
                {Math.round(t)}
              </text>
            </>
          )}
        </For>
        <For each={props.bars}>
          {(b, i) => {
            const x = () => padL + i() * slot() + 1
            const top = () => y(b.minutes)
            const h = () => Math.max(b.minutes > 0 ? 3 : 1.5, y(0) - top())
            return (
              <g
                onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, bar: b })}
                onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, bar: b })}
                onMouseLeave={() => setTip(null)}
              >
                <rect class="hit" x={x() - 1} y={padT} width={slot()} height={H - padT - padB} />
                <path
                  class={`bar ${b.minutes > 0 ? '' : 'empty'}`}
                  d={`M${x()},${y(0)} v${-(h() - 4)} a4,4 0 0 1 4,-4 h${barW() - 8} a4,4 0 0 1 4,4 v${h() - 4} z`}
                />
                <Show when={i() === maxIdx() || (b.day === props.bars[props.bars.length - 1]!.day && b.minutes > 0)}>
                  <text class="value" x={x() + barW() / 2} y={top() - 4}>
                    {Math.round(b.minutes)}
                  </text>
                </Show>
              </g>
            )
          }}
        </For>
        <text class="axis" x={padL} y={H - 6}>
          {fmtDayShort(props.bars[0]!.day)}
        </text>
        <text class="axis" x={W - 6} y={H - 6} text-anchor="end">
          today
        </text>
      </svg>
      <Show when={tip()}>
        {(t) => (
          <div class="tooltip" style={{ left: `${t().x + 12}px`, top: `${t().y + 12}px` }}>
            <div class="mono">{t().bar.day}</div>
            <div>
              {Math.round(t().bar.minutes)} min · {t().bar.sessions} session{t().bar.sessions === 1 ? '' : 's'}
            </div>
          </div>
        )}
      </Show>
    </>
  )
}

export default function ProgressPanel() {
  const rows = () => data.practiceLog() ?? []
  const totals = createMemo(() => {
    const r = rows()
    const minutes = r.reduce((a, x) => a + x.minutes, 0)
    const days = new Set(r.map((x) => x.started.slice(0, 10))).size
    return { sessions: r.length, minutes, days, perDay: days ? minutes / days : 0, streak: streakDays(r) }
  })
  const bars = createMemo(() => minutesPerDay(rows(), settings.chartDays))
  const latest = () => rows().slice(-25).reverse()

  return (
    <div class="grid wide">
      <div class="card">
        <h2>Progress</h2>
        <div class="tiles">
          <div class="tile">
            <div class="label">sessions</div>
            <div class="value">{totals().sessions}</div>
          </div>
          <div class="tile">
            <div class="label">minutes total</div>
            <div class="value">{Math.round(totals().minutes)}</div>
          </div>
          <div class="tile">
            <div class="label">days practised</div>
            <div class="value">{totals().days}</div>
            <div class="hint">{totals().perDay ? `${Math.round(totals().perDay)} min / day` : ''}</div>
          </div>
          <div class="tile">
            <div class="label">current streak</div>
            <div class="value">{totals().streak}</div>
            <div class="hint">{totals().streak === 1 ? 'day' : 'days'} in a row</div>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Minutes per day, last {settings.chartDays} days</h2>
        <Show when={rows().length} fallback={<p class="empty">No sessions logged yet. The chart fills in as you play.</p>}>
          <BarChart bars={bars()} />
        </Show>
      </div>

      <div class="card">
        <h2>Sessions</h2>
        <Show when={latest().length} fallback={<p class="empty">Nothing logged yet.</p>}>
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>when</th>
                  <th>player</th>
                  <th class="num">min</th>
                  <th class="num">notes</th>
                  <th class="num">n/min</th>
                  <th>range</th>
                  <th class="num">left %</th>
                  <th class="num">spread</th>
                  <Show when={settings.advanced}>
                    <th class="num">gap s</th>
                    <th class="num">pitches</th>
                    <th>file</th>
                    <th>source</th>
                  </Show>
                </tr>
              </thead>
              <tbody>
                <For each={latest()}>
                  {(r) => (
                    <tr>
                      <td class="mono">{fmtWhen(r.started)}</td>
                      <td>{r.player ?? '–'}</td>
                      <td class="num">{r.minutes.toFixed(1)}</td>
                      <td class="num">{r.notes}</td>
                      <td class="num">{r.notes_per_min ?? '–'}</td>
                      <td class="mono">
                        {r.low}–{r.high}
                      </td>
                      <td class="num">{r.left_hand_pct ?? '–'}</td>
                      <td class="num">{r.timing_spread ?? '–'}</td>
                      <Show when={settings.advanced}>
                        <td class="num">{r.median_gap_sec ?? '–'}</td>
                        <td class="num">{r.distinct_pitches ?? '–'}</td>
                        <td class="mono small">{r.midi ?? '–'}</td>
                        <td>{r.source ?? 'python'}</td>
                      </Show>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
          <p class="small faint" style={{ 'margin-bottom': 0 }}>
            spread: inter-note timing variation around the median, lower is steadier. Only meaningful on scales and exercises.
          </p>
        </Show>
      </div>
    </div>
  )
}
