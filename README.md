# rip-the-MIDI-AI

The hub for everything MIDI in the Rip-the-* universe: learning to play keyboard as an adult beginner
with an AI coach, tools for the Casio LK-175's lighted keys, and an index of the MIDI-related side
projects that live elsewhere.

Started 2026-09-10 as a small private repo (`ripTheMIDI`); consolidated here on 2026-10-02 as the public hub.

## What's here

| Path | What it is |
|---|---|
| [`web/`](web/README.md) | The dashboard (`npm run dev`): live keys, keyboard status, practice history, trainer results, Basic/Advanced settings |
| [`keyboard/`](keyboard/) | Casio LK-175 tools (Python): port check, practice logger, lighted-key player, wait-mode snippet trainer |
| [`lessons/`](lessons/README.md) | The practice journal: one folder per thing being learned, with the exact commands used |
| [`songs/`](songs/README.md) | MIDI to learn from. Only public-domain or self-written files are tracked (`songs/public/`) |
| [`docs/`](docs/) | Hardware notes, open-source landscape, roadmap |
| [`PROJECTS.md`](PROJECTS.md) | Index of related MIDI and audio projects in other repos |

## Quick start (Windows)

```
uv venv --python 3.11 venv
uv pip install --python venv\Scripts\python.exe -r requirements.txt
```
(or without uv: `py -3.11 -m venv venv` then `venv\Scripts\python.exe -m pip install -r requirements.txt`)

```
venv\Scripts\python.exe keyboard\midi_ports.py                                  # is the Casio plugged in? (--watch to see what it sends)
venv\Scripts\python.exe keyboard\light_keys.py --probe                          # which MIDI channels light the keys?
venv\Scripts\python.exe keyboard\light_keys.py songs\public\x.mid --speed 0.5   # watch the keys light the way through a piece
venv\Scripts\python.exe keyboard\snippet_trainer.py --notes "C4 D4 E4 F4 G4 F4 E4 D4 C4"   # wait-mode drill, scored
venv\Scripts\python.exe keyboard\practice_log.py                                # log a free practice session
```

Tests: `venv\Scripts\python.exe -m pytest` (install `requirements-dev.txt` first).

### The dashboard

```
cd web
npm install
npm run dev          # then open http://127.0.0.1:5173 in Chrome or Edge and allow MIDI
```

It shows the 61 keys live (left and right hand coloured by the split note), whether the Casio is connected,
the running practice session, minutes per day, every logged session, trainer results per snippet, and the
lesson list. Settings come in two layers: **Basic** (player name, auto-log, silence gap, hand split, light
channels) and **Advanced** (practice thresholds, polling, raw MIDI monitor, velocity check, port details,
extra table columns, light tests and the channel probe). A **Capture** card turns whatever you just played
into the trainer's `--notes` notation, which is how a riff gets transcribed by ear. Sessions it saves land in
the same `practice_log.json` and `keyboard/sessions/` the Python logger uses. See [web/README.md](web/README.md).

## The tools

- **`midi_ports.py`**: lists input/output ports, exits non-zero when the Casio is missing, `--watch` prints
  what the keyboard sends.
- **`light_keys.py`**: plays a MIDI file, or a text sequence via `--notes "C4 E4+G4"`, to the keyboard with every
  note moved onto Casio's "navigate" channels (left hand 3, right hand 4), which is what makes the keys light.
  `--probe` finds the channels on your unit, `--speed` slows it down, `--hand` isolates a hand, `--map track`
  uses the file's tracks instead of a pitch split.
- **`snippet_trainer.py`**: wait mode. Lights the next step, waits until you play it, counts wrong notes and
  time per step, prints a summary and appends it to a local log. Takes a MIDI file (with `--start/--count` to
  cut a passage) or a text sequence like `"C4 E4+G4 C5"`.
- **`practice_log.py`**: background logger. A session starts on the first note and ends after 90 s of silence;
  each one is saved as `.mid` with notes, range, timing spread and left/right split.

## The keyboard: Casio LK-175

Class-compliant USB MIDI, no drivers. Enumerates as `CASIO USB-MIDI 1` (keyboard to PC) and `CASIO USB-MIDI 2`
(PC to keyboard). The one hardware limit that matters: **velocity is fixed at 100**, the keys are not
touch-sensitive, so there is no dynamics data. Note choice, timing, evenness and range are all real, and that
is where a beginner's practice value is anyway.

**Lighted keys over MIDI.** Casio's LK series lights a key when it receives a note on one of its *navigate
channels*: channel 3 for the left-hand part and channel 4 for the right-hand part by default. Casio's own
guidance for transferred songs says the same, and newer LK models expose this explicitly as a "MIDI In
Navigate" setting. `light_keys.py` does the channel remapping so any MIDI file lights the keys. Details, sources
and the verification procedure for this specific unit are in [docs/casio-lk175.md](docs/casio-lk175.md).

## Where this is going

See [docs/ROADMAP.md](docs/ROADMAP.md). Short version: get the first lesson done on real hardware, then a
per-bar accuracy scorer, then a browser front-end (OpenSheetMusicDisplay + webmidi.js) when a terminal stops
being enough. Research behind the choices: [docs/oss-landscape.md](docs/oss-landscape.md).

## License

MIT. Music files under `songs/public/` carry their own licences, noted per file.
