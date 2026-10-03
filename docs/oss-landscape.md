# Open-source piano-tutor and MIDI-feedback landscape

Surveyed via the GitHub API on 2026-09-11. Activity claims age quickly; re-verify before relying on them.

## Reusable building blocks (all active, Windows-clean)

- **OpenSheetMusicDisplay (OSMD)**, https://github.com/opensheetmusicdisplay/opensheetmusicdisplay, BSD-3, TypeScript.
  Renders MusicXML in the browser. The open build includes `osmd.cursor` (`next()`, `NotesUnderCursor()`), which
  is all a wait mode needs. Only the audio player is sponsor-gated.
- **webmidi.js**, https://github.com/djipco/webmidi, Apache-2. Web MIDI works in Chrome and Edge on Windows with
  no flags, just a permission prompt.
- **VexFlow** / **abcjs**: MIT notation renderers if OSMD is too heavy (abcjs uses ABC notation, not MusicXML).
- **music21**, https://github.com/cuthbertLab/music21, BSD-3, alive (v10.5, June 2026). Needs Python 3.11+, which
  is why this repo's venv is 3.11.
- **partitura**, https://github.com/CPJKU/partitura, Apache-2, pure Python. Loads scores, performances and
  alignments. Lighter than music21 for note arrays.
- **matchmaker**, https://github.com/pymatchmaker/matchmaker, Apache-2. Real-time score following straight from
  python-rtmidi. Windows setup friction (VC++ build tools, fluidsynth). Only worth it for true real-time
  following, not per-bar reports.

## Whole apps

- **PianoBooster**: GPL-3 C++/Qt, wait mode + score + a CC-BY beginner MIDI course (BoosterMusic). Last release
  December 2020, effectively unmaintained. Good zero-code bridge for week one.
- **Neothesia**: GPL-3 Rust, active (September 2026). Play-along wait mode, no scoring, no lessons.
- **sightread**, https://github.com/sightread/sightread: GPL-3 TypeScript/React with lessons and progress, but went
  private-dev in March 2026 (PRs closed, "reopen core 2027"). Free hosted at sightread.dev. The pre-March-2026
  source is a good reference for wait-mode and scoring code.
- **PianoML**, https://github.com/piano-ml/piano-ml: GPL-3, Angular + Java + Postgres, 21 stars. Closest
  all-in-one (MusicXML library, exercises, feedback) but heavy. Evaluate one evening; fork only if it does 80%.
- **piano-trainer** (ZaneH, MIT, Tauri + React): scale and chord drills only. **Openthesia** (C#, Windows):
  learning mode, no score. **Linthesia**: Linux only. **Piano-LED-Visualizer**: needs a Raspberry Pi and an
  LED strip, which the LK-175 makes unnecessary.

## Free score sources

musetrainer/library (public-domain MusicXML), Mutopia (about 2100 pieces, MIDI and LilyPond), IMSLP, OpenScore
(CC0, not beginner-level). No open-source graded method book exists; assemble one from Anna Magdalena Notebook
minuets, Burgmüller Op. 100, Clementi sonatinas and folk tunes, plus generated exercises. PianoBooster's
BoosterMusic course is CC-BY and beginner-graded.

## Recommended architecture (ranked first of three considered)

Local web app: OSMD renders the score, webmidi.js feeds note-ons, about a hundred lines of TypeScript compare
pressed pitches to `NotesUnderCursor()` and advance the cursor (wait mode). Each attempt is recorded as MIDI and
posted to a small Python service that maps notes to bars and emits per-bar wrong/missed/extra and timing-offset
stats into SQLite, feeding the practice log. Estimated one to two weekends to a first useful version.

The terminal tools in `keyboard/` are the deliberately smaller first step: same feedback loop, no browser.
