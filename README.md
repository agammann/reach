# Reach — input journey prototype

Reach explores a checkpoint contract for whether a browser game reaches menu, play, pause, recovery and finish using keyboard and discrete single-action profiles. It includes a clean-room sample game, a Playwright adapter, per-step screenshots, local evidence viewer and human observations. It is an early prototype, not accessibility certification. Automated input profiles do not simulate disability or replace disabled players, assistive hardware, or usability studies.

## Try it

Requires Node.js 24 and npm. The browser tests require Playwright's Chromium. From the project root:

```sh
npm install
npx playwright install chromium
node --test test/*.test.ts
node --test test/browser.e2e.ts
node examples/browser-run.ts keyboard
node examples/browser-run.ts single-action
```

Alternatively, if Chrome or Edge is already installed, set `REACH_BROWSER_CHANNEL` to `chrome` or `msedge` before running the browser commands. The default uses Playwright-managed Chromium.

Each run creates a new uniquely named directory under `evidence/` and prints its path; open its `index.html` locally to inspect screenshots and outcomes. Earlier runs are preserved. Set `REACH_EVIDENCE_ROOT` to choose another output root. Each run writes JSON, a Markdown guide and a static HTML viewer. Files stay local. Reports and screenshots can contain sensitive content: inspect them before sharing. Evidence folders are ignored by Git.

The sample responds to Enter, Escape and R in the keyboard profile, and individual Space presses in the single-action profile. It never holds a key. To demonstrate detected blocks, run `node examples/browser-run.ts keyboard trap`, `node examples/browser-run.ts keyboard unpausable`, or `node examples/browser-run.ts single-action held-only`. Repeat without the fault argument to see the corrected version. These switches simulate defects in the sample game; they are not a substitute for testing an actual game.

For observations, put a JSON array like `[{"step":1,"note":"Focus was difficult to find"}]` in a local file and set `REACH_OBSERVATIONS` to its path. Step indices start at zero. Notes do not override outcomes. The runner stops at the first blocked checkpoint. Seed 42 selects the sample's visual variant. The elapsed time covers input and checkpoint observation, not screenshot capture.

## Integrating a game

The browser adapter in `src/playwright-adapter.ts` demonstrates Playwright input and screenshots for the sample game's `data-checkpoint` attribute. Implement `Adapter` in `src/reach.ts` for another game: reset with a seed, deliver actions, observe the named checkpoints and capture evidence. The game must expose trustworthy semantic checkpoints and the adapter must supply deterministic setup, appropriate timeouts and input mappings. The bundled adapter is specific to the sample, has immediate checks and is not a general game recorder. Screenshots are optional in the core contract; capture failures are recorded separately and do not change a checkpoint outcome.

The browser suite exercises the sample using both profiles and three injected faults. Validation still needed: integrate an actual game, review with intended players, add journey recording and handle games with asynchronous transitions. Integration may cost more than it saves for a tiny game. No market-fit or safety claim is made.

## Context

[Ubisoft Chroma](https://github.com/ubisoft/Chroma) focuses on color-vision simulation. [GameDriver](https://www2.gamedriver.io/en-us/pricing) offers broader commercial game/XR automation. Reach explores a narrower checkpoint and human-observation contract for browser-game input journeys; this comparison does not establish novelty or exhaust the field.

Original code is MIT licensed. Playwright is a separate Apache-2.0 dependency; see its notices in its installed package.
