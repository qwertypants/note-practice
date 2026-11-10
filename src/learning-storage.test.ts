import { describe, it, expect } from "vitest";
import { parseLearning, parseSavedActivity } from "./learning-storage";

const saved = {
  kind: "daily", sessionId: "visit-1", melodyId: null,
  noteIds: ["E4", "B3", "E4", "B3", "E4", "B3", "E4", "B3"],
  maxFret: 0, index: 1, answered: [true, false, false, false, false, false, false, false],
  assisted: [false, true, false, false, false, false, false, false],
  mistakes: [false, false, false, false, false, false, false, false], retentionDays: 0,
};
describe("extended progress parsing", () => {
  it("keeps assisted current items and settled answers on resume", () => {
    expect(parseSavedActivity(saved, 0)).toEqual(saved);
  });
  it("rejects invalid/locked queues and inconsistent answered positions", () => {
    for (const change of [{index: 8}, {noteIds: Array(8).fill("G3")}, {maxFret: 5},
      {answered: Array(8).fill(false)}, {retentionDays: Infinity},
      {assisted: []}, {kind: "other"}, {sessionId: ""}]) {
      expect(parseSavedActivity({...saved, ...change}, 0)).toBeNull();
    }
  });
  it("keeps valid learning records and drops corrupt dates, stages, and unknown notes", () => {
    const good = {lastAttemptAt: 1000, lastSuccessAt: null, dueAt: 86401000, stage: 1, lastSessionId: "visit-1"};
    expect(parseLearning({E4: good, BAD: good, B3: {...good, dueAt: Infinity}, G3: {...good, stage: 6}})).toEqual({E4: good});
    expect(parseLearning(null)).toBeUndefined();
  });
});
