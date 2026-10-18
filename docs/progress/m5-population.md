# M5 execution ledger — plan: docs/superpowers/plans/2026-10-15-civilization-town-mvp.md

Scope: Tasks 12–15 only; test/review/fix, then stop before M6. Base 8a9c9dc (M4). Branch codex/m5-population. No commit/merge/push requested.

- Pre-flight 12→13→14: session owns citizens/grid; assignment is exclusive by workplaceId; navigation reads that same live grid and a mutation revision; activity establishes M4 access, arrival and animation gates.
- Pre-flight 14→15: sprites consume activity/direction/position/tick only; no animation creates work. Source/storage blockers must resume without requiring an already-playing work animation.
- Ruling: keep current checkout on a new feature branch, matching prior milestone workflow; cost if wrong: move uncommitted work into a worktree.
- Ruling: citizens can share walkable entrance tiles; unique bootstrap cells avoid initial overlap, but no crowd-collision system is added. Cost if wrong: add reservations/crowd routing later.
- Ruling: growth requires 1200 consecutive eligible ticks and resets on shortage/housing/happiness failure. Cost if wrong: change the growth timer policy.

Baseline: all 182 M4 tests passed.

Task 12: complete — identities/housing/exclusive assignment and automatic one-builder-per-site integrated; 3 new tests RED→GREEN after Task 14 arrival connection. Initial cells are distinct and walkable, names/IDs seeded. Unassign/demolition clear roles and references immediately.

Task 13: complete — A*, stable tie breaks, road costs, bounded revision cache and command revision integrated; 4 tests RED→GREEN plus 4 rotated entrance cases. In-flight origin/target tiles are reserved against placement.

Task 14: complete — real fixed-tick movement, 600-tick work shift, 100-tick home rest, arrival/access/animation work gates, source/storage idle/recovery integrated. Initial 4 activity tests RED→GREEN; additional regressions caught old-route continuation after unassign and incomplete builder eligibility checks, both fixed RED→GREEN. Movement does not snap fractional positions when destination changes.

Task 15: complete — population/happiness/consecutive growth integrated, 6 tests RED→GREEN; 3 cell-size renderer tests RED→GREEN. Vertical atlas planes have binary alpha testing, nearest filtering, depth test/write and foot anchor; geometry/material/UV texture clones dispose with their citizen. Rendering uses immutable snapshots and clock interpolation, whose pause-fraction test failed then passed. Integer-only grid placement conversion was replaced by continuous-coordinate projection in the citizen renderer after its first actual run exposed the mismatch.

- Ruling: retain historical no-worker economy/construction tests with explicit zero population (and no food for long runs, preventing actual immigration). Default session tests now assert 3 citizens. Development art gallery configures zero population; production ignores gallery flags. Cost if wrong: adjust fixture configuration without weakening live-citizen tests.
- Ruling: movement can finish a safe active segment before adopting a new destination; both segment cells are protected from construction. A blocked segment waits in place; no teleport or snap is permitted. Cost if wrong: replace segment reservations with a richer crowd movement model.

Browser initial M5 playtest: real UI placement, builder/farmer work, actual four movement directions, return/rest and UI unassign passed. Screenshot review found happiness/hints and inspector/zoom overlap; a layout regression was added before the CSS fix. Full browser/production verification and final review pending.

Additional RED→GREEN coverage: arrived worker access is rechecked on navigation revisions; closing the home/work route stops output/animation until reopened. Hungry builder contribution stores a half-tick remainder. Growth without a free spawn waits without allocating an ID or crashing. Full unit suite now 216 passed across 29 files. No technology/save functionality added.

## Verification — 2026-10-18 (before final review fixes)

- `npm.cmd test`: 216 passed across 29 files.
- `npm.cmd run test:e2e`: 13 passed, covering M1–M5, actual citizens, assignment UI, four directions, minimum/normal/maximum zoom and front/behind scene positions. Layout regression passed after CSS fix.
- `npm.cmd run test:e2e:production`: strict TypeScript/Vite build and 1 production browser smoke passed; test hook/gallery excluded.
- Python asset suite: 8 passed after sandbox temporary-directory denial was retried with approved escalation. Generated assets unchanged.
- `git diff --check`: passed. Development game server restarted on port 3000 and returned HTTP 200.
- Visual evidence inspected: `m5-walk-NW/SE.png`, `m5-citizens-minimum/normal/maximum.png`, `m5-occlusion-behind/front.png`. Character feet, atlas edges, plane orientation and zoom scaling reviewed. Layout screenshots show happiness and worker controls clear after fix; occlusion scenario adjusted to the nearer diagonal behind Town Center for stronger evidence in the final run.
- Main chunk advisory baseline: 605.29 kB / 160.14 kB gzip before final review fixes. No size threshold changed. No device-FPS/mobile/BFCache certification is claimed.

## Final fresh review and fix pass

The independent read-only reviewer identified two Important issues, with no Critical or additional Minor findings. Both were accepted as user-visible correctness defects and fixed in one pass:

- Final: fixed worker selection/focus reset — browser regression selected citizen-3, advanced one unrelated tick, and failed with citizen-2. HUD now compares cached source markup rather than browser-normalized HTML, updates construction progress in a persistent span, and preserves a still-available selection/focus across actual worker-list changes. Regression passed after the fix, including a second selection retained across a real assignment update.
- Final: fixed stale access granted on arrival — actual-domain regression closed the home/work corridor behind a navigating farmer, who incorrectly arrived as reachable and produced food. Arrival now forces home/work validation even when movement already stamped the current navigation revision. Regression now stops output and resumes only after a genuinely walkable corridor reopens. The first recovery fixture accidentally opened a hole immediately above the guaranteed starter tree; correcting that hole to (12,15) tested real route recovery rather than weakening access checks.

Post-fix verification: `npm.cmd test` passed 219 tests across 29 files; all 14 development browser tests and 1 production browser test passed. Production TypeScript/Vite build passed (main chunk 605.70 kB / 160.30 kB gzip advisory). All eight unchanged Python asset tests passed in this milestone. `git diff --check` passed and the game server returned HTTP 200. Final screenshots for four directions, minimum/normal/maximum zoom and front/behind scene positions were inspected after fixes.

Reviewer boundaries accepted for this milestone:

- Final: Ruling: save/load/corrupt-data validation, research and final session controls/accessibility remain M6–M7 — those milestones are not authorized yet — cost if wrong: advance their integration and verification scope.
- Final: Ruling: long-run balance and 100-citizen profiling remain M8 — no device performance claim is made — cost if wrong: profile/rebalance before expanding the settlement.
- Final: Ruling: pixel-level occlusion/zoom/flicker are assessed through the implementer's screenshots and renderer tests; the reviewer examined configuration but did not inspect screenshots — cost if wrong: repeat the affected visual scenario on the failing device.
- Final: Ruling: pointer/camera regressions and M4 ledger integration use the full automated suites; the reviewer did not repeat a comprehensive audit of unchanged systems — cost if wrong: investigate a reproduced regression in the owning module.

No deferred Minor findings. Changes remain uncommitted on `codex/m5-population`; M5 is complete. Stop before M6 until the user requests continuation.

Final lifecycle coverage: actual dispatcher tests also passed for workplace demolition during fractional navigation and home demolition during the return trip. Citizens keep continuous positions, clear orphan references, return safely or wait with no_home, and are not deleted. Final suite 219/219.
