"""Shared helpers for the keyboard tools: note names, port discovery, MIDI-file loading.

Channels are stored 0-based internally (as mido does) and shown 1-based to humans (as the Casio
manuals print them). Convert with ``ch0()`` / ``ch1()`` at the boundary and nowhere else.
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass

try:
    import mido
except ImportError:  # pragma: no cover
    sys.exit("mido not installed:  venv\\Scripts\\python.exe -m pip install -r requirements.txt")

NOTE_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
_BASE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
_NOTE_RE = re.compile(r"^([A-Ga-g])([#b]?)(-?\d)$")

MIDDLE_C = 60
PORT_NEEDLE = "CASIO"

# Casio "navigate" channels, 1-based as printed in the manuals. The LK series lights a key when it
# RECEIVES a note message on one of these channels: left hand = 3, right hand = 4 by default.
# Verify on the actual keyboard with ``light_keys.py --probe`` (see docs/casio-lk175.md).
NAV_LEFT_CH = 3
NAV_RIGHT_CH = 4


def ch0(human_channel: int) -> int:
    """1-based human channel -> 0-based mido channel."""
    if not 1 <= human_channel <= 16:
        raise ValueError("MIDI channel must be 1..16, got %r" % (human_channel,))
    return human_channel - 1


def ch1(mido_channel: int) -> int:
    """0-based mido channel -> 1-based human channel."""
    return mido_channel + 1


def note_name(n: int) -> str:
    """60 -> 'C4' (middle C), 21 -> 'A0', 108 -> 'C8'."""
    return "%s%d" % (NOTE_NAMES[n % 12], n // 12 - 1)


def parse_note(token: str) -> int:
    """'C4' -> 60. Accepts sharps (F#3), flats (Bb2) and raw MIDI numbers ('60')."""
    token = token.strip()
    if token.lstrip("-").isdigit():
        n = int(token)
    else:
        m = _NOTE_RE.match(token)
        if not m:
            raise ValueError("not a note: %r (use C4, F#3, Bb2 or 0..127)" % (token,))
        letter, acc, octave = m.groups()
        n = (int(octave) + 1) * 12 + _BASE[letter.upper()] + {"#": 1, "b": -1, "": 0}[acc]
    if not 0 <= n <= 127:
        raise ValueError("note out of MIDI range 0..127: %r" % (token,))
    return n


def parse_sequence(text: str) -> list[list[int]]:
    """'C4 E4+G4 C5' -> [[60], [64, 67], [72]].

    Whitespace or commas separate steps; '+' joins notes that must be played together.
    """
    steps = []
    for tok in re.split(r"[\s,]+", text.strip()):
        if not tok:
            continue
        notes = sorted({parse_note(p) for p in tok.split("+") if p})
        if notes:
            steps.append(notes)
    return steps


def hand_of(note: int, split: int = MIDDLE_C) -> str:
    """Heuristic hand assignment: below the split is 'left', at/above is 'right'."""
    return "left" if note < split else "right"


def nav_channel(note: int, split: int = MIDDLE_C,
                left: int = NAV_LEFT_CH, right: int = NAV_RIGHT_CH) -> int:
    """0-based channel that will light this note on the Casio, by hand."""
    return ch0(left if hand_of(note, split) == "left" else right)


@dataclass(frozen=True)
class NoteEvent:
    time: float      # seconds from the start of the file
    note: int
    velocity: int
    duration: float  # seconds
    channel: int     # 0-based
    track: int       # index into MidiFile.tracks


def _tempo_map(mid) -> list[tuple[int, int]]:
    """[(absolute_tick, microseconds_per_beat), ...] across all tracks, starting at tick 0."""
    changes = []
    for tr in mid.tracks:
        t = 0
        for msg in tr:
            t += msg.time
            if msg.type == "set_tempo":
                changes.append((t, msg.tempo))
    changes.sort(key=lambda c: c[0])  # stable: later duplicates at the same tick win
    if not changes or changes[0][0] > 0:
        changes.insert(0, (0, 500000))  # MIDI default 120 bpm
    return changes


def _tick2sec(tick: int, tempo_map: list[tuple[int, int]], tpb: int) -> float:
    sec = 0.0
    for i, (start, tempo) in enumerate(tempo_map):
        if tick <= start:
            break
        nxt = tempo_map[i + 1][0] if i + 1 < len(tempo_map) else None
        end = tick if nxt is None or tick < nxt else nxt
        sec += mido.tick2second(end - start, tpb, tempo)
    return sec


def load_midi_notes(path) -> list[NoteEvent]:
    """Every note in the file with absolute seconds, honouring tempo changes. Sorted by onset."""
    mid = mido.MidiFile(str(path))
    tm = _tempo_map(mid)
    tpb = mid.ticks_per_beat
    events = []
    for ti, tr in enumerate(mid.tracks):
        tick = 0
        active: dict[tuple[int, int], tuple[int, int]] = {}
        for msg in tr:
            tick += msg.time
            if msg.type == "note_on" and msg.velocity > 0:
                active[(msg.channel, msg.note)] = (tick, msg.velocity)
            elif msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
                key = (msg.channel, msg.note)
                if key in active:
                    st, vel = active.pop(key)
                    t0, t1 = _tick2sec(st, tm, tpb), _tick2sec(tick, tm, tpb)
                    events.append(NoteEvent(t0, msg.note, vel, max(t1 - t0, 0.0), msg.channel, ti))
        for (chn, n), (st, vel) in active.items():  # note_on never closed: give it a short length
            events.append(NoteEvent(_tick2sec(st, tm, tpb), n, vel, 0.25, chn, ti))
    events.sort(key=lambda e: (e.time, e.note))
    return events


def steps_to_events(steps: list[list[int]], step_seconds: float = 0.5, velocity: int = 100) -> list[NoteEvent]:
    """[[60], [64, 67]] -> NoteEvents, one step every ``step_seconds``, each note held for 90% of it."""
    return [NoteEvent(i * step_seconds, n, velocity, step_seconds * 0.9, 0, 0)
            for i, step in enumerate(steps) for n in step]


def group_steps(events: list[NoteEvent], window: float = 0.03) -> list[list[NoteEvent]]:
    """Notes whose onsets fall within ``window`` seconds of the step's first note form one step."""
    steps: list[list[NoteEvent]] = []
    for e in events:
        if steps and e.time - steps[-1][0].time <= window:
            steps[-1].append(e)
        else:
            steps.append([e])
    return steps


def track_summary(path) -> list[dict]:
    mid = mido.MidiFile(str(path))
    out = []
    for ti, tr in enumerate(mid.tracks):
        name = next((m.name for m in tr if m.type == "track_name"), "")
        notes = [m for m in tr if m.type == "note_on" and m.velocity > 0]
        out.append({
            "track": ti, "name": name, "notes": len(notes),
            "channels": sorted({ch1(m.channel) for m in notes}),
            "low": note_name(min(m.note for m in notes)) if notes else None,
            "high": note_name(max(m.note for m in notes)) if notes else None,
        })
    return out


def find_port(names, needle: str = PORT_NEEDLE):
    for p in names:
        if needle.upper() in p.upper():
            return p
    return None


def casio_ports(needle: str = PORT_NEEDLE):
    """(input_name, output_name) for the keyboard; either may be None when unplugged."""
    return find_port(mido.get_input_names(), needle), find_port(mido.get_output_names(), needle)


def all_notes_off(out, channels) -> None:
    for chn in channels:
        out.send(mido.Message("control_change", channel=chn, control=123, value=0))
