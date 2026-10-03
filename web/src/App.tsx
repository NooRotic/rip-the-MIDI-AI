import { createEffect, createSignal, For, Match, onCleanup, onMount, Switch } from 'solid-js'
import KeyboardPanel from './components/KeyboardPanel.tsx'
import LessonsPanel from './components/LessonsPanel.tsx'
import OverviewPanel from './components/OverviewPanel.tsx'
import ProgressPanel from './components/ProgressPanel.tsx'
import SettingsPanel from './components/SettingsPanel.tsx'
import StatusBar from './components/StatusBar.tsx'
import TrainerPanel from './components/TrainerPanel.tsx'
import { refetchData } from './stores/data.ts'
import { midi } from './stores/midi.ts'
import { settings } from './stores/settings.ts'

const TABS = ['Overview', 'Keyboard', 'Progress', 'Trainer', 'Lessons', 'Settings'] as const
type Tab = (typeof TABS)[number]
const isTab = (s: string): s is Tab => (TABS as readonly string[]).includes(s)

export default function App() {
  const initial = decodeURIComponent(location.hash.slice(1))
  const [tab, setTab] = createSignal<Tab>(isTab(initial) ? initial : 'Overview')
  const go = (t: string) => {
    if (isTab(t)) setTab(t)
  }
  createEffect(() => {
    history.replaceState(null, '', `#${tab()}`)
  })
  onMount(() => {
    void midi.init()
  })
  createEffect(() => {
    const every = Math.max(2, settings.pollSeconds) * 1000
    const id = setInterval(refetchData, every)
    onCleanup(() => clearInterval(id))
  })

  return (
    <>
      <header class="top">
        <div class="brand">
          <span class="logo">♩</span>
          <div>
            <h1>rip-the-MIDI</h1>
            <div class="sub">Casio LK-175 dashboard</div>
          </div>
        </div>
        <StatusBar />
      </header>
      <nav class="tabs" aria-label="Sections">
        <For each={TABS}>
          {(t) => (
            <button classList={{ active: tab() === t }} onClick={() => setTab(t)}>
              {t}
            </button>
          )}
        </For>
      </nav>
      <main>
        <Switch>
          <Match when={tab() === 'Overview'}>
            <OverviewPanel go={go} />
          </Match>
          <Match when={tab() === 'Keyboard'}>
            <KeyboardPanel />
          </Match>
          <Match when={tab() === 'Progress'}>
            <ProgressPanel />
          </Match>
          <Match when={tab() === 'Trainer'}>
            <TrainerPanel />
          </Match>
          <Match when={tab() === 'Lessons'}>
            <LessonsPanel />
          </Match>
          <Match when={tab() === 'Settings'}>
            <SettingsPanel />
          </Match>
        </Switch>
      </main>
    </>
  )
}
