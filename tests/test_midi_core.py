import mido
import pytest

from midi_core import (NAV_LEFT_CH, NAV_RIGHT_CH, ch0, ch1, group_steps, hand_of, load_midi_notes,
                       nav_channel, note_name, parse_note, parse_sequence, track_summary)


@pytest.mark.parametrize("token,expected", [
    ("C4", 60), ("c4", 60), ("C-1", 0), ("G9", 127), ("F#3", 54), ("Bb2", 46), ("A0", 21), ("60", 60),
])
def test_parse_note(token, expected):
    assert parse_note(token) == expected


@pytest.mark.parametrize("bad", ["H4", "C", "C10", "128", "-1", "", "C#"])
def test_parse_note_rejects(bad):
    with pytest.raises(ValueError):
        parse_note(bad)


def test_note_name_roundtrip():
    for n in range(128):
        assert parse_note(note_name(n)) == n
    assert note_name(60) == "C4" and note_name(21) == "A0" and note_name(108) == "C8"


def test_parse_sequence():
    assert parse_sequence("C4 E4+G4, C5") == [[60], [64, 67], [72]]
    assert parse_sequence("  G4+E4+G4 ") == [[64, 67]]
    assert parse_sequence("") == []


def test_channels():
    assert ch0(1) == 0 and ch0(16) == 15 and ch1(3) == 4
    with pytest.raises(ValueError):
        ch0(0)
    assert hand_of(59) == "left" and hand_of(60) == "right"
    assert nav_channel(48) == NAV_LEFT_CH - 1
    assert nav_channel(72) == NAV_RIGHT_CH - 1


def _two_track_file(path):
    """Track 0: tempo 120 then 60 bpm at beat 2. Track 1: C4 beat 0-1, E4 beat 2-3, chord at beat 4."""
    mid = mido.MidiFile(ticks_per_beat=480)
    t0, t1 = mido.MidiTrack(), mido.MidiTrack()
    mid.tracks += [t0, t1]
    t0.append(mido.MetaMessage("track_name", name="tempo"))
    t0.append(mido.MetaMessage("set_tempo", tempo=500000, time=0))
    t0.append(mido.MetaMessage("set_tempo", tempo=1000000, time=960))
    t1.append(mido.MetaMessage("track_name", name="melody"))
    t1.append(mido.Message("note_on", note=60, velocity=90, channel=0, time=0))
    t1.append(mido.Message("note_off", note=60, velocity=0, channel=0, time=480))
    t1.append(mido.Message("note_on", note=64, velocity=80, channel=0, time=480))
    t1.append(mido.Message("note_on", note=64, velocity=0, channel=0, time=480))   # running-status style off
    t1.append(mido.Message("note_on", note=48, velocity=70, channel=1, time=480))
    t1.append(mido.Message("note_on", note=55, velocity=70, channel=1, time=0))
    t1.append(mido.Message("note_off", note=48, velocity=0, channel=1, time=240))
    t1.append(mido.Message("note_off", note=55, velocity=0, channel=1, time=0))
    mid.save(str(path))
    return path


def test_load_midi_notes_honours_tempo_changes(tmp_path):
    ev = load_midi_notes(_two_track_file(tmp_path / "t.mid"))
    assert [(e.note, round(e.time, 3), round(e.duration, 3)) for e in ev] == [
        (60, 0.0, 0.5),      # 1 beat at 120 bpm
        (64, 1.0, 1.0),      # starts at beat 2 (1.0s), 1 beat at 60 bpm
        (48, 3.0, 0.5),      # beat 4 -> 1.0 + 2 beats at 60 bpm = 3.0s; half a beat long
        (55, 3.0, 0.5),
    ]
    assert {e.track for e in ev} == {1}
    assert ev[0].velocity == 90 and ev[2].channel == 1


def test_group_steps_and_summary(tmp_path):
    ev = load_midi_notes(_two_track_file(tmp_path / "t.mid"))
    steps = group_steps(ev)
    assert [[e.note for e in s] for s in steps] == [[60], [64], [48, 55]]
    summary = track_summary(tmp_path / "t.mid")
    assert summary[0]["notes"] == 0 and summary[1] == {
        "track": 1, "name": "melody", "notes": 4, "channels": [1, 2], "low": "C3", "high": "E4"}
