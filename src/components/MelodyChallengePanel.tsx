import type { Progress } from "../contracts";
import type { Melody } from "../learning-contracts";
import { availableMelodies, MELODIES } from "../melodies";
import "../melody.css";

export function MelodyChallengePanel({
  progress,
  onStart,
  onResume,
}: {
  progress: Progress;
  onStart: (melody: Melody) => void;
  onResume: () => void;
}) {
  const available = new Set(availableMelodies(progress).map((melody) => melody.id));
  const resumable = progress.activity?.kind === "melody" &&
    MELODIES.some((melody) => melody.id === progress.activity?.melodyId && available.has(melody.id));
  return (
    <section className="melody-challenges" aria-labelledby="melody-challenges-title">
      <h2 id="melody-challenges-title">Melody challenges</h2>
      <p>Read a short phrase, one note at a time. Take as long as you like.</p>
      {resumable && <button className="melody-resume" type="button" onClick={onResume}>Resume melody</button>}
      <div className="melody-list">
        {MELODIES.map((melody) => (
          <button
            key={melody.id}
            type="button"
            className="melody-entry"
            disabled={!available.has(melody.id)}
            onClick={() => onStart(melody)}
            aria-label={`${melody.title}, ${melody.noteIds.length} notes${available.has(melody.id) ? "" : ", locked"}`}
          >
            <span><strong>{melody.title}</strong><small>{melody.noteIds.length} notes</small></span>
            <span aria-hidden="true">{available.has(melody.id) ? "→" : "○"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
