import { describe, expect, it } from "vitest";
import { ledgerSteps, noteAt, positionsFor, STRINGS } from "./music";
describe("guitar pitches and written notation", () => {
  it("maps literal standard tuning, sounding pitches, and written staff steps", () => {
    expect(STRINGS.map((item) => item.midi)).toEqual([40, 45, 50, 55, 59, 64]);
    expect(
      STRINGS.map((item) => noteAt({ string: item.string, fret: 0 })),
    ).toEqual([
      { id: "E2", name: "E", midi: 40, writtenName: "E3", staffStep: -7 },
      { id: "A2", name: "A", midi: 45, writtenName: "A3", staffStep: -4 },
      { id: "D3", name: "D", midi: 50, writtenName: "D4", staffStep: -1 },
      { id: "G3", name: "G", midi: 55, writtenName: "G4", staffStep: 2 },
      { id: "B3", name: "B", midi: 59, writtenName: "B4", staffStep: 4 },
      { id: "E4", name: "E", midi: 64, writtenName: "E5", staffStep: 7 },
    ]);
    expect(noteAt({ string: 2, fret: 1 })).toEqual({
      id: "C4",
      name: "C",
      midi: 60,
      writtenName: "C5",
      staffStep: 5,
    });
    expect(noteAt({ string: 4, fret: 2 }).staffStep).toBe(0);
  });
  it("returns exact pitch duplicates while excluding other octaves", () => {
    expect(positionsFor(noteAt({ string: 1, fret: 0 }), 5)).toEqual([
      { string: 2, fret: 5 },
      { string: 1, fret: 0 },
    ]);
    expect(positionsFor(noteAt({ string: 6, fret: 0 }), 3)).toEqual([
      { string: 6, fret: 0 },
    ]);
  });
  it("draws ledger lines only beyond staff edges", () => {
    expect(ledgerSteps(-7)).toEqual([-2, -4, -6]);
    expect(ledgerSteps(-1)).toEqual([]);
    expect(ledgerSteps(9)).toEqual([]);
    expect(ledgerSteps(12)).toEqual([10, 12]);
  });
});
