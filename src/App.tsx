import { useEffect, useRef, useState } from "react";
import type { Position, Round } from "./contracts";
import { LESSONS } from "./lessons";
import { STRINGS } from "./music";
import { answer, createRound, help, next, restoreRound, revisit } from "./game";
import { createNoteAudio, loadMuted, saveMuted, type NoteAudio } from "./audio";
import { canReview, createReviewRound } from "./review";
import { loadProgress, saveProgress } from "./progress";
import { Staff } from "./components/Staff";
import { Neck } from "./components/Neck";
import { usePracticeMotion } from "./usePracticeMotion";
import type { Activity, Melody } from "./learning-contracts";
import { restoreActivity, saveActivity } from "./activity";
import { createDailyActivity, recordExposure, recordOutcome } from "./learning";
import { createMelodyActivity } from "./melody";
import { createSessionId } from "./session-id";
import { DailyPracticePanel } from "./components/DailyPracticePanel";
import { MelodyChallengePanel } from "./components/MelodyChallengePanel";
import { LearningPractice } from "./components/LearningPractice";
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
  const [lessonIndex, setLessonIndex] = useState(() => {
    const saved = loaded.progress.session;
    return Math.max(0, LESSONS.findIndex((item) => item.id === saved?.lessonId));
  });
  const [round, setRound] = useState<Round | null>(() => {
    const saved = loaded.progress.session;
    const lesson = LESSONS.find((item) => item.id === saved?.lessonId);
    return lesson && saved
      ? restoreRound(lesson, saved.queue, saved.answered, saved.index, saved.cleanAnswers, saved.bestStreak, saved.attempts)
      : null;
  });
  const [activity, setActivity] = useState(() => restoreActivity(loaded.progress.activity));
  const lessonSessionId = useRef("");
  if (!lessonSessionId.current)
    lessonSessionId.current = loaded.progress.session?.sessionId ?? createSessionId();
  useEffect(() => {
    if (!loaded.progress.session || !round) return;
    const updated = { ...loaded.progress, session: {
      ...loaded.progress.session, sessionId: lessonSessionId.current, attempts: round.attempts,
    }};
    setProgress(updated);
    setPersistent(saveProgress(updated));
  }, [loaded]);
  const [guide, setGuide] = useState(false);
  const [helpRequested, setHelpRequested] = useState(false);
  const [muted, setMuted] = useState(loadMuted);
  const [audioMessage, setAudioMessage] = useState("");
  const quizRef = useRef<HTMLElement | null>(null);
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
  function replayNote() {
    if (!target || muted) return;
    const updated = { ...progress, learning: recordExposure(progress.learning ?? {}, [target.id], Date.now()) };
    setProgress(updated);
    setPersistent(saveProgress(updated));
    void hear(target.midi);
  }
  const showGuide = guide || (!round && !activity);
  const motionScope = usePracticeMotion(showGuide, round);
  if (!lesson) return <p>Lessons are getting ready.</p>;
  function apply(result: ReturnType<typeof answer>, helpUsed = false) {
    setRound(result.round);
    let updated = result.progress;
    if (round?.status === "asking" && result.round.status === "correct" && target) {
      updated = {...updated, learning: recordOutcome(updated.learning ?? {}, {
        noteId: target.id, sessionId: lessonSessionId.current,
        clean: !round.assisted && round.mistakes === 0, now: Date.now(),
      })};
    }
    if (round?.status === "asking" && target && result.round.status === "asking" &&
      (helpUsed || result.round.mistakes > round.mistakes || (!round.assisted && result.round.assisted))) {
      updated = {...updated, learning: recordOutcome(updated.learning ?? {}, {
        noteId: target.id, sessionId: lessonSessionId.current, clean: false, now: Date.now(),
      })};
    }
    setProgress(updated);
    persistRound(result.round, updated);
  }
  function persistRound(nextRound: Round | null, currentProgress: typeof progress) {
    const session = nextRound?.mode === "lesson" && nextRound.status !== "complete"
      ? {
          lessonId: nextRound.lessonId,
          sessionId: lessonSessionId.current,
          attempts: nextRound.attempts,
          queue: nextRound.queue.map((note) => note.id),
          answered: nextRound.answered ?? Array(8).fill(false),
          index: nextRound.index,
          cleanAnswers: nextRound.cleanAnswers,
          bestStreak: nextRound.bestStreak,
        }
      : null;
    const updated = { ...currentProgress, session, activity: null };
    setProgress(updated);
    setPersistent(saveProgress(updated));
  }
  function scrollToTop() {
    quizRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function start(index: number) {
    stopAudio();
    setActivity(null);
    setHelpRequested(false);
    const selected = LESSONS[index];
    if (selected) {
      setLessonIndex(index);
      const savedSession = progress.session?.lessonId === selected.id ? progress.session : null;
      lessonSessionId.current = savedSession?.sessionId ?? createSessionId();
      const nextRound = savedSession
        ? restoreRound(selected, savedSession.queue, savedSession.answered, savedSession.index, savedSession.cleanAnswers, savedSession.bestStreak, savedSession.attempts)
        : null;
      const activeRound = nextRound ?? createRound(selected);
      setRound(activeRound);
      persistRound(activeRound, progress);
      setGuide(false);
      requestAnimationFrame(scrollToTop);
    }
  }
  function startReview() {
    if (!canReview(progress)) return;
    stopAudio();
    setHelpRequested(false);
    setActivity(null);
    lessonSessionId.current = createSessionId();
    const review = createReviewRound(progress);
    setRound(review);
    persistRound(review, progress);
    setGuide(false);
    requestAnimationFrame(scrollToTop);
  }
  function updateActivity(current: Activity, nextProgress: typeof progress) {
    setActivity(current);
    const updated = {...nextProgress, activity: saveActivity(current)};
    setProgress(updated);
    setPersistent(saveProgress(updated));
  }
  function enterActivity(current: Activity | null) {
    if (!current) return;
    stopAudio();
    setRound(null);
    setActivity(current);
    setGuide(false);
    updateActivity(current, progress);
    requestAnimationFrame(() => document.querySelector(".learning-practice")?.scrollIntoView({behavior: "smooth", block: "start"}));
  }
  function startDaily() { enterActivity(createDailyActivity(progress, Date.now(), createSessionId())); }
  function startMelody(melody: Melody) { enterActivity(createMelodyActivity(melody, createSessionId())); }
  function backToLessons() {
    setActivity(null);
    setGuide(true);
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
            aria-pressed={!muted}
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
          <DailyPracticePanel progress={progress} now={Date.now()} onStart={startDaily}
            onResume={() => enterActivity(restoreActivity(progress.activity))} />
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
                  <small>{progress.session?.lessonId === item.id ? "Continue where you left off" : item.subtitle}</small>
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
          <MelodyChallengePanel progress={progress} onStart={startMelody}
            onResume={() => enterActivity(restoreActivity(progress.activity))} />
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
          ) : activity ? (
            <LearningPractice key={activity.sessionId} activity={activity} progress={progress} muted={muted}
              onChange={updateActivity} onBack={backToLessons} />
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
            <section className="game" ref={quizRef}>
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
                <button
                  className={`note-name note-name-button${revealed ? "" : " name-hidden"}`}
                  type="button"
                  aria-label={`Play note ${target.name}`}
                  aria-hidden={!revealed}
                  disabled={!revealed || muted}
                  onClick={replayNote}
                >
                  {target.name}
                  <small aria-hidden="true">{muted ? "🔇" : "🔊"}</small>
                </button>
              </div>
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
              {round.mode === "lesson" && round.answered && (
                <nav className="question-nav" aria-label="Answered questions">
                  {round.answered.map((answered, index) => (
                    <button
                      key={index}
                      type="button"
                      className={index === round.index ? "current" : ""}
                      disabled={!answered || index === round.index}
                      aria-label={`Question ${index + 1}${answered ? ", answered" : ", unanswered"}`}
                      aria-current={index === round.index ? "step" : undefined}
                      onClick={() => {
                        stopAudio();
                        setHelpRequested(false);
                        const changed = revisit(round, index);
                        setRound(changed);
                        persistRound(changed, progress);
                      }}
                    >{index + 1}</button>
                  ))}
                </nav>
              )}
              <div className="game-actions">
                {round.status === "correct" ? (
                  <button
                    className="primary-button"
                    onClick={() => {
                      stopAudio();
                      setHelpRequested(false);
                      apply(next(round, progress));
                      requestAnimationFrame(scrollToTop);
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
                      apply(help(round, progress), true);
                      requestAnimationFrame(scrollToTop);
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
