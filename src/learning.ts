import type { Progress } from "./contracts";
import type { Activity, LearningHistory, LearningOutcome, LearningRecord, LearningSkill } from "./learning-contracts";
import { unlockedNotes } from "./review";

const DAY = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];

function recordFor(history: LearningHistory, outcome: LearningOutcome): LearningRecord | undefined {
  return history[outcome.skill]?.[outcome.noteId];
}

export function retentionDays(history: LearningHistory, outcome: LearningOutcome): number {
  const previous = recordFor(history, outcome);
  if (!outcome.clean || !Number.isFinite(outcome.now) || previous?.lastSessionId === outcome.sessionId ||
      previous?.lastSuccessAt === null || previous?.lastSuccessAt === undefined ||
      !Number.isFinite(previous.lastSuccessAt) || outcome.now < previous.lastSuccessAt)
    return 0;
  return Math.floor((outcome.now - previous.lastSuccessAt) / DAY);
}

export function recordOutcome(history: LearningHistory, outcome: LearningOutcome): LearningHistory {
  if (!Number.isFinite(outcome.now) || !outcome.noteId || !outcome.sessionId) return history;
  const previous = recordFor(history, outcome);
  const lastAttemptAt = Math.max(outcome.now, previous?.lastAttemptAt ?? outcome.now);
  let record: LearningRecord;
  if (!outcome.clean) {
    record = {
      lastAttemptAt,
      lastSuccessAt: previous?.lastSuccessAt ?? null,
      dueAt: lastAttemptAt + DAY,
      stage: 0,
      lastSessionId: outcome.sessionId,
    };
  } else {
    const canAdvance = previous?.lastSessionId !== outcome.sessionId &&
      (previous === undefined ||
        (outcome.now >= previous.lastAttemptAt && outcome.now >= previous.dueAt &&
         (previous.lastSuccessAt === null || outcome.now >= previous.lastSuccessAt)));
    const stage = canAdvance ? Math.min(5, (previous?.stage ?? 0) + 1) : (previous?.stage ?? 0);
    record = {
      lastAttemptAt,
      lastSuccessAt: canAdvance ? outcome.now : (previous?.lastSuccessAt ?? null),
      dueAt: canAdvance ? outcome.now + INTERVAL_DAYS[stage] * DAY : (previous?.dueAt ?? outcome.now + DAY),
      stage,
      lastSessionId: outcome.sessionId,
    };
  }
  return {
    ...history,
    [outcome.skill]: { ...history[outcome.skill], [outcome.noteId]: record },
  };
}

export function dailyDueCount(progress: Progress, now: number, skill: LearningSkill = "fretboard"): number {
  if (!Number.isFinite(now)) return 0;
  const records = progress.learning?.[skill] ?? {};
  return unlockedNotes(progress).filter(({ note }) => {
    const record = records[note.id];
    return record && Number.isFinite(record.dueAt) && record.dueAt <= now;
  }).length;
}

export function createDailyActivity(
  progress: Progress,
  now: number,
  sessionId: string,
  skill: LearningSkill = "fretboard",
): Activity | null {
  if (!Number.isFinite(now) || !sessionId) return null;
  const unlocked = unlockedNotes(progress);
  if (!unlocked.some(({ note }) => Object.hasOwn(progress.mastery, note.id) ||
      Object.hasOwn(progress.learning?.[skill] ?? {}, note.id))) return null;
  const records = progress.learning?.[skill] ?? {};
  const selected = unlocked.sort((a, b) => {
    const aRecord = records[a.note.id];
    const bRecord = records[b.note.id];
    const rank = (record: LearningRecord | undefined, id: string) => {
      if (record && record.dueAt <= now) return 0;
      const hasMastery = skill === "fretboard" && Object.hasOwn(progress.mastery, id);
      if (!record && !hasMastery) return 3;
      const weak = skill === "pitch"
        ? (record?.stage ?? 3) < 3
        : (hasMastery && progress.mastery[id] < 3) || (record?.stage ?? 3) < 3;
      return weak ? 1 : 2;
    };
    const rankDifference = rank(aRecord, a.note.id) - rank(bRecord, b.note.id);
    if (rankDifference) return rankDifference;
    if (aRecord && bRecord && rank(aRecord, a.note.id) === 0 && aRecord.dueAt !== bRecord.dueAt)
      return aRecord.dueAt - bRecord.dueAt;
    if (aRecord && bRecord && aRecord.stage !== bRecord.stage)
      return aRecord.stage - bRecord.stage;
    const masteryDifference = (progress.mastery[a.note.id] ?? 0) - (progress.mastery[b.note.id] ?? 0);
    return skill === "fretboard" && rank(aRecord, a.note.id) === 1 && masteryDifference
      ? masteryDifference : a.note.id.localeCompare(b.note.id);
  }).slice(0, 8);
  const notes = Array.from({ length: 8 }, (_, index) => selected[index % selected.length].note);
  return {
    kind: "daily", sessionId, melodyId: null, notes,
    maxFret: Math.max(...selected.map(({ maxFret }) => maxFret)),
    index: 0, answered: Array(8).fill(false), assisted: Array(8).fill(false),
    mistakes: Array(8).fill(false), skill, retentionDays: 0,
    status: "asking", feedback: "",
  };
}

export function retryMissedNote(activity: Activity): Activity {
  if (activity.kind !== "daily" || activity.status === "complete" ||
      !activity.mistakes[activity.index]) return activity;
  const missed = activity.notes[activity.index];
  if (!missed || activity.notes.slice(activity.index + 1).some((note) => note.id === missed.id))
    return activity;
  const replacement = activity.notes.findIndex((note, index) =>
    index >= activity.index + 3 && !activity.answered[index] &&
    activity.notes.some((other, otherIndex) => otherIndex !== index && other.id === note.id),
  );
  if (replacement < 0) return activity;
  const notes = [...activity.notes];
  notes[replacement] = missed;
  return { ...activity, notes };
}
