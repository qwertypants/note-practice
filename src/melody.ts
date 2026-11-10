import type { Activity, LearningSkill, Melody } from "./learning-contracts";
import { melodyNotes } from "./melodies";

export function createMelodyActivity(
  melody: Melody,
  sessionId: string,
  skill: LearningSkill = "fretboard",
): Activity {
  const notes = melodyNotes(melody);
  if (notes.length === 0) throw new Error("A melody needs at least one note");
  return {
    kind: "melody",
    sessionId,
    melodyId: melody.id,
    notes,
    maxFret: melody.maxFret,
    index: 0,
    answered: notes.map(() => false),
    assisted: notes.map(() => false),
    mistakes: notes.map(() => false),
    skill,
    retentionDays: 0,
    status: "asking",
    feedback: "Read the marked note and play at your own pace.",
  };
}

export function assistActivity(activity: Activity, allRemaining = false): Activity {
  if (activity.status === "complete") return activity;
  const assisted = activity.assisted.map((value, index) =>
    value || (!activity.answered[index] &&
      (allRemaining ? index > activity.index || (index === activity.index && activity.status === "asking") :
        index === activity.index && activity.status === "asking")),
  );
  return { ...activity, assisted };
}

export function advanceActivity(activity: Activity): Activity {
  if (activity.status !== "correct" || activity.answered[activity.index]) return activity;
  const answered = activity.answered.map((value, index) => value || index === activity.index);
  if (activity.index >= activity.notes.length - 1) {
    return { ...activity, answered, status: "complete", feedback: "Phrase complete. Nice playing." };
  }
  return {
    ...activity,
    answered,
    index: activity.index + 1,
    status: "asking",
    feedback: "Read the marked note and keep going.",
  };
}
