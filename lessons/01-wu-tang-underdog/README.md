# Lesson 01: the "Wu-Tang / Underdog" snippet

**Status: the snippet still has to be identified.** Searches of every memory bank and transcript on
2026-10-02 found no earlier conversation about it, so nothing here is guessed. Fill in section 1 and the
rest of the lesson is ready to run.

## 1. Identify the passage (you)
- Song / artist: ___
- Where in the track (mm:ss to mm:ss): ___
- A reference recording or video link: ___
- Which hand(s) and roughly how many bars: ___

## 2. Get it into MIDI (us, together)
Options, cheapest first:
1. **Transcribe by ear with the trainer's text notation.** For a short hook this is usually 8 to 16 notes:
   `--notes "G3 Bb3 C4 ..."`. No file needed. We iterate on the string until it sounds right through
   `light_keys.py --note`.
2. **Hand-write a MIDI file** from the transcription (a tiny mido script) into
   `songs/<artist>--<title>--<part>.mid`. Gitignored, because the music is copyrighted.
3. **Find an existing MIDI** of the song and cut the bars we want with `light_keys.py --info` plus
   `snippet_trainer.py --start/--count`. Check the file's hand split with `--map track` versus `--map split`.

## 3. Learn it
```
# hear it and watch the keys light, slowly
venv\Scripts\python.exe keyboard\light_keys.py songs\<file>.mid --speed 0.5 --loop

# drill the first four steps, right hand, until clean
venv\Scripts\python.exe keyboard\snippet_trainer.py songs\<file>.mid --hand right --count 4 --name underdog-rh --loops 5

# extend: next four, then all eight; then left hand; then both
venv\Scripts\python.exe keyboard\snippet_trainer.py songs\<file>.mid --hand right --start 4 --count 4 --name underdog-rh
```
Rule of thumb from method books: a passage is learned when you can play it three times in a row clean
at half speed. Only then raise the speed.

## 4. Journal
| date | what | result |
|---|---|---|
| | | |
