# Citizen art study — stage 1

Date: 2026-10-19. Status: technical prototype complete; visual approval pending.
Scope: one original villager, idle frames 0–1, NE/NW/SE/SW. This study is not connected to the active 32px atlas or renderer.

## Visual direction

The user's market-scene reference informs the expressive face, readable outline, muted clothing and compact character proportions. This villager has original brown hair, a blue tunic with linen collar/cuffs, woven shoulder strap, hip pouch and leather boots, suited to the Ancient Settlement setting.

Four silhouettes are authored independently. South views show level, compact dark eyes, a small nose inside the face contour, a short mouth and a continuous cheek/jaw outline. Avoid large white eye blocks or a projecting nose that distorts the head silhouette. North views show the hair mass, nape and side ear. Upper-right highlights stay on the screen-right planes rather than flipping with the facing direction. Hair uses broad, connected color clusters; clothing uses a few broad folds rather than scattered texture noise.

## Preview specification

| Property | Value |
|---|---|
| Canvas | 64×64 RGBA, not trimmed |
| Foot anchor | (32,60), same in all eight frames |
| Height | 53px in idle 0, 54px in idle 1, including boots |
| Padding | At least 2px around opaque bounds |
| Palette | Locked `tools/assets/palette.json`, 12 opaque colors used |
| Alpha | 0 or 255 only |
| Lighting | Upper-right, maintained across four separately drawn views |
| Outline | Mostly 1px ink, reinforced only at overlap/hair/shoe contours |
| Idle | Two poses at 500ms each; upper body rises 1px, boots remain planted |
| Scaling | Preview enlargements use nearest-neighbor only |

Head, shoulders, hands and cuffs move together during the breathing pose; the lower boots do not move. The current sample prioritizes style approval and is not a walk/work animation proof. Foot sliding during movement and building-scale/occlusion checks belong to later stages.

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
- `tools/assets/preview_citizens.py`: isolated output, contact sheets, silhouettes, comparison and idle GIF; refuses output inside the resolved project's `public/` directory.
- `tests/assets/test_citizen_style.py`: frame/palette/alpha/padding/direction/anchor stability, unsupported combinations and export contract.

```powershell
python tools/assets/preview_citizens.py --output test-results/citizen-style-stage-1
python -m unittest discover -s tests/assets -p test_citizen_style.py
```

Use an available real Python executable with Pillow if WindowsApps has no configured Python. Outputs under ignored `test-results/citizen-style-stage-1/`:

- `villager-{NE,NW,SE,SW}-idle-{0,1}.png`: eight original transparent frames.
- `contact-sheet-1x.png`, `contact-sheet-4x.png`: all eight labeled poses.
- `silhouettes-1x.png`, `silhouettes-4x.png`: silhouette check.
- `comparison-4x.png`: legacy 32px sprite at 2× versus newly authored 64px sprite at 1×, both subsequently enlarged equally for comparison. Their foot anchors share the same image coordinate.
- `idle-preview.gif`: four directions at 3×, two 500ms frames.
- `preview.json`: preview-only metadata; no absolute machine paths or timestamps.

## Verification and next checkpoint

All eight transparent frames passed pixel-art quality audit: zero semi-transparent pixels, zero orphan pixels, 12 colors within the locked 28-color palette, dimensions aligned to a 64px grid. All 14 Python asset tests passed, including the five new preview tests and existing generation tests. The production generator/atlas/runtime files remain unchanged.

The user should review facial expression, proportions, outline, clothes and north/south readability. Stage 2 may adapt the runtime metadata after this visual direction is accepted; it must not treat this prototype as approval for every future profession or animation.
