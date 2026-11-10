import { describe, expect, it } from "vitest";
import { answerActivity, restoreActivity, saveActivity } from "./activity";
import { createMelodyActivity } from "./melody";
import { MELODIES } from "./melodies";
import { emptyProgress } from "./progress";

function activity() { return createMelodyActivity(MELODIES[0]!, "session-1"); }
describe("activity scoring", () => {
  it("credits an item once and rejects wrong octaves", () => {
    const current = activity();
    const target = current.notes[0]!;
    const wrong = answerActivity(current, target.midi - 12, emptyProgress(), 1000);
    expect(wrong.activity.status).toBe("asking");
    expect(wrong.activity.assisted[0]).toBe(true);
    const right = answerActivity(current, target.midi, emptyProgress(), 1000);
    expect(right.activity.status).toBe("correct");
    expect(right.progress.mastery[target.id]).toBe(1);
    const duplicate = answerActivity(right.activity, target.midi, right.progress, 1001);
    expect(duplicate.progress).toBe(right.progress);
  });
  it("persists assistance across reload and never recreates a clean answer", () => {
    const current = activity();
    current.assisted[0] = true;
    const restored = restoreActivity(saveActivity(current));
    expect(restored?.assisted[0]).toBe(true);
    const result = answerActivity(restored!, current.notes[0]!.midi, emptyProgress(), 1000);
    expect(result.progress.mastery[current.notes[0]!.id]).toBe(0);
    expect(result.progress.learning?.[current.notes[0]!.id]?.stage).toBe(0);
  });
  it("refuses a changed or unknown saved melody", () => {
    const saved = saveActivity(activity())!;
    expect(restoreActivity({...saved, melodyId: "missing"})).toBeNull();
    expect(restoreActivity({...saved, noteIds: saved.noteIds.toReversed()})).toBeNull();
  });
});
