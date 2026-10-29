import type { Lesson, Note, Position, Progress, Round } from "./contracts";
import { LESSONS } from "./lessons";
import { noteAt } from "./music";

function shuffle<T>(items: T[]): T[] {
  return items
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((entry) => entry.item);
}
export function createRound(lesson: Lesson): Round {
  if (lesson.notes.length === 0 || lesson.notes.length > 8)
    throw new Error("Lessons need one to eight notes");
  const queue: Note[] = [];
  while (queue.length < 8)
    queue.push(...shuffle(lesson.notes).slice(0, 8 - queue.length));
  return {
    mode: "lesson",
    lessonId: lesson.id,
    maxFret: lesson.maxFret,
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
export function help(
  round: Round,
  progress: Progress,
): { round: Round; progress: Progress } {
  const note = round.queue[round.index];
  if (round.status !== "asking" || !note) return { round, progress };
  return {
    round: {
      ...round,
      assisted: true,
      streak: 0,
      feedback: `Look for ${note.name}. Its label is showing on the neck.`,
    },
    progress: { ...progress, mastery: { ...progress.mastery, [note.id]: 0 } },
  };
}
export function answer(
  round: Round,
  position: Position,
  progress: Progress,
): { round: Round; progress: Progress } {
  const note = round.queue[round.index];
  const lesson =
    round.mode === "lesson"
      ? LESSONS.find((item) => item.id === round.lessonId)
      : undefined;
  if (
    round.status !== "asking" ||
    !note ||
    (round.mode === "lesson" && !lesson) ||
    position.fret < 0 ||
    position.fret > round.maxFret
  )
    return { round, progress };
  if (noteAt(position).midi !== note.midi) {
    const mistakes = round.mistakes + 1;
    const queue = [...round.queue];
    const later = queue.slice(round.index + 1);
    if (!later.some((item) => item.id === note.id)) {
      const replacement = queue.findIndex(
        (item, index) =>
          index > round.index &&
          queue.some(
            (other, otherIndex) => otherIndex < index && other.id === item.id,
          ),
      );
      if (replacement !== -1) queue[replacement] = note;
    }
    return {
      round: {
        ...round,
        queue,
        mistakes,
        assisted: true,
        streak: 0,
        feedback:
          mistakes >= 2
            ? "Need a hand? Tap A little help to reveal the note."
            : "Try another position. You can take your time.",
      },
      progress: { ...progress, mastery: { ...progress.mastery, [note.id]: 0 } },
    };
  }
  const clean = !round.assisted && round.mistakes === 0;
  const streak = clean ? round.streak + 1 : 0;
  const mastery = {
    ...progress.mastery,
    [note.id]: clean
      ? Math.min(3, (progress.mastery[note.id] ?? 0) + 1)
      : (progress.mastery[note.id] ?? 0),
  };
  const index =
    round.mode === "lesson"
      ? LESSONS.findIndex((item) => item.id === round.lessonId)
      : -1;
  const unlocked = lesson && round.mode === "lesson" && lesson.notes.every((item) => (mastery[item.id] ?? 0) >= 3)
    ? Math.max(progress.unlocked, Math.min(LESSONS.length - 1, index + 1))
    : progress.unlocked;
  return {
    round: {
      ...round,
      status: "correct",
      streak,
      bestStreak: Math.max(round.bestStreak, streak),
      cleanAnswers: round.cleanAnswers + Number(clean),
      feedback: clean ? "Yes! You found it." : "You found it. Keep going!",
    },
    progress: { ...progress, mastery, unlocked },
  };
}
export function next(
  round: Round,
  progress: Progress,
): { round: Round; progress: Progress } {
  if (round.status !== "correct") return { round, progress };
  if (round.index === round.queue.length - 1)
    return {
      round: { ...round, status: "complete" },
      progress: { ...progress, rounds: progress.rounds + 1 },
    };
  return {
    round: {
      ...round,
      index: round.index + 1,
      status: "asking",
      assisted: false,
      mistakes: 0,
      feedback: "",
    },
    progress,
  };
}
