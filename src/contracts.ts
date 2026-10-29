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
}
export type Round = (
  | { mode: "lesson"; lessonId: string }
  | { mode: "review"; lessonId: null }
) & {
  maxFret: number;
  queue: Note[];
  index: number;
  status: "asking" | "correct" | "complete";
  assisted: boolean;
  mistakes: number;
  streak: number;
  bestStreak: number;
  cleanAnswers: number;
  feedback: string;
}
