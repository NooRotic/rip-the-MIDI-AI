/** Vite dev-server middleware that exposes the repo's practice data under /api.
 *
 * Everything the dashboard shows that is not live MIDI comes through here: the practice log, the
 * trainer log, the recorded session files and the lesson list. POST /api/practice-log lets the
 * browser save a session in exactly the shape keyboard/practice_log.py writes, so both loggers
 * feed one history.
 */
import { existsSync, promises as fs } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { writeSmf, type NoteTuple } from './smf.ts'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(HERE, '..', '..')
const KEYBOARD = path.join(ROOT, 'keyboard')
const PRACTICE_LOG = path.join(KEYBOARD, 'practice_log.json')
const TRAINER_LOG = path.join(KEYBOARD, 'trainer_log.json')
const SESSIONS = path.join(KEYBOARD, 'sessions')
const LESSONS_INDEX = path.join(ROOT, 'lessons', 'README.md')

async function readJsonArray(file: string): Promise<unknown[]> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(file, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function fileInfo(file: string) {
  try {
    const st = await fs.stat(file)
    return { exists: true, modified: st.mtime.toISOString(), bytes: st.size }
  } catch {
    return { exists: false, modified: null, bytes: 0 }
  }
}

async function listSessions() {
  if (!existsSync(SESSIONS)) return []
  const names = (await fs.readdir(SESSIONS)).filter((n) => n.toLowerCase().endsWith('.mid')).sort()
  return Promise.all(
    names.map(async (file) => {
      const st = await fs.stat(path.join(SESSIONS, file))
      return { file, bytes: st.size, modified: st.mtime.toISOString() }
    }),
  )
}

/** Rows of the table in lessons/README.md: `| 00 | [Title](path): blurb | status |`. */
export function parseLessonTable(markdown: string) {
  const out: { num: string; title: string; path: string; blurb: string; status: string }[] = []
  const re = /^\|\s*(\d+)\s*\|\s*\[([^\]]+)\]\(([^)]+)\)\s*:?\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$/
  for (const line of markdown.split(/\r?\n/)) {
    const m = re.exec(line)
    if (m) out.push({ num: m[1]!, title: m[2]!, path: `lessons/${m[3]!}`, blurb: m[4]!, status: m[5]! })
  }
  return out
}

async function listLessons() {
  try {
    return parseLessonTable(await fs.readFile(LESSONS_INDEX, 'utf8'))
  } catch {
    return []
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null'))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Same file stem practice_log.py uses: YYYYMMDD_HHMM_player, local time. */
export function sessionStem(started: Date, player: string) {
  const safe = player.replace(/[^A-Za-z0-9_-]+/g, '_') || 'me'
  return `${started.getFullYear()}${pad(started.getMonth() + 1)}${pad(started.getDate())}_${pad(
    started.getHours(),
  )}${pad(started.getMinutes())}_${safe}`
}

interface SavePayload {
  row: Record<string, unknown> & { started: string; player: string }
  notes: NoteTuple[]
}

function isSavePayload(x: unknown): x is SavePayload {
  if (!x || typeof x !== 'object') return false
  const p = x as Partial<SavePayload>
  return (
    !!p.row &&
    typeof p.row === 'object' &&
    typeof p.row.started === 'string' &&
    typeof p.row.player === 'string' &&
    Array.isArray(p.notes) &&
    p.notes.length > 0 &&
    p.notes.every((n) => Array.isArray(n) && n.length === 3 && n.every((v) => typeof v === 'number'))
  )
}

async function savePracticeSession(payload: SavePayload) {
  const started = new Date(payload.row.started)
  if (Number.isNaN(started.getTime())) throw new Error('row.started is not a date')
  await fs.mkdir(SESSIONS, { recursive: true })
  let stem = sessionStem(started, payload.row.player)
  let file = `${stem}.mid`
  for (let i = 2; existsSync(path.join(SESSIONS, file)); i++) file = `${stem}_${i}.mid`
  await fs.writeFile(path.join(SESSIONS, file), writeSmf(payload.notes))
  const rows = await readJsonArray(PRACTICE_LOG)
  const row = { ...payload.row, midi: file, source: 'web' }
  rows.push(row)
  await fs.writeFile(PRACTICE_LOG, JSON.stringify(rows, null, 2), 'utf8')
  return { ok: true, midi: file, rows: rows.length, row }
}

export function ripApi(): Plugin {
  return {
    name: 'rip-the-midi-api',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        const url = (req.url ?? '/').split('?')[0]
        try {
          if (req.method === 'GET' && url === '/status') {
            const [practice, trainer, sessions] = await Promise.all([
              fileInfo(PRACTICE_LOG),
              fileInfo(TRAINER_LOG),
              listSessions(),
            ])
            return send(res, 200, {
              root: ROOT,
              practiceLog: practice,
              trainerLog: trainer,
              sessions: sessions.length,
              now: new Date().toISOString(),
            })
          }
          if (req.method === 'GET' && url === '/practice-log') return send(res, 200, await readJsonArray(PRACTICE_LOG))
          if (req.method === 'GET' && url === '/trainer-log') return send(res, 200, await readJsonArray(TRAINER_LOG))
          if (req.method === 'GET' && url === '/sessions') return send(res, 200, await listSessions())
          if (req.method === 'GET' && url === '/lessons') return send(res, 200, await listLessons())
          if (req.method === 'POST' && url === '/practice-log') {
            const body = await readBody(req)
            if (!isSavePayload(body)) return send(res, 400, { ok: false, error: 'expected {row:{started,player,...}, notes:[[t,note,vel],...]}' })
            return send(res, 200, await savePracticeSession(body))
          }
          if (url.startsWith('/')) return send(res, 404, { ok: false, error: `no route ${req.method} /api${url}` })
          next()
        } catch (e) {
          send(res, 500, { ok: false, error: e instanceof Error ? e.message : String(e) })
        }
      })
    },
  }
}
