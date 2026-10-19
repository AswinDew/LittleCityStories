# Citizen sprite art upgrade — stage 1

Plan: docs/superpowers/plans/2026-10-18-citizen-sprite-art-upgrade.md
Base: 54c72bc (Fix animation). Branch: codex/citizen-style-preview.

Authorized scope: implement stage 1, one villager/idle in four directions, two frames each, with preview and style guide. No runtime/active atlas changes. User review of the visual sample precedes stage 2.

Ruling: work in the existing checkout on a dedicated feature branch — the user is continuing work in this shared folder and no attached worktree exists. Preserve the untracked plan; no commit/push.
Ruling: 64px is a preview-only exception to the project's current 32px asset contract, as authorized by the approved plan. Do not migrate the production contract or modify the project skill at this stage.
Pre-flight: Task 1 produces draw_citizen(role, direction, state, frame); later tasks consume it. Unsupported combinations must raise ValueError instead of silently substituting a sprite. Task 2 will adapt runtime metadata separately; preview source must not be imported by the active generator yet.

Implementation:

- Added preview-only draw_citizen(...) with four separately authored views and two breathing poses; rejects unfinished combinations explicitly.
- Added export tool for original transparent frames, labeled 1×/4× sheets, silhouettes, old/new comparison, idle GIF and preview-only metadata. It rejects output into public/.
- Added style guide with 64px canvas, (32,60) anchor, palette/material roles and reproduction instructions.

Verification:

- Watched new tests fail with missing citizen_style module before implementation, then pass after drawing the prototype.
- Corrected an overbroad initial foot-stability assertion: tunic hem at y49 is allowed to breathe; boot rows y54–60 must remain identical. Opaque bounds and anchor still tested independently.
- All 14 Python asset tests passed (five new). All eight transparent frames individually passed quality_audit.py: alpha binary, no orphan pixels, 12 opaque colors, 64px alignment.
- Inspected actual contact sheet, silhouettes and old/new comparison. Feet stay on the same baseline and all four directions differ without image mirroring.
- Runtime/src, active public/generated assets and the existing production generator were not modified. Browser/build checks are deferred until stage 2 changes runtime code.

- Independent final review found no important actionable defects. Reviewer reran all five focused tests and confirmed two independent exports have identical hashes for all 15 files.

Status: implementation, technical verification and final code review complete; user visual review pending. Do not start stage 2 on this turn.

## User-requested head revision

The user identified distorted heads in both south-facing idle frames. Redrew only SE/SW head silhouettes, hairlines, ears and face planes; removed the projecting nose contour and large white eye blocks, aligned compact pupils, and simplified the jaw and mouth. Both frames use the same head drawing with the existing 1px breathing offset.

Regenerated all stage-1 previews and inspected the contact sheet. All 14 asset tests passed; all eight original frames passed quality audit (12 colors, binary alpha, zero orphan pixels). Pixel comparison against the previous contact sheet confirms changes are confined to the four requested head regions. Normalized head crops match exactly between idle frames. The first sandboxed test run failed on Windows temporary-directory permissions; the approved rerun passed. No runtime or production asset changes; visual review still pending.
