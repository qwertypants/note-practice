import { describe, expect, it } from "vitest";
import { emptyProgress } from "./progress";
import { createDailyActivity, dailyDueCount, recordExposure, recordOutcome, retentionDays, retryMissedNote } from "./learning";
import type { LearningHistory, LearningOutcome } from "./learning-contracts";

const DAY = 86_400_000;
const outcome = (now: number, sessionId: string, clean = true): LearningOutcome =>
  ({ noteId: "E4", sessionId, clean, now });

describe("learning schedule", () => {
  it("advances once per session only when due, using elapsed days", () => {
    const first = recordOutcome({}, outcome(0, "one"));
    expect(first.E4).toMatchObject({ stage: 1, dueAt: DAY, lastSuccessAt: 0 });
    expect(recordOutcome(first, outcome(DAY, "one")).E4.stage).toBe(1);
    expect(recordOutcome(first, outcome(DAY - 1, "early")).E4.stage).toBe(1);
    const second = recordOutcome(first, outcome(4 * DAY, "two"));
    expect(retentionDays(first, outcome(4 * DAY, "two"))).toBe(4);
    expect(second.E4).toMatchObject({ stage: 2, dueAt: 7 * DAY });
    let history = second;
    for (let stage = 3; stage <= 5; stage++) {
      const due = history.E4.dueAt;
      history = recordOutcome(history, outcome(due, `session-${stage}`));
      expect(history.E4.stage).toBe(stage);
    }
    expect(history.E4.dueAt).toBe((history.E4.lastSuccessAt ?? 0) + 30 * DAY);
  });

  it("records an early successful recall without advancing the interval", () => {
    const first = recordOutcome({}, outcome(0, "one"));
    const early = recordOutcome(first, outcome(DAY / 2, "early"));
    expect(early.E4).toMatchObject({stage: 1, dueAt: DAY, lastSuccessAt: DAY / 2});
    expect(retentionDays(early, outcome(DAY, "later"))).toBe(0);
  });

  it("keeps a failure's due date fixed when the same session retries or uses Help", () => {
    const failed = recordOutcome({}, outcome(DAY, "one", false));
    expect(recordOutcome(failed, outcome(DAY + 1000, "one", false)).E4).toMatchObject({
      dueAt: 2 * DAY, lastAttemptAt: DAY + 1000,
    });
    expect(failed.E4.dueAt).toBe(2 * DAY);
  });

  it("measures retention after the latest mistake, Help, and assisted resolution", () => {
    const first = recordOutcome({}, outcome(0, "first"));
    const failed = recordOutcome(first, outcome(3 * DAY, "helped", false));
    const resolved = recordOutcome(failed, outcome(3 * DAY + DAY / 2, "helped", false));
    expect(retentionDays(resolved, outcome(4 * DAY, "later"))).toBe(0);
    expect(retentionDays(resolved, outcome(5 * DAY, "later"))).toBe(1);
    expect(resolved.E4.dueAt).toBe(4 * DAY);
  });

  it("counts heard notes as exposure without creating recall or changing the schedule", () => {
    const first = recordOutcome({}, outcome(0, "first"));
    const exposed = recordExposure(first, ["E4", "B3"], 3 * DAY);
    expect(exposed.E4).toEqual({...first.E4, lastAttemptAt: 3 * DAY});
    expect(exposed.B3).toBeUndefined();
    expect(retentionDays(exposed, outcome(5 * DAY, "later"))).toBe(2);
    expect(recordExposure(exposed, ["E4"], 2 * DAY)).toEqual(exposed);
    expect(recordExposure(exposed, ["E4"], Number.NaN)).toEqual(exposed);
  });

  it("resets on errors, keeps prior success, and rejects clock rollback credit", () => {
    const first = recordOutcome({}, outcome(2 * DAY, "one"));
    const failed = recordOutcome(first, outcome(3 * DAY, "two", false));
    expect(failed.E4).toMatchObject({ stage: 0, dueAt: 4 * DAY, lastSuccessAt: 2 * DAY });
    expect(recordOutcome(failed, outcome(4 * DAY, "two")).E4.stage).toBe(0);
    expect(recordOutcome(failed, outcome(1 * DAY, "clock")).E4.stage).toBe(0);
    expect(retentionDays(first, outcome(1 * DAY, "clock"))).toBe(0);
    expect(recordOutcome(first, outcome(Number.NaN, "bad"))).toBe(first);
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
      B3: { lastAttemptAt: 0, lastSuccessAt: 0, dueAt: DAY, stage: 1, lastSessionId: "old" },
      F4: { lastAttemptAt: 0, lastSuccessAt: 0, dueAt: DAY, stage: 1, lastSessionId: "old" },
    };
    const progress = { ...emptyProgress(), mastery: { E4: 1 }, learning };
    expect(dailyDueCount(progress, DAY)).toBe(1);
    expect(dailyDueCount(progress, DAY - 1)).toBe(0);
    expect(createDailyActivity(progress, DAY, "today")?.notes.slice(0, 2).map((note) => note.id)).toEqual(["B3", "E4"]);
  });

  it("selects a later-ID weak note ahead of strong notes when the pool exceeds eight", () => {
    const strongIds = ["A2", "A3", "B2", "B3", "C3", "C4", "D3", "D4"];
    const strong = Object.fromEntries(strongIds.map((id) => [id, {
      lastAttemptAt: 0, lastSuccessAt: 0, dueAt: 30 * DAY,
      stage: 5, lastSessionId: "earlier",
    }]));
    const progress = {
      ...emptyProgress(), unlocked: 10,
      mastery: Object.fromEntries([...strongIds, "G4"].map((id) => [id, 3])),
      learning: {
        ...strong,
        G4: { lastAttemptAt: 0, lastSuccessAt: null, dueAt: DAY,
          stage: 0, lastSessionId: "earlier" },
      },
    };
    const ids = createDailyActivity(progress, 0, "today")?.notes.map((note) => note.id);
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
