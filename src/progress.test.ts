import { afterEach, describe, expect, it, vi } from "vitest";
import {
  emptyProgress,
  loadProgress,
  saveProgress,
  STORAGE_KEY,
} from "./progress";
afterEach(() => vi.unstubAllGlobals());
function storage(raw: string | null) {
  const values = new Map<string, string>();
  if (raw !== null) values.set(STORAGE_KEY, raw);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
}
describe("saved progress", () => {
  it("supports a fresh browser and saves real progress", () => {
    storage(null);
    expect(loadProgress()).toEqual({
      progress: emptyProgress(),
      persistent: true,
    });
    expect(
      saveProgress({ version: 1, mastery: { E4: 2 }, unlocked: 1, rounds: 4 }),
    ).toBe(true);
    expect(loadProgress().progress).toEqual({
      version: 1,
      mastery: { E4: 2 },
      unlocked: 1,
      rounds: 4,
      session: null,
    });
  });
  it("persists a valid in-progress lesson and discards malformed sessions", () => {
    const session = {
      lessonId: "open-2",
      queue: ["E4", "B3", "E4", "B3", "E4", "B3", "E4", "B3"],
      answered: [true, true, false, false, false, false, false, false],
      index: 2,
      cleanAnswers: 2,
      bestStreak: 2,
    };
    storage(JSON.stringify({ version: 1, unlocked: 0, session }));
    expect(loadProgress().progress.session).toEqual(session);
    storage(JSON.stringify({ version: 1, unlocked: 0, session: { ...session, index: 8 } }));
    expect(loadProgress().progress.session).toBeNull();
  });
  it("validates unknown shape and bounds values", () => {
    storage(
      JSON.stringify({
        version: 1,
        mastery: { E4: 99, B3: -2, BAD: 3, G3: "3" },
        unlocked: 999,
        rounds: -4,
      }),
    );
    const result = loadProgress().progress;
    expect(result.mastery).toEqual({ E4: 3, B3: 0 });
    expect(result.rounds).toBe(0);
    expect(result.unlocked).toBe(10);
    for (const raw of [
      "null",
      "[]",
      "4",
      '{"version":2}',
      '{"version":1,"mastery":null}',
    ]) {
      storage(raw);
      expect(loadProgress().progress).toEqual(emptyProgress());
    }
  });
  it("survives malformed JSON and unavailable or failing storage", () => {
    storage("{");
    expect(loadProgress().progress).toEqual(emptyProgress());
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(loadProgress()).toEqual({
      progress: emptyProgress(),
      persistent: false,
    });
    expect(saveProgress(emptyProgress())).toBe(false);
    vi.stubGlobal("localStorage", undefined);
    expect(loadProgress().persistent).toBe(false);
  });
});

describe("compatible learning extensions", () => {
  it("round trips new fields while leaving legacy progress intact", () => {
    storage(null);
    const progress = {version: 1 as const, mastery: {E4: 2}, unlocked: 1, rounds: 4,
      learning: {E4: {lastAttemptAt: 1000, lastSuccessAt: 1000, dueAt: 86401000, stage: 1, lastSessionId: "one"}}};
    expect(saveProgress(progress)).toBe(true);
    expect(loadProgress().progress).toEqual({...progress, session: null});
    // The prior reader reads these same fields and ignores the additive extension.
    const legacy = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect([legacy.version, legacy.mastery, legacy.unlocked, legacy.rounds]).toEqual([1, {E4: 2}, 1, 4]);
  });
  it("discards corrupt optional extensions without erasing lesson progress", () => {
    storage(JSON.stringify({version: 1, mastery: {B3: 3}, unlocked: 2, rounds: 7,
      learning: "invalid", activity: {kind: "melody", noteIds: ["BAD"]}}));
    expect(loadProgress().progress).toEqual({version: 1, mastery: {B3: 3}, unlocked: 2, rounds: 7, session: null, activity: null});
  });
});
