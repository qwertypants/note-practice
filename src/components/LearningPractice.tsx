import { useEffect, useRef, useState } from "react";
import type { Progress } from "../contracts";
import type { Activity } from "../learning-contracts";
import { answerActivity } from "../activity";
import { assistActivity, advanceActivity } from "../melody";
import { recordExposure, recordOutcome } from "../learning";
import { MELODIES } from "../melodies";
import { noteAt } from "../music";
import { createNoteAudio, type NoteAudio } from "../audio";
import { Staff } from "./Staff";
import { Neck } from "./Neck";
import { MelodyStaff } from "./MelodyStaff";

export function LearningPractice({activity, progress, muted, onChange, onBack}: {
  activity: Activity;
  progress: Progress;
  muted: boolean;
  onChange: (activity: Activity, progress: Progress) => void;
  onBack: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [audioMessage, setAudioMessage] = useState("");
  const audio = useRef<NoteAudio | null>(null);
  const playbackId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const latest = useRef({activity, progress, onChange});
  latest.current = {activity, progress, onChange};
  const itemId = `${activity.sessionId}:${activity.index}`;
  const target = activity.notes[activity.index];

  function submit(midi: number) {
    const current = latest.current;
    if (document.hidden) return;
    const result = answerActivity(current.activity, midi, current.progress, Date.now());
    // Update the ref immediately: two taps in the same React batch cannot score twice.
    latest.current = {...current, activity: result.activity, progress: result.progress};
    current.onChange(result.activity, result.progress);
  }
  function stopPlayback() {
    playbackId.current++;
    audio.current?.stop();
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
    setPlaying(false);
  }
  useEffect(() => {
    const player = createNoteAudio();
    audio.current = player;
    return () => {
      playbackId.current++;
      player.dispose();
      audio.current = null;
      for (const timer of timers.current) clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    stopPlayback();
  }, [itemId, activity.status, muted]);
  useEffect(() => {
    const onHidden = () => { if (document.hidden) stopPlayback(); };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, []);

  function help() {
    if (!target || activity.status !== "asking") return;
    const assisted = assistActivity(activity);
    const learning = recordOutcome(progress.learning ?? {}, {noteId: target.id, sessionId: activity.sessionId, clean: false, now: Date.now()});
    onChange({...assisted, feedback: `Look for ${target.name}. Its label is showing on the neck.`}, {...progress, learning});
  }
  async function hear(phrase: boolean) {
    if (!target || muted) return;
    stopPlayback();
    const assisted = assistActivity(activity, phrase);
    const learning = recordExposure(progress.learning ?? {},
      (phrase ? activity.notes : [target]).map(note => note.id), Date.now());
    const updated = { ...progress, learning };
    latest.current = { ...latest.current, activity: assisted, progress: updated };
    onChange(assisted, updated);
    const version = ++playbackId.current;
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
    setPlaying(true);
    setAudioMessage("");
    const player = audio.current;
    const played = phrase ? await player?.playPhrase(activity.notes.map(note => note.midi)) : await player?.play(target.midi);
    if (version !== playbackId.current) return;
    if (!played) setAudioMessage("Sound is unavailable right now. You can keep practicing.");
    if (phrase || !played) stopPlayback();
    else timers.current.push(setTimeout(stopPlayback, 700));
  }
  if (!target) return null;
  const revealed = activity.assisted[activity.index] || activity.status !== "asking";
  const title = activity.kind === "daily" ? "Today's practice" : MELODIES.find(melody => melody.id === activity.melodyId)?.title ?? "Melody challenge";
  if (activity.status === "complete") return <section className="summary learning-practice">
    <span className="tag">{title}</span>
    <h2>{activity.kind === "daily" ? "A little more familiar." : "You made a melody."}</h2>
    <p>{activity.notes.length} notes practiced at your own pace.</p>
    <p>{activity.answered.filter((answered, index) => answered && !activity.assisted[index]).length} first-try finds.</p>
    {activity.retentionDays > 0 && <p>You remembered a note after {activity.retentionDays} {activity.retentionDays === 1 ? "day" : "days"}.</p>}
    <p>Come back another day to see what you remember.</p>
    {activity.kind === "melody" && <button className="quiet-button" disabled={muted} onClick={() => void hear(true)}>Hear the phrase again</button>}
    {playing && <button className="quiet-button" onClick={stopPlayback}>Stop playback</button>}
    <button className="primary-button" onClick={onBack}>Back to lessons</button>
  </section>;
  return <section className="game learning-practice" aria-label={title}>
    <div className="game-heading"><span className="tag">{title}</span><span>{activity.index + 1} / {activity.notes.length} notes</span></div>
    <h2>{activity.status === "correct" ? "That's the one!" : activity.kind === "daily" ? "Where does this note live?" : "Find the marked note."}</h2>
    <p>Read the note, then tap its place on the neck. No instrument needed.</p>
    {activity.kind === "melody" ? <MelodyStaff notes={activity.notes} index={activity.index} reveal={revealed} /> : <Staff note={target} reveal={revealed} />}
    <div className="learning-audio-actions">
      {activity.kind === "melody" && <button className="quiet-button" disabled={muted || playing} onClick={() => void hear(true)}>Hear the phrase</button>}
      {revealed && <button className="quiet-button" disabled={muted || playing} onClick={() => void hear(false)}>Hear this note</button>}
      {playing && <button className="quiet-button" onClick={stopPlayback}>Stop playback</button>}
    </div>
    <p role="status" className="audio-status">{audioMessage}</p>
    <Neck target={target} maxFret={activity.maxFret} hints={revealed} reveal={revealed}
      disabled={activity.status !== "asking" || playing} onAnswer={position => submit(noteAt(position).midi)} />
    <p className="feedback" role="status">{activity.feedback || "Take your time. Help is always here."}</p>
    <div className="game-actions">
      {activity.status === "correct" ? <button className="primary-button" onClick={() => {
        stopPlayback();
        const next = advanceActivity(activity);
        onChange(next, next.status === "complete" ? {...progress, rounds: progress.rounds + 1} : progress);
      }}>{activity.index === activity.notes.length - 1 ? "See my progress" : "Next note"}</button> :
        <button className="help-button" onClick={help}>A little help</button>}
      <button className="quiet-button" onClick={onBack}>Back to lessons</button>
    </div>
  </section>;
}
