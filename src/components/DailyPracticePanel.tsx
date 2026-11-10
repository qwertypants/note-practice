import type { Progress } from "../contracts";
import { createDailyActivity, dailyDueCount } from "../learning";
import "./DailyPracticePanel.css";

interface DailyPracticePanelProps {
  progress: Progress;
  onStart: () => void;
  onResume: () => void;
  now: number;
}

export function DailyPracticePanel({ progress, onStart, onResume, now }: DailyPracticePanelProps) {
  const canStart = createDailyActivity(progress, now, "preview") !== null;
  const due = dailyDueCount(progress, now);
  const resumable = progress.activity?.kind === "daily";
  return (
    <section className="daily-practice-panel" aria-labelledby="daily-practice-title">
      <h2 id="daily-practice-title">Today’s practice</h2>
      {canStart ? (
        <>
          <p>Eight notes at your own pace.{due > 0 ? ` ${due} ${due === 1 ? "note is" : "notes are"} due to revisit.` : ""}</p>
          <div className="daily-practice-actions">
            <button className="primary-button" type="button" onClick={onStart}>Start today’s practice</button>
            {resumable && <button className="quiet-button" type="button" onClick={onResume}>Resume practice</button>}
          </div>
        </>
      ) : (
        <p>Begin with the first lesson. After you’ve tried a note, today’s practice will revisit what you’re learning.</p>
      )}
    </section>
  );
}
