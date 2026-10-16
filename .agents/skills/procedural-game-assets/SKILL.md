---
name: procedural-game-assets
description: Use when generating or changing Civilization Town pixel textures, icons, citizen atlases, ancient models, palette, or asset loading.
---

# Procedural game assets

## Ownership

`tools/assets/`, `public/generated/`, `src/assets/` and visual sprite sampling in `src/citizens/`. Simulation activity selection belongs to population systems, not asset code.

## Workflow

1. Read `tools/assets/palette.json` before changing pixels. Use integer drawing, binary alpha, no antialiasing, and the locked warm-earth palette. Characters are 32×32 with foot anchor (16,30); draw NE/NW/SE/SW separately so tools and light do not mirror incorrectly.
2. Install generator dependencies with `python -m pip install -r tools/assets/requirements.txt` if needed. Generate with `python tools/assets/generate_assets.py --seed 42 --output public/generated`; never edit generated PNGs or manifest manually.
3. Run `python tools/assets/validate_assets.py --input public/generated` and `python -m unittest discover -s tests/assets`. Commit generator sources and matching generated output, with no local absolute paths or timestamps in metadata.
4. Run `npm.cmd test -- tests/ancientAssets.test.ts tests/spriteAnimator.test.ts` and `npm.cmd run build`. Models must fit footprints; cached geometry releases at last owner, materials stay shared, preview materials are clones.
5. Inspect `/?assets=1` on the development server at gameplay zoom. Nearest filtering, stable anchors and transparent sprite edges are required. The gallery is an inspection surface, not simulated citizens or construction.

On Windows, use an available real Python executable if the WindowsApps alias is unavailable. Keep generated manifest loading via its public URL; do not import public files into production JavaScript.
