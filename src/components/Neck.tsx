import type { Note, Position } from "../contracts";
import { STRINGS, noteAt } from "../music";

export function Neck({
  maxFret,
  hints,
  target,
  reveal,
  disabled = false,
  onAnswer,
}: {
  maxFret: number;
  hints: boolean;
  target: Note;
  reveal: boolean;
  disabled?: boolean;
  onAnswer: (position: Position) => void;
}) {
  return (
    <div className="neck-wrap">
      <div className="string-headings" aria-hidden="true">
        {STRINGS.map((s) => (
          <span key={s.string}>
            <b>{s.name}</b>
            <small>
              {s.string === 6
                ? "low"
                : s.string === 1
                  ? "high"
                  : `str ${s.string}`}
            </small>
          </span>
        ))}
      </div>
      <div
        className="neck"
        role="group"
        aria-label="Guitar neck. Nut at top, low E on left, high E on right."
      >
        {Array.from({ length: maxFret + 1 }, (_, fret) => (
          <div
            className={`fret-row ${fret === 0 ? "open-row" : ""}`}
            key={fret}
          >
            <span className="fret-number" aria-hidden="true">
              {fret === 0 ? "○" : fret}
            </span>
            {STRINGS.map((s) => {
              const position = { string: s.string, fret };
              const note = noteAt(position);
              const highlighted = reveal && note.id === target.id;
              const stringLabel =
                s.string === 6 ? "low E" : s.string === 1 ? "high E" : s.name;
              return (
                <button
                  className={`neck-note ${highlighted ? "is-target" : ""}`}
                  key={s.string}
                  disabled={disabled}
                  onClick={() => onAnswer(position)}
                  data-highlighted={highlighted}
                  data-string={s.string}
                  data-fret={fret}
                  aria-label={`String ${s.string}, ${stringLabel}, ${fret === 0 ? "open" : `fret ${fret}`}${hints ? `, ${note.name}` : ""}`}
                >
                  <span className="note-dot">
                    {hints || highlighted ? note.name : "·"}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="neck-caption">
        <span>← thicker strings</span>
        <span>{maxFret === 0 ? "○ open strings" : "fret numbers at left"}</span>
        <span>thinner →</span>
      </div>
    </div>
  );
}
