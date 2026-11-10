import { LESSONS } from "./lessons";
import type { LearningHistory, LearningRecord, SavedActivity } from "./learning-contracts";

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const timestamp = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 8.64e15;
const identifier = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 160;
const noteIds = new Set(LESSONS.flatMap(lesson => lesson.notes.map(note => note.id)));

function record(value: unknown): LearningRecord | null {
  if (!object(value) || !timestamp(value.lastAttemptAt) || !timestamp(value.dueAt) ||
    !(value.lastSuccessAt === null || timestamp(value.lastSuccessAt)) ||
    typeof value.stage !== "number" || !Number.isInteger(value.stage) || value.stage < 0 || value.stage > 5 ||
    !identifier(value.lastSessionId)) return null;
  return {lastAttemptAt: value.lastAttemptAt, lastSuccessAt: value.lastSuccessAt, dueAt: value.dueAt,
    stage: value.stage, lastSessionId: value.lastSessionId};
}
export function parseLearning(value: unknown): LearningHistory | undefined {
  if (!object(value)) return undefined;
  const result: LearningHistory = {};
  for (const [id, raw] of Object.entries(value)) {
    const parsed = record(raw);
    if (noteIds.has(id) && parsed) result[id] = parsed;
  }
  return result;
}
export function parseSavedActivity(value: unknown, unlocked: number): SavedActivity | null {
  if (!object(value) || (value.kind !== "daily" && value.kind !== "melody") || !identifier(value.sessionId) ||
    (value.kind === "daily" ? value.melodyId !== null : !identifier(value.melodyId)) ||
    !Array.isArray(value.noteIds) || value.noteIds.length < 4 || value.noteIds.length > 8 ||
    (value.kind === "daily" && value.noteIds.length !== 8) ||
    !value.noteIds.every((id): id is string => typeof id === "string" && noteIds.has(id)) ||
    typeof value.maxFret !== "number" || !Number.isInteger(value.maxFret) || value.maxFret < 0 || value.maxFret > 3 ||
    typeof value.index !== "number" || !Number.isInteger(value.index) || value.index < 0 || value.index >= value.noteIds.length ||
    typeof value.retentionDays !== "number" || !Number.isInteger(value.retentionDays) || value.retentionDays < 0 || value.retentionDays > 100000) return null;
  const {noteIds: ids, index} = value;
  const available = new Set(LESSONS.slice(0, unlocked + 1).flatMap(lesson => lesson.notes.map(note => note.id)));
  if (!ids.every(id => available.has(id))) return null;
  const flags = (raw: unknown): raw is boolean[] => Array.isArray(raw) && raw.length === ids.length && raw.every(flag => typeof flag === "boolean");
  if (!flags(value.answered) || !flags(value.assisted) || !flags(value.mistakes)) return null;
  if (value.answered.some((flag, position) => position < index ? !flag : position > index && flag)) return null;
  return {kind: value.kind, sessionId: value.sessionId, melodyId: value.kind === "daily" ? null : String(value.melodyId),
    noteIds: ids, maxFret: value.maxFret, index, answered: value.answered, assisted: value.assisted,
    mistakes: value.mistakes, retentionDays: value.retentionDays};
}
