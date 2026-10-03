r"""Wait-mode trainer for a short passage: the keyboard lights the next note(s), waits for you to
play them, and keeps score.

    venv\Scripts\python.exe keyboard\snippet_trainer.py --notes "C4 D4 E4 F4 G4 F4 E4 D4 C4"      # five-finger warm-up
    venv\Scripts\python.exe keyboard\snippet_trainer.py songs\my-snippet.mid --start 0 --count 8   # first 8 steps of a file
    venv\Scripts\python.exe keyboard\snippet_trainer.py songs\my-snippet.mid --hand right --loops 3
    venv\Scripts\python.exe keyboard\snippet_trainer.py --notes "C4+E4+G4 F4+A4+C5" --name triads

A STEP is one or more notes that start together (a chord is one step). For each step the trainer
sends the notes to the Casio on its navigate channels so the keys light (and sound, quietly), then
waits until you have pressed every note in the step. Wrong notes are counted, not punished: the step
completes once all the right keys have been hit. A summary prints at the end and appends to
trainer_log.json (gitignored) so progress on a named snippet can be compared across days.
"""
import argparse
import json
import statistics
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import mido

from midi_core import (MIDDLE_C, NAV_LEFT_CH, NAV_RIGHT_CH, PORT_NEEDLE, all_notes_off, casio_ports,
                       group_steps, hand_of, load_midi_notes, nav_channel, note_name, parse_note,
                       parse_sequence)

LOG = Path(__file__).parent / "trainer_log.json"


@dataclass
class StepResult:
    target: list[int]
    wrong: int = 0
    seconds: float | None = None
    pressed: list[int] = field(default_factory=list)


class StepScorer:
    """Pure scoring logic, no MIDI: feed it presses, read results. Testable without a keyboard."""

    def __init__(self, steps):
        self.steps = [sorted(set(s)) for s in steps if s]
        if not self.steps:
            raise ValueError("no steps to train")
        self.results = [StepResult(target=list(s)) for s in self.steps]
        self.i = 0
        self._pressed: set[int] = set()
        self._t0 = 0.0

    @property
    def done(self) -> bool:
        return self.i >= len(self.steps)

    @property
    def target(self) -> list[int]:
        return [] if self.done else self.steps[self.i]

    def begin(self, now: float) -> None:
        self._pressed = set()
        self._t0 = now

    def press(self, note: int, now: float) -> str:
        """-> 'hit' (right note, step not finished), 'complete', 'wrong', or 'done'."""
        if self.done:
            return "done"
        r = self.results[self.i]
        r.pressed.append(note)
        if note in self.target:
            self._pressed.add(note)
            if len(self._pressed) == len(self.target):
                r.seconds = now - self._t0
                self.i += 1
                return "complete"
            return "hit"
        r.wrong += 1
        return "wrong"

    def summary(self) -> dict:
        n = len(self.results)
        finished = [r for r in self.results if r.seconds is not None]
        clean = sum(1 for r in finished if r.wrong == 0)
        times = [r.seconds for r in finished]
        slowest = sorted(((r.seconds, i) for i, r in enumerate(self.results) if r.seconds is not None),
                         reverse=True)[:3]
        return {
            "steps": n,
            "completed": len(finished),
            "clean_steps": clean,
            "accuracy_pct": round(100 * clean / n) if n else 0,
            "wrong_notes": sum(r.wrong for r in self.results),
            "avg_seconds_per_step": round(statistics.mean(times), 2) if times else None,
            "slowest_steps": ["step %d %s %.1fs" % (i + 1, "+".join(note_name(x) for x in self.results[i].target), s)
                              for s, i in slowest],
        }


def steps_from_midi(path, hand="both", split=MIDDLE_C, start=0, count=None):
    events = load_midi_notes(path)
    if hand != "both":
        events = [e for e in events if hand_of(e.note, split) == hand]
    steps = [sorted({e.note for e in grp}) for grp in group_steps(events)]
    steps = steps[start:]
    return steps[:count] if count else steps


def run(steps, inp, out, light=True, light_velocity=20, split=MIDDLE_C,
        left_ch=NAV_LEFT_CH, right_ch=NAV_RIGHT_CH, hold=0.25):
    sc = StepScorer(steps)
    total = len(sc.steps)
    try:
        while not sc.done:
            tgt = sc.target
            for _ in inp.iter_pending():          # drop stale presses before lighting the next step
                pass
            if light and out:
                for n in tgt:
                    out.send(mido.Message("note_on", channel=nav_channel(n, split, left_ch, right_ch),
                                          note=n, velocity=light_velocity))
            print("step %2d/%d  play %-14s" % (sc.i + 1, total, " + ".join(note_name(n) for n in tgt)),
                  end=" ", flush=True)
            sc.begin(time.perf_counter())
            while True:
                progressed = False
                for msg in inp.iter_pending():
                    if msg.type == "note_on" and msg.velocity > 0:
                        r = sc.press(msg.note, time.perf_counter())
                        if r == "wrong":
                            print("x%s" % note_name(msg.note), end=" ", flush=True)
                        elif r == "hit":
                            print(".", end="", flush=True)
                        elif r == "complete":
                            print(" OK  %.2fs" % sc.results[sc.i - 1].seconds, flush=True)
                            progressed = True
                if progressed:
                    break
                time.sleep(0.002)
            if light and out:
                for n in tgt:
                    out.send(mido.Message("note_off", channel=nav_channel(n, split, left_ch, right_ch),
                                          note=n, velocity=0))
            time.sleep(hold)
    except KeyboardInterrupt:
        print("\nstopped early")
    finally:
        if out:
            all_notes_off(out, {nav_channel(n, split, left_ch, right_ch) for s in sc.steps for n in s})
    return sc


def log_row(row) -> None:
    rows = []
    if LOG.exists():
        try:
            rows = json.loads(LOG.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001 - a corrupt log must not block a practice session
            rows = []
    rows.append(row)
    LOG.write_text(json.dumps(rows, indent=2), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("midi", nargs="?", help="MIDI file to take the steps from")
    ap.add_argument("--notes", help='text sequence instead of a file, e.g. "C4 E4+G4 C5"')
    ap.add_argument("--name", help="label for the log (default: file stem or 'notes')")
    ap.add_argument("--hand", choices=("both", "left", "right"), default="both")
    ap.add_argument("--split", default="C4", help="first note of the right hand (default C4)")
    ap.add_argument("--start", type=int, default=0, help="skip this many steps")
    ap.add_argument("--count", type=int, help="train only this many steps")
    ap.add_argument("--loops", type=int, default=1, help="repeat the passage this many times")
    ap.add_argument("--no-light", action="store_true", help="do not send anything to the keyboard")
    ap.add_argument("--light-velocity", type=int, default=20, help="1..127; the lit note also sounds at this level")
    ap.add_argument("--left-ch", type=int, default=NAV_LEFT_CH)
    ap.add_argument("--right-ch", type=int, default=NAV_RIGHT_CH)
    ap.add_argument("--port", default=PORT_NEEDLE, help="substring of the keyboard's ports (default CASIO)")
    ap.add_argument("--list", action="store_true", help="print the steps and exit (no keyboard needed)")
    a = ap.parse_args()

    split = parse_note(a.split)
    if a.notes:
        steps = parse_sequence(a.notes)[a.start:]
        steps = steps[:a.count] if a.count else steps
        name = a.name or "notes"
    elif a.midi:
        steps = steps_from_midi(a.midi, a.hand, split, a.start, a.count)
        name = a.name or Path(a.midi).stem
    else:
        ap.error("give a MIDI file or --notes")
    if not steps:
        print("no steps selected")
        return 1

    if a.list:
        for i, s in enumerate(steps, 1):
            print("%3d  %s" % (i, " + ".join(note_name(n) for n in s)))
        return 0

    cin, cout = casio_ports(a.port)
    if not cin:
        print("no input port matching %r - is the keyboard on and plugged in? (%s)"
              % (a.port, mido.get_input_names()))
        return 1
    if not cout and not a.no_light:
        print("no output port matching %r; running with --no-light" % a.port)
        a.no_light = True

    print("%s: %d steps x %d loop(s); lights %s; Ctrl-C to stop\n"
          % (name, len(steps), a.loops, "off" if a.no_light else "on ch %d/%d" % (a.left_ch, a.right_ch)))
    with mido.open_input(cin) as inp:
        out = mido.open_output(cout) if (cout and not a.no_light) else None
        try:
            for loop in range(1, a.loops + 1):
                if a.loops > 1:
                    print("-- loop %d/%d --" % (loop, a.loops))
                sc = run(steps, inp, out, light=not a.no_light, light_velocity=a.light_velocity,
                         split=split, left_ch=a.left_ch, right_ch=a.right_ch)
                s = sc.summary()
                print("\n%d/%d steps clean (%d%%), %d wrong notes, %s s/step avg"
                      % (s["clean_steps"], s["steps"], s["accuracy_pct"], s["wrong_notes"],
                         s["avg_seconds_per_step"]))
                if s["slowest_steps"]:
                    print("slowest: " + "; ".join(s["slowest_steps"]))
                print()
                log_row({"when": datetime.now().isoformat(timespec="seconds"), "name": name,
                         "source": a.midi or "notes", "loop": loop, **s})
                if not sc.done:          # Ctrl-C mid-passage: stop looping
                    break
        finally:
            if out:
                out.close()
    print("logged to %s" % LOG.name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
