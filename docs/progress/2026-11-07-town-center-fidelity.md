# Town Center: one-building visual review

User scope: correct one building first, stop for their review, and wait before
applying the approach to other buildings. Town Center was selected as the initial
civic landmark. This checkpoint supersedes any suggestion to continue the rest
of the asset library automatically.

## Changes

- Dedicated `src/assets/procedural/townCenter.ts`; only `town_center` is routed
  here. Other catalog models retain their previous implementation.
- Raised, staggered warm-grey masonry with slit vents; plaster and cross-braced
  timber upper storey; a deep open arched entry; broad stone steps; static blue
  cloth banners; thick overlapping rounded straw sheaves and a roof dormer.
- Building-only vertex colors and a separately named illustrated material. No
  global palette/lighting/terrain/character/HUD changes in this increment.
- Repeated geometry is baked into eight meshes by construction stage and shared
  through the existing reference-counted cache. Existing 3×3 footprint and room
  route remain unchanged. No new animation was authored.
- A development-only comparison at `/?buildingReview=town_center` displays the
  exact unmodified source JPEG alongside the same factory model used by the game.
  It supports the reference angle, game angle and quarter turns. This screen
  does not run the simulation or replace the gameplay camera.

## Visual review

Inspected the original master and actual renders side by side. Iterations corrected
the initially low stone base, green masonry tint, flat-looking roof layers,
rectangular thatch ends, missing side vents and unshaded portal interior.

The result is a 3D reconstruction. It retains geometric surfaces and a cleaner
finish than the reference's textured pixel illustration. Visual equivalence is
not asserted; the user decides whether this is the accepted direction before any
other building is touched.

Screenshots: `test-results/town-center-reference-review.png`,
`test-results/town-center-game-review.png`, and the actual settlement close view
`test-results/stitch-settlement-close.png`.

## Verification

- Regression test was observed failing on the prior Town Center doorway width.
  It now checks three rays across the portal, a 24-mesh upper budget, and shared
  geometry disposal only after the last owner releases it.
- Full unit suite: 272 passed across 31 files.
- TypeScript and Vite production build passed. The existing bundle-size advisory
  remains; no threshold was weakened.
- Fresh reviewer checked factory routing, cache/material ownership, construction
  metadata, entrances/bounds, the isolated review lifecycle and rendered images.
  Roof rounding and side vents were refined and re-reviewed without blockers.
- Full Chrome browser suite: 22 development tests and 1 production smoke passed,
  including actual room returns, construction, picking, mobile HUD and the new
  one-building comparison. Production still excludes test hooks.

## Handoff

Server `http://127.0.0.1:3000/` remains running. Comparison URL returned HTTP 200.
Wait for the user's review of this Town Center. Do not roll out to any other
building, character, environment or animation under this authorization.
