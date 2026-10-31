import type { LessonSession, Progress } from "./contracts";
import { LESSONS } from "./lessons";
export const STORAGE_KEY = "note-practice:progress:v1";
export function emptyProgress(): Progress {
  return { version: 1, mastery: {}, unlocked: 0, rounds: 0, session: null };
}
function parseSession(value: unknown, unlocked: number): LessonSession | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Partial<LessonSession>;
  const lessonIndex = LESSONS.findIndex((lesson) => lesson.id === candidate.lessonId);
  const lesson = LESSONS[lessonIndex];
  if (
    !lesson || lessonIndex > unlocked || !Array.isArray(candidate.queue) ||
    candidate.queue.length !== 8 || !Array.isArray(candidate.answered) ||
    candidate.answered.length !== 8 ||
    !candidate.queue.every((id) => typeof id === "string" && lesson.notes.some((note) => note.id === id)) ||
    !candidate.answered.every((answered) => typeof answered === "boolean") ||
    typeof candidate.index !== "number" || !Number.isInteger(candidate.index) ||
    candidate.index < 0 || candidate.index > 7 ||
    typeof candidate.cleanAnswers !== "number" || !Number.isInteger(candidate.cleanAnswers) ||
    candidate.cleanAnswers < 0 || candidate.cleanAnswers > 8 ||
    typeof candidate.bestStreak !== "number" || !Number.isInteger(candidate.bestStreak) ||
    candidate.bestStreak < 0 || candidate.bestStreak > candidate.cleanAnswers
  ) return null;
  return {
    lessonId: lesson.id,
    queue: candidate.queue as string[],
    answered: candidate.answered as boolean[],
    index: candidate.index,
    cleanAnswers: candidate.cleanAnswers,
    bestStreak: candidate.bestStreak,
  };
}
function parse(value: unknown): Progress {
  const result = emptyProgress();
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    value.version !== 1
  )
    return result;
  if (
    "unlocked" in value &&
    typeof value.unlocked === "number" &&
    Number.isFinite(value.unlocked)
  )
    result.unlocked = Math.max(
      0,
      Math.min(LESSONS.length - 1, Math.floor(value.unlocked)),
    );
  if (
    "rounds" in value &&
    typeof value.rounds === "number" &&
    Number.isFinite(value.rounds)
  )
    result.rounds = Math.max(
      0,
      Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value.rounds)),
    );
  if (
    "mastery" in value &&
    typeof value.mastery === "object" &&
    value.mastery !== null
  ) {
    const validIds = new Set(
      LESSONS.flatMap((lesson) => lesson.notes.map((note) => note.id)),
    );
    for (const [id, count] of Object.entries(value.mastery)) {
      if (
        validIds.has(id) &&
        typeof count === "number" &&
        Number.isFinite(count)
      )
        result.mastery[id] = Math.max(0, Math.min(3, Math.floor(count)));
    }
  }
  result.session = parseSession("session" in value ? value.session : null, result.unlocked);
  return result;
}
export function loadProgress(): { progress: Progress; persistent: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let value: unknown = null;
    if (raw !== null) {
      try {
        value = JSON.parse(raw);
      } catch {
        value = null;
      }
    }
    return { progress: parse(value), persistent: true };
  } catch {
    return { progress: emptyProgress(), persistent: false };
  }
}
export function saveProgress(progress: Progress): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parse(progress)));
    return true;
  } catch {
    return false;
  }
}
