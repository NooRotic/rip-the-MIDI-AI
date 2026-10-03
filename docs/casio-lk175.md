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

## Lighted keys from the PC (documented, not yet verified on this unit)

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
1. Does it light MIDI IN notes on 3/4 with no menu change, or is there a FUNCTION item (older LK models call
   it "Navi. Ch") that must be set?
2. Does a very low velocity (we use 20 for the trainer, so the hint note is quiet) still light the key?
3. Does the LK-175 flash the *next* key the way the LK-S245 lesson mode does, or only light the current one?

Procedure to close them: `venv\Scripts\python.exe keyboard\light_keys.py --probe`, watch which channels light
middle C, then `--note C4 --channel 4 --velocity 20` style tests. Record the answers in
`lessons/00-first-contact/README.md` and update this section.

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
