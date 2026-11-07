# Stitch Static Art Implementation Plan

> **For agentic workers:** Use the approved Stitch generate-design and manage-design-system workflow. Execute sequentially; do not replace art with local procedural drawings.

**Goal:** Produce and inspect the complete static art library in Stitch before animation.
**Architecture:** One project/design system; settlement composition establishes scale, family boards share its art direction. Preserve source exports and track concepts separately from game-ready assets.
**Tech Stack:** Stitch MCP; local JSON/Markdown and downloaded HTML/images for provenance and review.
**Spec:** `docs/art/2026-11-07-stitch-art-reset.md`, `.stitch/DESIGN.md`; user approved 2026-11-07.

## Constraints

- Source/export phase: static art only; no animation, runtime replacement, or reuse of rejected citizen masters. Subsequent user continuation authorizes the static runtime integration recorded in `docs/progress/2026-11-07-stitch-3d-ui.md`.
- Keep the existing engine, domain asset IDs, footprints and gameplay contracts.
- Mark screenshots as concept boards, not transparent sprites, seamless textures or 3D meshes.
- Inspect actual visual output and individual image sources; do not claim completion from board count alone.

## Sequential deliverables

1. [x] Upload approved design system; save project/design-system IDs in `.stitch/metadata.json`.
2. [x] Generate and inspect settlement composition; refine if it is a website rather than an asset-rich scene.
3. [x] Generate citizen neutral masters (4 professions x 4 views); inspect anatomy, proportions and distinct equipment.
4. [x] Generate all eight ancient sites and static architecture/interior components.
5. [x] Generate nature, terrain and eleven equipment/prop designs.
6. [x] Generate nineteen icons, UI surfaces and the legacy factory extension.
7. [x] Download verified board sources to `.stitch/designs/`; record individual export gaps and visual defects.
8. [ ] Resolve missing static assets before any animation. Do not begin animation while export/review gaps remain.

### Static production progress

- [x] Extract and audit 100 individual static PNGs, preserving source masters and provenance.
- [x] Export UI component source HTML/CSS and prepare the native-size review/download pack.
- [x] Adapt actual 3D building/nature meshes from the Stitch references.
- [x] Adapt UI and validate static rendering, scale, occlusion and loading in the existing game.
- [ ] Close static-art visual review before authoring animation.

## Verification

Inspect each board screenshot and source HTML; identify real image assets versus glyphs, placeholders and CSS drawings. Cross-check all requested IDs against the inventory. Validate local JSON, file provenance and whitespace. Runtime tests are unnecessary until runtime code/assets change.
