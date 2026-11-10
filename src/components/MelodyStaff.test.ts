import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { melodyNotes, MELODIES } from "../melodies";
import { MelodyStaff } from "./MelodyStaff";

describe("MelodyStaff", () => {
  const notes = melodyNotes(MELODIES[2]);

  it("keeps note names out of the rendered SVG before reveal", () => {
    const markup = renderToStaticMarkup(createElement(MelodyStaff, { notes, index: 1 }));
    expect(markup).toContain("Note 2 of 5 is marked");
    expect(markup).not.toContain("E5");
    expect(markup).not.toContain("F5");
    expect(markup).not.toContain("G5");
  });

  it("reveals only the current note in visible text and the accessible name", () => {
    const markup = renderToStaticMarkup(createElement(MelodyStaff, { notes, index: 1, reveal: true }));
    expect(markup).toContain("revealed as F5");
    expect(markup).toContain('class="melody-note-label">F5</text>');
    expect(markup).not.toContain("E5");
    expect(markup).not.toContain("G5");
    expect(markup.match(/class="melody-note-label"/g)).toHaveLength(1);
  });
});
