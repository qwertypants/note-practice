# Audio and personalized review implementation plan

> **For agentic workers:** Use the subagent-driven-development skill to execute this plan task by task. This document authorizes planning only; implementation begins when the user requests execution.

**Goal:** Connect written notes to their sound and offer eight-question practice sessions focused on weaker notes from unlocked lessons.

**Architecture:** Keep audio outside the game reducer. Add a review variant to the existing round model so review reuses answering, hints, and summaries. The root owns shared contracts and UI integration; two workers implement independent modules after the contracts land.

**Tech stack:** React 19, TypeScript, Vite, Web Audio, Vitest, Playwright. No backend or new runtime dependency.

## Scope and product decisions

- Add “Hear this note” during a question and play the target pitch after a correct answer. Use the sounding `Note.midi`, not the octave-transposed written staff pitch.
- Produce a short synthesized plucked tone with a quick attack and decay. This is a guitar-like sound, not a sampled guitar recording. Audition before accepting its quality.
- Sound starts enabled, but never plays on page load. A persistent “Sound on/off” toggle controls both manual and success playback. Muting stops an active tone immediately. Do not change answer scoring when listening.
- Create/resume the audio context from a user gesture. Playback errors leave visual practice working and show a short, nonblocking status message. Avoid overlapping voices and duplicate success tones.
- Add “Practice my weak notes” once the learner has at least one saved mastery entry among unlocked lessons. Explain this availability before that point.
- Review includes unlocked notes only, deduplicated by note ID. Include all eligible notes whose mastery is below three, including unattempted notes in unlocked lessons. Sort by mastery ascending, then ID for deterministic ties. Cycle that pool to fill eight questions; take at most eight distinct notes before repeating. If every note is mastered, offer “Review all learned notes” using the unlocked pool.
- Review updates existing mastery and completed-round count, but does not unlock lessons. Keep lesson unlocking tied to completing lesson practice. Review summaries identify the mode and offer another review or return to lessons.
- Preserve existing version-one progress and storage key. Keep the audio preference under a separate key. No account, microphone, ear-training quiz, due-date scheduler, streak system, or progress dashboard in this scope.

## Repository readiness

Observed planning baseline: clean `main` at `c08c207`; one worktree at `/Users/wilkins/Sites/note-practice`. Recheck before execution. Preserve unrelated changes and stage explicit paths. No push or PR unless requested.

Before implementing, inspect applicable nested instructions and existing test configuration, run `npm test` and `npm run build`, and record results. Run `graft callers` for changed existing symbols before changing them. Consult current official Web Audio documentation for context activation and lifecycle behavior. Do not upgrade graft or unrelated dependencies as part of this work.

## Contracts owned by the root

Establish these interfaces in a small committed contract change before workers start:

```ts
// contracts.ts: add to existing Round
type RoundSource =
  | { mode: "lesson"; lessonId: string }
  | { mode: "review"; lessonId: null };
// Round becomes RoundSource & the existing round fields, plus maxFret: number.
// Existing lesson rounds set maxFret from Lesson; review sets it from its pool.

// audio.ts: worker-owned implementation
interface NoteAudio {
  play(midi: number): Promise<boolean>;
  stop(): void;
  dispose(): void;
}
function createNoteAudio(): NoteAudio;
function loadMuted(): boolean;
function saveMuted(muted: boolean): boolean;

// review.ts: worker-owned implementation
function canReview(progress: Progress): boolean;
function createReviewRound(progress: Progress): Round;
```

`play` returns false on unavailable or blocked audio rather than rejecting. It replaces the active tone. UI owns mute state and does not call play while muted. Storage failures retain session state. `loadMuted` defaults to false for absent or malformed preferences.

`createReviewRound` always returns eight questions. It uses the current unlocked pool and the selection rules above. Its maxFret is the highest lesson maxFret needed by selected notes, choosing the earliest unlocked lesson containing each note. Only valid application progress reaches this internal function.

## Team and ownership

| Agent | Deliverable | Exclusive write ownership | Dependencies and prohibitions |
| --- | --- | --- | --- |
| Root | Contracts, integration, accessible controls and review flow | `src/contracts.ts`, `src/App.tsx`, `src/styles.css`, integrated `tests/practice.spec.ts`, this plan | Owns integration branch, conflict resolution and final checks. No worker edits these paths. |
| Audio worker | Playback engine and mute storage | New `src/audio.ts`, `src/audio.test.ts` | Starts after contracts commit. Reads music types. No UI, dependency, lockfile, or progress-schema edits. |
| Review worker | Review selection and round behavior | New `src/review.ts`, `src/review.test.ts`; `src/game.ts`, `src/game.test.ts` | Starts after contracts commit. Reads lessons and progress. No UI, storage-schema, or audio edits. |
| Independent verifier | Findings and evidence against integrated commit | Read-only | Starts after integration. Checks behavior, regressions, accessibility, audio lifecycle and persistence. Reports findings; root fixes them. |

Use at most root plus two implementation workers concurrently. Start the verifier later. Each worker returns branch/worktree, commit SHA, changed paths, commands/results, assumptions, and unresolved limitations.

## Worktree map

Use execution-time managed worktree isolation when available. Otherwise use ordinary Git worktrees. Do not create worktrees during planning.

| Branch | Logical path | Owner | Base and start gate | Integration order |
| --- | --- | --- | --- | --- |
| `feat/practice-experience` | Primary checkout if still clean; otherwise sibling `note-practice-integration` | Root | Observed baseline after readiness checks | Shared contracts first |
| `feat/note-audio` | Sibling `note-practice-audio` | Audio worker | Committed shared contracts | First worker integration |
| `feat/weak-note-review` | Sibling `note-practice-review` | Review worker | Same committed contracts | Second worker integration |

The verifier needs no worktree because it is read-only. One writer per tracked path. Keep ignored credentials and bulky artifacts out of worktrees; install dependencies locally as needed. Workers never merge/rebase the integration branch.

## Execution tasks and gates

### 1. Root establishes the shared round contract

- [ ] Inspect `Round`, `createRound`, `answer`, `next`, and their callers, including animation dependencies on lessonId.
- [ ] Add the discriminated source and round maxFret. Set lesson mode and maxFret in `createRound`; use round maxFret for answer bounds.
- [ ] Restrict lesson lookup/unlocking in `answer` to lesson mode. Leave mastery, hints and completed-round behavior shared.
- [ ] Adjust UI lesson references so a review round will not depend on selected lesson bounds. Retain existing visible lesson behavior.
- [ ] Add a regression assertion that normal lesson rounds still unlock lessons and preserve eight-question completion behavior.
- [ ] Run `npm test` and `npm run build`; commit explicit paths. This passing commit is the workers' base.

### 2. Audio worker implements playback and preference storage

- [ ] Add tests for saved mute, missing/malformed preference, and storage failures.
- [ ] Implement lazy audio creation, MIDI-to-frequency conversion, a short plucked envelope, replacement of active voices, stop and disposal. Avoid creating resources until playback is requested.
- [ ] Cover unavailable context, rejected resume, stopped voices, and repeated disposal with an injected/mock browser boundary. These tests prove lifecycle calls, not audible quality.
- [ ] Assert MIDI 69 yields 440 Hz and MIDI 64 yields approximately 329.63 Hz; staff display octave must not affect playback.
- [ ] Run `npm test -- src/audio.test.ts` and `npm run build`. Commit only owned paths and return evidence.

### 3. Review worker implements personalized rounds

- [ ] Add tests with literal expected note IDs for eligibility, locked-note exclusion, deduplication, weaker-first ordering, repeat-to-eight behavior, and all-mastered fallback.
- [ ] Implement `canReview` and `createReviewRound` with the specified deterministic algorithm.
- [ ] Ensure review accepts correct same-pitch positions within round bounds, reuses mistake/help behavior, updates mastery and round totals, and never unlocks lessons.
- [ ] Add regressions proving ordinary lesson unlocking still works and review does not mutate its input progress.
- [ ] Run `npm test -- src/review.test.ts src/game.test.ts` and `npm run build`. Commit only owned paths and return evidence.

### 4. Root integrates the experience

- [ ] Review and integrate audio worker, then review worker commits. Resolve conflicts centrally and record original SHAs.
- [ ] Add a stable audio instance with cleanup, the remembered mute toggle, and the manual listening button. Trigger the success sound on an actual asking-to-correct transition in the answer handler, avoiding render/effect replay.
- [ ] Stop audio when muting, switching sessions, returning to the guide, or unmounting. Guard pending asynchronous playback against mute/navigation so a late context resume cannot start unwanted sound.
- [ ] Add the review entry, mode-specific heading, fret bounds and summary actions. Avoid running a lesson unlock message for review.
- [ ] Keep the current visual style, keyboard access, visible focus, accessible toggle name/state, and polite status feedback. Verify narrow screens and reduced motion.
- [ ] Extend `tests/practice.spec.ts` to cover mute reload persistence, audio-unavailable visual practice, review from saved progress, correct review summary and completion, and returning to lessons.
- [ ] Run `npm test`, `npm run build`, `npm run test:e2e`, and `git diff --check`. Fix failures before independent review.

### 5. Independent verifier checks the integrated result

- [ ] Read the integrated diff and test evidence; independently exercise the new flows in a real browser.
- [ ] Check keyboard-only controls, mobile-width layout, persisted mute after reload, locked lesson exclusion, review completion, and ordinary lesson unlocking.
- [ ] Audition pitch and tone quality, rapid repeats, mute during playback, and navigation during pending context activation. Check available Chromium and WebKit environments. Report unsupported environments rather than claiming coverage.
- [ ] Separate automated audio lifecycle evidence from actual audible verification. Physical iPhone/Safari remains unverified unless tested on that device.
- [ ] Return findings with severity, file/line, reproduction and observed result. Root resolves material findings and reruns affected checks.

## Integration, recovery and completion

No external writes, publishing, pushes or PRs are included. Stop and report if baseline failures prevent meaningful validation, contracts conflict with existing behavior, or a worker needs another agent's owned paths. Root reassigns ownership explicitly before edits continue.

Keep worker commits until integration and verification finish. If a feature fails its gate, fix or revert its scoped commit without resetting unrelated changes. Remove worktrees only after commits are integrated and provenance recorded.

Done means both features work together, saved version-one progress loads unchanged, acceptance cases pass, independent material findings are resolved, and no required change remains only in a worker checkout. Report branch, commits, tests, clean/dirty state, remaining worktrees, and any audible/device verification limits.

## First execution wave

Root first rechecks repository readiness and lands the shared-contract commit. No worker starts before that gate. Then start audio and review workers together from that commit; keep the verifier blocked until UI integration and combined checks pass. Implementation has not started.
