r"""Is the keyboard plugged in? List MIDI ports, flag the Casio, optionally watch what it sends.

    venv\Scripts\python.exe keyboard\midi_ports.py            # list ports; exit 1 if no Casio
    venv\Scripts\python.exe keyboard\midi_ports.py --watch    # print every message the Casio sends

Use --watch to confirm hardware facts for yourself: the LK-175 reports velocity 100 for every key
(not touch sensitive) and sends on channel 1.
"""
import argparse
import sys
import time

import mido

from midi_core import PORT_NEEDLE, ch1, find_port, note_name


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--watch", action="store_true", help="print incoming messages until Ctrl-C")
    ap.add_argument("--port", default=PORT_NEEDLE, help="substring of the port to match (default: CASIO)")
    a = ap.parse_args()

    ins, outs = mido.get_input_names(), mido.get_output_names()
    print("INPUT  ports (instrument -> PC):")
    for p in ins or ["(none)"]:
        print("   ", p)
    print("OUTPUT ports (PC -> instrument):")
    for p in outs or ["(none)"]:
        print("   ", p)

    cin, cout = find_port(ins, a.port), find_port(outs, a.port)
    if not (cin and cout):
        print("\n%r NOT found on both legs - is the keyboard on and the USB cable in?" % a.port)
        return 1
    print("\n%s found:  IN=%r  OUT=%r" % (a.port, cin, cout))

    if a.watch:
        print("watching %r - play something; Ctrl-C to stop\n" % cin)
        try:
            with mido.open_input(cin) as inp:
                while True:
                    for msg in inp.iter_pending():
                        if msg.type in ("note_on", "note_off"):
                            print("%-8s ch%-2d %-4s vel=%d" % (msg.type, ch1(msg.channel),
                                                               note_name(msg.note), msg.velocity))
                        else:
                            print(msg)
                    time.sleep(0.002)
        except KeyboardInterrupt:
            print("\nstopped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
