import pytest

from light_keys import build_schedule
from midi_core import NoteEvent
from snippet_trainer import StepScorer

EVENTS = [
    NoteEvent(0.0, 48, 70, 0.5, channel=0, track=1),   # left hand (below C4)
    NoteEvent(0.0, 72, 90, 0.5, channel=0, track=2),   # right hand
    NoteEvent(0.5, 64, 80, 0.5, channel=5, track=2),
]


def _ons(schedule):
    return [(round(t, 3), m.channel + 1, m.note, m.velocity) for t, m in schedule if m.type == "note_on"]


def test_split_mapping_puts_hands_on_navigate_channels():
    s = build_schedule(EVENTS)
    assert _ons(s) == [(0.0, 3, 48, 70), (0.0, 4, 72, 90), (0.5, 4, 64, 80)]
    # note_offs at 0.5 sort before the note_on at 0.5
    at_half = [m.type for t, m in s if round(t, 3) == 0.5]
    assert at_half == ["note_off", "note_off", "note_on"]


def test_track_mapping_and_hand_filter():
    s = build_schedule(EVENTS, mapping="track", right_track=2, left_track=1, hand="right", velocity=10)
    assert _ons(s) == [(0.0, 4, 72, 10), (0.5, 4, 64, 10)]
    assert build_schedule(EVENTS, mapping="track", right_track=9) == []


def test_keep_mapping_preserves_channels():
    assert [c for _, c, _, _ in _ons(build_schedule(EVENTS, mapping="keep"))] == [1, 1, 6]


def test_minimum_note_length():
    s = build_schedule([NoteEvent(1.0, 60, 100, 0.0, 0, 0)])
    assert [round(t, 3) for t, _ in s] == [1.0, 1.05]


def test_step_scorer_flow():
    sc = StepScorer([[60], [67, 64]])
    assert sc.target == [60]
    sc.begin(10.0)
    assert sc.press(60, 10.4) == "complete"
    assert sc.target == [64, 67]
    sc.begin(11.0)
    assert sc.press(64, 11.2) == "hit"
    assert sc.press(99, 11.3) == "wrong"
    assert sc.press(64, 11.35) == "hit"          # re-pressing a held note is not wrong
    assert sc.press(67, 11.5) == "complete"
    assert sc.done and sc.press(60, 12.0) == "done"
    s = sc.summary()
    assert s["steps"] == 2 and s["completed"] == 2 and s["clean_steps"] == 1
    assert s["accuracy_pct"] == 50 and s["wrong_notes"] == 1
    assert s["avg_seconds_per_step"] == 0.45
    assert s["slowest_steps"][0].startswith("step 2 E4+G4 0.5s")


def test_step_scorer_rejects_empty():
    with pytest.raises(ValueError):
        StepScorer([[]])
