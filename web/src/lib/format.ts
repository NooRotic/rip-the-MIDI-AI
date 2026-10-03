export function timeAgo(epochSeconds: number | null, nowSeconds = Date.now() / 1000): string {
  if (epochSeconds === null) return 'never'
  const d = Math.max(0, nowSeconds - epochSeconds)
  if (d < 2) return 'just now'
  if (d < 60) return `${Math.round(d)} s ago`
  if (d < 3600) return `${Math.round(d / 60)} min ago`
  if (d < 86400) return `${Math.round(d / 3600)} h ago`
  return `${Math.round(d / 86400)} d ago`
}

export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  return m ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s} s`
}

/** 'YYYY-MM-DD' in local time. */
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function shiftDay(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number]
  return dayKey(new Date(y, m - 1, d + days))
}

export function fmtWhen(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ')
}

export function fmtDayShort(key: string): string {
  const [, m, d] = key.split('-')
  return `${Number(m)}/${Number(d)}`
}
