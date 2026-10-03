/** Everything served by the Vite /api middleware, polled on an interval. */
import { createResource, createRoot, createSignal } from 'solid-js'
import type { Analysis } from '../lib/analyse.ts'

export interface PracticeRow extends Partial<Analysis> {
  started: string
  player?: string
  minutes: number
  midi?: string
  source?: string
  notes: number
  low: string
  high: string
}

export interface TrainerRow {
  when: string
  name: string
  source: string
  loop: number
  steps: number
  completed: number
  clean_steps: number
  accuracy_pct: number
  wrong_notes: number
  avg_seconds_per_step: number | null
  slowest_steps: string[]
}

export interface SessionFile {
  file: string
  bytes: number
  modified: string
}

export interface Lesson {
  num: string
  title: string
  path: string
  blurb: string
  status: string
}

export interface Status {
  root: string
  practiceLog: { exists: boolean; modified: string | null; bytes: number }
  trainerLog: { exists: boolean; modified: string | null; bytes: number }
  sessions: number
  now: string
}

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) throw new Error(`${r.status}`)
    return (await r.json()) as T
  } catch {
    return fallback
  }
}

export const data = createRoot(() => {
  const [tick, setTick] = createSignal(0)
  const [apiOk, setApiOk] = createSignal<boolean | null>(null)
  const [practiceLog] = createResource(tick, () => getJson<PracticeRow[]>('/api/practice-log', []))
  const [trainerLog] = createResource(tick, () => getJson<TrainerRow[]>('/api/trainer-log', []))
  const [sessions] = createResource(tick, () => getJson<SessionFile[]>('/api/sessions', []))
  const [lessons] = createResource(tick, () => getJson<Lesson[]>('/api/lessons', []))
  const [status] = createResource(tick, async () => {
    const s = await getJson<Status | null>('/api/status', null)
    setApiOk(s !== null)
    return s
  })
  return {
    practiceLog,
    trainerLog,
    sessions,
    lessons,
    status,
    apiOk,
    refetch: () => setTick((t) => t + 1),
  }
})

export const refetchData = data.refetch
