import { describe, expect, it } from "vitest";
import { emptyProgress } from "./progress";
import { LESSONS } from "./lessons";
import { availableMelodies, MELODIES, melodyNotes } from "./melodies";
import { positionsFor } from "./music";

describe("melody catalog", () => {
  it("has six playable phrases with valid existing notes", () => {
    expect(MELODIES).toHaveLength(6);
    expect(new Set(MELODIES.map((melody) => melody.id)).size).toBe(6);
    for (const melody of MELODIES) {
      expect(melody.noteIds.length).toBeGreaterThanOrEqual(4);
      expect(melody.noteIds.length).toBeLessThanOrEqual(8);
      expect(melodyNotes(melody).every((note) => positionsFor(note, melody.maxFret).length > 0)).toBe(true);
    }
  });

  it("offers the open E and B phrase immediately and unlocks by lessons, not mastery", () => {
    expect(availableMelodies(emptyProgress()).map((melody) => melody.id)).toEqual(["open-call"]);
    const allUnlocked = { ...emptyProgress(), unlocked: LESSONS.length - 1 };
    expect(availableMelodies(allUnlocked)).toHaveLength(6);
  });

  it("rejects a phrase whose note is not in the lesson catalog", () => {
    expect(() => melodyNotes({ id: "bad", title: "Bad", noteIds: ["C#4"], maxFret: 3 })).toThrow();
  });
});
