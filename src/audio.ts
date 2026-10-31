import { Sampler, start, now } from "tone";

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
  let sampler: Sampler | undefined;
  let samplerReady: Promise<void> | undefined;
  let disposed = false;
  let cancelPending: (() => void) | undefined;
  let releaseVoice: (() => void) | undefined;

  function stop() {
    cancelPending?.();
    cancelPending = undefined;
    releaseVoice?.();
    releaseVoice = undefined;
  }

  function loadGuitar() {
    if (!samplerReady) {
      samplerReady = new Promise<void>((resolve, reject) => {
        sampler = new Sampler({
          urls: { 40: "E2.mp3", 45: "A2.mp3", 50: "D3.mp3", 55: "G3.mp3", 59: "B3.mp3", 64: "E4.mp3" },
          baseUrl: `${import.meta.env.BASE_URL}guitar/`,
          attack: 0,
          release: 0.06,
          onload: resolve,
          onerror: reject,
        }).toDestination();
      });
    }
    return samplerReady;
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
        const loaded = await Promise.race([loadGuitar().then(() => true), cancellation]);
        if (!loaded || cancelled || disposed) return false;
        const time = now();
        sampler?.triggerAttack(440 * 2 ** ((midi - 69) / 12), time);
        cleanup = () => {
          sampler?.releaseAll(now());
          if (releaseVoice === cleanup) releaseVoice = undefined;
        };
        releaseVoice = cleanup;
        return true;
      } catch {
        cleanup?.();
        if (!sampler?.loaded) {
          sampler?.dispose();
          sampler = undefined;
          samplerReady = undefined;
        }
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
      sampler?.dispose();
      sampler = undefined;
      samplerReady = undefined;
    },
  };
}
