import type { Note } from "../contracts";
import { ledgerSteps } from "../music";

export function Staff({
  note,
  reveal = false,
  compact = false,
}: {
  note: Note;
  reveal?: boolean;
  compact?: boolean;
}) {
  const y = 112 - note.staffStep * 7;
  const stemUp = note.staffStep < 4;
  return (
    <svg
      className={`staff ${compact ? "staff--compact" : ""}`}
      viewBox="0 0 320 210"
      role="img"
      aria-label={
        reveal
          ? `Treble staff showing ${note.name}, written ${note.writtenName}`
          : "Read this note on the treble staff"
      }
      data-testid="note-staff"
      data-note-id={note.id}
    >
      <title>{reveal ? `Note ${note.name}` : "A note to read"}</title>
      {[0, 2, 4, 6, 8].map((step) => (
        <line
          key={step}
          x1="37"
          x2="292"
          y1={112 - step * 7}
          y2={112 - step * 7}
          className="staff-line"
        />
      ))}
      <text
        x="40"
        y="117"
        fontSize="85"
        fontFamily="'Apple Symbols', 'Noto Music', 'Segoe UI Symbol', serif"
      >
        𝄞
      </text>
      {ledgerSteps(note.staffStep).map((step) => (
        <line
          key={step}
          x1="177"
          x2="213"
          y1={112 - step * 7}
          y2={112 - step * 7}
          className="ledger-line"
        />
      ))}
      <ellipse
        cx="195"
        cy={y}
        rx="10"
        ry="7"
        transform={`rotate(-18 195 ${y})`}
        fill="currentColor"
      />
      <line
        x1={stemUp ? 204 : 186}
        x2={stemUp ? 204 : 186}
        y1={y}
        y2={y + (stemUp ? -43 : 43)}
        stroke="currentColor"
        strokeWidth="2.4"
      />
    </svg>
  );
}
