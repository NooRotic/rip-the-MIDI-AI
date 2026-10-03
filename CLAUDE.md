# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

The public hub for MIDI work: tools for a Casio LK-175 lighted-key keyboard, a practice journal
(`lessons/`), and an index of related projects (`PROJECTS.md`). The learner is the repo owner, an adult
total beginner; the tooling exists to give them pitch and timing feedback and to light the keys for a
passage they want to learn. Python 3.11 in `venv/` at the repo root (music21 needs 3.11+ if we add it).
Node 22 is on the machine for a future web front-end; nothing uses it yet.

## Commands

```
uv pip install --python venv\Scripts\python.exe -r requirements-dev.txt   # setup
venv\Scripts\python.exe -m pytest -q                                      # tests (no hardware needed)
venv\Scripts\python.exe keyboard\midi_ports.py [--watch]                  # is the keyboard plugged in?
venv\Scripts\python.exe keyboard\light_keys.py --probe | --notes "C4 E4" | FILE.mid [--dry-run]
venv\Scripts\python.exe keyboard\snippet_trainer.py --notes "C4 E4+G4" | FILE.mid [--list]
venv\Scripts\python.exe keyboard\practice_log.py [--report]

cd web && npm install && npm run dev      # dashboard at http://127.0.0.1:5173 (Chrome/Edge for Web MIDI)
cd web && npm test && npm run build       # vitest + tsc type-check + vite build
```

The dashboard (`web/`) is SolidJS + Vite + TypeScript. Live keyboard data comes from the Web MIDI API in the
browser; logs come through the Vite middleware in `web/api/plugin.ts` (`/api/*`), which also writes sessions
the dashboard saves. `web/src/lib/analyse.ts` and `web/src/lib/session.ts` are line-for-line ports of
`practice_log.py`; change both sides together. `.claude/launch.json` starts it as `dashboard`.

Always run Python through `venv\Scripts\python.exe`, never the system interpreter. The keyboard is often
unplugged: `--dry-run`, `--list`, `--report` and the tests all work without it, and `--port "Microsoft GS"`
sends to the Windows software synth for a listening test.

## Hardware facts that shape the code

- Ports: `CASIO USB-MIDI 1` = input (keyboard to PC), `CASIO USB-MIDI 2` = output. Match on the substring
  `CASIO`. Other devices (a Loupedeck) also appear, so never fall back silently to "first port".
- **Velocity is fixed at 100.** Keys are not touch-sensitive. Do not build or imply dynamics feedback.
- **Keys light from MIDI IN on the navigate channels: 3 = left hand, 4 = right hand (1-based).** Defaults
  live in `keyboard/midi_core.py` (`NAV_LEFT_CH`, `NAV_RIGHT_CH`); every tool takes `--left-ch/--right-ch`.
  Until `light_keys.py --probe` has been run on this unit, treat the channel numbers as Casio's documented
  default, not as verified. Record the result in `lessons/00-first-contact/README.md`.
- Channels are 0-based inside the code (mido) and 1-based in anything a human reads. Convert only with
  `ch0()` / `ch1()`.
- `mido` has no `__version__`; don't probe it.

## Conventions

- **Sessions are defined by silence, not buttons** (`practice_log.py`): a fixed-window listener cannot tell
  "pipe broken" from "nobody played". Keep that model in any new capture tool.
- **Pure logic is separable and tested.** `StepScorer`, `build_schedule`, `load_midi_notes` take no ports;
  in the web app `analyse`, `SessionTracker`, `writeSmf`, `groupCaptured` take no DOM or MIDI. New behaviour
  goes in a testable function first, then gets a thin CLI or component.
- **One MIDI owner at a time.** Windows hands a MIDI port to one process. The browser dashboard and the
  Python trainer/logger cannot both hold the Casio input; tell the user which one to stop.
- **Settings have two layers.** Anything a beginner must touch is Basic; thresholds, raw data and
  diagnostics are Advanced (`settings.advanced` gates them). Don't add a third layer.
- **Personal data never lands in git.** `keyboard/sessions/`, `*_log.json` and everything in `songs/` except
  `songs/public/` are gitignored. No family names in code, docs or commit messages; the player label defaults
  to `me` / `$RTM_PLAYER`.
- **Copyright.** Do not commit transcriptions of copyrighted music, and do not paste lyrics anywhere. Short
  note sequences typed on the command line for personal practice are fine.
- `lessons/NN-slug/README.md` is a journal: goal, exact commands, what happened, next time. Update it after
  a session rather than writing docs nobody reads.
- Docs cite their sources with dates; hardware claims say whether they were verified on this unit.
