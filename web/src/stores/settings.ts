/** Dashboard settings, split into the Basic layer everyone touches and the Advanced layer for
 * deeper data use. Persisted per browser in localStorage. */
import { createStore } from 'solid-js/store'

export interface Settings {
  // basic
  player: string
  autoLog: boolean
  idleSeconds: number
  splitNote: string
  leftCh: number
  rightCh: number
  advanced: boolean
  // advanced
  minNotes: number
  minSeconds: number
  pollSeconds: number
  monitorSize: number
  lightVelocity: number
  portMatch: string
  chartDays: number
  listenAllInputs: boolean
}

export const DEFAULTS: Settings = {
  player: 'me',
  autoLog: true,
  idleSeconds: 90,
  splitNote: 'C4',
  leftCh: 3,
  rightCh: 4,
  advanced: false,
  minNotes: 20,
  minSeconds: 30,
  pollSeconds: 5,
  monitorSize: 150,
  lightVelocity: 20,
  portMatch: 'CASIO',
  chartDays: 30,
  listenAllInputs: true,
}

const KEY = 'rip-the-midi.settings.v1'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export const [settings, setSettings] = createStore<Settings>(load())

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    /* private window or blocked storage: settings just don't survive a reload */
  }
}

export function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  setSettings(key, () => value)
  persist()
}

export function resetSettings() {
  setSettings({ ...DEFAULTS })
  persist()
}
