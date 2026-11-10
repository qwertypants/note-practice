import { afterEach, expect, it, vi } from "vitest";
import { createSessionId } from "./session-id";

afterEach(() => vi.unstubAllGlobals());

it("creates distinct local session IDs without secure-context crypto APIs", () => {
  vi.stubGlobal("crypto", {});
  const ids = Array.from({length: 100}, createSessionId);
  expect(new Set(ids).size).toBe(100);
  expect(ids.every(id => id.length > 0 && id.length <= 160)).toBe(true);
  vi.stubGlobal("crypto", undefined);
  expect(createSessionId()).toBeTruthy();
});
