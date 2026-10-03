r"""Piano practice logger for the Casio LK-175 — capture every session, measure what happened.

    venv\Scripts\python.exe keyboard\practice_log.py                 # watch until Ctrl-C
    venv\Scripts\python.exe keyboard\practice_log.py --player me
    venv\Scripts\python.exe keyboard\practice_log.py --report        # history, no recording

Sits quietly on the MIDI input. When notes start it opens a session; when the keyboard has been
quiet for a while it closes that session, writes a timestamped .mid, and appends a row to
practice_log.json. Leave it running for the whole practice and it needs no interaction.

WHY A SESSION IS A GAP, NOT A BUTTON
------------------------------------
Nobody remembers to press start and stop when they just want to play. So a session
is defined by silence: >90s of nothing ends it. Anything shorter than MIN_NOTES or MIN_SECONDS is
discarded as noodling rather than logged as practice, so the numbers stay honest.

WHAT IT CAN AND CANNOT MEASURE
------------------------------
The LK-175 reports a FIXED velocity of 100 — its keys are not touch sensitive
(see docs/casio-lk175.md). So there is no dynamics data, and this deliberately does not
pretend otherwise. What IS real: note choice, range, note count, timing between notes, evenness,
hands-apart vs together (inferred from the low/high split), and total time at the instrument.
"""
import argparse
import json
import os
import statistics
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    import mido
except ImportError:
    sys.exit("mido not installed:  <venv>\\Scripts\\python.exe -m pip install mido python-rtmidi")

HERE = Path(__file__).parent
SESSIONS = HERE / "sessions"
LOG = HERE / "practice_log.json"

IDLE_END = 90.0        # seconds of silence that closes a session
MIN_NOTES = 20         # below this it was noodling, not practice
MIN_SECONDS = 30.0
SPLIT = 60             # middle C: notes below are "left hand", at/above "right"

NAMES = {0: "C", 1: "C#", 2: "D", 3: "D#", 4: "E", 5: "F", 6: "F#",
         7: "G", 8: "G#", 9: "A", 10: "A#", 11: "B"}


def nm(n):
    return "%s%d" % (NAMES[n % 12], n // 12 - 1)


def find_input():
    for p in mido.get_input_names():
        if "CASIO" in p.upper():
            return p
    return mido.get_input_names()[0] if mido.get_input_names() else None


def analyse(notes):
    """notes = [(t, note, velocity)] relative to session start."""
    ts = [t for t, _, _ in notes]
    ns = [n for _, n, _ in notes]
    span = ts[-1] - ts[0] if len(ts) > 1 else 0.0
    gaps = [b - a for a, b in zip(ts, ts[1:]) if 0.02 < (b - a) < 4.0]
    left = sum(1 for n in ns if n < SPLIT)
    out = {
        "notes": len(notes),
        "span_sec": round(span, 1),
        "notes_per_min": round(len(notes) / span * 60, 1) if span > 5 else None,
        "low": nm(min(ns)), "high": nm(max(ns)),
        "distinct_pitches": len(set(ns)),
        "left_hand_pct": round(100 * left / len(ns)),
    }
    if len(gaps) > 4:
        med = statistics.median(gaps)
        out["median_gap_sec"] = round(med, 3)
        # spread of inter-note gaps around the median = how EVEN the playing was.
        # Lower is steadier. Only meaningful on runs (scales/exercises), not free playing.
        out["timing_spread"] = round(statistics.median(abs(g - med) for g in gaps) / med, 2) if med else None
    return out


def save_midi(notes, path, bpm=100):
    mid = mido.MidiFile(ticks_per_beat=480)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    tr.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(bpm)))
    tick = lambda s: int(mido.second2tick(s, 480, mido.bpm2tempo(bpm)))
    prev = 0.0
    for t, n, v in notes:
        tr.append(mido.Message("note_on", note=n, velocity=v, time=tick(t - prev)))
        tr.append(mido.Message("note_off", note=n, velocity=0, time=tick(0.25)))
        prev = t + 0.25
    mid.save(str(path))


def load_log():
    if LOG.exists():
        try:
            return json.loads(LOG.read_text(encoding="utf-8"))
        except Exception:                                    # noqa: BLE001
            return []
    return []


def report():
    rows = load_log()
    if not rows:
        print("no sessions logged yet")
        return
    print("%-18s %-8s %7s %7s %9s %-12s" % ("when", "player", "mins", "notes", "n/min", "range"))
    for r in rows[-25:]:
        print("%-18s %-8s %7.1f %7d %9s %-12s" % (
            r["started"][:16].replace("T", " "), r.get("player", "-"),
            r["minutes"], r["notes"], r.get("notes_per_min") or "-",
            "%s-%s" % (r["low"], r["high"])))
    tot = sum(r["minutes"] for r in rows)
    print("\n%d sessions · %.0f minutes total · %d notes" %
          (len(rows), tot, sum(r["notes"] for r in rows)))
    days = {r["started"][:10] for r in rows}
    print("practised on %d separate days (avg %.0f min/day)" % (len(days), tot / max(1, len(days))))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--player", default=os.environ.get("RTM_PLAYER", "me"),
                    help="who is practising (default: RTM_PLAYER env var, else me)")
    ap.add_argument("--report", action="store_true", help="print history and exit")
    ap.add_argument("--idle", type=float, default=IDLE_END)
    a = ap.parse_args()

    if a.report:
        report()
        return

    port = find_input()
    if not port:
        sys.exit("no MIDI input found — is the keyboard plugged in and on?")
    SESSIONS.mkdir(exist_ok=True)
    print("practice logger — %s" % port)
    print("player: %s | a session ends after %.0fs of silence | Ctrl-C to stop\n"
          % (a.player, a.idle))

    notes, t0, last = [], None, None
    try:
        with mido.open_input(port) as inp:
            while True:
                now = time.time()
                for msg in inp.iter_pending():
                    if msg.type == "note_on" and msg.velocity > 0:
                        if t0 is None:
                            t0 = now
                            print("[%s] session started" % datetime.now().strftime("%H:%M:%S"),
                                  flush=True)
                        notes.append((now - t0, msg.note, msg.velocity))
                        last = now
                if t0 and last and now - last > a.idle:
                    close(notes, t0, a.player)
                    notes, t0, last = [], None, None
                time.sleep(0.004)
    except KeyboardInterrupt:
        if t0:
            close(notes, t0, a.player)
        print("\nstopped")


def close(notes, t0, player):
    span = notes[-1][0] if notes else 0
    if len(notes) < MIN_NOTES or span < MIN_SECONDS:
        print("  discarded (%d notes / %.0fs — below the practice threshold)\n"
              % (len(notes), span), flush=True)
        return
    started = datetime.fromtimestamp(t0)
    stem = "%s_%s" % (started.strftime("%Y%m%d_%H%M"), player)
    path = SESSIONS / (stem + ".mid")
    save_midi(notes, path)
    row = {"started": started.isoformat(timespec="seconds"), "player": player,
           "minutes": round(span / 60, 1), "midi": path.name}
    row.update(analyse(notes))
    rows = load_log()
    rows.append(row)
    LOG.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    print("  SESSION LOGGED  %.1f min · %d notes · %s-%s · %s%% left hand"
          % (row["minutes"], row["notes"], row["low"], row["high"], row["left_hand_pct"]))
    if row.get("timing_spread") is not None:
        print("  timing spread %.2f (lower = steadier)" % row["timing_spread"])
    print("  -> %s\n" % path.name, flush=True)


if __name__ == "__main__":
    main()
