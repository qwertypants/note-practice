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
  let context: AudioContext | undefined;
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
        context ??= new AudioContext();
        const current = context;
        if (current.state !== "running") {
          const resumed = await Promise.race([
            current.resume().then(() => true),
            cancellation,
          ]);
          if (!resumed || cancelled || disposed) return false;
        }
        if (current.state !== "running" || cancelled || disposed) return false;
        const oscillator = current.createOscillator();
        cleanup = () => oscillator.disconnect();
        const gain = current.createGain();
        let started = false;
        let released = false;
        cleanup = () => {
          if (released) return;
          released = true;
          oscillator.onended = null;
          if (started) {
            try { oscillator.stop(); } catch { /* Already ended. */ }
          }
          oscillator.disconnect();
          gain.disconnect();
          if (releaseVoice === cleanup) releaseVoice = undefined;
        };
        const now = current.currentTime;
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(440 * 2 ** ((midi - 69) / 12), now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
        oscillator.connect(gain);
        gain.connect(current.destination);
        oscillator.onended = cleanup;
        oscillator.start(now);
        started = true;
        oscillator.stop(now + 0.7);
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
      const previous = context;
      context = undefined;
      try {
        void previous?.close().catch(() => {});
      } catch { /* Audio failures must not interrupt practice. */ }
    },
  };
}
