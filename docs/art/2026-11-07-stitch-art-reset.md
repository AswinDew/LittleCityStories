# Civilization Town - Stitch art reset

Date: 2026-11-07. Status: user approved; static master designs generated in Stitch and ready for visual review. Individual static 2D exports are now available; actual 3D adaptation and runtime review remain pending.

## User direction

The user rejected the current sprite result and requested Stitch and its skills
for the style of all assets, with animation only after every art asset is complete.
This replaces the previous citizen-only procedural art direction and animation-first
iteration. Existing game code and historical previews remain intact for now.

## Approach

Use one Stitch project and one shared design system for the complete asset library.
Start with a settlement composition to establish how citizens, architecture and
environment fit together, then derive static family sheets and individual masters.
Use the earlier reference as the craft/style reference and the actual ancient
catalog as the content source. Do not use rejected citizen drawings as masters.

This is the proposed implementation of the user's chosen Stitch workflow, not a
request to choose another tool. Reusing the procedural drawings would preserve
the rejected anatomy. Converting the entire game to flat 2D would require replacing
camera, picking, occlusion and building presentation; that is not part of this reset.
The proposed default retains the current hybrid engine and its functional rules.

The design system proposal is `.stitch/DESIGN.md`. Display name:
**Civilization Town - Living Settlement**. Parchment, moss, timber, straw and muted
blue come from the existing palette. Board labels use Noto Serif/Noto Sans;
panels have shallow 4px corners. Typography is not baked into asset art.

## Repository findings and coverage

`tools/assets/generate_assets.py` declares 19 icons, three terrain textures and a
citizen atlas. `citizen_style.py` supports four roles and 312 animation frames;
those animations are outside this static phase. The active building registry uses
`ANCIENT_CATALOG`; older modern factories remain callable but outside that catalog.
Buildings and nature are generated Three.js geometry, not PNG sprites.

| Family | Static art deliverables | Source of current contract |
|---|---|---|
| Citizens | Villager, farmer, lumberjack, builder; neutral NE/NW/SE/SW views; anatomy and proportion sheet | `tools/assets/citizen_style.py`, `src/citizens/types.ts` |
| Ancient sites | Town center, primitive house, farm, lumber camp, stone quarry, storage hut, research hut, dirt road | `src/config/BalanceConfig.ts`, `src/assets/procedural/ancientBuildings.ts` |
| Building parts/interiors | Foundation, posts, wall, door, window, thatch roof, fence, flag, research table and work areas; static cutaway/component drawings | `ancientBuildings.ts`, `walls.ts`, `windows.ts`, `roofs.ts` |
| Nature | Tree, bush, rock, grass clump, crop; silhouette/scale variants | `src/assets/procedural/ancientEnvironment.ts` |
| Terrain | Grass, dirt and path masters; static water/concrete appearance references for existing grid types | `generate_assets.py`, `src/world/GridSystem.ts` |
| Props/equipment | Hoe, watering can, axe, hammer, pickaxe, book, writing tool, carried stone, timber, log stack and crates | Citizen tools and ancient building geometry |
| Icons | All 19 resource, population, happiness, construction, technology, building and research icons | `generate_assets.py:ICONS` |
| UI art | Resource strip, construction cards/tabs, inspector, tool buttons, zoom controls, selection/placement indicators | `src/ui/HUD.ts`, selection and placement views |
| Legacy catalog | Road, streetlight, small/family house, apartment, shop, bakery, restaurant, school, clinic, park and tree | `src/assets/BuildingFactory.ts` |

The legacy family is listed explicitly so "all assets" does not silently omit it;
give it its own static extension sheet, without adding it to the ancient catalog.

## Stitch boards and production order

1. Settlement overview and scale comparison: art occupies the main canvas, not a
   marketing page. Show the ancient sites, natural ground, four citizens and compact
   HUD together. This is a visual concept, not a playable screen.
2. Citizen masters: four neutral views per profession, clean silhouettes, correct
   shoulder/arm/hip connections. Tool designs separate from the neutral bodies.
3. Ancient architecture: all eight site IDs, common scale, entrances and static
   interior references. Component views support later construction presentation.
4. Nature, terrain and props: consistent material/shadow treatment; repeatability
   inspection for terrain, and distinct outlines for equipment.
5. Icons and UI art: all named pictograms and the existing HUD surfaces in one style.
6. Legacy extension: complete the remaining factory designs in their own board.
7. Export and inspect each individual asset; record verified files and unresolved
   gaps. Only after the entire static inventory is complete may animation begin.

No independent image-generation service or new hand-drawn primitive generator is
introduced in this phase. Local metadata/file management is allowed; local drawing
code is not a substitute for the requested Stitch art.

## Feasibility and acceptance

The available Stitch tools create screens, HTML, screenshots and design systems.
They do not advertise sprite-atlas, transparent-cutout, tile-seam or 3D-mesh export.
Inspect the actual generated result and its downloadable images before promising
game-ready files. An artboard screenshot counts as a concept only. A building
concept is not a runtime mesh. If Stitch cannot export a required type, record
that limitation and resolve the production method with the user before integration.

Builder check identified this as the only material open decision: does "Stitch
only" apply to visual design, or to every production/export step as well? The
recommended proposal is Stitch as the sole creative source, with technical export
and adaptation into the existing engine allowed after its art is reviewed. Such
adaptation must follow the approved masters and cannot introduce another generator
or silently reuse rejected art. Include this boundary in the same confirmation as
the design-system upload; if the user requires Stitch for every production step,
do not promise unsupported transparent assets or 3D meshes.

Every asset must have an ID, source board, downloadable master, expected dimensions
or footprint, and review status. Sprite/icon masters need actual transparent
backgrounds, no baked checkerboard, readable silhouettes, integer pixel structure
and no clipped equipment. Terrain must repeat without visible seams. 3D buildings
must eventually fit the existing footprints, door and workstation locations.
Check the whole composition for consistent light, scale and material treatment.

Do not use passing technical tests as evidence that the user approves the art.
The static milestone requires visual review and a complete inventory, not a count
of generated screenshots. Animation and runtime integration remain gated behind it.

## Current checkpoint

Created private Stitch project `9572784485551125903` and design system
`assets/7e69032a14294b34916f28326fae80ba` after the user's confirmation. Generated
and inspected the static design library; current results are in `.stitch/index.html`.
See `docs/progress/2026-11-07-stitch-static-art.md` for refinements and verification.
No runtime, production assets, animation code or existing preview generator changed.

The invoked `stitch::manage-design-system` skill requires confirmation before a new
design-system upload. That checkpoint was satisfied by the user's "okay lanjutkan"
on 2026-11-07. Do not ask for the same authorization again. Generated art approval
and static production acceptance are separate from this already-granted permission.
