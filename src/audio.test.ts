import { afterEach, describe, expect, it, vi } from "vitest";
import { createNoteAudio, loadMuted, saveMuted } from "./audio";

afterEach(() => vi.unstubAllGlobals());

function browser(state = "running") {
  const voices: ReturnType<typeof voice>[] = [];
  function voice() {
    return {
      type: "sine", frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(),
      onended: null as (() => void) | null,
    };
  }
  const gains: ReturnType<typeof gain>[] = [];
  function gain() {
    return {
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(), disconnect: vi.fn(),
    };
  }
  const context = {
    state, currentTime: 10, destination: {},
    resume: vi.fn(async () => { context.state = "running"; }),
    close: vi.fn(async () => {}),
    createOscillator: vi.fn(() => { const node = voice(); voices.push(node); return node; }),
    createGain: vi.fn(() => { const node = gain(); gains.push(node); return node; }),
  };
  const constructor = vi.fn(function () { return context; });
  vi.stubGlobal("AudioContext", constructor);
  return { context, constructor, voices, gains };
}

function deferred() {
  let resolve = () => {};
  let reject = (_reason: Error) => {};
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe("mute preference", () => {
  it("round trips a separate saved preference and defaults malformed values to enabled", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    expect(loadMuted()).toBe(false);
    expect(saveMuted(true)).toBe(true);
    expect(loadMuted()).toBe(true);
    expect(saveMuted(false)).toBe(true);
    expect(loadMuted()).toBe(false);
    expect([...values.keys()]).toEqual(["note-practice:muted:v1"]);
    for (const raw of ["{", '"true"', "1", "null", "{}"]) {
      values.set("note-practice:muted:v1", raw);
      expect(loadMuted()).toBe(false);
    }
  });
  it("tolerates unavailable and throwing storage", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(loadMuted()).toBe(false);
    expect(saveMuted(true)).toBe(false);
    vi.stubGlobal("localStorage", {
      getItem: () => { throw Error("denied"); },
      setItem: () => { throw Error("quota"); },
    });
    expect(loadMuted()).toBe(false);
    expect(saveMuted(true)).toBe(false);
  });
});

describe("note audio", () => {
  it("creates lazily, uses sounding MIDI pitches, and schedules a short pluck", async () => {
    const { constructor, voices, gains } = browser();
    const audio = createNoteAudio();
    expect(constructor).not.toHaveBeenCalled();
    expect(await audio.play(69)).toBe(true);
    expect(voices[0].frequency.setValueAtTime).toHaveBeenCalledWith(440, 10);
    expect(gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.2, 10.005);
    expect(gains[0].gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, 10.65);
    expect(voices[0].stop).toHaveBeenCalledWith(10.7);
    expect(await audio.play(64)).toBe(true);
    expect(voices[1].frequency.setValueAtTime.mock.calls[0][0]).toBeCloseTo(329.63, 2);
    expect(constructor).toHaveBeenCalledTimes(1);
    expect(voices[0].disconnect).toHaveBeenCalledOnce();
    expect(gains[0].disconnect).toHaveBeenCalledOnce();
    audio.stop();
    audio.stop();
    expect(voices[1].stop).toHaveBeenLastCalledWith();
    expect(voices[1].disconnect).toHaveBeenCalledOnce();
  });
  it("disconnects naturally ended voices without stopping a later voice", async () => {
    const { voices, gains } = browser();
    const audio = createNoteAudio();
    await audio.play(69);
    const ended = voices[0].onended;
    await audio.play(64);
    ended?.();
    expect(voices[1].disconnect).not.toHaveBeenCalled();
    voices[1].onended?.();
    expect(gains[1].disconnect).toHaveBeenCalledOnce();
    audio.dispose();
  });
  it("returns false for missing, throwing, closed, or blocked contexts", async () => {
    vi.stubGlobal("AudioContext", undefined);
    expect(await createNoteAudio().play(69)).toBe(false);
    vi.stubGlobal("AudioContext", function () { throw Error("unavailable"); });
    expect(await createNoteAudio().play(69)).toBe(false);
    const { context, voices } = browser("suspended");
    context.resume.mockRejectedValueOnce(Error("blocked"));
    const audio = createNoteAudio();
    expect(await audio.play(69)).toBe(false);
    context.resume.mockImplementationOnce(async () => {});
    expect(await audio.play(69)).toBe(false);
    context.state = "closed";
    context.resume.mockRejectedValueOnce(Error("closed"));
    expect(await audio.play(69)).toBe(false);
    expect(voices).toHaveLength(0);
  });
  it.each(["stop", "dispose"] as const)("%s settles pending resume and prevents late playback", async (method) => {
    const { context, voices } = browser("suspended");
    const pending = deferred();
    context.resume.mockReturnValueOnce(pending.promise);
    const audio = createNoteAudio();
    const playing = audio.play(69);
    audio[method]();
    expect(await playing).toBe(false);
    context.state = "running";
    pending.resolve();
    await Promise.resolve();
    expect(voices).toHaveLength(0);
    if (method === "stop") expect(await audio.play(64)).toBe(true);
    else expect(await audio.play(64)).toBe(false);
  });
  it("only starts the newest request when concurrent resumes finish out of order", async () => {
    const { context, voices } = browser("suspended");
    const first = deferred();
    const second = deferred();
    context.resume.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const audio = createNoteAudio();
    const old = audio.play(69);
    const latest = audio.play(64);
    expect(await old).toBe(false);
    first.reject(Error("late rejection"));
    context.state = "running";
    second.resolve();
    expect(await latest).toBe(true);
    expect(voices).toHaveLength(1);
    expect(voices[0].frequency.setValueAtTime.mock.calls[0][0]).toBeCloseTo(329.63, 2);
  });
  it("disposes once, stops active audio, and handles close failures", async () => {
    const { context, voices } = browser();
    context.close.mockRejectedValueOnce(Error("closed"));
    const audio = createNoteAudio();
    await audio.play(69);
    audio.dispose();
    audio.dispose();
    expect(context.close).toHaveBeenCalledOnce();
    expect(voices[0].disconnect).toHaveBeenCalledOnce();
    expect(await audio.play(69)).toBe(false);
  });
  it("cleans partial voice creation failures and rejects invalid MIDI without resources", async () => {
    const { context, constructor, voices } = browser();
    const audio = createNoteAudio();
    for (const midi of [NaN, Infinity, -1, 128]) expect(await audio.play(midi)).toBe(false);
    expect(constructor).not.toHaveBeenCalled();
    context.createGain.mockImplementationOnce(() => { throw Error("failed"); });
    expect(await audio.play(69)).toBe(false);
    expect(voices[0].disconnect).toHaveBeenCalledOnce();
  });
});
