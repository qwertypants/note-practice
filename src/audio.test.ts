import { afterEach, describe, expect, it, vi } from "vitest";
const tone = vi.hoisted(() => ({
  start: vi.fn(async () => {}), now: vi.fn(() => 10),
  attack: vi.fn(), release: vi.fn(), dispose: vi.fn(), ampDispose: vi.fn(), destination: vi.fn(), connect: vi.fn(),
  synthOptions: vi.fn(), ampOptions: vi.fn(),
}));
vi.mock("tone", () => ({
  start: tone.start, now: tone.now,
  Distortion: class {
    constructor(options: unknown) { tone.ampOptions(options); }
    toDestination() { tone.destination(); return this; }
    dispose = tone.ampDispose;
  },
  PluckSynth: class {
    constructor(options: unknown) { tone.synthOptions(options); }
    connect(amp: unknown) { tone.connect(amp); return this; }
    triggerAttack = tone.attack;
    triggerRelease = tone.release;
    dispose = tone.dispose;
  },
}));
import { createNoteAudio, loadMuted, saveMuted } from "./audio";

afterEach(() => {
  vi.unstubAllGlobals(); vi.clearAllMocks();
  tone.start.mockResolvedValue(undefined); tone.now.mockReturnValue(10);
});

describe("mute preference", () => {
  it("saves and loads muted state while tolerating unavailable storage", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
    expect(loadMuted()).toBe(false);
    expect(saveMuted(true)).toBe(true);
    expect(loadMuted()).toBe(true);
    vi.stubGlobal("localStorage", undefined);
    expect(loadMuted()).toBe(false);
    expect(saveMuted(false)).toBe(false);
  });
});

describe("note audio", () => {
  it("creates a pluck lazily at the requested sounding MIDI pitch", async () => {
    const audio = createNoteAudio();
    expect(tone.destination).not.toHaveBeenCalled();
    expect(await audio.play(69)).toBe(true);
    expect(tone.destination).toHaveBeenCalledOnce();
    expect(tone.synthOptions).toHaveBeenCalledWith({ attackNoise: 0.45, dampening: 2600, resonance: 0.88, release: 0.7 });
    expect(tone.ampOptions).toHaveBeenCalledWith({ distortion: 0.12, wet: 0.25 });
    expect(tone.connect).toHaveBeenCalledOnce();
    expect(tone.attack).toHaveBeenCalledWith(440, 10);
    expect(await audio.play(64)).toBe(true);
    expect(tone.attack).toHaveBeenLastCalledWith(440 * 2 ** ((64 - 69) / 12), 10);
    expect(tone.release).toHaveBeenCalledWith(10);
  });

  it("stops a pending start and does not play after cancellation", async () => {
    let resolveStart!: () => void;
    tone.start.mockImplementationOnce(() => new Promise<void>((resolve) => { resolveStart = resolve; }));
    const audio = createNoteAudio();
    const pending = audio.play(69);
    audio.stop();
    expect(await pending).toBe(false);
    resolveStart();
    await Promise.resolve();
    expect(tone.attack).not.toHaveBeenCalled();
  });

  it("rejects invalid MIDI, handles Tone failures, and disposes idempotently", async () => {
    const audio = createNoteAudio();
    for (const midi of [NaN, Infinity, -1, 128]) expect(await audio.play(midi)).toBe(false);
    expect(tone.start).not.toHaveBeenCalled();
    tone.start.mockRejectedValueOnce(Error("blocked"));
    expect(await audio.play(69)).toBe(false);
    expect(await audio.play(69)).toBe(true);
    audio.dispose(); audio.dispose();
    expect(tone.release).toHaveBeenCalled();
    expect(tone.dispose).toHaveBeenCalledOnce();
    expect(tone.ampDispose).toHaveBeenCalledOnce();
    expect(await audio.play(69)).toBe(false);
  });
});
