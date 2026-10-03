# Lesson 00: First contact

**Goal:** prove the whole loop works end to end. Keyboard to PC, PC to keyboard, keys light on command,
and a nine-note warm-up gets scored. About fifteen minutes.

## 1. Plug in and check both legs
```
venv\Scripts\python.exe keyboard\midi_ports.py
```
Expect `CASIO USB-MIDI 1` (input) and `CASIO USB-MIDI 2` (output). If only the Loupedeck shows up,
the keyboard is off or the cable is out.

Then add `--watch` and press a few keys: every note should report `vel=100` (the LK-175 is not
touch-sensitive) on channel 1.

## 2. Find the navigate channels
```
venv\Scripts\python.exe keyboard\light_keys.py --probe
```
Middle C plays for one second on each channel 1 to 16. Write down which channels made the key LIGHT
(not just sound). Casio's default is 3 (left hand) and 4 (right hand). If nothing lights, check the
FUNCTION menu for a Keylight = ON setting and see `docs/casio-lk175.md`.

Result: **2026-10-03: C4 on channel 4 and E3 on channel 3, sent from the PC with factory settings, lit the
keys.** The full 1..16 probe has not been run yet, so whether other channels also light is unknown.
Speakers were silent (see `docs/casio-lk175.md`, "Speakers silent"); headphone test pending.

## 3. Five-finger warm-up with the trainer
```
venv\Scripts\python.exe keyboard\snippet_trainer.py --notes "C4 D4 E4 F4 G4 F4 E4 D4 C4" --name five-finger --loops 3
```
Right hand, thumb on C4, one finger per key, no thumb-crossing. The lit key is the next note and the
trainer waits for you. Aim for all nine clean first, then speed.

Then the same with the left hand, pinky on C3:
```
venv\Scripts\python.exe keyboard\snippet_trainer.py --notes "C3 D3 E3 F3 G3 F3 E3 D3 C3" --name five-finger-lh --loops 3
```

## 4. Leave the logger running while you noodle
```
venv\Scripts\python.exe keyboard\practice_log.py
```
It only records once you have played 20+ notes over 30+ seconds, so free play is captured as a session
without pressing anything.

## Notes
(what happened, what felt hard, what to change)
