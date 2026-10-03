# Casio LK-175: hardware facts and the lighted-key mechanism

What is known about the keyboard this hub is built around, with how each fact was established.
"Verified" means observed on this unit; "documented" means it comes from Casio material and still needs the
probe in lesson 00.

## Connection (verified 2026-09-04/05)

Class-compliant USB MIDI, no driver. Windows enumerates it as `CASIO USB-MIDI` (`USB\VID_07CF&PID_6803`).

| Port | Direction | Status |
|---|---|---|
| `CASIO USB-MIDI 1` | keyboard to PC | verified: 41 notes captured, D3 to B5 |
| `CASIO USB-MIDI 2` | PC to keyboard | verified: played back "clean and clear" through the speakers |

Notes sent to it on channels 1, 2 and 10 were all audible in the same test, so the receive channel is not a
constraint for *sound*. Lighting is a different matter, see below.

## Fixed velocity (verified)

Every key reports velocity 100. The LK-175's keys are not touch-sensitive, so no dynamics (soft versus loud)
data exists. This rules out dynamics feedback and nothing else: note choice, timing, evenness, range and the
left/right split are real and are where a beginner's practice value is.

## Lighted keys from the PC (verified 2026-10-03)

**Verified on this unit:** with factory settings and no menu change, notes sent from the PC on channel 4
(C4) and channel 3 (E3) made the keys light. That is the whole mechanism `light_keys.py` and
`snippet_trainer.py` rely on, and it works. Still open: whether channels other than 3 and 4 also light
(run `light_keys.py --probe` and watch), and whether a very low velocity still lights.

The LK series lights a key when it **receives a note message on one of its navigate channels**. Casio's
wording for the current LK-S245 (user's guide, settings list, page EN-38 of the English PDF):

> MIDI IN Navigate: Navigate function that causes the Key Light function to be controlled by MIDI IN note
> messages. Options: Off, Listen, Right Hand Off, Left Hand Off, BothHand Off.
>
> MIDI IN Navigate Right-hand Channel: Changes the channel of the note message that operates as the
> right-hand melody for the navigate function. 1 to 16.
>
> MIDI IN Navigate Left-hand Channel: Changes the channel of the note message that operates as the left-hand
> melody for the navigate function. 1 to 16.

Casio's FAQ for transferring songs to LK keyboards, and third-party summaries of it, give the defaults:
**right-hand part on channel 4, left-hand part on channel 3.** Keyboard-forum reports on other LK models
(for example an LK-215) confirm that the keyboard lights keys from real-time MIDI IN once the navigation
channel points at the right track, and that files on an SD card are more limited than notes arriving over MIDI.

What this means for the tools: `light_keys.py` moves every note onto channel 3 (left hand) or 4 (right hand)
before sending it, and `snippet_trainer.py` lights the next step the same way. Both take `--left-ch/--right-ch`
in case this unit differs.

**Open questions for the LK-175 specifically** (a 2014 model; its own guide could not be fetched online, and
the retailer summaries only cover Keylight On/Off):
1. ~~Does it light MIDI IN notes on 3/4 with no menu change?~~ **Yes** (2026-10-03).
2. Do channels other than 3 and 4 light too? (`light_keys.py --probe`, watch all 16.)
3. Does a very low velocity (the trainer uses 20 so the hint note is quiet) still light the key?
4. Does the LK-175 flash the *next* key the way the LK-S245 lesson mode does, or only light the current one?

Record the answers in `lessons/00-first-contact/README.md` and update this section.

## Speakers silent (2026-10-03)

After the keyboard was run from the wrong power adapter, the built-in speakers produce no sound, while USB
MIDI, key lighting and the main board all work. The correct adapter for the LK-175 is Casio's
**AD-E95100L (9.5 V DC)**; the keyboard also runs on 6 AA batteries, which is the cleanest way to rule the
adapter out. Triage order:

1. **Batteries in, adapter out, volume up.** If sound returns, the adapter (or what it did to the power
   stage) is the problem, not the amp.
2. **Headphones in the PHONES/OUTPUT jack.** Sound in the phones but not the speakers means the speaker amp or
   the speakers themselves are gone; the sound engine is fine, and practice can continue on headphones or an
   external speaker on that jack.
3. **No sound anywhere** means the audio stage after the sound generator is damaged. MIDI is unaffected: the
   PC can still light keys and record playing, and a software synth (`--port "Microsoft GS"` in the tools, or
   any DAW) can produce the sound from the keyboard's MIDI output instead.

Keyboard-to-PC note traffic was not re-confirmed on 2026-10-03. Four listening windows (45 s, 120 s, 60 s,
and a 30 s raw count of every message type) saw **nothing at all**, but nobody was confirmed to be pressing
keys during them. Two useful negatives came out of it: the LK-175 sends **no Active Sensing** and does **not
echo** incoming notes back out (no soft-thru), so there is no key-press-free way to prove the input leg. A MIDI
Identity Request also got no reply. First thing next session: `midi_ports.py --watch`, press one key, and
you have the answer in a second.

## Library notes

`mido` 1.3 + `python-rtmidi` 1.5 (RtMidi 5.0) in this repo's own `venv` (Python 3.11). `mido` has no
`__version__` attribute, so don't probe it. Enumerate with `mido.get_input_names()` and match on `CASIO`;
when the keyboard is unplugged, other devices (a Loupedeck Live) still appear.

## A gotcha that wasted two runs

A fixed-window listener reports "0 notes" both when the pipe is broken and when nobody happened to play
during the window. Use an open-ended watcher that waits for activity and ends on a quiet gap, so there is no
window to miss. `practice_log.py` already does this: a session boundary is a silence gap, not a timer.

## Sources

- Casio LK-S245 User's Guide (EN), settings list and "Key Light Function":
  https://www.casio.com/content/dam/casio/global/support/manuals/electronic-musical-instruments/pdf/2022/lk-s245/LKS245_usersguide_EN.pdf
- Casio FAQ, "If I transfer a song from my computer to a LK series keyboard, how can I set it up to light the keys?":
  https://www.casio.com/intl/support/electronic-musical-instruments/faq/article/01/09/69/19/
- Keyboard Forums thread on an LK-215 not lighting from external MIDI until the navigation channel was set:
  https://www.keyboardforums.com/threads/keys-dont-light-up-keyboard-does-not-wait-when-using-midi-with-learning-mode.24527/
- LK-175 user's guide listings (Keylight On/Off in FUNCTION, GM Level 1): https://www.manua.ls/casio/lk-175/manual
