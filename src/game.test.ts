import { describe, expect, it } from "vitest";
import { answer, createRound, help, hintsVisible, next } from "./game";
import { LESSONS } from "./lessons";
import { noteAt, positionsFor } from "./music";
import { emptyProgress } from "./progress";
import { createReviewRound } from "./review";
import type { Round } from "./contracts";
const lesson = LESSONS[0];
if (!lesson) throw new Error("Missing introductory lesson");
const e = noteAt({ string: 1, fret: 0 });
function round(): Round {
  return {
    ...createRound(lesson),
    queue: [e, ...createRound(lesson).queue.slice(1)],
  };
}
describe("practice rounds", () => {
  it("balances eight questions and includes every lesson note", () => {
    for (const lesson of LESSONS) {
      const queue = createRound(lesson).queue;
      expect(queue).toHaveLength(8);
      expect(new Set(queue.map((note) => note.id))).toEqual(
        new Set(lesson.notes.map((note) => note.id)),
      );
      const counts = lesson.notes.map(
        (note) => queue.filter((item) => item.id === note.id).length,
      );
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    }
  });
  it("restores hints and resets mastery on Help, without awarding assisted mastery", () => {
    const progress = { ...emptyProgress(), mastery: { E4: 3 } };
    expect(hintsVisible(e, progress)).toBe(false);
    const helped = help(round(), progress);
    expect(hintsVisible(e, helped.progress)).toBe(true);
    expect(helped.round.assisted).toBe(true);
    const correct = answer(
      helped.round,
      { string: 1, fret: 0 },
      helped.progress,
    );
    expect(correct.progress.mastery.E4).toBe(0);
    expect(correct.round.cleanAnswers).toBe(0);
  });
  it("keeps a wrong question active, reveals after two misses, and recovers on next", () => {
    let state = answer(
      round(),
      { string: 6, fret: 0 },
      { ...emptyProgress(), mastery: { E4: 3 } },
    );
    expect(state.round.status).toBe("asking");
    expect(state.round.index).toBe(0);
    expect(state.round.mistakes).toBe(1);
    expect(state.progress.mastery.E4).toBe(0);
    state = answer(state.round, { string: 6, fret: 0 }, state.progress);
    expect(state.round.feedback).toContain("E");
    state = answer(state.round, { string: 1, fret: 0 }, state.progress);
    expect(state.round.status).toBe("correct");
    expect(state.progress.mastery.E4).toBe(0);
    state = next(state.round, state.progress);
    expect(state.round.assisted).toBe(false);
    expect(state.round.mistakes).toBe(0);
  });
  it("awards first-attempt answers only once and never relocks lessons", () => {
    let state = answer(
      round(),
      { string: 1, fret: 0 },
      { ...emptyProgress(), mastery: { E4: 2, B3: 3 } },
    );
    expect(state.progress.mastery.E4).toBe(3);
    expect(state.progress.unlocked).toBe(1);
    expect(state.round.bestStreak).toBe(1);
    expect(state.round.cleanAnswers).toBe(1);
    expect(answer(state.round, { string: 1, fret: 0 }, state.progress)).toEqual(
      state,
    );
    state = next(state.round, state.progress);
    state = help(state.round, state.progress);
    expect(state.progress.unlocked).toBe(1);
  });
  it("revisits a missed note without dropping an unseen note", () => {
    const b = noteAt({ string: 2, fret: 0 });
    const initial = { ...round(), queue: [e, b, b, b, b, b, b, b] };
    const state = answer(initial, { string: 6, fret: 0 }, emptyProgress());
    expect(state.round.queue.slice(1).some((note) => note.id === "E4")).toBe(
      true,
    );
    expect(state.round.queue[1]?.id).toBe("B3");
    expect(state.round.queue).toHaveLength(8);
  });
  it("fades hints after three clean finds and restores them after a mistake", () => {
    let state = help(round(), { ...emptyProgress(), mastery: { E4: 3 } });
    expect(hintsVisible(e, state.progress)).toBe(true);
    for (let success = 1; success <= 3; success++) {
      state = answer(round(), { string: 1, fret: 0 }, state.progress);
      expect(state.progress.mastery.E4).toBe(success);
      expect(hintsVisible(e, state.progress)).toBe(success < 3);
    }
    state = answer(round(), { string: 2, fret: 0 }, state.progress);
    expect(hintsVisible(e, state.progress)).toBe(true);
    expect(state.progress.mastery.E4).toBe(0);
    expect(state.round.feedback).toBe(
      "Try another position. You can take your time.",
    );
  });
  it("finalizes exactly once after eight answers", () => {
    let state = { round: createRound(lesson), progress: emptyProgress() };
    for (let index = 0; index < 8; index++) {
      const note = state.round.queue[state.round.index];
      if (!note) throw new Error("Missing question");
      const position = positionsFor(note, 0)[0];
      if (!position) throw new Error("Missing answer");
      state = answer(state.round, position, state.progress);
      state = next(state.round, state.progress);
    }
    expect(state.round.status).toBe("complete");
    expect(state.progress.rounds).toBe(1);
    expect(next(state.round, state.progress)).toEqual(state);
  });
  it("accepts an alternate same-pitch position within review bounds", () => {
    const progress = { ...emptyProgress(), mastery: { E4: 2, B3: 3 } };
    const initial = createReviewRound(progress);
    const review: Round = { ...initial, maxFret: 5 };
    const outside = answer(review, { string: 3, fret: 9 }, progress);
    expect(outside).toEqual({ round: review, progress });
    const answered = answer(review, { string: 2, fret: 5 }, progress);
    expect(answered.round.status).toBe("correct");
    expect(answered.progress.mastery.E4).toBe(3);
    expect(answered.round.cleanAnswers).toBe(1);
    expect(answer(answered.round, { string: 2, fret: 5 }, answered.progress)).toEqual(answered);
  });

  it("updates mastery and round totals without unlocking or mutating input progress", () => {
    const progress = { ...emptyProgress(), mastery: { E4: 2, B3: 3 } };
    const original = structuredClone(progress);
    let state: ReturnType<typeof answer> = { round: createReviewRound(progress), progress };
    for (let question = 0; question < 8; question++) {
      state = answer(state.round, { string: 1, fret: 0 }, state.progress);
      expect(state.round.status).toBe("correct");
      expect(state.progress.unlocked).toBe(0);
      state = next(state.round, state.progress);
    }
    expect(state.progress.mastery).toEqual({ E4: 3, B3: 3 });
    expect(state.round.status).toBe("complete");
    expect(state.round.cleanAnswers).toBe(8);
    expect(state.progress.rounds).toBe(1);
    expect(next(state.round, state.progress)).toEqual(state);
    expect(progress).toEqual(original);
  });

  it("reuses review mistakes, help, and question resets without awarding assisted mastery", () => {
    const progress = { ...emptyProgress(), mastery: { E4: 2, B3: 3 } };
    const original = structuredClone(progress);
    let state: ReturnType<typeof answer> = { round: createReviewRound(progress), progress };
    state = answer(state.round, { string: 6, fret: 0 }, state.progress);
    expect(state.round.status).toBe("asking");
    expect(state.round.mistakes).toBe(1);
    expect(state.round.assisted).toBe(true);
    expect(state.progress.mastery.E4).toBe(0);
    state = answer(state.round, { string: 6, fret: 0 }, state.progress);
    expect(state.round.feedback).toContain("its label is showing");
    state = answer(state.round, { string: 1, fret: 0 }, state.progress);
    expect(state.round.status).toBe("correct");
    expect(state.round.cleanAnswers).toBe(0);
    expect(state.progress.mastery.E4).toBe(0);
    state = next(state.round, state.progress);
    expect(state.round).toMatchObject({ index: 1, assisted: false, mistakes: 0, status: "asking" });
    state = help(state.round, state.progress);
    expect(state.round.assisted).toBe(true);
    state = answer(state.round, { string: 1, fret: 0 }, state.progress);
    expect(state.round.cleanAnswers).toBe(0);
    expect(state.progress.mastery.E4).toBe(0);
    expect(state.progress.unlocked).toBe(0);
    expect(progress).toEqual(original);
  });
});
