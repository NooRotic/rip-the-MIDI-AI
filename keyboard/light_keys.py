r"""Drive the Casio LK-175's lighted keys from the PC.

The LK series lights a key when it RECEIVES a note message on one of its "navigate" channels
(left hand 3, right hand 4 by default, 1-based). So to make the keyboard light the way through a
piece, play the MIDI file to it with every note moved onto those two channels. That is all this does.

    venv\Scripts\python.exe keyboard\light_keys.py --probe                 # which channels light keys? C4 on ch 1..16
    venv\Scripts\python.exe keyboard\light_keys.py --note C4 --channel 4   # one test note
    venv\Scripts\python.exe keyboard\light_keys.py --notes "C4 E4+G4 C5" --step 0.5 --loop   # audition a text sequence
    venv\Scripts\python.exe keyboard\light_keys.py song.mid                # play; hands split at middle C -> ch 3 / ch 4
    venv\Scripts\python.exe keyboard\light_keys.py song.mid --speed 0.5    # half speed
    venv\Scripts\python.exe keyboard\light_keys.py song.mid --hand right   # one hand only
    venv\Scripts\python.exe keyboard\light_keys.py song.mid --map track --right-track 1 --left-track 2
    venv\Scripts\python.exe keyboard\light_keys.py song.mid --map keep     # original channels (hear it; keys may not light)
    venv\Scripts\python.exe keyboard\light_keys.py song.mid --info         # tracks / channels / ranges, then exit
    venv\Scripts\python.exe keyboard\light_keys.py song.mid --dry-run      # print the schedule, send nothing

Ctrl-C stops playback and sends All Notes Off so nothing stays lit or sounding.
"""
import argparse
import sys
import time

import mido

from midi_core import (MIDDLE_C, NAV_LEFT_CH, NAV_RIGHT_CH, PORT_NEEDLE, all_notes_off, ch0, ch1,
                       find_port, hand_of, load_midi_notes, note_name, parse_note, parse_sequence,
                       steps_to_events, track_summary)


def build_schedule(events, mapping="split", split=MIDDLE_C, left_ch=NAV_LEFT_CH, right_ch=NAV_RIGHT_CH,
                   right_track=None, left_track=None, hand="both", velocity=None):
    """-> [(seconds, mido.Message), ...] sorted, note_offs before note_ons at equal times."""
    out = []
    for e in events:
        if mapping == "track":
            h = "right" if e.track == right_track else "left" if e.track == left_track else None
        else:
            h = hand_of(e.note, split)
        if h is None or (hand != "both" and h != hand):
            continue
        chn = e.channel if mapping == "keep" else ch0(right_ch if h == "right" else left_ch)
        vel = velocity if velocity else max(1, min(127, e.velocity))
        out.append((e.time, mido.Message("note_on", channel=chn, note=e.note, velocity=vel)))
        out.append((e.time + max(e.duration, 0.05),
                    mido.Message("note_off", channel=chn, note=e.note, velocity=0)))
    out.sort(key=lambda p: (p[0], 0 if p[1].type == "note_off" else 1))
    return out


def play(out, schedule, speed=1.0, loop=False):
    channels = {m.channel for _, m in schedule}
    try:
        while True:
            start = time.perf_counter()
            for t, msg in schedule:
                target = start + t / speed
                while True:
                    d = target - time.perf_counter()
                    if d <= 0:
                        break
                    time.sleep(min(d, 0.005))
                out.send(msg)
            if not loop:
                break
    except KeyboardInterrupt:
        print("\nstopped")
    finally:
        all_notes_off(out, channels)


def probe(out, note=MIDDLE_C, seconds=1.0):
    print("Watch the keyboard. %s plays on each channel for %.1fs - note which channels LIGHT the key."
          % (note_name(note), seconds))
    for human in range(1, 17):
        print("  channel %2d ..." % human, flush=True)
        out.send(mido.Message("note_on", channel=ch0(human), note=note, velocity=100))
        time.sleep(seconds)
        out.send(mido.Message("note_off", channel=ch0(human), note=note, velocity=0))
        time.sleep(0.4)
    print("Done. Channels that lit are the navigate channels (Casio default: 3 = left hand, 4 = right).")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("midi", nargs="?", help="MIDI file to play")
    ap.add_argument("--probe", action="store_true", help="play one note on channels 1..16 to find the navigate channels")
    ap.add_argument("--note", help="send one test note (e.g. C4) and exit")
    ap.add_argument("--notes", help='play a text sequence instead of a file, e.g. "C4 E4+G4 C5"')
    ap.add_argument("--step", type=float, default=0.5, help="seconds per step for --notes (default 0.5)")
    ap.add_argument("--channel", type=int, default=NAV_RIGHT_CH, help="1-based channel for --note (default 4)")
    ap.add_argument("--map", choices=("split", "track", "keep"), default="split",
                    help="split: hands by --split pitch; track: --right-track/--left-track; keep: original channels")
    ap.add_argument("--split", default="C4", help="first note of the right hand for --map split (default C4)")
    ap.add_argument("--right-track", type=int)
    ap.add_argument("--left-track", type=int)
    ap.add_argument("--left-ch", type=int, default=NAV_LEFT_CH, help="1-based left-hand navigate channel (default 3)")
    ap.add_argument("--right-ch", type=int, default=NAV_RIGHT_CH, help="1-based right-hand navigate channel (default 4)")
    ap.add_argument("--hand", choices=("both", "left", "right"), default="both")
    ap.add_argument("--speed", type=float, default=1.0, help="1.0 = as written, 0.5 = half speed")
    ap.add_argument("--velocity", type=int, help="force one velocity for every note (1..127)")
    ap.add_argument("--loop", action="store_true")
    ap.add_argument("--info", action="store_true", help="describe the file's tracks and exit")
    ap.add_argument("--dry-run", action="store_true", help="print the schedule instead of sending it")
    ap.add_argument("--port", default=PORT_NEEDLE, help="substring of the output port (default CASIO)")
    a = ap.parse_args()

    if a.info:
        if not a.midi:
            ap.error("--info needs a MIDI file")
        for t in track_summary(a.midi):
            print("track %d %-20r notes=%-5d channels=%-10s range=%s..%s"
                  % (t["track"], t["name"], t["notes"], t["channels"], t["low"], t["high"]))
        return 0

    schedule = None
    events = None
    if a.midi:
        if a.map == "track" and a.right_track is None and a.left_track is None:
            ap.error("--map track needs --right-track and/or --left-track (see --info)")
        events = load_midi_notes(a.midi)
    elif a.notes:
        events = steps_to_events(parse_sequence(a.notes), a.step)
    if events is not None:
        schedule = build_schedule(events, a.map, parse_note(a.split), a.left_ch, a.right_ch,
                                  a.right_track, a.left_track, a.hand, a.velocity)
        if not schedule:
            print("nothing to play after filtering")
            return 1
        print("%d notes over %.1fs -> channels %s" % (
            len(schedule) // 2, schedule[-1][0] / a.speed,
            sorted({ch1(m.channel) for _, m in schedule})))
        if a.dry_run:
            for t, msg in schedule:
                print("%8.3f  %s" % (t / a.speed, msg))
            return 0
    elif not (a.probe or a.note):
        ap.error("give a MIDI file, --notes, --probe or --note")

    port = find_port(mido.get_output_names(), a.port)
    if not port:
        print("no output port matching %r. Available: %s" % (a.port, mido.get_output_names()))
        return 1
    print("output: %r" % port)
    with mido.open_output(port) as out:
        if a.probe:
            probe(out)
        elif a.note:
            n = parse_note(a.note)
            print("%s on channel %d for 1s" % (note_name(n), a.channel))
            out.send(mido.Message("note_on", channel=ch0(a.channel), note=n, velocity=100))
            time.sleep(1.0)
            out.send(mido.Message("note_off", channel=ch0(a.channel), note=n, velocity=0))
        else:
            play(out, schedule, a.speed, a.loop)
    return 0


if __name__ == "__main__":
    sys.exit(main())
