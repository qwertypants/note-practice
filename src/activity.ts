import type { Progress } from "./contracts";
import type { Activity, SavedActivity } from "./learning-contracts";
import { LESSONS } from "./lessons";
import { positionsFor } from "./music";
import { recordOutcome, retentionDays, retryMissedNote } from "./learning";
import { MELODIES } from "./melodies";

export function restoreActivity(saved: SavedActivity | null | undefined): Activity | null {
  if (!saved) return null;
  const available = LESSONS.flatMap(lesson => lesson.notes);
  const notes = saved.noteIds.flatMap(id => {
    const note = available.find(note => note.id === id);
    return note ? [note] : [];
  });
  if (notes.length !== saved.noteIds.length || notes.some(note => positionsFor(note, saved.maxFret).length === 0)) return null;
  if (saved.kind === "melody" && !MELODIES.some(melody => melody.id === saved.melodyId && melody.maxFret === saved.maxFret &&
    melody.noteIds.join(",") === saved.noteIds.join(","))) return null;
  return {...saved, notes, status: saved.answered[saved.index] ? "correct" : "asking", feedback: "Continue where you left off."};
}
export function saveActivity(activity: Activity): SavedActivity | null {
  if (activity.status === "complete") return null;
  const {notes, status: _status, feedback: _feedback, ...saved} = activity;
  return {...saved, noteIds: notes.map(note => note.id)};
}
export function answerActivity(activity: Activity, midi: number, progress: Progress, now: number): {activity: Activity; progress: Progress} {
  const target = activity.notes[activity.index];
  if (!target || activity.status !== "asking" || activity.answered[activity.index] || !Number.isInteger(midi)) return {activity, progress};
  const correct = midi === target.midi;
  const clean = correct && !activity.assisted[activity.index] && !activity.mistakes[activity.index];
  const outcome = {noteId: target.id, sessionId: activity.sessionId, clean, now};
  const remembered = retentionDays(progress.learning ?? {}, outcome);
  const learning = recordOutcome(progress.learning ?? {}, outcome);
  const atCurrent = (flags: boolean[], flag: boolean) => flags.map((old, index) => index === activity.index ? flag : old);
  let updated: Activity = {...activity,
    answered: atCurrent(activity.answered, correct),
    assisted: atCurrent(activity.assisted, !clean),
    mistakes: atCurrent(activity.mistakes, !correct || activity.mistakes[activity.index] === true),
    status: correct ? "correct" : "asking",
    retentionDays: Math.max(activity.retentionDays, remembered),
    feedback: correct ? clean ? "Yes! You found it." : "You found it. Keep going!" : "Try another note. Take your time.",
  };
  if (!correct && activity.kind === "daily") updated = retryMissedNote(updated);
  // Activity practice builds note familiarity; only lessons unlock further lessons.
  const mastery = {...progress.mastery, [target.id]: clean ? Math.min(3, (progress.mastery[target.id] ?? 0) + 1) : 0};
  return {activity: updated, progress: {...progress, mastery, learning}};
}
