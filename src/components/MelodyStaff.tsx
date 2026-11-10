import type { Note } from "../contracts";
import { ledgerSteps } from "../music";
import "../melody.css";

export function MelodyStaff({
  notes,
  index,
  reveal = false,
}: {
  notes: Note[];
  index: number;
  reveal?: boolean;
}) {
  const width = Math.max(360, 100 + notes.length * 58);
  const current = Math.min(index + 1, notes.length);
  const revealedName = reveal ? notes[index]?.writtenName : undefined;
  return (
    <div className="melody-staff-scroll">
      <svg
        className="melody-staff"
        viewBox={`0 0 ${width} 230`}
        role="img"
        aria-label={revealedName
          ? `Melody on a treble staff. Note ${current} of ${notes.length} is marked and revealed as ${revealedName}.`
          : `Melody on a treble staff. Note ${current} of ${notes.length} is marked.`}
      >
        <title>{revealedName ? "Melody with current note revealed" : "Melody to read"}</title>
        {[0, 2, 4, 6, 8].map((step) => (
          <line key={step} x1="37" x2={width - 20} y1={130 - step * 7} y2={130 - step * 7} className="staff-line" />
        ))}
        <text x="39" y="135" fontSize="85" fontFamily="'Apple Symbols', 'Noto Music', 'Segoe UI Symbol', serif" aria-hidden="true">𝄞</text>
        {notes.map((note, noteIndex) => {
          const x = 110 + noteIndex * 58;
          const y = 130 - note.staffStep * 7;
          const stemUp = note.staffStep < 4;
          return (
            <g key={noteIndex} aria-hidden="true" className={noteIndex === index ? "melody-note-current" : "melody-note"}>
              {ledgerSteps(note.staffStep).map((step) => (
                <line key={step} x1={x - 18} x2={x + 18} y1={130 - step * 7} y2={130 - step * 7} className="ledger-line" />
              ))}
              <ellipse cx={x} cy={y} rx="10" ry="7" transform={`rotate(-18 ${x} ${y})`} fill="currentColor" />
              <line x1={stemUp ? x + 9 : x - 9} x2={stemUp ? x + 9 : x - 9} y1={y} y2={y + (stemUp ? -43 : 43)} stroke="currentColor" strokeWidth="2.4" />
              {noteIndex === index && <path d={`M ${x - 7} 207 L ${x + 7} 207 L ${x} 198 Z`} fill="currentColor" />}
              {reveal && noteIndex === index && <text x={x} y="226" textAnchor="middle" className="melody-note-label">{note.writtenName}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
