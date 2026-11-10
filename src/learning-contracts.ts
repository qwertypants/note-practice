import type { Note } from "./contracts";

export type LearningSkill = "fretboard" | "pitch";
export interface LearningRecord {
  lastAttemptAt: number;
  lastSuccessAt: number | null;
  dueAt: number;
  stage: number;
  lastSessionId: string;
}
export type LearningHistory = Partial<Record<LearningSkill, Record<string, LearningRecord>>>;
export interface LearningOutcome {
  noteId: string;
  skill: LearningSkill;
  sessionId: string;
  clean: boolean;
  now: number;
}
export interface SavedActivity {
  kind: "daily" | "melody";
  sessionId: string;
  melodyId: string | null;
  noteIds: string[];
  maxFret: number;
  index: number;
  answered: boolean[];
  assisted: boolean[];
  mistakes: boolean[];
  skill: LearningSkill;
  retentionDays: number;
}
export interface Activity extends Omit<SavedActivity, "noteIds"> {
  notes: Note[];
  status: "asking" | "correct" | "complete";
  feedback: string;
}
export interface Melody {
  id: string;
  title: string;
  noteIds: string[];
  maxFret: number;
}
export interface PitchEstimate {
  midi: number;
  cents: number;
  confidence: number;
}
export type GuitarInputState = "idle" | "requesting" | "listening" | "unavailable";
export interface GuitarInput {
  start(): Promise<void>;
  stop(): void;
  setTarget(midi: number, itemId: string): void;
  setSuppressed(suppressed: boolean): void;
  dispose(): void;
}
export interface GuitarInputOptions {
  onPitch(midi: number, itemId: string): void;
  onState(state: GuitarInputState): void;
}
