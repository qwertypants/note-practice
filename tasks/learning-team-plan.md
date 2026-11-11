# Little Frets learning features: agent team plan

Revised 2026-11-10 at the user's request: remove microphone support. Execution is authorized for daily spaced practice and melody challenges. Both must be fully usable without an instrument.

## Outcome and acceptance criteria

1. **Today's practice:** a returning learner starts an eight-question session mixing overdue notes, weak attempted notes, and other unlocked notes. Errors return later where space permits. Success across separate visits spaces future review.
2. **Melody challenges:** six original phrases of four to eight learned notes, shown together on a staff and answered one note at a time by tapping the guitar neck. Optional phrase playback connects the written notes to sound.

No instrument, microphone, recording, audio upload, account, backend, countdown, lives, or mandatory streak. Preserve existing lessons, help, local progress, exact sounding-pitch matching, reduced motion, accessibility, and offline tap practice. Rhythm grading, chords, alternate tuning, accidentals, higher fret ranges, and cloud sync remain outside scope.

## Repository and execution readiness

- Baseline: `main` at `324b8b2571092d47003bc6a916d78f7bb8fa7ea3`; primary checkout had only this plan untracked when execution began.
- Stack: React, TypeScript, Vite, Tone.js, GSAP, Vitest, Playwright, static PWA.
- Baseline evidence: 31 unit tests, production build, and 30 desktop/phone-viewport browser tests passed before feature integration.
- Work happens on `feature/learning-suite` in `../note-practice-learning-integration`. Leave the primary checkout and unrelated work intact. Ordinary Git, explicit staging, no push or PR unless asked.
- Existing source boundaries: `src/game.ts` handles lesson correctness/unlocking, `src/progress.ts` persists data, `src/contracts.ts` defines shared types, and `src/App.tsx` coordinates UI.
- Keep credentials, profiles, ignored private data, generated builds, and dependency directories out of commits and worktree copying. Run `npm ci` per worktree. Existing task documents describe historical releases and are not current specifications.

## Product rules and shared contracts

### Daily scheduling

- Add optional learning history to the current version-1 progress payload and retain its storage key. Preserve mastery, unlocked lessons, rounds, and resumable lessons. Old payloads start without invented spaced-review evidence.
- History is keyed by exact sounding note ID. Each record stores last attempt, last successful review, next due time, interval stage, and last session ID. No input-skill choice is needed.
- Inject the clock into pure functions. Proposed intervals are 1, 3, 7, 14, and 30 elapsed days. These are implementation defaults, not claims of an optimal learning schedule.
- A clean first-attempt success advances at most one stage per session, only when due. Multiple repetitions today cannot count as multiple days of retention. Mistakes/help reset the interval to its first stage and due tomorrow. Assisted answers never build mastery.
- Each question can settle once. Duplicate taps, revisiting answered questions, replay, and reload cannot add credits. Errors can reset history immediately; later assisted resolution must not write a second failure or shift that error's due date.
- Select overdue notes first, then weak attempted notes using mastery and interval stage, then other unlocked notes. Break ties deterministically. Repeat a small pool to fill eight prompts; offer the first lesson when there is no attempted-note history.
- After a mistake, replace a later duplicate slot only if there are at least two intervening prompts and no selected note loses all coverage. If that is impossible, keep the note due for another session. Never append a ninth prompt.
- Store valid timestamps; a clock rollback cannot advance a review interval. Calculate elapsed days without depending on local midnight or time zone changes.
- Report only observed retention, such as remembering a note after four days. Same-session success is not evidence of long-term retention.

### Melody challenges

- Six original phrases, each four to eight notes; first phrase uses open E4 and B3. Later phrases draw from existing unlocked lesson notes and visible neck ranges.
- Show the whole phrase with the current note marked. Tap correct pitches one step at a time at the learner's pace. Wrong input keeps the current step active. Help reveals only the current note, including in accessible labels; future answers stay hidden.
- Use exact MIDI pitch, including octave, and accept every visible neck position producing it. Retain the guitar convention of notation written an octave above sounding pitch.
- Provide silent play, optional phrase preview, a stop action, and replay after completion. Hearing a target assists that step; previewing the phrase assists all remaining steps. Already answered items never gain credit again.
- Shared scheduling receives settled outcomes, but activity completion does not unlock lessons. Only lesson rules unlock further lessons.
- Playback must be cancellable during loading, between notes, on stop, mute, navigation, backgrounding, and disposal. No queued note may sound after cancellation.

### Persistence and UI integration

- Keep new activity state separate from existing lesson rounds; use a focused activity component instead of growing all rendering in `App.tsx`.
- Save session identity, kind, note IDs, current index, settled answers, mistakes, assistance, and retention evidence. Validate external stored data and catalog eligibility before restoring. Preserve assistance across reload so Help cannot become a clean success.
- Resume daily sessions and melodies without rescoring settled steps. Completed sessions clear their saved active state. Blocked storage leaves the app playable for the visit.
- Keep a single owner for shared types, parser, audio, global CSS, and app wiring. No microphone adapter, pitch detector, permission prompt, input selector, experimental guitar entry, or microphone fixture belongs in the integrated result.

## Agent roster and ownership

Use one root and at most two implementation workers in parallel, then an independent verifier. Reuse available slots for scoped reviews. No worker spawns further agents.

| Agent | Inputs and responsibility | Exclusive paths | Prohibited scope | Handoff |
| --- | --- | --- | --- | --- |
| Root | Approved plan, baseline, shared contracts, data compatibility, app integration | `src/contracts.ts`, `src/learning-contracts.ts`, `src/progress.ts` and tests, new storage/activity modules and tests, `src/App.tsx`, new `src/components/LearningPractice.tsx`, audio and tests, global CSS, configs, E2E, README, plan | Unrelated files, external publication | Integrated branch/SHA, full test and review evidence |
| A / daily practice | Committed types, existing lessons/mastery | `src/learning.ts`, its tests, `src/review.ts`, its tests, new `DailyPracticePanel.tsx` and its CSS | Root files, melody code | Scheduler, eight-note queue, focused panel, literal-clock tests, commit SHA |
| B / melodies | Committed Activity and Melody types, pitch data | `src/melodies.ts`, `src/melody.ts`, tests, new `MelodyStaff.tsx`, `MelodyChallengePanel.tsx`, their tests/CSS | Root files, scheduler, audio engine | Six phrases, eligibility/state logic, accessible staff/panel, commit SHA |
| Scoped reviewer | Worker commits and exact requirements | Read-only source; report in plan scratch workspace | Production edits and self-approval | Spec/quality verdict with file:line findings |
| Independent verifier | Integrated SHA and this revised plan | Read-only app/source; `tasks/learning-verification.md` for report | Production fixes | Full-flow findings, browser evidence, explicit limits |

Every writer reports branch/worktree, base and commit SHAs, changed paths, commands/results, assumptions, and remaining risks. A dependency/shared-file request goes to root; workers never silently expand ownership.

## Worktree map and dependencies

| Branch | Checkout | Owner | Start gate | Integration order |
| --- | --- | --- | --- | --- |
| `feature/learning-suite` | `../note-practice-learning-integration` | Root | Baseline | Integration authority |
| `feature/daily-practice` | `../note-practice-daily` | A | Committed shared contract | 1 |
| `feature/melody-challenges` | `../note-practice-melody` | B | Same committed contract | 2 |

The earlier guitar worker was interrupted after the scope change. Its task-created worktree and unmodified branch were removed after confirming they contained only its excluded prototype. No microphone implementation was integrated. No physical-instrument verification is required for the revised product.

Dependency order: baseline and contracts, then A and B in parallel, then daily integration, melody integration, independent verification. Workers branch from a fixed contract SHA. Root centrally reviews/cherry-picks commits and resolves conflicts in the integration checkout. Run fixed-port browser suites serially so worktrees cannot accidentally test another checkout's server.

## Execution waves

### Wave 0: root baseline and contracts

- [x] Recheck base and worktrees; isolate integration work.
- [x] Run `npm ci`, unit tests, build, and existing browser suite; record baseline evidence.
- [x] Commit initial shared contract and plan, then start feature workers.
- [x] Apply scope revision: remove microphone contracts/UI, flatten learning history to note ID, and revise this plan in both checkouts.
- [x] Before changing shared symbols, inspect their callers. Keep literal E4 sounding / E5 written examples and existing lesson tests.
- [x] Test old/corrupt payloads, invalid dates, invalid activity state, unavailable storage, and additive-field compatibility with the old app.

### Wave 1: A and B implementation and task review

- [x] A verifies due ordering, weak-note priority with more than eight eligible notes, small/all-future pools, repeated same-day success, assistance, last-item mistakes, retry spacing, and clock rollback.
- [x] B verifies catalog eligibility, phrase order, repeated notes, self-paced advancement, settled-step resumption, Help without future-answer leaks, and completion once.
- [x] Each worker runs focused tests/build, inspects the diff, and commits only owned files. Root integrates skill-removal cleanup with matching contract changes when local worker contracts are older.
- [x] Independent scoped review checks both spec and quality. Fix findings and recheck the affected behavior before acceptance.

### Wave 2: root integration

- [x] Wire daily entry, persistence, outcome recording, interval summary, and retry behavior. Commit a usable daily increment.
- [x] Wire melody catalog, full-phrase staff, neck answers, optional playback, silent mode, Help, and resume. Commit a usable melody increment.
- [x] Verify lessons remain playable and retain unlocking rules. New activity modes must not grant lesson unlocks.
- [x] Update README and focused E2E. Record worker-to-integration commit provenance and run combined checks after integration.

### Wave 3: independent verification

- [x] A fresh reviewer inspects the integrated diff and drives the app without relying on implementer claims.
- [x] Verify daily practice across simulated days, same-session limits, reload after Help/settlement, melody completion, preview assistance, playback cancellation, storage failures, and old-progress preservation.
- [x] Check real Chromium desktop and phone viewports at 320, 375, and 430 pixels: no page overflow, at least 44-pixel touch targets, keyboard access, visible focus, useful current-note announcements, reduced motion, and no console errors.
- [x] Confirm no runtime microphone API, permission prompt, instrument requirement, or pitch-detection UI in the final source/build. Offline tap practice must work after caching; audio remains best effort.
- [x] Test Pages base-path build and inspect generated asset references. Report physical-phone behavior separately if it cannot be observed. No physical guitar gate remains.
- [x] Fix material findings, rerun affected checks, and obtain independent readback before reporting completion.

## Verification and safety

Worker tests: `npx vitest run src/learning.test.ts src/review.test.ts` and `npx vitest run src/melodies.test.ts src/melody.test.ts src/components/MelodyStaff.test.ts`.

Integrated commands:

```sh
npm test
npm run build
npm run test:e2e
npm run build:pages
git diff --check
git status --short
```

Only root integrates. Use reviewable commits and retain provenance before cleanup. Never erase storage to recover from malformed optional fields. Do not rewrite shared history, push, open PRs, or deploy without authorization. Stop and diagnose contract drift, ownership conflicts, data loss, or audio that survives cancellation; do not lower acceptance thresholds to pass checks.

## Definition of done and immediate handoff

Both features work through tap answers without an instrument. Progress remains compatible, all required tests pass, independent review has no unresolved material findings, and no required changes remain only in worker checkouts. Report integration branch/SHA, worker commits, checks, UI evidence, primary-checkout state, and unverified physical-phone limits. Build success does not prove deployment; publication is outside scope.

Immediate execution: finish A/B fixes and scope cleanup, connect the two modes, then run integrated verification. The guitar worker stays stopped and excluded. No user checkpoint is needed between these authorized steps.

## Release authorization

The user authorized committing, merging, and deploying after verification. Final local checks passed 66 unit tests and 74 browser tests; independent review approved the final corrections. Deploy through the existing main-branch Pages workflow and verify its exact SHA and live assets.
