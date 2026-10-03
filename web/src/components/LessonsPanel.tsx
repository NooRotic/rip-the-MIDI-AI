import { For, Show } from 'solid-js'
import { data } from '../stores/data.ts'

export default function LessonsPanel() {
  const lessons = () => data.lessons() ?? []
  return (
    <div class="card">
      <h2>Lessons</h2>
      <p class="muted small">From <code>lessons/README.md</code>. Each lesson folder is a journal: goal, exact commands, what happened, next time.</p>
      <Show when={lessons().length} fallback={<p class="empty">No lessons table found.</p>}>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>#</th>
                <th>lesson</th>
                <th>what</th>
                <th>status</th>
                <th>file</th>
              </tr>
            </thead>
            <tbody>
              <For each={lessons()}>
                {(l) => (
                  <tr>
                    <td class="mono">{l.num}</td>
                    <td>{l.title}</td>
                    <td class="muted" style={{ 'white-space': 'normal' }}>{l.blurb}</td>
                    <td>{l.status}</td>
                    <td class="mono small">{l.path}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  )
}
