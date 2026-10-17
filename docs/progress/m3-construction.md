# M3 execution ledger — plan: docs/superpowers/plans/2026-10-15-civilization-town-mvp.md

Scope: Tasks 7–9 only, then verification/review and stop before M4. Base: 745677f (M2). Branch: codex/m3-construction. No commit/merge/push requested.

- Pre-flight 7→8: one session owns resources/capacity/buildings and the live grid; ledger binds those same resource objects, never a second inventory.
- Pre-flight 8→9: pure layout and placement checks serve ghost feedback and actual command dispatch. UI validation is advisory; session revalidates before every mutation.
- Ruling: complete the coupled legacy consumer/test migration together; no writable treasury/building adapter survives M3.
- Ruling: planned demolition has the same full refund as cancellation; unfinished work beyond planned/completed demolition returns half of actually paid resources, rounded down per type.
- Ruling: construction step accepts only real builder entities already assigned, positioned at the entrance and actively working. M3 creates no citizens, paths or fake work progress; M5 will provide eligible builders.
- Ruling: keep current checkout and a new feature branch so the existing development server can continue serving the user's project.

## Delivered

- Task 7: immutable eight-definition ancient catalog and centralized balancing; one completed Town Center; authoritative session resources/capacity/buildings; atomic vector ResourceLedger. All writable legacy treasury/building store APIs and their production consumers were removed.
- Task 8: real dispatcher commands for buildings/roads, cancel/demolition and environment clearing; pure shared layout/entrance validation; reserved planned footprints, staged scaffolds, real-builder work gate and completed-only storage capacity. Existing entrances remain walkable, including on roads. Cancellation/demolition removes stale home/workplace references from fixture citizens.
- Task 9: UI-only placement adapter, 4px pointer intent, ghost/rotated footprint feedback, four-category construction menu, resource/capacity bar, idle selection, protected Town Center and inspector actions. Camera drag cancellation handles pointercancel, blur and lost capture.

## Verification — 2026-10-17

| Check | Actual result |
|---|---|
| `npm.cmd test` | 141 tests passed across 22 files |
| `python -m unittest discover -s tests/assets` | All 8 passed; M2 generated assets and skill references remain valid |
| `PLAYWRIGHT_CHANNEL=chrome npm.cmd run test:e2e` | All 9 passed: M1 foundation/lifecycle, M2 gallery, M3 construction/inspector/refund/clear and pointer guards |
| `PLAYWRIGHT_CHANNEL=chrome npm.cmd run test:e2e:production` | Production TypeScript/Vite build and browser smoke passed; generated textures load and debug hook/gallery remain excluded |
| `git diff --check` | Passed |
| Visual inspection | `test-results/m3-construction.png` inspected at 1280×720: paid resource totals, Town Center, planned scaffold, honest waiting status, menu and inspector |

The project still uses isolated Chrome/software WebGL for smoke tests. A completed building was not invented for the browser test: normal sites remain planned without M5 citizens. Headless construction fixtures provide real assigned builder data to verify eligibility, partial work, completion and capacity behavior.

## Review and resolved issues

- Fresh read-only review found no blocking gameplay-path defects and independently passed 46 focused tests. Its nonblocking coverage gaps for locked definitions and each worker-eligibility field were then covered explicitly.
- Browser tests caught native PointerEvent properties disappearing when object-spread into a plain object. A prototype-backed event regression failed before the explicit field capture fix, then passed; all three M3 browser scenarios and the full nine-test suite passed afterward.
- Additional ResourceLedger input tests found inherited negative costs could bypass own-entry validation. Plain/null-prototype restriction fixed that case. Targeted review found the related non-enumerable cost case; validation now inspects all own keys and data descriptors, rejects accessor/symbol/non-enumerable input and reads only own resource fields. Regression cases were observed failing before the fix and passing afterward.
- Review approved the final descriptor/own-field fix with no further findings. Atomicity checks cover failure paths without inventory, ID, occupancy or entity changes; refunds preserve overflow and repeat removal cannot create resources.
- Retained legacy procedural asset generators remain outside the active registry. No modern building or treasury is available through the gameplay catalog.

Vite reports the existing advisory main-chunk warning: 583.28 kB minified / 153.59 kB gzip after M3. This is a size baseline for measured Task 22 optimization; thresholds were not changed. Mobile/final UI polish, genuine BFCache eligibility and measured device FPS are not certified by these desktop smoke tests.

M3 is complete. Production/consumption (M4), autonomous population/navigation (M5), research (M6), persistence/final UI (M7), and measured polish (M8) remain pending. Stop before M4 until the user requests continuation.
