import type { Note, Progress, Round } from "./contracts";
import { LESSONS } from "./lessons";

function unlockedNotes(progress: Progress) {
  const notes = new Map<string, { note: Note; maxFret: number }>();
  for (const lesson of LESSONS.slice(0, progress.unlocked + 1)) {
    for (const note of lesson.notes) {
      if (!notes.has(note.id))
        notes.set(note.id, { note, maxFret: lesson.maxFret });
    }
  }
  return [...notes.values()];
}

export function canReview(progress: Progress): boolean {
  return unlockedNotes(progress).some(({ note }) =>
    Object.hasOwn(progress.mastery, note.id),
  );
}

export function createReviewRound(progress: Progress): Round {
  const unlocked = unlockedNotes(progress);
  const weak = unlocked.filter(({ note }) => (progress.mastery[note.id] ?? 0) < 3);
  const pool = (weak.length ? weak : unlocked)
    .sort((a, b) => {
      const difference =
        (progress.mastery[a.note.id] ?? 0) - (progress.mastery[b.note.id] ?? 0);
      return difference || (a.note.id < b.note.id ? -1 : a.note.id > b.note.id ? 1 : 0);
    })
    .slice(0, 8);
  const queue: Note[] = [];
  while (queue.length < 8)
    queue.push(...pool.map(({ note }) => note).slice(0, 8 - queue.length));
  return {
    mode: "review",
    lessonId: null,
    maxFret: Math.max(...pool.map(({ maxFret }) => maxFret)),
    queue,
    index: 0,
    status: "asking",
    assisted: false,
    mistakes: 0,
    streak: 0,
    bestStreak: 0,
    cleanAnswers: 0,
    feedback: "",
  };
}
