import { createMemo, For, Show } from 'solid-js'
import { fmtWhen } from '../lib/format.ts'
import { data, type TrainerRow } from '../stores/data.ts'
import { settings } from '../stores/settings.ts'

interface Group {
  name: string
  attempts: number
  best: number
  latest: number
  latestWhen: string
  avgSeconds: number | null
  trend: number
}

export function groupTrainer(rows: TrainerRow[]): Group[] {
  const by = new Map<string, TrainerRow[]>()
  for (const r of rows) by.set(r.name, [...(by.get(r.name) ?? []), r])
  return [...by.entries()]
    .map(([name, rs]) => {
      const sorted = [...rs].sort((a, b) => a.when.localeCompare(b.when))
      const last = sorted[sorted.length - 1]!
      const first = sorted[0]!
      return {
        name,
        attempts: rs.length,
        best: Math.max(...rs.map((r) => r.accuracy_pct)),
        latest: last.accuracy_pct,
        latestWhen: last.when,
        avgSeconds: last.avg_seconds_per_step,
        trend: last.accuracy_pct - first.accuracy_pct,
      }
    })
    .sort((a, b) => b.latestWhen.localeCompare(a.latestWhen))
}

export default function TrainerPanel() {
  const rows = () => data.trainerLog() ?? []
  const groups = createMemo(() => groupTrainer(rows()))
  const recent = () => rows().slice(-30).reverse()
  return (
    <div class="grid wide">
      <div class="card">
        <h2>Snippets drilled with the trainer</h2>
        <Show
          when={groups().length}
          fallback={
            <p class="empty">
              No trainer runs yet. Try <code>keyboard\snippet_trainer.py --notes "C4 D4 E4 F4 G4 F4 E4 D4 C4"</code> from the repo root.
            </p>
          }
        >
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>snippet</th>
                  <th class="num">attempts</th>
                  <th class="num">best</th>
                  <th class="num">latest</th>
                  <th class="num">change</th>
                  <th class="num">s / step</th>
                  <th>last run</th>
                </tr>
              </thead>
              <tbody>
                <For each={groups()}>
                  {(g) => (
                    <tr>
                      <td>{g.name}</td>
                      <td class="num">{g.attempts}</td>
                      <td class="num">{g.best}%</td>
                      <td class="num">{g.latest}%</td>
                      <td class="num">{g.trend > 0 ? `+${g.trend}` : g.trend}</td>
                      <td class="num">{g.avgSeconds ?? '–'}</td>
                      <td class="mono">{fmtWhen(g.latestWhen)}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>
      <Show when={recent().length}>
        <div class="card">
          <h2>Recent runs</h2>
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>when</th>
                  <th>snippet</th>
                  <th class="num">loop</th>
                  <th class="num">clean</th>
                  <th class="num">accuracy</th>
                  <th class="num">wrong</th>
                  <th class="num">s / step</th>
                  <Show when={settings.advanced}>
                    <th>slowest</th>
                    <th>source</th>
                  </Show>
                </tr>
              </thead>
              <tbody>
                <For each={recent()}>
                  {(r) => (
                    <tr>
                      <td class="mono">{fmtWhen(r.when)}</td>
                      <td>{r.name}</td>
                      <td class="num">{r.loop}</td>
                      <td class="num">
                        {r.clean_steps}/{r.steps}
                      </td>
                      <td class="num">{r.accuracy_pct}%</td>
                      <td class="num">{r.wrong_notes}</td>
                      <td class="num">{r.avg_seconds_per_step ?? '–'}</td>
                      <Show when={settings.advanced}>
                        <td class="small">{r.slowest_steps.join('; ')}</td>
                        <td class="small mono">{r.source}</td>
                      </Show>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>
    </div>
  )
}
