# Little Frets learning features: agent team plan

Status: proposed, planning only. No implementation, worktrees, commits, pushes, or deployment are authorized by this document alone.

## Outcome and scope

Build three independently reviewable increments, in this order:

1. **Today's practice:** eight-question sessions that revisit missed and due notes across days.
2. **Melody challenges:** short original phrases made from learned notes, shown together on a staff and answered one note at a time.
3. **Play on guitar:** optional microphone answers for individual notes and melody steps, with tap answers always available.

Keep the relaxed experience: no countdown, lives, mandatory streak, account, or backend. Retain current lessons, exact sounding-pitch matching, beginner help, local progress, accessibility, reduced motion, and offline tap practice. Microphone input detects pitch, not which string or fret the player used. Explain that limit when selecting guitar input.

Proposed defaults below are product decisions for review, not proven optimal learning parameters. Exclude rhythm grading, chords, polyphonic detection, alternate tunings, accidentals, higher fret ranges, cloud sync, recordings, and audio upload. A melody has a playback rhythm but the learner advances at their own pace.

Success means a returning learner gets a useful session, can apply learned notes to a phrase, and can optionally answer with a real guitar without detection noise changing their progress.

## Repository readiness

Inspected 2026-11-10:

- Git repository, branch `main`, base `324b8b2571092d47003bc6a916d78f7bb8fa7ea3`.
- Working tree was clean; only the primary worktree existed. Recheck before execution because this plan itself introduces a new file.
- React 19, TypeScript, Vite, Tone.js, GSAP, Vitest, Playwright, and a static PWA.
- Current review lives in `src/review.ts`; correctness/unlocking in `src/game.ts`; persistence in `src/progress.ts`; shared types in `src/contracts.ts`; UI orchestration in `src/App.tsx`.
- `src/App.tsx` is already 516 lines. Add focused feature panels rather than placing all new rendering and lifecycle logic there.
- Existing `tasks/plan.md` describes the initial release and contains historical setup information. It is not the current architecture specification.
- Applicable user instructions require ordinary Git, explicit staging, preservation of unrelated work, and no push or PR unless requested. No additional repository `AGENTS.md` was found in the inspected file inventory.
- Do not copy browser profiles, credentials, ignored local data, `node_modules`, or generated `dist` into worktrees. Install dependencies per checkout with `npm ci`.
- Do not run baseline tests during planning. The execution baseline must establish their actual status.

## Shared design decisions

The root owns these contracts before feature workers write consumers. Record final signatures and literal test fixtures in the contract commit; workers must not improvise competing types.

### Scheduling and progress

- Extend the existing version-1 progress payload with optional validated learning fields. Missing fields mean no spaced-review history; preserve unlocked lessons, mastery, rounds, and resumable lesson data. Retain the existing storage key.
- Track learning by exact note ID and answer skill: `fretboard` for taps and `pitch` for guitar input. A detected pitch must not claim the learner identified a fretboard position.
- Each record stores last attempt time, last successful review time, next due time, interval stage, and last credited session ID. Inject `now` and a random source into pure scheduling functions for deterministic tests.
- Proposed review intervals are 1, 3, 7, 14, and 30 elapsed days. A qualifying first-attempt, unassisted success advances at most one stage per session and only when due. Multiple repetitions today do not count as multiple days of retention.
- Errors or help reset the affected skill's interval stage and schedule it for the next day. Existing tap mastery/help behavior remains intact; microphone results do not unlock fretboard lessons.
- One active item produces at most one settled learning result. Help, replaying the answer sound, and mistakes mark it assisted. Revisiting an already answered item or duplicate microphone events cannot credit it again.
- Daily practice uses unlocked notes only. Select overdue notes first, then weak attempted notes, then other unlocked notes, with deterministic ties. Fill a short pool by repeating it to eight prompts. For beginners, offer the first lesson before a daily review history exists.
- Keep eight prompts per daily round. A missed note may replace a later duplicate slot after at least two intervening prompts, only if this preserves coverage of other selected notes. Otherwise leave it due for the next session. Never silently append a ninth prompt.
- New daily and melody sessions resume only settled answers. Persist any current-item assistance flag so reloading cannot turn an assisted attempt into a clean success. Never resume a microphone stream automatically.
- For clock changes, validate finite timestamps and never grant extra interval advances for a time earlier than the last credited review. Use elapsed days rather than local date strings for due calculations.
- Retention feedback must describe observed evidence, such as remembering a note after four elapsed days. It must not call a same-session repetition long-term retention.

### Melody challenges

- Ship six original phrases of four to eight notes, covering several existing lesson levels. Every note must be available within the unlocked lesson range and visible neck range. Validate the catalog against current note IDs.
- Show the whole phrase with the current note marked. Support silent practice, optional full-phrase playback, and replay after completion.
- Keep note input self-paced. Correct input advances exactly one step; wrong input leaves the step active and offers a concrete cue using existing note/position data. Help reveals the target.
- Playback or help marks the current step assisted; full-phrase preview marks every not-yet-answered step assisted. Completed steps cannot be credited again by replaying or navigating backward.
- Use shared learning outcomes for scheduling, but keep melody completion and existing lesson unlocking separate. Repeated occurrences of a note in a phrase cannot advance its review stage multiple times.
- Cancel scheduled playback on stop, navigation, new playback, input-mode change, or disposal. Do not build timed melody playback by rapidly calling the current single-note player, whose cancellation behavior may replace previous voices.

### Guitar input

- Offer an explicit input choice and a visible listening/stop state. Ask for microphone access only after a user gesture. Tap practice remains usable when permission is denied, unavailable, or left pending.
- Process monophonic audio locally. Do not record, upload, or persist raw audio. Bound detection to the current curriculum's sounding-pitch range, using the existing guitar octave convention.
- Initial matching rule: a confident estimate within 35 cents of the exact target MIDI pitch for at least 150 ms. Treat these as tuning defaults requiring real-device evidence. A different octave is incorrect.
- Silence, noise, low confidence, and ambiguous/polyphonic input do not generate wrong-answer events. Stable wrong pitches produce one gentle retry result per attack, not one per analysis frame.
- Require release/silence before accepting a repeated pitch on the next item. Freeze scoring after acceptance and discard callbacks from previous item/session generations.
- Suspend input scoring during app playback and until the playback tail has decayed; require a fresh attack before listening can credit an answer. Hearing the app must never answer its own question.
- Stop all stream tracks and analysis resources on stop, hidden page, navigation away, input switch, completion, or unmount. If a permission request resolves after cancellation, stop its late-arriving tracks immediately.
- Use HTTPS or localhost for microphone verification. A plain HTTP LAN URL on a phone is not sufficient. Platform requirement: [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

## Team and ownership

Use one root and at most three concurrent workers. Reuse finished slots for independent review. No agents or worktrees are created during planning.

| Agent | Purpose and inputs | Exclusive writing scope | Prohibited scope | Output and verification |
| --- | --- | --- | --- | --- |
| Root / integrator | Own requirements, shared contracts, progress compatibility, lifecycle integration, and final evidence | `src/contracts.ts`, `src/game.ts`, `src/game.test.ts`, `src/progress.ts`, `src/progress.test.ts`, `src/App.tsx`, `src/audio.ts`, `src/audio.test.ts`, `src/styles.css`, `src/usePracticeMotion.ts`, existing `src/components/Staff.tsx`, package/config files, existing E2E, README, plan | Unrelated changes, external writes, push/PR/deployment | Contract commit; integrated feature commits; full regression report |
| A / spaced practice | Contract commit, existing mastery and lesson catalog | `src/learning.ts`, `src/learning.test.ts`, existing `src/review.ts`, `src/review.test.ts`, new `src/components/DailyPracticePanel.tsx` | Shared root files, melody/input code, package/config files | Pure scheduler, daily queue, focused panel, literal-clock behavior tests |
| B / melody | Contract commit, note catalog and playback port | `src/melodies.ts`, `src/melodies.test.ts`, `src/melody.ts`, `src/melody.test.ts`, new `src/components/MelodyStaff.tsx`, `src/components/MelodyChallengePanel.tsx` | Scheduler, existing Staff, shared root files, audio engine/config | Catalog, phrase state machine, accessible staff/panel, sequence/help tests |
| C / guitar input | Contract commit, exact-pitch examples, input port | `src/pitch.ts`, `src/pitch.test.ts`, `src/guitar-input.ts`, `src/guitar-input.test.ts`, new `src/components/GuitarInputPanel.tsx`, `tests/fixtures/guitar-input/` | Scoring/unlocking policy, root files, melody/scheduler, package/config | Pitch estimator, resource-safe input adapter, panel, fixture and lifecycle tests |
| Independent verifier | Integrated commit and acceptance criteria; starts after implementation slots free | Read-only source and app; write only `tasks/learning-verification.md` | Production code fixes or self-approving implementer claims | Findings by severity and location; desktop/phone browser results; explicit physical-device limits |

Workers can import committed shared types but cannot edit them. Each new panel owns a feature-specific CSS file if needed; global CSS remains root-owned. A worker requesting a dependency or shared-file change reports the reason to root first. Root either lands it before consumers need it or reassigns ownership explicitly.

## Worktree map and dependency graph

Use sibling paths outside the source checkout. Root creates branches only after checking the target paths and branch names are free. Never remove an existing checkout to reuse its name.

| Branch | Worktree | Owner | Start gate | Integration order |
| --- | --- | --- | --- | --- |
| `feature/learning-suite` | `../note-practice-learning-integration` | Root | Rechecked clean base; plan committed separately if authorized | Authority for all integration |
| `feature/daily-practice` | `../note-practice-daily` | A | Root contract commit | 1 |
| `feature/melody-challenges` | `../note-practice-melody` | B | Same root contract commit | 2 |
| `feature/guitar-input` | `../note-practice-guitar` | C | Same root contract commit | 3 |

The dedicated integration worktree leaves the user's primary checkout undisturbed. Workers branch from the exact committed contract SHA, not a moving `main`. Each worktree gets its own dependency installation and browser port; run fixed-port E2E serially if configuration is unchanged.

```text
Baseline and contract commit
  |-- A: scheduler + daily review --------> daily integration + review
  |-- B: catalog + melody state/UI -------> melody integration + review
  `-- C: detector + input lifecycle ------> guitar integration + review
                                                |
                              independent verification + physical guitar gate
```

B and C build against stable ports rather than importing A's uncommitted implementation. Root connects learning outcomes after A lands. The three features remain independently demonstrable; microphone readiness must not hold back a usable daily-practice increment.

## Execution waves and handoffs

### Wave 0: root establishes the baseline and contracts

- [ ] Recheck Git status, worktrees, instructions, and the recorded base. Preserve all unrelated work; stop to reconcile if the base or ownership changed.
- [ ] Create the isolated integration checkout at execution time. Run `npm ci`, `npm test`, `npm run build`, and `npm run test:e2e`; record pre-existing failures before changing code.
- [ ] Run `graft callers <symbol> --depth all` before changing shared symbols such as `answer`, `Round`, or `Progress`. Inspect actual caller coverage rather than relying on the earlier ranked search.
- [ ] Root commits the shared learning record/outcome types, daily/melody session discriminants, note-based answer entry point, injected-clock contracts, and input/playback ports. Keep tap correctness and exact-octave semantics in one scoring path.
- [ ] Define ports for daily queue construction, one settled learning outcome, melody advancement, cancellable phrase playback, and guitar listening. Include session/item identities and input skill in outcomes. Keep microphone lifecycle state separate from saved progress.
- [ ] Add compatibility tests proving old progress, unknown new data, invalid dates, malformed sessions, and blocked storage remain safe. Do not infer past spaced-review successes from legacy mastery counts.
- [ ] Contract gate: existing tests pass, fixtures show literal high E sounding E4 versus written E5, and all workers receive exact signatures, owned paths, and the contract SHA.

### Wave 1: A, B, and C start together

Each worker follows a bounded test cycle: add meaningful failing behavior tests, implement the owned feature, run focused tests and build, inspect its diff, and commit explicit paths. No worker merges or rebases the integration branch.

- [ ] A tests due ordering, fewer than eight unique notes, all-due/all-future pools, same-day repeated success, assistance, last-item error, clock rollback, and separate tap/pitch histories. Return a panel that root can wire without duplicating scheduling rules in React.
- [ ] B tests learned-note eligibility, exact phrase ordering, repeated notes, wrong-answer retry, assistance from preview/help, completion once, and invalid resume state. Return six catalog entries and keyboard/screen-reader-friendly phrase rendering.
- [ ] C tests independently labeled fixtures for every open string, selected first-three-fret notes, octave errors, harmonic-heavy plucks, silence, noise, detuning, and repeated attacks. Test denied/pending permission, late permission resolution, stop/restart, hidden pages, stale callbacks, and playback suppression. Fixtures must be original/generated or have recorded redistribution rights; disclose that generated tones are not physical-guitar evidence.
- [ ] Every worker reports branch, worktree, base SHA, commit SHA, changed paths, commands/results, assumptions, unresolved risks, and any requested ownership change. A passing unit test is not a claim of browser or physical-device success.

### Wave 2: root integrates three reviewable increments

- [ ] Review A's diff and evidence; cherry-pick its owned commits. Wire daily entry, persistence, outcome scheduling, and retention summary. Verify eight prompts, retry spacing, saved progress, and no extra mastery from reload/revisit. Commit the complete daily increment.
- [ ] Review B; integrate melody catalog/state/UI. Root extends audio playback with cancellation and wires learning outcomes. Verify playback cannot credit an answer, learned-note eligibility, silent mode, resume, and original lessons. Commit the complete melody increment.
- [ ] Review C; integrate microphone lifecycle and input choice. Route accepted pitches through shared scoring with pitch-skill attribution. Gate callbacks by item/session generation; keep tap fallback immediate. Commit the complete guitar increment.
- [ ] Root updates README and focused E2E for each integrated feature. Run focused checks after each increment and the complete suite after the final integration. Resolve conflicts centrally and retain worker-to-integration commit provenance.

### Wave 3: independent verification

- [ ] Start a fresh verifier with the integrated SHA, this plan, test commands, and device matrix. A worker may review another worker's scope, but cannot independently approve its own feature.
- [ ] Verify migration and session resumption, daily scheduling across simulated days, melody correctness, input isolation, accessibility, reduced motion, narrow layouts, offline tap flows, and microphone denial/recovery.
- [ ] Run real browser journeys on Chromium desktop and phone viewport; add WebKit coverage for microphone/audio lifecycle where available. A simulated phone viewport is recorded separately from a physical phone.
- [ ] Physical check on a supported iPhone/Safari and Android/Chrome over HTTPS: ten isolated plucks for each open string and three selected fretted notes, plus repeated pitches, alternate pitches, silence, ordinary room noise, background/foreground, and switching input modes. Record device/browser, conditions, correct detections, missed detections, false acceptances, and time to recognition.
- [ ] Proposed device gate: at least nine of ten plucks accepted for each tested pitch within one second, no wrong-octave acceptances in ten deliberate octave trials, no duplicate credit in ten repeated-note trials, and no accepted answers during a 30-second silence/noise trial or app playback. These are release thresholds to validate, not measured results.
- [ ] If physical devices are unavailable or the gate fails, report guitar mode as unverified and keep it out of the default production entry. Do not call all three features complete. Daily and melody may remain independently accepted on the integration branch.
- [ ] Root fixes findings in its checkout, reruns affected checks, and requests verifier readback for material fixes. Finish with no unresolved correctness, data-loss, privacy, or resource-leak findings.

## Verification commands and observable gates

Worker commands, using only files that worker owns:

```sh
npx vitest run src/learning.test.ts src/review.test.ts
npx vitest run src/melodies.test.ts src/melody.test.ts
npx vitest run src/pitch.test.ts src/guitar-input.test.ts
npm run build
```

Root runs integrated checks from the integration checkout:

```sh
npm test
npm run build
npm run test:e2e
npm run build:pages
git diff --check
git status --short
```

Browser acceptance includes 320, 375, and 430-pixel widths, reachable 44-pixel touch targets, keyboard input, visible focus, accessible current-note and listening states, no console errors, and navigation that cleans up audio. Inspect the Pages base path and offline cache after building. A build or passing CI does not prove deployment or physical input behavior.

## Integration safety, recovery, and definition of done

- Only root writes shared files or integrates commits. Keep feature commits small enough to revert independently. No pushed-history rewrite, force push, PR, deployment, or external write is part of execution unless separately requested.
- Preserve legacy progress fields and storage key; optional learning extensions must not make old progress unreadable. Never erase all storage as an error-recovery action. Test rollback to the previous app with the extended payload.
- Stop a workstream for contract drift, ownership collisions, progress loss, app-playback self-scoring, or persistent microphone tracks. Diagnose before proceeding; do not lower acceptance thresholds to make a gate pass.
- Completion requires all three observable feature flows, compatible saved data, passing integrated checks, independent review, and physical microphone evidence. Remaining hardware limits must appear prominently in the handoff.
- No required change remains only in a worker checkout. Record integration branch/SHA, worker provenance, test results, device evidence, remaining limits, and primary-checkout status. Keep worktrees until this evidence is recorded; remove only clean finished worktrees, without discarding user data.

## First execution wave

Root first rechecks the base and establishes the contract commit in the integration checkout. No implementation worker starts before that gate. Then start A, B, and C together from that exact SHA; keep the verifier blocked until integration. Return the baseline results and contract evidence before connecting feature implementations.
