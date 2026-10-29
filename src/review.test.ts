import { describe, expect, it } from "vitest";
import { canReview, createReviewRound } from "./review";
import { emptyProgress } from "./progress";
import { LESSONS } from "./lessons";

const ids = (progress: Parameters<typeof createReviewRound>[0]) =>
  createReviewRound(progress).queue.map((note) => note.id);

describe("personalized review", () => {
  it("requires a saved mastery entry for an unlocked note, including zero", () => {
    expect(canReview(emptyProgress())).toBe(false);
    expect(canReview({ ...emptyProgress(), mastery: { F4: 2, unknown: 3 } })).toBe(false);
    expect(canReview({ ...emptyProgress(), mastery: { E4: 0 } })).toBe(true);
    expect(canReview({ ...emptyProgress(), mastery: { B3: 3 } })).toBe(true);
    expect(canReview({ ...emptyProgress(), unlocked: 5, mastery: { F4: 0 } })).toBe(true);
  });

  it("excludes locked notes and repeats weaker and unattempted notes to eight", () => {
    const progress = { ...emptyProgress(), mastery: { E4: 1, F4: 0 } };
    expect(ids(progress)).toEqual(["B3", "E4", "B3", "E4", "B3", "E4", "B3", "E4"]);
    expect(createReviewRound(progress)).toMatchObject({
      mode: "review", lessonId: null, maxFret: 0, index: 0, status: "asking",
      assisted: false, mistakes: 0, streak: 0, bestStreak: 0, cleanAnswers: 0, feedback: "",
    });
  });

  it("deduplicates overlapping lessons and orders by mastery then ID", () => {
    expect(ids({
      ...emptyProgress(), unlocked: 5,
      mastery: { E2: 3, A2: 2, B3: 1, E4: 1, G4: 3 },
    })).toEqual(["D3", "F4", "G3", "B3", "E4", "A2", "D3", "F4"]);
  });

  it("selects eight distinct weakest notes before any repeat", () => {
    expect(ids({ ...emptyProgress(), unlocked: LESSONS.length - 1, mastery: { E4: 1 } }))
      .toEqual(["A2", "A3", "B2", "B3", "C3", "C4", "D3", "D4"]);
  });

  it("falls back to all unlocked notes when all are mastered", () => {
    expect(ids({ ...emptyProgress(), unlocked: 1, mastery: { B3: 3, E4: 3, G3: 3 } }))
      .toEqual(["B3", "E4", "G3", "B3", "E4", "G3", "B3", "E4"]);
  });

  it("uses the earliest containing lesson bounds for only the selected notes", () => {
    const progress = {
      ...emptyProgress(), unlocked: 5,
      mastery: { E2: 3, A2: 3, D3: 3, G3: 3, B3: 3, E4: 0, F4: 3, G4: 3 },
    };
    expect(ids(progress)).toEqual(Array(8).fill("E4"));
    expect(createReviewRound(progress).maxFret).toBe(0);
    expect(createReviewRound({ ...progress, mastery: { ...progress.mastery, F4: 0 } }).maxFret).toBe(3);
  });

  it("does not mutate progress or the shared lessons", () => {
    const progress = { ...emptyProgress(), unlocked: 5, mastery: { E4: 1 } };
    const before = structuredClone(progress);
    const lessonsBefore = structuredClone(LESSONS);
    createReviewRound(progress);
    canReview(progress);
    expect(progress).toEqual(before);
    expect(LESSONS).toEqual(lessonsBefore);
  });
});
