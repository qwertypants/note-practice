export interface NoteAudio {
  play(midi: number): Promise<boolean>;
  stop(): void;
  dispose(): void;
}

const MUTED_KEY = "note-practice:muted:v1";

export function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveMuted(muted: boolean): boolean {
  try {
    localStorage.setItem(MUTED_KEY, JSON.stringify(muted));
    return true;
  } catch {
    return false;
  }
}

export function createNoteAudio(): NoteAudio {
  let synth: PluckSynth | undefined;
  let disposed = false;
  let cancelPending: (() => void) | undefined;
  let releaseVoice: (() => void) | undefined;

  function stop() {
    cancelPending?.();
    cancelPending = undefined;
    releaseVoice?.();
    releaseVoice = undefined;
  }

  return {
    async play(midi) {
      stop();
      if (disposed || !Number.isFinite(midi) || midi < 0 || midi > 127)
        return false;
      let cancelled = false;
      const cancellation = new Promise<false>((resolve) => {
        cancelPending = () => {
          cancelled = true;
          resolve(false);
        };
      });
      let cleanup: (() => void) | undefined;
      try {
        const started = await Promise.race([
          start().then(() => true),
          cancellation,
        ]);
        if (!started || cancelled || disposed) return false;
        synth ??= new PluckSynth().toDestination();
        const time = now();
        synth.triggerAttack(440 * 2 ** ((midi - 69) / 12), time);
        cleanup = () => {
          synth?.triggerRelease(now());
          if (releaseVoice === cleanup) releaseVoice = undefined;
        };
        releaseVoice = cleanup;
        return true;
      } catch {
        cleanup?.();
        return false;
      } finally {
        if (!cancelled) cancelPending = undefined;
      }
    },
    stop,
    dispose() {
      if (disposed) return;
      disposed = true;
      stop();
      synth?.dispose();
      synth = undefined;
    },
  };
}
import { PluckSynth, start, now } from "tone";
