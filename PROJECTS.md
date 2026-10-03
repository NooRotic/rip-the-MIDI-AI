# Related projects

The MIDI and music work that lives outside this repo, so there is one place to look.

| Project | Where | Relation to this hub |
|---|---|---|
| **ripTheMIDI** (private, 2026-09-10 to 09-11) | `github.com/NooRotic/ripTheMIDI`, local `R:\dev\ripTheMIDI` | The origin of this repo. `keyboard/practice_log.py` and the hardware notes came from here. Kept as a private archive; new work happens in this hub. |
| **wu-amv-research** (private) | `github.com/NooRotic/wu-amv-research` | Wu-Tang AMV research kit. Its `songs/structures.md` (who raps where, credits only) is the reference when picking which Wu-Tang passage to learn. |
| **project-wu-tang-forever** (public) | `github.com/NooRotic/project-wu-tang-forever` | Lyrics browser; the data source the AMV kit scores against. No audio or MIDI. |
| **RipTheStack** | `M:\dev\RipTheStack` | The streaming stack. Open idea: MIDI as a stream-overlay input (notes driving visuals or triggering scenes). That belongs in RipTheStack and would consume this repo's output, not live here. |
| **TASagentTwitchBot Audio.Midi plugin** | `M:\GitHub\TASagentTwitchBotDemos\...\TASagentTwitchBot.Plugin.Audio.Midi` | Third-party reference for a .NET MIDI plugin inside a Twitch bot. Useful if the overlay idea above ever gets built. |
| **Re-Infinity** (April 2026) | location not confirmed on this machine | SolidJS + Web Audio five-track mixer with VU meters. Audio, not MIDI, but the Web Audio notes there apply if a browser front-end with sound is built here. |

## Open-source building blocks we expect to use

Short list; the full survey with licences and activity status is in [docs/oss-landscape.md](docs/oss-landscape.md).

- [mido](https://github.com/mido/mido) + [python-rtmidi](https://github.com/SpotlightKid/python-rtmidi): what every tool here runs on.
- [OpenSheetMusicDisplay](https://github.com/opensheetmusicdisplay/opensheetmusicdisplay): MusicXML rendering in the browser with a cursor API.
- [webmidi.js](https://github.com/djipco/webmidi): Web MIDI in Chrome/Edge.
- [music21](https://github.com/cuthbertLab/music21) or [partitura](https://github.com/CPJKU/partitura): score analysis in Python.
- [PianoBooster](https://github.com/pianobooster/PianoBooster): zero-code wait-mode app with a CC-BY beginner course, as a bridge.
