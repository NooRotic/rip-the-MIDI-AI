# Lesson 01: the "Wu-Tang / Underdog" snippet

**Identified 2026-10-02.** The passage is the main loop of **Wu-Tang Clan, "Wu-Tang Clan Ain't Nuthing ta
F' Wit"** (*Enter the Wu-Tang (36 Chambers)*, 1993). RZA built the beat on the theme from the 1960s
*Underdog* cartoon, which is why it reads as "the Underdog snippet".

References, in the order to use them:
1. Official video, the loop starts right at 0:10: https://youtu.be/HnOZea4Zgbc?t=10
2. A remake short, the figure played on a 25-key controller: https://www.youtube.com/shorts/lPKyzIIjSAg
3. "Enter the Wu-Tang 36 Chambers Piano Mix", a piano arrangement of the album (the perfect example):
   https://www.youtube.com/watch?v=a0KWmCS4hbU

## What is known
- Published chord charts put the *Underdog* theme in **F minor** (Fm, C7, Bb for the verse figure;
  [songsterr](https://www.songsterr.com/a/wsa/misc-cartoons-underdog-theme-chords-s220994)). RZA's sample may
  be pitched, so treat that as a starting neighbourhood, not the answer.
- The loop is a short figure, about two bars, that repeats for the whole track. It sits in one hand.
- **The exact pitches are not written down anywhere we found, and video frames do not show them.** They
  get captured by ear in step 1 below. Nothing in this repo guesses them.

## Step 1: capture it by ear (dashboard, 20 minutes)
1. `cd web && npm run dev`, open the page in Chrome or Edge, allow MIDI, go to the **Keyboard** tab.
2. Play reference 1 from 0:10 on loop. Hunt for the first note on the keyboard: the dashboard shows every key
   you press, so you can see what you are trying.
3. Once the first note is right, find the rest one at a time. Start in the F minor area: F, Ab, Bb, C, Eb.
4. Play the whole figure slowly, twice, cleanly. The **Capture** card shows the last 64 notes as
   `C4 E4+G4 ...`. Press **Copy for --notes**.
5. Audition it with the keys lighting, against the video:
   ```
   venv\Scripts\python.exe keyboard\light_keys.py --notes "<paste>" --step 0.4 --loop
   ```
   Adjust, re-capture, repeat until it matches.
6. Save the final string to `songs/wu-tang--aint-nuthing-ta-f-wit--riff.notes.txt` (gitignored, it is
   copyrighted music) and paste it into the journal at the bottom.

## Step 2: drill it (trainer)
```
# the whole figure, wait mode, lights on
venv\Scripts\python.exe keyboard\snippet_trainer.py --notes "<riff>" --name underdog --loops 5

# if it has more than ~8 steps, drill halves first
venv\Scripts\python.exe keyboard\snippet_trainer.py --notes "<riff>" --count 4 --name underdog-a --loops 5
venv\Scripts\python.exe keyboard\snippet_trainer.py --notes "<riff>" --start 4 --name underdog-b --loops 5
```
Gate: three clean runs in a row before speeding up. The **Trainer** tab shows best and latest accuracy per name.

## Step 3: tempo
Once clean at the trainer's pace, play along with the video. The dashboard's live notes/min tells you how far
off the record you are; the practice logger's timing spread tells you how even it was.

## Fingering hint
A one-hand riff in F minor usually sits with the thumb on F or C and the figure under the first three or four
fingers. Decide the fingering once, in step 1, and write it next to the notes below. Changing fingering later
is the single biggest cause of "I had it yesterday".

## Journal
| date | notes string / fingering | result |
|---|---|---|
| | | |
