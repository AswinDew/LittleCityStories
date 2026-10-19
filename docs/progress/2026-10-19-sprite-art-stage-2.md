# Sprite art upgrade — stage 2

Plan: docs/superpowers/plans/2026-10-18-citizen-sprite-art-upgrade.md, Task 2.

User requested the next stage after the corrected SE/SW preview. Scope: renderer accepts square 32px or 64px metadata with equivalent anchors/world scale; active artwork and simulation stay unchanged. Continue in the existing citizen-style-preview branch based on 37c897d (Upgrade Citizen Art). The prior stage-1 commit is preserved. No commit/push or stage 3.

Pre-flight: Task 1 supplies 64px art with (32,60) foot anchor; Task 2 supports this metadata alongside legacy 32px/(16,30). Task 5 later migrates the active atlas atomically. Until then only tests construct complete 64px metadata fixtures. All clips must use the same size and canonical proportional anchor, so changing direction or activity cannot shift feet without rebuilding geometry.

Ruling: use the existing progress documents and native PowerShell commands for task tracking/testing, preserving this plan's established workflow instead of introducing the skill's Bash bookkeeping scripts. Review covers uncommitted files directly; no commit ranges can represent these edits yet.

TDD: added a complete scaled fixture and rejection/world-scale/last-row UV tests first. Observed six failures: missing exposed dimensions and rejection of valid 64px metadata. Then implemented validated frame dimensions and replaced the hardcoded anchor divisor.

Verification so far: 39 focused tests and all 269 unit tests passed. Production build passed after fixing a fixture-only TypeScript inference issue; Vite reports the existing >500kB chunk-size warning. Production PNGs, manifest and generator are unchanged according to git diff. Independent reviewer reran the 39 focused tests and found no actionable issues; 64px artwork clipping remains a later integration checkpoint.

Browser regression: all 10 targeted Chrome tests passed (assets.spec.ts and citizens.spec.ts, 54.8s). Checked the actual gallery and quarry screenshots. These cover atlas loading, four walking directions, construction progression, worker selection, farm/lumber/quarry/research clips and returning indoors. The sandboxed web-server launch stalled before readiness and was interrupted; the approved run outside the sandbox completed successfully. No code change was needed for that environment issue.

Task 2: complete — 39 focused tests, 269 total unit tests, production build and 10 targeted browser regressions passed. Independent final review: no actionable findings. Git diff --check clean. Current 32px production art still active; only metadata fixtures exercise 64px until the later atlas migration. No deferred code-review findings. Stop here pending the user's next-stage request.
