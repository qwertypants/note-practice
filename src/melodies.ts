import type { Note, Progress } from "./contracts";
import type { Melody } from "./learning-contracts";
import { LESSONS } from "./lessons";
import { positionsFor } from "./music";

const notesById = new Map<string, Note>(
  LESSONS.flatMap((lesson) => lesson.notes).map((note) => [note.id, note]),
);

export const MELODIES: Melody[] = [
  { id: "open-call", title: "Open string call", noteIds: ["E4", "B3", "E4", "B3"], maxFret: 0 },
  { id: "open-walk", title: "Open string walk", noteIds: ["G3", "B3", "E4", "B3", "G3"], maxFret: 0 },
  { id: "high-arc", title: "High arc", noteIds: ["E4", "F4", "G4", "F4", "E4"], maxFret: 3 },
  { id: "middle-answer", title: "Middle answer", noteIds: ["B3", "C4", "D4", "C4", "B3", "E4"], maxFret: 3 },
  { id: "low-rise", title: "Low rise", noteIds: ["D3", "E3", "F3", "G3", "F3", "E3"], maxFret: 3 },
  { id: "bass-echo", title: "Bass echo", noteIds: ["E2", "G2", "A2", "G2", "F2", "E2"], maxFret: 3 },
];

export function melodyNotes(melody: Melody): Note[] {
  return melody.noteIds.map((id) => {
    const note = notesById.get(id);
    if (!note || positionsFor(note, melody.maxFret).length === 0) {
      throw new Error(`Invalid melody note ${id} in ${melody.id}`);
    }
    return note;
  });
}

export function availableMelodies(progress: Progress): Melody[] {
  const unlockedLessons = LESSONS.slice(0, progress.unlocked + 1);
  const unlockedNotes = new Set(unlockedLessons.flatMap((lesson) => lesson.notes.map((note) => note.id)));
  const visibleMaxFret = Math.max(0, ...unlockedLessons.map((lesson) => lesson.maxFret));
  return MELODIES.filter((melody) =>
    melody.maxFret <= visibleMaxFret &&
    melody.noteIds.every((id) => unlockedNotes.has(id)),
  );
}
