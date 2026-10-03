# web/ — the dashboard

A SolidJS + Vite page that shows the keyboard live, your practice history and the trainer results,
with settings in two layers (Basic, Advanced).

```
npm install
npm run dev        # http://127.0.0.1:5173  (Chrome or Edge: Web MIDI)
npm test           # vitest: analysis parity with the Python logger, session model, MIDI writer
npm run build      # type-check + production build
```

How it gets its data:
- **Live keyboard**: the Web MIDI API in the browser, no server in the loop. First load asks for MIDI permission.
- **Logs and lessons**: a small Vite dev-server middleware (`api/plugin.ts`) serves `keyboard/practice_log.json`,
  `keyboard/trainer_log.json`, `keyboard/sessions/` and the lessons table under `/api/*`.
- **Saving sessions**: the dashboard runs the same silence-defined session model as `keyboard/practice_log.py`
  and POSTs finished sessions to `/api/practice-log`, which writes the `.mid` and appends the row in the same
  shape. Both loggers feed one history; run one at a time, because Windows gives a MIDI port to one program.

Settings live in the browser's localStorage. Nothing here is served in production; it is a local tool.
