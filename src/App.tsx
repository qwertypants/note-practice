import { useEffect, useRef, useState } from "react";
import type { Position, Round } from "./contracts";
import { LESSONS } from "./lessons";
import { STRINGS } from "./music";
import { answer, createRound, help, next } from "./game";
import { createNoteAudio, loadMuted, saveMuted, type NoteAudio } from "./audio";
import { canReview, createReviewRound } from "./review";
import { loadProgress, saveProgress } from "./progress";
import { Staff } from "./components/Staff";
import { Neck } from "./components/Neck";
import { usePracticeMotion } from "./usePracticeMotion";
import "./styles.css";

function Sun({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "sun sun-small" : "sun"}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <g fill="#efc74e">
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse
            key={i}
            cx="50"
            cy="21"
            rx="12"
            ry="20"
            transform={`rotate(${i * 45} 50 50)`}
          />
        ))}
      </g>
      <circle cx="50" cy="50" r="24" fill="#f6db78" />
      <circle cx="42" cy="47" r="2.4" fill="currentColor" />
      <circle cx="58" cy="47" r="2.4" fill="currentColor" />
      <path
        d="M41 57 Q50 65 59 57"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function App() {
  const [loaded] = useState(loadProgress);
  const [progress, setProgress] = useState(loaded.progress);
  const [persistent, setPersistent] = useState(loaded.persistent);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [round, setRound] = useState<Round | null>(null);
  const [guide, setGuide] = useState(false);
  const [helpRequested, setHelpRequested] = useState(false);
  const [muted, setMuted] = useState(loadMuted);
  const [audioMessage, setAudioMessage] = useState("");
  const audio = useRef<NoteAudio | null>(null);
  const playbackVersion = useRef(0);
  useEffect(() => {
    const player = createNoteAudio();
    audio.current = player;
    return () => {
      playbackVersion.current++;
      player.dispose();
      audio.current = null;
    };
  }, []);
  function stopAudio() {
    playbackVersion.current++;
    audio.current?.stop();
    setAudioMessage("");
  }
  async function hear(midi: number) {
    if (muted || !audio.current) return;
    const version = ++playbackVersion.current;
    setAudioMessage("");
    const played = await audio.current.play(midi);
    if (version === playbackVersion.current && !played)
      setAudioMessage("Sound is unavailable right now. You can keep practicing.");
  }
  function toggleMuted() {
    stopAudio();
    const value = !muted;
    setMuted(value);
    if (!saveMuted(value))
      setAudioMessage("Your sound preference will last for this visit.");
  }
  function toggleGuide() {
    stopAudio();
    setGuide(!guide);
  }
  const lesson = LESSONS[lessonIndex];
  const target = round?.queue[round.index];
  const showGuide = guide || !round;
  const motionScope = usePracticeMotion(showGuide, round);
  if (!lesson) return <p>Lessons are getting ready.</p>;
  function apply(result: ReturnType<typeof answer>) {
    setRound(result.round);
    setProgress(result.progress);
    setPersistent(saveProgress(result.progress));
  }
  function start(index: number) {
    stopAudio();
    setHelpRequested(false);
    const selected = LESSONS[index];
    if (selected) {
      setLessonIndex(index);
      setRound(createRound(selected));
      setGuide(false);
    }
  }
  function startReview() {
    if (!canReview(progress)) return;
    stopAudio();
    setHelpRequested(false);
    setRound(createReviewRound(progress));
    setGuide(false);
  }
  const reviewing = round?.mode === "review";
  const unlockedNotes = LESSONS.slice(0, progress.unlocked + 1).flatMap((item) => item.notes);
  const hasWeakNotes = unlockedNotes.some((note) => (progress.mastery[note.id] ?? 0) < 3);
  function tap(position: Position) {
    if (!round) return;
    const result = answer(round, position, progress);
    apply(result);
    if (round.status === "asking" && result.round.status === "correct" && target)
      void hear(target.midi);
  }
  const revealed = !!round && (helpRequested || round.status === "correct");
  return (
    <div className="app-shell" ref={motionScope}>
      <header className="topbar">
        <a
          className="wordmark"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            stopAudio();
            setGuide(true);
          }}
        >
          <Sun small />
          little frets<span className="wordmark-dot">.</span>
        </a>
        <div className="topbar-actions">
          <button
            className="quiet-button"
            onClick={toggleMuted}
            aria-pressed={muted}
            aria-label="Mute sound"
          >
            {muted ? "Sound off" : "Sound on"}
          </button>
          <button className="quiet-button" onClick={toggleGuide}>
            {guide && round ? "Back to practice ↗" : "How to play ↗"}
          </button>
        </div>
      </header>
      <div className="app-layout">
        <aside className="journey">
          <p className="eyebrow">A LITTLE EVERY DAY</p>
          <h1>
            Find your
            <br />
            <em>musical feet.</em>
          </h1>
          <p className="aside-copy">
            Small notes. Happy discoveries.
            <br />
            Your own kind of progress.
          </p>
          <div className="lesson-list" aria-label="Lessons">
            {LESSONS.map((item, index) => (
              <button
                key={item.id}
                className={`lesson-chip ${!reviewing && lessonIndex === index ? "selected" : ""}`}
                disabled={index > progress.unlocked}
                onClick={() => start(index)}
              >
                <span className="lesson-number">
                  {index > progress.unlocked
                    ? "⌑"
                    : String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <b>{item.title}</b>
                  <small>{item.subtitle}</small>
                </span>
                <span className="lesson-arrow">
                  {index > progress.unlocked ? "Locked" : "↗"}
                </span>
              </button>
            ))}
          </div>
          <div className="review-entry">
            <button className="quiet-button" disabled={!canReview(progress)} onClick={startReview}>
              {hasWeakNotes ? "Practice my weak notes" : "Review all learned notes"}
            </button>
            {!canReview(progress) && <p>Try a note in a lesson to unlock personalized review.</p>}
          </div>
          <div className="save-note">
            <span>◌</span>
            <p>
              {persistent
                ? "Your progress stays in this browser."
                : "Practice freely. Progress cannot be saved in this browser right now."}
              <small>No account. Just you and the notes.</small>
            </p>
          </div>
        </aside>
        <main className="practice-panel">
          {showGuide ? (
            <section className="guide">
              <div className="guide-top">
                <span className="tag">YOUR FIRST TWO NOTES</span>
                <Sun />
              </div>
              <h2>
                A little practice.
                <br />A lot of possibility.
              </h2>
              <p>
                You don’t need a guitar. Just curious eyes and a finger ready to
                tap.
              </p>
              <div className="guide-notes">
                {LESSONS[0]?.notes.map((note) => (
                  <div key={note.id}>
                    <Staff note={note} reveal compact />
                    <b>{note.name}</b>
                    <small>
                      {note.name === "E" ? "High E · string 1" : "B · string 2"}
                    </small>
                  </div>
                ))}
              </div>
              <div
                className="first-neck"
                aria-label="Open string orientation, low E left and high E right"
              >
                <span className="eyebrow">OPEN STRINGS · FRET 0</span>
                <div>
                  {STRINGS.map((string) => (
                    <span
                      className={string.string <= 2 ? "first-neck-target" : ""}
                      key={string.string}
                    >
                      <b>
                        {string.string === 6 || string.string === 1
                          ? "E"
                          : string.name}
                      </b>
                      <small>
                        {string.string === 6
                          ? "low"
                          : string.string === 1
                            ? "high"
                            : `str ${string.string}`}
                      </small>
                    </span>
                  ))}
                </div>
                <p>↑ nut · Start with the two sunny circles: B and high E.</p>
              </div>
              <div className="guide-steps">
                <p>
                  <span>1</span>
                  <span>
                    <b>Look at the staff.</b> Music lives on five lines and the
                    spaces between. Notice where E and B sit.
                  </span>
                </p>
                <p>
                  <span>2</span>
                  <span>
                    <b>Find it on the neck.</b> Low E is on the left, high E on
                    the right. The thick nut is at the top; the circles above it
                    are open strings (fret 0).
                  </span>
                </p>
                <p>
                  <span>3</span>
                  <span>
                    <b>Tap, learn, repeat.</b> Tap an open-string circle to
                    answer. Need a hand? Help is always here. Names stay hidden until you ask for help
                    or find the note.
                  </span>
                </p>
              </div>
              <button
                className="primary-button"
                onClick={() => (round ? setGuide(false) : start(0))}
              >
                {round ? "Back to my notes" : "Let’s find a note"}{" "}
                <span>→</span>
              </button>
              <p className="gentle-note">
                No timer. No lives. All the room to learn.
              </p>
            </section>
          ) : round?.status === "complete" ? (
            <section className="summary">
              <Sun />
              <span className="eyebrow">ONE LITTLE STEP FORWARD</span>
              <h2>{reviewing ? "A little more familiar." : "Look at you grow."}</h2>
              <p>Eight notes practiced. A little more familiar than before.</p>
              <div className="summary-stats">
                <div>
                  <b>{round.cleanAnswers}/8</b>
                  <span>first-try finds</span>
                </div>
                <div>
                  <b>{round.bestStreak}</b>
                  <span>best streak</span>
                </div>
              </div>
              <p className="summary-message">
                {reviewing
                  ? "Your review is complete. Revisit these notes or return to your lessons."
                  : !LESSONS[lessonIndex + 1]
                  ? "You’ve reached the last lesson. Revisit any notes whenever you like."
                  : progress.unlocked > lessonIndex
                    ? "Your next lesson is ready whenever you are."
                    : "Keep visiting these notes. Three first-try finds for each note opens the next lesson."}
              </p>
              <button
                className="primary-button"
                onClick={() => reviewing ? startReview() : start(lessonIndex)}
              >
                {reviewing ? "Review again" : "Practice again"} <span>↻</span>
              </button>
              {reviewing && (
                <button className="quiet-button" onClick={() => start(lessonIndex)}>Back to lessons →</button>
              )}
              {!reviewing && progress.unlocked > lessonIndex && LESSONS[lessonIndex + 1] && (
                <button
                  className="quiet-button"
                  onClick={() => start(lessonIndex + 1)}
                >
                  Try the next lesson →
                </button>
              )}
            </section>
          ) : round && target ? (
            <section className="game">
              <div className="game-heading">
                <span className="tag">{reviewing ? "Personalized review" : lesson.title}</span>
                <span className="question-count">
                  {round.index + 1} <span>/ 8 notes</span>
                </span>
              </div>
              <div
                className="progress-track"
                aria-label={`Question ${round.index + 1} of 8`}
              >
                {Array.from({ length: 8 }, (_, i) => (
                  <span
                    key={i}
                    className={
                      i < round.index ||
                      (i === round.index && round.status === "correct")
                        ? "filled"
                        : i === round.index
                          ? "current"
                          : ""
                    }
                  />
                ))}
              </div>
              <div className="question-title">
                <h2>
                  {round.status === "correct"
                    ? "That’s the one!"
                    : "Where does this note live?"}
                </h2>
                <p>
                  {round.status === "correct"
                    ? "Take a breath. You’re making music make sense."
                    : "Read the note, then tap its place on the neck."}
                </p>
              </div>
              <div className="staff-card">
                <Staff note={target} reveal={revealed} />
                <div
                  className={`note-name ${revealed ? "" : "name-hidden"}`}
                >
                  {revealed
                    ? target.name
                    : "Your eyes have got this"}
                  <small>
                    {revealed ? "note name" : "name hint tucked away"}
                  </small>
                </div>
              </div>
              <button className="help-button hear-note" disabled={muted} onClick={() => void hear(target.midi)}>
                Hear this note
              </button>
              <p className="audio-status" role="status">{audioMessage}</p>
              <div className="neck-label">
                <b>Your guitar neck</b>
                <span>nut at the top ↓</span>
              </div>
              <Neck
                target={target}
                maxFret={round.maxFret}
                hints={revealed}
                reveal={revealed}
                disabled={round.status === "correct"}
                onAnswer={tap}
              />
              <div
                className={`feedback ${round.status === "correct" ? "feedback-correct" : ""}`}
                role="status"
                aria-live="polite"
              >
                {round.feedback || "A small guess is a good place to start."}
                {round.streak > 1 && (
                  <span className="streak">{round.streak} in a row ✦</span>
                )}
              </div>
              <div className="game-actions">
                {round.status === "correct" ? (
                  <button
                    className="primary-button"
                    onClick={() => {
                      stopAudio();
                      setHelpRequested(false);
                      apply(next(round, progress));
                    }}
                  >
                    {round.index === 7 ? "See my progress" : "Next note"}{" "}
                    <span>→</span>
                  </button>
                ) : (
                  <button
                    className="help-button"
                    onClick={() => {
                      setHelpRequested(true);
                      apply(help(round, progress));
                    }}
                  >
                    <span>✧</span> A little help
                  </button>
                )}
                <span className="no-rush">
                  Take your time. This is practice.
                </span>
              </div>
            </section>
          ) : null}
        </main>
      </div>
      <footer>
        A small space to learn something lovely.{" "}
        <span>MADE FOR YOUR OWN PACE</span>
      </footer>
    </div>
  );
}
