import type { Note } from "./contracts";

export interface LearningRecord {
  lastAttemptAt: number;
  lastSuccessAt: number | null;
  dueAt: number;
  stage: number;
  lastSessionId: string;
}
export type LearningHistory = Record<string, LearningRecord>;
export interface LearningOutcome {
  noteId: string;
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
