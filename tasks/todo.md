# Guitar note practice tasks

Implementation approved by the user on 2026-10-29 and completed with an implementation team. Preserve the existing `graft/` directory. Paths below are proposed and may be adjusted without changing the acceptance criteria.

## Task 1: Play a two-note round

**Description:** Set up the static application and deliver the smallest complete game using open high E and B. Validate guitar pitch conventions before encoding the staff and neck relationship.

**Acceptance criteria:**
- [x] A player can start and finish an eight-question round by reading a single staff note and tapping an open string on the neck.
- [x] Written pitch, sounding pitch, and guitar position agree for both notes; correct and incorrect taps produce appropriate feedback, and Next advances exactly once.
- [x] The app runs locally and builds as static assets without a backend.

**Verification:**
- [x] `npm test` checks literal high E and B pitch/staff examples, wrong answers, and round completion.
- [x] `npm run build` succeeds.
- [x] Manual phone-sized check completes a round with correct and incorrect answers.

**Dependencies:** None.

**Files likely touched:** `package.json` and setup files; `src/App.tsx`; `src/music.ts`; `src/music.test.ts`; `src/styles.css`. Keep setup mechanical and the gameplay slice focused.

**Estimated scope:** Medium gameplay slice, plus initial project setup.

## Task 2: Teach through gentle feedback

**Description:** Add first-use guidance, per-note hints, helpful mistakes, and a relaxed round summary.

**Acceptance criteria:**
- [x] A beginner can learn the two initial notes and neck orientation before answering, and can request Help during play.
- [x] Labels fade after three first-attempt correct answers per note; mistakes and Help restore them, and revealed answers do not advance mastery.
- [x] Wrong answers have no timer or life penalty, remain retryable, and return for review where the round has room; the summary offers replay.

**Verification:**
- [x] `npm test` covers hint fading, hint restoration, assisted-answer exclusion, and review scheduling.
- [x] `npm run build` succeeds.
- [x] Manual check walks through onboarding, a mistake, Help, recovery, and replay.

**Dependencies:** Task 1.

**Files likely touched:** `src/App.tsx`, `src/game.ts`, `src/game.test.ts`, `src/styles.css`.

**Estimated scope:** Medium.

## Checkpoint after tasks 1–2

- [x] Tests and build pass.
- [x] Review the playable round at a narrow phone width, including staff readability and neck orientation.
- [x] Orchestrator reviewed the phone layout before completion; full execution was authorized without an intermediate pause. See `tasks/execution.md`.

## Task 3: Grow the lesson set and retain progress

**Description:** Add the remaining open strings and then natural notes in the first three frets, while retaining access to earlier lessons and saving progress locally.

**Acceptance criteria:**
- [x] Lessons add small note groups in the planned order; the next lesson unlocks after three first-attempt successes per current note, and earlier lessons remain replayable.
- [x] Visible positions with the same exact pitch are all accepted; another octave is not accepted, and staff ledger lines remain correct.
- [x] Refresh retains unlocked lessons and mastery; missing, malformed, or unavailable storage still permits play without crashing.

**Verification:**
- [x] `npm test` covers known pitches across all six strings, duplicate positions, octave mismatch, unlocking, and storage recovery.
- [x] `npm run build` succeeds.
- [x] Manual check finishes the first lesson, starts the next, refreshes, and reopens an earlier lesson.

**Dependencies:** Task 2 and its review checkpoint.

**Files likely touched:** `src/music.ts`, `src/lessons.ts`, `src/progress.ts`, `src/progress.test.ts`, `src/App.tsx`.

**Estimated scope:** Medium.

## Task 4: Finish the phone experience

**Description:** Refine visual feedback and accessibility, then verify the complete beginner journey in the browser.

**Acceptance criteria:**
- [x] Portrait layouts at 320, 375, and 430 CSS pixels have no horizontal overflow; answer targets measure at least 44 by 44 CSS pixels.
- [x] Controls have accessible names and visible focus; feedback uses text as well as color, and reduced-motion preference suppresses celebratory movement.
- [x] A browser journey covers onboarding, wrong answer, Help, correct answer, completed round, lesson unlock, and progress after refresh.

**Verification:**
- [x] `npm test`, `npm run build`, and `npm run test:e2e` pass.
- [x] Inspect rendered notation, target dimensions, keyboard access, and reduced-motion behavior in a real browser.
- [ ] User trial on a physical phone remains outstanding. Browser phone-size checks passed; see `tasks/execution.md`.

**Dependencies:** Task 3.

**Files likely touched:** `src/App.tsx`, `src/styles.css`, `tests/practice.spec.ts`, `playwright.config.ts`, `package.json`.

**Estimated scope:** Medium.

## Completion checkpoint

- [x] All acceptance criteria and required checks pass.
- [ ] User review of the completed app and physical-phone verification remain outstanding.
- [x] Document local run/build commands and local-only progress behavior in `README.md`.
- [x] Report changes and verification. Deployment, commits, pushes, and pull requests require separate scope or instructions.
