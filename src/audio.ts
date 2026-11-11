import { Sampler, start, now } from "tone";

export interface NoteAudio {
  play(midi: number): Promise<boolean>;
  playPhrase(midis: number[]): Promise<boolean>;
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

  let sequenceVersion = 0;
  let cancelWait: (() => void) | undefined;

  function stopVoice() {
    cancelPending?.();
    cancelPending = undefined;
    releaseVoice?.();
    releaseVoice = undefined;
  }

  function stop() {
    sequenceVersion++;
    cancelWait?.();
    cancelWait = undefined;
    stopVoice();
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

  async function playNote(midi: number): Promise<boolean> {
      stopVoice();
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
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const deadline = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Audio startup timed out")), 8000);
      });
      try {
        const started = await Promise.race([
          start().then(() => true),
          cancellation, deadline,
        ]);
        if (!started || cancelled || disposed) return false;
        const loaded = await Promise.race([loadGuitar().then(() => true), cancellation, deadline]);
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
        clearTimeout(timeout);
        if (!cancelled) cancelPending = undefined;
      }
  }
  return {
    play(midi) {
      stop();
      return playNote(midi);
    },
    async playPhrase(midis) {
      stop();
      if (!midis.length || midis.some(midi => !Number.isFinite(midi) || midi < 0 || midi > 127)) return false;
      const version = sequenceVersion;
      for (const midi of midis) {
        if (version !== sequenceVersion || disposed || !await playNote(midi)) return false;
        if (version !== sequenceVersion || disposed) return false;
        const finished = await new Promise<boolean>(resolve => {
          const timer = setTimeout(() => { cancelWait = undefined; resolve(true); }, 600);
          cancelWait = () => { clearTimeout(timer); resolve(false); };
        });
        if (!finished || version !== sequenceVersion || disposed) return false;
        stopVoice();
      }
      return true;
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
