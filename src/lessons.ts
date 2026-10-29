import type { Lesson, Position } from "./contracts";
import { noteAt } from "./music";

const openPositions: Position[] = [
  { string: 1, fret: 0 },
  { string: 2, fret: 0 },
  { string: 3, fret: 0 },
  { string: 4, fret: 0 },
  { string: 5, fret: 0 },
  { string: 6, fret: 0 },
];
const openLessons = [2, 3, 4, 5, 6].map((count, index): Lesson => ({
  id: `open-${count}`,
  title:
    ["Meet E and B", "Add open G", "Add open D", "Add open A", "Add low E"][
      index
    ] ?? "Open strings",
  subtitle: "Tap an open string. The nut is at the top.",
  notes: openPositions.slice(0, count).map(noteAt),
  maxFret: 0,
}));
function frets(id: string, title: string, positions: Position[]): Lesson {
  return {
    id,
    title,
    subtitle: "Natural notes within the first three frets.",
    notes: positions.map(noteAt),
    maxFret: 3,
  };
}
export const LESSONS: Lesson[] = [
  ...openLessons,
  frets("high-notes", "E, F and G", [
    { string: 1, fret: 0 },
    { string: 1, fret: 1 },
    { string: 1, fret: 3 },
    { string: 2, fret: 0 },
  ]),
  frets("middle-high", "B, C and D", [
    { string: 2, fret: 0 },
    { string: 2, fret: 1 },
    { string: 2, fret: 3 },
    { string: 1, fret: 0 },
  ]),
  frets("middle", "G and A", [
    { string: 3, fret: 0 },
    { string: 3, fret: 2 },
    { string: 2, fret: 0 },
  ]),
  frets("middle-low", "D, E and F", [
    { string: 4, fret: 0 },
    { string: 4, fret: 2 },
    { string: 4, fret: 3 },
    { string: 3, fret: 0 },
  ]),
  frets("low-notes", "A, B and C", [
    { string: 5, fret: 0 },
    { string: 5, fret: 2 },
    { string: 5, fret: 3 },
    { string: 4, fret: 0 },
  ]),
  frets("lowest", "Low E, F and G", [
    { string: 6, fret: 0 },
    { string: 6, fret: 1 },
    { string: 6, fret: 3 },
    { string: 5, fret: 0 },
  ]),
];
