import { describe, expect, it } from "vitest";
import { emptyProgress } from "./progress";
import { createDailyActivity, dailyDueCount, recordOutcome, retentionDays, retryMissedNote } from "./learning";
import type { LearningHistory, LearningOutcome } from "./learning-contracts";

const DAY = 86_400_000;
const outcome = (now: number, sessionId: string, clean = true, skill: "fretboard" | "pitch" = "fretboard"): LearningOutcome =>
  ({ noteId: "E4", skill, sessionId, clean, now });

describe("learning schedule", () => {
  it("advances once per session only when due, using elapsed days", () => {
    const first = recordOutcome({}, outcome(0, "one"));
    expect(first.fretboard?.E4).toMatchObject({ stage: 1, dueAt: DAY, lastSuccessAt: 0 });
    expect(recordOutcome(first, outcome(DAY, "one")).fretboard?.E4.stage).toBe(1);
    expect(recordOutcome(first, outcome(DAY - 1, "early")).fretboard?.E4.stage).toBe(1);
    const second = recordOutcome(first, outcome(4 * DAY, "two"));
    expect(retentionDays(first, outcome(4 * DAY, "two"))).toBe(4);
    expect(second.fretboard?.E4).toMatchObject({ stage: 2, dueAt: 7 * DAY });
    let history = second;
    for (let stage = 3; stage <= 5; stage++) {
      const due = history.fretboard?.E4.dueAt ?? 0;
      history = recordOutcome(history, outcome(due, `session-${stage}`));
      expect(history.fretboard?.E4.stage).toBe(stage);
    }
    expect(history.fretboard?.E4.dueAt).toBe((history.fretboard?.E4.lastSuccessAt ?? 0) + 30 * DAY);
  });

  it("resets on errors, keeps prior success, and rejects clock rollback credit", () => {
    const first = recordOutcome({}, outcome(2 * DAY, "one"));
    const failed = recordOutcome(first, outcome(3 * DAY, "two", false));
    expect(failed.fretboard?.E4).toMatchObject({ stage: 0, dueAt: 4 * DAY, lastSuccessAt: 2 * DAY });
    expect(recordOutcome(failed, outcome(4 * DAY, "two")).fretboard?.E4.stage).toBe(0);
    expect(recordOutcome(failed, outcome(1 * DAY, "clock")).fretboard?.E4.stage).toBe(0);
    expect(retentionDays(first, outcome(1 * DAY, "clock"))).toBe(0);
    expect(recordOutcome(first, outcome(Number.NaN, "bad"))).toBe(first);
  });

  it("keeps answer skills separate", () => {
    const history = recordOutcome({}, outcome(0, "guitar", true, "pitch"));
    expect(history.fretboard).toBeUndefined();
    expect(history.pitch?.E4.stage).toBe(1);
  });
});

describe("daily activity", () => {
  it("waits until a beginner attempts a lesson note", () => {
    expect(createDailyActivity(emptyProgress(), 0, "one")).toBeNull();
    const activity = createDailyActivity({ ...emptyProgress(), mastery: { E4: 0 } }, 0, "one");
    expect(activity?.notes.map((note) => note.id)).toEqual(["E4", "B3", "E4", "B3", "E4", "B3", "E4", "B3"]);
    expect(activity).toMatchObject({ kind: "daily", index: 0, status: "asking", maxFret: 0 });
  });

  it("puts overdue notes first, excludes locked notes, and counts only unlocked due notes", () => {
    const learning: LearningHistory = {
      fretboard: {
        B3: { lastAttemptAt: 0, lastSuccessAt: 0, dueAt: DAY, stage: 1, lastSessionId: "old" },
        F4: { lastAttemptAt: 0, lastSuccessAt: 0, dueAt: DAY, stage: 1, lastSessionId: "old" },
      },
    };
    const progress = { ...emptyProgress(), mastery: { E4: 1 }, learning };
    expect(dailyDueCount(progress, DAY)).toBe(1);
    expect(dailyDueCount(progress, DAY - 1)).toBe(0);
    expect(createDailyActivity(progress, DAY, "today")?.notes.slice(0, 2).map((note) => note.id)).toEqual(["B3", "E4"]);
  });

  it("selects a later-ID weak pitch note ahead of strong pitch notes when the pool exceeds eight", () => {
    const strongIds = ["A2", "A3", "B2", "B3", "C3", "C4", "D3", "D4"];
    const strong = Object.fromEntries(strongIds.map((id) => [id, {
      lastAttemptAt: 0, lastSuccessAt: 0, dueAt: 30 * DAY,
      stage: 5, lastSessionId: "earlier",
    }]));
    const progress = {
      ...emptyProgress(), unlocked: 10,
      learning: { pitch: {
        ...strong,
        G4: { lastAttemptAt: 0, lastSuccessAt: null, dueAt: DAY,
          stage: 0, lastSessionId: "earlier" },
      } },
    };
    const ids = createDailyActivity(progress, 0, "today", "pitch")?.notes.map((note) => note.id);
    expect(ids).toHaveLength(8);
    expect(ids?.[0]).toBe("G4");
    expect(ids).toContain("G4");
    expect(ids).not.toContain("D4");
  });

  it("replaces only a later duplicate with two prompts between and preserves coverage", () => {
    const activity = createDailyActivity({ ...emptyProgress(), mastery: { E4: 0 } }, 0, "one");
    if (!activity) throw new Error("Expected activity");
    const missed = {
      ...activity,
      notes: [activity.notes[0], ...Array(7).fill(activity.notes[1])],
      mistakes: [true, ...Array(7).fill(false)],
    };
    const retried = retryMissedNote(missed);
    expect(retried.notes).toHaveLength(8);
    expect(retried.notes[3].id).toBe("E4");
    expect(new Set(retried.notes.map((note) => note.id))).toEqual(new Set(["B3", "E4"]));
    expect(missed.notes[3].id).toBe("B3");
  });
});
