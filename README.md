# Little Frets

A relaxed, phone-first game for learning guitar note reading. See a note on a staff, then tap its position on the guitar neck. Start with open E and B, gradually learn the other strings, and move into natural notes within the first three frets.

[Play Little Frets](https://qwertypants.github.io/note-practice/) · [Source code](https://github.com/qwertypants/note-practice)

## Run locally

Use Node.js 22.12 or newer and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To try it on a phone connected to the same Wi-Fi, open the printed Network URL. The development server must keep running on your computer.

## Build and verify

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run preview` serves the production build locally. `dist/` contains the static site. No server API, credentials, or account is required.

## How practice works

- Each round has eight questions with no countdown or lives.
- Tap a string above the nut for an open note. Later lessons add fretted positions.
- Mistakes stay retryable. Help shows where to tap, and missed notes return for review where possible.
- Three first-attempt successes for a note fade its name hint. A mistake or Help restores the hint. Assisted answers do not build mastery.
- Mastering a lesson unlocks the next one. Earlier lessons remain available and unlocked lessons stay unlocked.
- Progress stays in this browser's local storage. Clearing browser data removes it; private browsing may discard it. If storage is blocked, you can still play for the current session.

The game teaches pitch recognition and fretboard familiarity. Rhythm, chords, accidentals, microphone input, and instrument performance are outside this first version.

## Music conventions

Standard tuning uses sounding pitches E2, A2, D3, G3, B3, and E4 from thickest to thinnest string. Guitar notation is written one octave higher than it sounds. The app keeps sounding pitch separate from staff position and accepts every visible neck position with the exact same pitch.

References: [Yamaha's guitar tuning guide](https://www.yamaha.com/en/musical_instrument_guide/classical_guitar/play/play002.html) explains the notation octave; [Yamaha's string-order guide](https://www.yamaha.com/en/musical_instrument_guide/acoustic_guitar/trivia/trivia006.html) gives standard string order.

## Project records

The approved design is in `tasks/plan.md`, acceptance criteria in `tasks/todo.md`, and implementation decisions and verification in `tasks/execution.md`.

## GitHub Pages

Pushes to `main` run unit tests, a production build, and desktop and phone browser tests before deploying `dist/` to GitHub Pages. `npm run build:pages` builds with the `/note-practice/` base path. Enable GitHub Actions as the Pages source in repository settings.

## Contributing

Bug reports and pull requests are welcome. Describe how to reproduce a bug and run the verification commands above before submitting a change.

## License

MIT. See [LICENSE](LICENSE).
