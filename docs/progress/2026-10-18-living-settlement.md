# Living settlement improvements

User scope: progressive construction, distinct building-specific work animation/locations, and entering/exiting homes. Base f6ea087 (M5), branch codex/living-settlement-animation. No M6 research mechanics, commit or push requested.

Baseline: 219 tests passed. Existing skill workflows: engine/Three.js, procedural assets/pixel-art, TDD and browser playtesting.

Design: reuse final building components with continuous foundation/frame/wall/roof assembly; enter through an actual door before reaching a reserved workstation; use farmer/axe/pickaxe/book/hammer clips; residents cross the door and remain hidden indoors during rest, then exit before navigation. Construction/production requires actual arrival at the workstation, never render-only movement.

Decisions: private building traversal permits only the citizen's own building footprint and walkable entrance, without opening buildings to public A*. Two work slots receive separate positions. Research uses a cutaway interior so the reading animation remains visible. Homes stay opaque; residents are hidden after crossing the doorway. No fake storage job or research output is added.

Implemented:

- Final geometry grows through foundation/frame/walls/roof and building-specific beds/crops/stone, driven by actual work ticks; mesh identity survives completion.
- Private doorway routes connect public navigation to workstation slots. Construction and production require real interior arrival. Two production workers use separate stations and reposition continuously if a slot changes.
- Farmer hoe/watering, axe, hammer, eight-frame pickaxe and reading/writing clips; atlas now 312 frames, 512×640. Research desk is indoors and the camera-facing walls/roof open while occupied, accounting for all building rotations.
- Home occupants pass the doorway, hide indoors during rest, and reappear on exit. Reassignment and demolition do not snap positions.

Review corrections (both reproduced with failing regression tests before fixes):

- Demolishing an occupied research hut and immediately building over its doorway could trap its worker forever. Reserve the entire private evacuation corridor while the room exists, including the interval before the next activity tick.
- Immediate unassign/reassign to the same building could leave an indoor worker trying public navigation from an interior position. Assignment now initiates a continuous exit before starting the new trip.

Verification, 2026-10-18:

- 238 Vitest tests / 30 files passed; TypeScript strict and Vite production build passed. Existing Three.js chunk-size warning remains (611.96 kB raw / 162.52 kB gzip); no runtime console errors in the playtests.
- 9 Python asset tests passed, including deterministic generation and distinct new clips. Manifest validator passed all 23 assets. Pixel-art quality audit passed: zero semi-transparent/orphan pixels, 17 used opaque colors within the locked 28-color palette, aligned 32px frames.
- All 19 development browser tests passed, verifying real citizens/builders, four job clips advancing, growing walls/roof, hidden home residents, existing input/navigation/economy and lifecycle behavior. The production browser test passed, including sprite PNG load and absence of test hooks.
- Inspected actual browser screenshots of construction at 20/40/60/80/100%, all four workplaces at maximum zoom, and the generated citizen atlas. Evidence is under ignored test-results/ (assembly-*.png, work-*.png).
- Independent review found the demolition deadlock above; final review of its fix, reassignment, and rotation changes found no important remaining defects.

No M6 mechanics, commit or push performed. Ready for user playtest; stop here until requested to continue.
