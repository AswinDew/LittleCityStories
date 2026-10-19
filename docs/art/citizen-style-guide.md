# Citizen art — style guide

Date: 2026-10-19. Status: stages 1–2 complete; stage-3 art and animations ready for visual review.
Scope: four professions, NE/NW/SE/SW, all 312 poses. The new art remains an isolated preview; the game still uses its active 32px atlas. Renderer metadata supports 32/64px after stage 2.

## Visual direction

The user's market-scene reference informs the expressive face, readable outline, muted clothing and compact character proportions. This villager has original brown hair, a blue tunic with linen collar/cuffs, woven shoulder strap, hip pouch and leather boots, suited to the Ancient Settlement setting.

Four silhouettes are authored independently. South views show level, compact dark eyes, a small nose inside the face contour, a short mouth and a continuous cheek/jaw outline. Avoid large white eye blocks or a projecting nose that distorts the head silhouette. North views show the hair mass, nape and side ear. Upper-right highlights stay on the screen-right planes rather than flipping with the facing direction. Hair uses broad, connected color clusters; clothing uses a few broad folds rather than scattered texture noise.

## Preview specification

| Property | Value |
|---|---|
| Canvas | 64×64 RGBA, not trimmed |
| Foot anchor | (32,60), same across all 312 frames |
| Height | Villager 53px in idle 0 / 54px in idle 1 including boots; farmer hat adds 3px |
| Padding | At least 2px around opaque bounds |
| Palette | Locked `tools/assets/palette.json`, at most 16 opaque colors per frame |
| Alpha | 0 or 255 only |
| Lighting | Upper-right, maintained across four separately drawn views |
| Outline | Mostly 1px ink, reinforced only at overlap/hair/shoe contours |
| Idle | Two poses at 500ms each; upper body rises 1px, boots remain planted |
| Scaling | Preview enlargements use nearest-neighbor only |

Heads and headwear translate as a rigid unit, preserving the revised SE/SW face geometry; torso bends taper toward the hips so the apron does not stretch into the boots. The six-frame gait alternates contact, passing and lift, with opposite arm swing and one foot supporting the baseline at every frame. Work boots stay still. In-game foot sliding, building scale and occlusion checks belong to later integration stages.

## Profession and movement design

| Profession | Shape and clothing | Work |
|---|---|---|
| Villager | Blue tunic, diagonal strap, pouch, approved head views | Lift/inspect/place stone; overhead pickaxe swing; hold an open book and write |
| Farmer | Wide straw brim, green sleeves, tied apron | Bend forward and pull a hoe through soil; tip a can and pour a connected stream |
| Lumberjack | Broader shoulders, open leather vest, beard, axe | Wind up overhead, swing into contact, recover |
| Builder | Linen shirt, knotted headband, leather apron, tool pocket | Raise a short hammer, strike a supported timber block, recover |

Tool handles pass through their grips. Two-handed tools project the second hand onto the same shaft. Harvest/chop/build use one normalized axis for tool tip, grips and shaft end, keeping shaft lengths at 22/24/17px respectively within integer rounding. Metal heads rotate as snapped integer geometry around the handle, never as resampled raster images. Screen-upper-right metal highlights do not flip with facing. Relaxed far arms sit behind the torso; far arms reaching across the chest during harvest/chop/build draw above the shirt. Both working palms draw above shafts/timber and opposite forearms, keeping the two grips visible. Work clips use explicit authored torso/hand/tool tracks, not the idle cycle with an extra moving object.

Worker-body revision: farmer, lumberjack and builder use compact rounded shoulders, tapered sleeve/forearm polygons and small shaped hands instead of thick bent lines. The torso contour stays continuous through the waist. Aprons follow the torso with softer internal edges and smaller pockets; the lumberjack vest is open at the front and continuous at the back. Back collars show the nape rather than a front V-neck; apron ties sit on the surface without the old large X across the body. Villager frames and worker boot regions remain unchanged.

Shoulder attachment: join worker torso and upper sleeves into one binary-alpha surface and apply a single 1px outer contour. No sleeve end-cap outline crosses the shoulder. Root the sleeve inside the torso with a rounded cap. Harvest/chop/build have explicit elbow/wrist key poses; other worker activities retain the bent two-link arm. Anatomical leading/support hands stay consistent across front/back views while near/far layers change. Keep raised tools outside the face and the builder timber support close to the body. Forearms and hands keep their near/far layering, and builder sleeve shadows stay in the linen ramp.

During harvest/chop/build, torso bend tapers toward the hip/hem rather than dropping the apron over the knees. A connected pelvis joins the planted thighs underneath the garment. Harvest adds slight knee/pelvis flex at contact without moving the boots. Both farmer thighs must retain at least three visible trouser rows in the y50–54 region and have a continuous opaque path from the torso to each boot.

| Clip | Frames | Duration per frame |
|---|---|---|
| idle / walk | 2 / 6 | 500 / 100 ms |
| work / harvest / chop / build | 6 | 120 ms |
| mine / research / water | 8 / 8 / 6 | 140 / 180 / 160 ms |

## Palette roles

| Material | Palette entries |
|---|---|
| Outline/deep overlap | `ink` |
| Hair, strap, pouch, boots | `wood_dark`, `wood`, `wood_light` |
| Skin | `skin_shadow`, `skin`, `skin_light` |
| Tunic | `stone_dark`, `blue`, `blue_light` |
| Collar, cuff and small accents | `linen`, `stone_light` |

Do not change the global terrain/icon palette to imitate a screen tint from the reference. Any later adjustment to the character proportions must be reviewed on the same original-size sheet, not only at enlarged scale.

## Sources and reproduction

- `tools/assets/citizen_style.py`: `draw_citizen(role, direction, state, frame)`; unsupported roles/activities/frames raise `ValueError`.
- `tools/assets/preview_citizens.py`: original eight-pose preview plus `--all` for 312 originals, profession overview, per-clip contact sheets, normal/slow GIFs and an HTML review gallery; refuses output inside the resolved project's `public/` directory.
- `tests/assets/test_citizen_style.py`: frame/palette/alpha/padding/direction/anchor stability, unsupported combinations and export contract.

```powershell
python tools/assets/preview_citizens.py --output test-results/citizen-style-stage-1
python -m unittest discover -s tests/assets -p test_citizen_style.py
python tools/assets/preview_citizens.py --all --output test-results/citizen-style-stage-3
```

Use an available real Python executable with Pillow if WindowsApps has no configured Python. Outputs under ignored `test-results/citizen-style-stage-1/`:

- `villager-{NE,NW,SE,SW}-idle-{0,1}.png`: eight original transparent frames.
- `contact-sheet-1x.png`, `contact-sheet-4x.png`: all eight labeled poses.
- `silhouettes-1x.png`, `silhouettes-4x.png`: silhouette check.
- `comparison-4x.png`: legacy 32px sprite at 2× versus newly authored 64px sprite at 1×, both subsequently enlarged equally for comparison. Their foot anchors share the same image coordinate.
- `idle-preview.gif`: four directions at 3×, two 500ms frames.
- `preview.json`: preview-only metadata; no absolute machine paths or timestamps.

Stage-3 output uses a separate folder, `test-results/citizen-style-stage-3/`: `frames/` has 312 full-size originals; `sheets/` has native/2× sheets for all 15 role/clip pairs; `loops/` has 30 GIFs (normal timing and 3× slower). `professions-3x.png` shows four professions × four directions. `preview-all.json` records all poses, anchors and clip timing; `index.html` links every sheet and loop. Review all four directions in each loop, including mine/research/water. No preview metadata is a replacement for the production manifest.

## Verification and next checkpoint

All 312 transparent frames passed pixel-art quality audit: zero semi-transparent pixels, zero orphan pixels, at most 16 colors within the locked 28-color palette, dimensions aligned to a 64px grid. All 27 Python asset tests passed, including eighteen preview tests and existing generation tests. Review findings about stride direction, villager strap/pouch continuity and telescoping shafts were reproduced with failing tests and fixed. Regressions cover bent-arm geometry, compact builder reach, anatomical grip continuity, fixed shaft lengths, both visible working palm centers, farmer knee flex with planted boots, exposed thighs and four-way connected torso-to-boot paths. The production generator, PNGs, manifest and runtime are unchanged in stage 3.

The user should review profession silhouettes, faces and hats, walking rhythm, tool contacts and recovery in the sheets/loops. Stage 4 may migrate the complete active atlas only after this checkpoint; this preview does not prove in-game scale, occlusion or animation/route synchronization.
