export type GuitarString = 6 | 5 | 4 | 3 | 2 | 1;
export interface Position {
  string: GuitarString;
  fret: number;
}
export interface Note {
  id: string;
  name: string;
  midi: number;
  writtenName: string;
  staffStep: number;
}
export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  notes: Note[];
  maxFret: number;
}
export interface Progress {
  version: 1;
  mastery: Record<string, number>;
  unlocked: number;
  rounds: number;
  session?: LessonSession | null;
  learning?: import("./learning-contracts").LearningHistory;
  activity?: import("./learning-contracts").SavedActivity | null;
}
export interface LessonAttempt {
  assisted: boolean;
  mistakes: number;
}
export interface LessonSession {
  sessionId?: string;
  attempts?: LessonAttempt[];
  lessonId: string;
  queue: string[];
  answered: boolean[];
  index: number;
  cleanAnswers: number;
  bestStreak: number;
}
export type Round = (
  | { mode: "lesson"; lessonId: string }
  | { mode: "review"; lessonId: null }
) & {
  maxFret: number;
  attempts?: LessonAttempt[];
  queue: Note[];
  answered?: boolean[];
  index: number;
  status: "asking" | "correct" | "complete";
  assisted: boolean;
  mistakes: number;
  streak: number;
  bestStreak: number;
  cleanAnswers: number;
  feedback: string;
}
