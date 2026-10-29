import type { GuitarString, Note, Position } from "./contracts";

export const STRINGS: { string: GuitarString; name: string; midi: number }[] = [
  { string: 6, name: "Low E", midi: 40 },
  { string: 5, name: "A", midi: 45 },
  { string: 4, name: "D", midi: 50 },
  { string: 3, name: "G", midi: 55 },
  { string: 2, name: "B", midi: 59 },
  { string: 1, name: "High E", midi: 64 },
];
const SPELLINGS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];

export function noteAt(position: Position): Note {
  const tuning = STRINGS.find((item) => item.string === position.string);
  if (!tuning || !Number.isInteger(position.fret) || position.fret < 0)
    throw new Error("Invalid guitar position");
  const midi = tuning.midi + position.fret;
  const name = SPELLINGS[midi % 12] ?? "C";
  const octave = Math.floor(midi / 12) - 1;
  return {
    id: `${name}${octave}`,
    name,
    midi,
    writtenName: `${name}${octave + 1}`,
    staffStep: (octave + 1 - 4) * 7 + LETTERS.indexOf(name.charAt(0)) - 2,
  };
}

export function positionsFor(note: Note, maxFret: number): Position[] {
  return STRINGS.flatMap((item) => {
    const fret = note.midi - item.midi;
    return Number.isInteger(fret) && fret >= 0 && fret <= maxFret
      ? [{ string: item.string, fret }]
      : [];
  });
}

export function ledgerSteps(staffStep: number): number[] {
  const lines: number[] = [];
  for (let step = -2; step >= staffStep; step -= 2) lines.push(step);
  for (let step = 10; step <= staffStep; step += 2) lines.push(step);
  return lines;
}
