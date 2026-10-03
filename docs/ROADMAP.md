# Roadmap

Ranked by value to a beginner per hour of building. Status as of 2026-10-02.

| # | Thing | Status | Notes |
|---|---|---|---|
| 1 | Practice logger | **built**, never run for a real session | `keyboard/practice_log.py`. First real session still owed. |
| 2 | Lighted-key player | **built, lighting verified 2026-10-03** | `keyboard/light_keys.py`. Keys light from PC notes on channels 3/4 with factory settings. Full `--probe` still to run. |
| 3 | Wait-mode snippet trainer | **built**, lights verified, input leg not yet re-checked | `keyboard/snippet_trainer.py`. Scored, logged. |
| 3b | Dashboard (`web/`) | **built**, unverified with the keyboard | Live keys, status, sessions, chart, trainer results, Basic/Advanced settings, capture-to-notation. Saves sessions in the Python logger's format. |
| 4 | Lesson 00: first contact | not started | Plug in, probe, five-finger warm-up. `lessons/00-first-contact/`. |
| 5 | Lesson 01: "Ain't Nuthing ta F' Wit" loop | identified; capture the notes by ear next | `lessons/01-wu-tang-underdog/`. Dashboard Capture card plus `light_keys.py --notes`. |
| 6 | Per-bar accuracy scorer | idea | Diff a logged performance against the piece's MIDI; report WHICH bars get fumbled. Turns "practice more" into "practice bar 14". |
| 7 | Timing / evenness analysis for scales | idea | The thing that is hard to self-assess. The logger already stores inter-note gaps. |
| 8 | Score on screen | idea | OSMD wait mode inside the dashboard, with the notation following the keys. See `docs/oss-landscape.md`. |
| 9 | Progress video | idea | Same piece at month 1 / 3 / 6, auto-assembled from logged MIDI. |

Hardware caveat (2026-10-03): the LK-175's speakers went silent after a wrong power adapter. MIDI, lighting and
the main board work. Triage steps are in `docs/casio-lk175.md`; practice does not depend on the speakers.

Out of scope here, belongs in RipTheStack: MIDI as a stream-overlay input (notes driving visuals or scene changes).

## Definition of "learned"

A passage counts as learned when it goes three times in a row clean at half speed in the trainer. Then raise the
speed. This is the gate between steps in every lesson.
