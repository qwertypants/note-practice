# Learning suite independent verification

## Scope and build

- Initial integrated checkout: `feature/learning-suite` at `b1c32be` on 2026-11-10. Reviewed the revised instrument-free acceptance criteria in `tasks/learning-team-plan.md`.
- A first `npm run test:e2e` used a concurrently generated Pages-base `dist` against the root-path test server: 39 passed, 5 failed with missing assets/MIME errors. After `npm run build` restored root-path assets, a fresh `npm run test:e2e` passed **44/44** Chromium desktop and phone-emulated cases. The first failures do not reproduce with a matching build.
- Dedicated `vite preview` at `http://127.0.0.1:4175/` served the root-path production build for direct Playwright inspection. This is a local browser check, not a deployment check.

## Direct browser evidence

- At 320, 375, 430, and 1280 px, daily and melody activity pages had `document.documentElement.scrollWidth - innerWidth === 0`. At 375 px, the activity panel scrolls to the top on entry; its step count is in the viewport. The melody shows all four staff notes with the first marked and the accessible label `Melody on a treble staff. Note 1 of 4 is marked.` Daily shows `1 / 8 notes` and its current staff note.
- All visible enabled buttons measured at least 44 × 44 CSS px at those four widths. A neck button accepted keyboard Enter. Tabbing to a neck button showed a 3 px solid focus outline.
- Leaving and resuming a melody retained the settled first step. Across the four inspected widths, no page errors or console errors occurred.
- In a fresh 375 px Chromium context, the service worker controlled the page after a reload. With the browser context offline, a further reload rendered the catalog and tapping a melody neck position reached the correct-answer state. Audio availability offline was not assessed.
- Screenshots: [melody 375 px](../artifacts/learning-ui/melody-375.png), [daily 375 px](../artifacts/learning-ui/daily-375.png), [melody desktop](../artifacts/learning-ui/melody-1280.png), [daily desktop](../artifacts/learning-ui/daily-1280.png), [corrected last melody step at 320 px](../artifacts/learning-ui/melody-final-320.png), and [corrected last melody step at 375 px](../artifacts/learning-ui/melody-final-375.png). These are ignored local artifacts and are not committed.

## Pending code review findings

The root's separate code review identified three material issues after the initial browser pass: retention-day text may overstate the gap after intervening Help/error; a resumed legacy lesson with Help may be recorded as clean in the new scheduler; and `crypto.randomUUID()` can fail in an insecure HTTP LAN context. Visual inspection also found that the fourth melody note was partly clipped at 375 px because the staff was wider than its scroll container, with no automatic follow as the active step advanced. Commit `63107d0` addressed these and passed 70/70 E2E tests. Independent browser readback found all four melody steps fully within the staff scroll container at 320 and 375 px; the last step had about 16.5 px of right clearance at both widths. Offline tap practice again worked after service-worker control. A later scoped review found two remaining retention callers that need correction: delayed assisted activity resolution and repeated Help on a previously assisted lesson question. Root is addressing these; final readback is pending.

## Limits

- Chromium phone emulation does not prove behavior on a physical phone or Safari.
- The local preview and service-worker check do not prove the GitHub Pages deployment.
- The browser checks do not establish long-term retention or audible playback through physical speakers.
