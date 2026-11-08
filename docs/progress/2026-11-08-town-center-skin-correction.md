# Town Center skin correction — 2026-11-08

The user rejected the previous three alternate views as broken and apparently
mirrored. The previous Stage D visual-quality conclusion is superseded. Passing
engine tests did not establish visual fidelity to the Stitch drawings.

Scope remains one Town Center in developer review. Game integration, other
buildings, citizens, and animation are unchanged.

## Verified causes

- The old added gable joined a rectangular wall to an off-plane triangle. The
  texture was projected into independent frames and clamped at their boundaries.
- Hidden dormer/roof faces selected atlas regions by normal/height and used small
  crops stretched across different surfaces. This did not preserve architectural
  artwork or guarantee the correct orientation.
- Photo-fitted stair side planes did not share tread vertices. Adding generic
  box backing introduced intersections. Both were replaced by actual shared stair
  profiles and surfaces from the corresponding side's Stitch illustration.
- Roof-edge interpolation incorrectly changed triangles for any negative
  barycentric coordinate. Jagged point `[294,52]` therefore reached world x=2.961,
  past the roof cage. Selecting by the shared diagonal fixes this without altering
  the original artwork. The regression was observed RED→GREEN.
- Dormer-side UVs had two corner correspondences reversed. They now follow the
  component's top/front, bottom/front and rear corners explicitly.

## Stitch sources actually used

All sources are actual raster IMAGE screens in project `9572784485551125903`.

| Component | Stitch screen | Local source |
|---|---|---|
| Existing front/left building art and window face | `5eaec90d6212477cb95917458d523044` | `.stitch/designs/ancient-sites-master.jpg` |
| Whole right gable elevation and small dormer roof/cheek | `d51f3649e1454b2fbf2243f8a9242312` | `.stitch/designs/town-center-uv-surfaces.jpg` |
| Whole rear elevation, rear roof and ridge timber | `a1b269126a7b4781ae5679295150845c` | `.stitch/designs/town-center-uv-surfaces-final.jpg` |
| Actual right stair side | `78c261288d26411396e1a6ae965da3a8` | `.stitch/designs/town-center-turnaround.jpg` |

The first UV sheet's rear wall had an extra timber row and its roof had a timber
stripe across the middle. A targeted Stitch edit supplied the corrected rear
components. Its changed gable/dormer were not substituted for the appropriate
first-sheet components. A further clean-roof candidate (`c19977c13a244e4da9a76abd281015e4`)
did not satisfy the requested course count; it is archived and unused.

Each panel's original source hash, screen and rectangle/quad are exported as
`completion.componentSources`. Separate file hashes are checked for component
overrides. Packing/nearest resampling is technical extraction, not synthesized
detail. The original source PNG's RGB remains byte-identical to its JPEG crop.

## Implementation

- One planar right-gable mesh shares body, stone/plaster datum and gable vertices.
  Seven explicit image landmarks unwrap the entire architectural elevation.
- The rear wall has six explicit corner/datum landmarks; its shuttered window and
  braces come from the rear source. The front is not mirrored into a rear facade.
- Source roof pixels are retopologized onto a connected roof cage. Rear slope,
  fascia and source overlay share structural corners. No source-camera-shaped
  depressed patch geometry remains.
- Dormer front rake/post/sill contour is fitted to the original image; hidden
  slope and cheeks join those same vertices. Small roof surfaces use actual Stitch
  roof components. Right-cheek image corner order is explicit, not inferred.
- Stair sides are derived from the exact tread/riser row vertices. The left uses
  the original source projection; the right uses its visible side from Stitch's
  front-right view. No intersecting generic box overlay remains.
- All atlas UV corners are checked. The old normal/height heuristic and the old
  world-projection-with-clamping helper were removed. UVs remain fixed when the
  object or camera rotates; no view-dependent image replacement is used.
- Review exposes both actual UV source sheets in expandable sections. The normal
  game factory and MaterialLibrary remain unchanged. The two-map loader retains
  its atomic failure/disposal behavior. Mesh budget remains at most 24.

The source illustration contains small perspective/proportion differences. Roof
retopology consequently changes some source-view geometry while retaining its
artwork. The early A–C landmark errors measure the original calibration math, not
pixel identity or independent accuracy of this revised roof. User visual review
remains the acceptance gate; automated test counts are not an art-quality score.

## Verification

- New right-gable planarity and shared stair-volume tests: observed RED→GREEN.
- Roof-edge wrong-triangle regression: observed x=2.961 failure, then GREEN.
- Shared dormer-edge, portal depth, native source pixels, corner bounds,
  two-map failure/disposal, fixed UV and exporter determinism checks retained.
- Independent ray/UV review identified the wrong roof triangle and reversed
  dormer corners. It also identified the gold border as exposed roof underlay;
  fitting the outer rake/post/sill back to the source restored contour coverage.
- Final full unit suite: **295 passed / 35 files**; asset suite: **41 passed**.
- Final full browser suite: **26 passed**; production smoke: **1 passed**.
  TypeScript/Vite build and whitespace checks pass. Production JS remains
  `index-CeANc3Y6.js`; its pre-existing size advisory is unchanged.
- Fresh captures of all four directions were inspected after the contour fixes.
  Composite: `test-results/direct-skin/four-side-corrected.png`.
- Local review endpoint verified HTTP 200. Visual approval remains pending;
  no production integration or other-building work has been performed.

Review URL: `http://127.0.0.1:3000/?buildingReview=town_center&appearance=direct`.
Stop at the one-building review checkpoint; do not start game integration.
