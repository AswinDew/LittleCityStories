# M4 execution ledger — plan: docs/superpowers/plans/2026-10-15-civilization-town-mvp.md

Scope: Tasks 10–11 only; verify/review and stop before M5. Base: 81fff3d (M3). Branch: codex/m4-economy. Baseline: 141 tests passed. No commit/merge/push requested.

- Pre-flight 10→11: production and consumption bind the session's same inventory/capacity through ResourceLedger. Construction lifecycle delegates capacity calculation to StorageSystem.
- Pre-flight 10→M5: worker presence needs identity, exclusive workplace, arrival, work activity/animation and explicit reachable access. M4 defines that plain-data contract; M5 provides real navigation and assignment. No game citizen injection.
- Ruling: retain the current checkout on a new feature branch, consistent with M3, so the local server serves the user's current project. Cost if wrong: move uncommitted work to a worktree.
- Ruling: extraction radius uses Euclidean distance to the nearest footprint tile, inclusive at 3 tiles. Sources remain infinite; removal immediately blocks output. Cost if wrong: adjust the distance predicate and boundary tests.
- Ruling: each worker stores integer work credit (200 units per normal tick, 100 when hungry), multiplied by resource productivity percent / 100; a 10-second batch requires 20000 units. Keep at most one ready batch per assigned worker, with no work accrued during blocked retries. This preserves 50%/future percentage remainders and prevents stockpiling. Cost if wrong: change the persisted progress representation before M7 saves exist.
- Ruling: tax uses current meal success and a valid completed home with stable housing-slot allocation. Full coin storage drops that meal's tax; it never delays food allocation or creates a tax backlog. Cost if wrong: add a bounded tax pending policy.

Task 10: complete. Production RED: 18 behavior assertions failed against empty contract, then 19 passed. FPS equivalence and non-divisible remainder cases passed. Registry invalid rule tests failed first, then validation added; fractional interval rejected in a follow-up regression. Final full suite: 182/182 passed.

Task 11: complete. Consumption/storage RED: 12 assertions failed against empty contracts, then all 13 passed. Includes three citizens/600 ticks, stable shortages/recovery, housing validity/slots, tax capacity, storage demolition with wood 500→525/refund and capacity 300, bounded batches and pause/2× equivalence. Session invokes construction → production → consumption; no browser citizens invented. Final full suite: 182/182 passed.

Browser RED→GREEN: new farm operating-status assertion failed because no status was rendered, then passed after inspector projection.

## Verification — 2026-10-17

| Check | Actual result |
|---|---|
| `npm.cmd test` | 182 passed across 24 files |
| `python -m unittest discover -s tests/assets` | All 8 passed |
| `PLAYWRIGHT_CHANNEL=chrome npm.cmd run test:e2e` | All 10 passed, including M1–M3 regressions and M4 status/resource scenario |
| `PLAYWRIGHT_CHANNEL=chrome npm.cmd run test:e2e:production` | Strict TypeScript/Vite build and 1 production browser test passed |
| `git diff --check` | Passed |
| Screenshot | `test-results/m4-economy.png` inspected at 1280×720; Farm site, paid 40 wood, 90 food/50 coins after 1200 ticks, waiting construction status and inspector readable |
| Local server | `http://127.0.0.1:3000/` returned HTTP 200 |

Build advisory: main JS chunk 587.48 kB minified / 154.93 kB gzip. Existing 500 kB advisory retained; measured optimization stays M8. Software WebGL browser smoke does not certify real device FPS, mobile layout, or genuine BFCache eligibility.

## Final fresh review

Read-only reviewer independently passed 57 tests across 5 focused suites and `git diff --check`. No Critical, Important, or Minor defects found; M4 approved. No pending fixes or deferred minors.

The reviewer explicitly set aside later milestone behaviors; rulings below retain the agreed scope:

- Final: Ruling: citizen bootstrap, assignment commands, builders, pathfinding/revision and return schedules remain M5. M4 consumes explicit access/presence data only — the approved roadmap separates these — cost if wrong: move navigation/assignment integration earlier.
- Final: Ruling: work-animation suspension/restart on blockers remains M5 Task 15. Production's work-animation gate is intentional; M5 must restore presence when a blocker clears — cost if wrong: workers could stay stalled until the activity integration is corrected.
- Final: Ruling: happiness, growth and real-population food recovery remain M5/M8. M4 owns hunger and meal rules only — cost if wrong: expand the population scope.
- Final: Ruling: technology effects remain M6. Current `productionModifiers` are work-rate percentages; Task 17's exact batch contract (6 food/3 wood at 100 work ticks) requires output scaling/remainders, rather than simply setting a 150% work rate. Record this integration requirement now; do not implement research early — cost if wrong: M6's exact output test will fail and its production adapter must change.
- Final: Ruling: save validation/load/counter restoration remains M7. Persistable plain work credit and counters are ready, but system recreation tests do not certify saves — cost if wrong: implement and validate persistence earlier.
- Final: Ruling: full worker/production UI, final session controls and accessibility polish remain M7. M4 adds the operating reason only — cost if wrong: expand the UI milestone.
- Final: Ruling: full pointer and production browser regressions are accepted based on the implementer's completed 10+1 browser tests; the reviewer did not rerun browsers — cost if wrong: repeat the affected browser scenario on a real failing environment.
- Final: Ruling: large-settlement performance and long-run balance remain M8. No unbounded pending production was found; no device performance claim is made — cost if wrong: profile and rebalance before growing the settlement further.

M4 is complete. Stop before M5 until the user requests continuation. Changes remain uncommitted on `codex/m4-economy`, matching the user's previous milestone workflow.
