# Implementation plan: Guitar note practice

## Confirmed intent

Build a simple, relaxed phone game for a complete beginner learning guitar sight-reading without a guitar in hand. Show a note on a treble-clef staff and let the player answer by tapping the guitar neck. Teach a few notes at a time, offer gentle help, and gradually fade note-name hints. Use short rounds and cheerful feedback without time pressure.

The first version excludes rhythm reading, chords, microphone input, accounts, and timers. It teaches pitch recognition and fretboard familiarity as foundations for sight-reading, rather than claiming to teach complete sight-reading.

## Current project

The project directory has no existing application, package manifest, task files, or Git repository. A `graft/` directory already exists and must be preserved. No implementation has started.

## Proposed architecture

- Use React, TypeScript, and Vite for a static client application. No backend or account is needed.
- Keep pitch and lesson rules separate from rendering. Represent pitches with octave information and string/fret positions explicitly.
- Use standard guitar tuning. Account for guitar notation sounding an octave below its written treble-clef pitch. Verify the pitch table against an authoritative music reference before implementation.
- Render a single note and staff with SVG. Keep note spelling, ledger lines, and fret positions driven by the same pitch data.
- Use a portrait-friendly neck with the nut at the top, the low E string on the left, and clearly labeled strings and frets. Show only the lesson's needed fret range so targets stay large. Explain orientation with a small first-use illustration.
- Accept every visible position producing the exact target pitch. A matching letter in another octave is a different answer. Initial lessons avoid duplicate-position ambiguity.
- Save unlocked lessons and completed practice in versioned localStorage. The game must remain playable when storage is unavailable.
- Use Vitest for music and game rules and Playwright for the main touch-sized user journey. Proposed commands are `npm test`, `npm run build`, and `npm run test:e2e`; add them during setup.

## Learning and game design

Start with a tiny lesson using the open high E and B strings. Explain the staff, the two note names, and where to tap before asking an unassisted question. Add open G, D, A, and low E in later lessons, with necessary ledger lines. Then introduce natural notes within the first three frets in small groups. Accidentals and positions farther up the neck can follow in a later version.

Each round contains eight questions and has no countdown. Correct answers receive a brief visual celebration and increase a small round streak. Wrong answers keep the question active, give a gentle cue, and eventually reveal the target. A visible Help action is always available. The player controls moving to the next question, preventing accidental taps from answering twice.

For each note, fade labels after three first-attempt correct answers. A mistake or Help request restores the labels for that note until another three first-attempt successes. Repeated taps and revealed answers never count as independent mastery. Revisit mistakes within the round where possible. After a round, show progress and offer replay or the next lesson. Unlock the next lesson when each current note has three first-attempt successes; never force advancement or erase progress after a mistake.

These numbers and the neck orientation are proposed defaults for review, rather than requirements supplied by the user.

## Ordered task index

Detailed acceptance criteria, verification, dependencies, and likely files are in `tasks/todo.md`.

1. Deliver a playable two-note round, including app setup and verified pitch mapping.
2. Add beginner guidance, mistake recovery, and fading hints.
3. Add gradual lessons and saved progress.
4. Polish the phone experience and verify the complete learning flow.

Checkpoint after task 2: review the actual phone layout and learning interaction before extending the lesson set.

Checkpoint after task 4: review the complete app and test evidence before any publication work.

## Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Incorrect guitar octave or staff mapping teaches the wrong relationship | High | Verify written and sounding pitch examples, then test literal known string/fret/staff cases. |
| A phone neck becomes too small to tap accurately | High | Start with open strings, limit visible frets, and verify target sizes at narrow widths. |
| Hints encourage memorizing labels instead of reading the staff | Medium | Fade hints per note and count only first-attempt unassisted answers toward mastery. |
| Too many new notes overwhelm a beginner | Medium | Add small groups, retain review, and let the player replay earlier lessons. |
| Browser data is cleared or unavailable | Low | Explain that progress stays on this browser and gracefully support temporary sessions. |

## Approval and boundaries

The user confirmed the intent and approved implementation with a team on 2026-10-29. Implementation is complete; see `tasks/execution.md` for verification and remaining physical-phone review. The user subsequently authorized committing and pushing to `https://github.com/qwertypants/note-practice`. Deployment and pull requests remain outside scope.

No blocking product questions remain. Hosting and publication are separate future decisions.
