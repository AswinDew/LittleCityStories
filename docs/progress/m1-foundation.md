# M1 execution ledger — 2026-10-16

Plan: `docs/superpowers/plans/2026-10-15-civilization-town-mvp.md`.
Authorized scope: M1 / Tasks 1–3 only, followed by verification and review. Stop before M2.

- Ruling: use feature branch `codex/m1-foundation` in the existing checkout, keeping work in the user's requested project. No worktree, merge, push, or automatic commit.
- Pre-flight 1→3: configuration, grid, seed and PRNG state are shared plain data; Three.js coordinate adapters must stay outside simulation.
- Pre-flight 2→3: the clock returns fixed tick counts, session consumes them; browser lifecycle must reset scheduler baseline without overriding manual pause.
- Ruling: retain the legacy construction catalog/store behind the existing APIs during M1. The authoritative construction/resource cutover belongs to M3; do not invent M3 commands in M1.
- Ruling: M1 world generator reserves a Town Center site, but does not draw a pretend Town Center or spawn citizen placeholders. Actual assets and population remain M2/M5 deliverables.
- Ruling: generated settlement size is limited to 12–128 so the clear starter area and two adjacent sources fit. Pure grid helpers still support smaller grids. Defaults remain 32×32 / cell size 2.
- Ruling: Vitest 2 had six audited development vulnerabilities, including critical findings. Upgrade to Vitest 5.0.5 resolved them; Node engines and README now declare the supported range. Application runtime dependencies were retained.
- Ruling: legacy pointer drag/cancel/touch hardening remains assigned to Task 9 as the approved plan specifies. M1 verifies mouse pan/zoom and click placement/demolition; it does not claim the full later interaction audit.

## Evidence

Final verification on 2026-10-16, branch `codex/m1-foundation`:

| Check | Result |
|---|---|
| `npm.cmd test` | 84 tests passed in 16 files |
| `PLAYWRIGHT_CHANNEL=chrome npm.cmd run test:e2e` | 5 passed: real WebGL canvas, layers/manual stepping, pan/zoom/resize/rotation lock, blocked environment placement and road placement/demolition, pause/speed, persisted page lifecycle handlers |
| `PLAYWRIGHT_CHANNEL=chrome npm.cmd run test:e2e:production` | TypeScript strict + Vite build passed; 1 production browser smoke passed, canvas visible and test hook absent even with `?manual=1` |
| Production artifact search | No `__CIV_TOWN_TEST__` or `installTestHooks` in `dist` |
| `npm.cmd audit --json` | 0 vulnerabilities |
| `git diff --check` | Passed |
| Visual inspection | Screenshot `test-results/m1-foundation.png` inspected: seeded terrain/environment, clear center, readable HUD and zoom controls clear of construction dock |

The browser suite used installed Chrome with an isolated Playwright profile and software WebGL. Chromium download was slow and was canceled after the installed browser proved sufficient. Real device performance, genuine BFCache eligibility, and complete gameplay remain later milestone validation; the page cache test exercises the application's lifecycle event handlers.

## Review and resolved defects

- Separate read-only M1 review requested changes for two concrete issues: factory meshes did not scale with configurable cell size, and Node prerequisites were stale after the test-tool upgrade.
- Added road/ghost geometry bounds tests at cell sizes 1 and 3. Both failed before the fix and passed afterward. Placed buildings, preview meshes, and environment now scale consistently.
- Declared Node `^22.12.0 || ^24.0.0 || >=26.0.0` in package metadata/lock and documented installation/testing steps.
- Lifecycle integration test caught lost visible-time remainder at the hide boundary (1 tick received vs 2 expected). Pumping the final visible slice before suspension fixed it; no hidden time is added and manual pause remains unchanged.
- Removed legacy `beforeunload` disposal to preserve pagehide/pageshow restoration; cleanup is idempotent. Added scheduler-independent rendering and disposal tests.
- Strict browser console check found a favicon 404; a local code-authored SVG favicon resolves it.
- Parallel browser suites initially collided on trace artifacts. Development and production now use separate output directories; both complete successfully in parallel.
- Reviewer rechecked both requested fixes and approved them with no further high-confidence issues. Later population/economy/persistence work was correctly excluded from this M1 review.

Build reports a 538.91 kB minified / 138.77 kB gzip main chunk, above Vite's advisory 500 kB warning. This is a recorded bundle baseline, not a failed build or a performance certification. Profiling and measured bundle optimization remain Task 22; the warning threshold was not weakened.

M1 is complete. No M2 assets, economy, citizen AI, research, or persistence were implemented. Stop here until the user requests continuation.
