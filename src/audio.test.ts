import { afterEach, describe, expect, it, vi } from "vitest";
const tone = vi.hoisted(() => ({
  start: vi.fn(async () => {}), now: vi.fn(() => 10),
  attack: vi.fn(), releaseAll: vi.fn(), dispose: vi.fn(), destination: vi.fn(),
  samplerOptions: vi.fn(), ready: vi.fn((onload: () => void, _onerror: (error: Error) => void) => queueMicrotask(onload)),
}));
vi.mock("tone", () => ({
  start: tone.start, now: tone.now,
  Sampler: class {
    loaded = false;
    constructor(options: { onload: () => void; onerror: (error: Error) => void }) {
      tone.samplerOptions(options);
      tone.ready(() => { this.loaded = true; options.onload(); }, options.onerror);
    }
    toDestination() { tone.destination(); return this; }
    triggerAttack = tone.attack;
    releaseAll = tone.releaseAll;
    dispose = tone.dispose;
  },
}));
import { createNoteAudio, loadMuted, saveMuted } from "./audio";

afterEach(() => {
  vi.unstubAllGlobals(); vi.clearAllMocks();
  tone.start.mockResolvedValue(undefined); tone.now.mockReturnValue(10);
  tone.ready.mockImplementation((onload) => queueMicrotask(onload));
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
  it("loads recorded guitar strings lazily at the requested sounding MIDI pitch", async () => {
    const audio = createNoteAudio();
    expect(tone.destination).not.toHaveBeenCalled();
    expect(await audio.play(69)).toBe(true);
    expect(tone.destination).toHaveBeenCalledOnce();
    expect(tone.samplerOptions).toHaveBeenCalledWith(expect.objectContaining({
      urls: { 40: "E2.mp3", 45: "A2.mp3", 50: "D3.mp3", 55: "G3.mp3", 59: "B3.mp3", 64: "E4.mp3" },
      baseUrl: expect.stringMatching(/guitar\/$/),
    }));
    expect(tone.attack).toHaveBeenCalledWith(440, 10);
    expect(await audio.play(64)).toBe(true);
    expect(tone.attack).toHaveBeenLastCalledWith(440 * 2 ** ((64 - 69) / 12), 10);
    expect(tone.releaseAll).toHaveBeenCalledWith(10);
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

  it("stops a pending sample download and does not play when it finishes", async () => {
    let finishLoad!: () => void;
    tone.ready.mockImplementationOnce((onload) => { finishLoad = onload; });
    const audio = createNoteAudio();
    const pending = audio.play(64);
    await vi.waitFor(() => expect(tone.ready).toHaveBeenCalledOnce());
    audio.stop();
    expect(await pending).toBe(false);
    finishLoad();
    await Promise.resolve();
    expect(tone.attack).not.toHaveBeenCalled();
    audio.dispose();
  });

  it("can retry after a sample fails to load", async () => {
    tone.ready.mockImplementationOnce((_onload, onerror) => queueMicrotask(() => onerror(Error("missing sample"))));
    const audio = createNoteAudio();
    expect(await audio.play(64)).toBe(false);
    expect(await audio.play(64)).toBe(true);
    expect(tone.samplerOptions).toHaveBeenCalledTimes(2);
    audio.dispose();
  });

  it("rejects invalid MIDI, handles Tone failures, and disposes idempotently", async () => {
    const audio = createNoteAudio();
    for (const midi of [NaN, Infinity, -1, 128]) expect(await audio.play(midi)).toBe(false);
    expect(tone.start).not.toHaveBeenCalled();
    tone.start.mockRejectedValueOnce(Error("blocked"));
    expect(await audio.play(69)).toBe(false);
    expect(await audio.play(69)).toBe(true);
    audio.dispose(); audio.dispose();
    expect(tone.releaseAll).toHaveBeenCalled();
    expect(tone.dispose).toHaveBeenCalledOnce();
    expect(await audio.play(69)).toBe(false);
  });
});
