import { describe, expect, it } from "vitest";
import { advanceActivity, assistActivity, createMelodyActivity } from "./melody";
import { MELODIES } from "./melodies";

describe("melody activity", () => {
  it("begins with an unanswered, unassisted phrase", () => {
    const activity = createMelodyActivity(MELODIES[0], "session-1");
    expect(activity.notes.map((note) => note.id)).toEqual(MELODIES[0].noteIds);
    expect(activity.status).toBe("asking");
    expect(activity.answered).toEqual([false, false, false, false]);
    expect(activity.assisted).toEqual([false, false, false, false]);
  });

  it("only advances a correct step and completes after the last", () => {
    let activity = createMelodyActivity(MELODIES[0], "session-1");
    expect(advanceActivity(activity)).toBe(activity);
    for (let index = 0; index < activity.notes.length; index += 1) {
      activity = advanceActivity({ ...activity, status: "correct" });
      expect(activity.answered[index]).toBe(true);
    }
    expect(activity.status).toBe("complete");
    expect(advanceActivity(activity)).toBe(activity);
  });

  it("advances settled correct steps while preserving assistance", () => {
    const initial = createMelodyActivity(MELODIES[0], "session-1");
    const settled = {
      ...initial,
      status: "correct" as const,
      answered: [true, false, false, false],
      assisted: [false, true, false, false],
    };
    const next = advanceActivity(settled);
    expect(next.index).toBe(1);
    expect(next.status).toBe("asking");
    expect(next.answered).toEqual([true, false, false, false]);
    expect(next.assisted).toEqual([false, true, false, false]);
    expect(advanceActivity(next)).toBe(next);

    const last = {
      ...next,
      index: next.notes.length - 1,
      status: "correct" as const,
      answered: [true, true, true, true],
    };
    const complete = advanceActivity(last);
    expect(complete.status).toBe("complete");
    expect(complete.answered).toEqual([true, true, true, true]);
    expect(complete.assisted).toEqual([false, true, false, false]);
  });

  it("marks only unsettled steps as assisted", () => {
    const initial = createMelodyActivity(MELODIES[0], "session-1");
    const first = assistActivity(initial);
    expect(first.assisted).toEqual([true, false, false, false]);
    const second = advanceActivity({ ...first, status: "correct" });
    expect(assistActivity(second, true).assisted).toEqual([true, true, true, true]);
    expect(assistActivity({ ...second, status: "correct" }).assisted).toEqual(second.assisted);
  });
});
