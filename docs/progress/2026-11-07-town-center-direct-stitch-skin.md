# Direct Stitch skin execution ledger

Plan: `docs/superpowers/plans/2026-11-07-town-center-direct-stitch-skin.md`.

User authorized execution on 2026-11-08. Execute A–C, then stop at the explicit
one-building visual-review checkpoint. D/E remain unauthorized until that review.

Pre-flight: A supplies native crop, masks and projection contract to B; B supplies
an isolated model/loader to the existing review in C. Game factory stays unchanged.

Ruling: reuse the current feature checkout `citizen-style-preview`, as requested
by the workspace instructions; do not create another worktree or move the server.
Ruling: retain source RGB rather than apply the older palette restriction; the
user's accepted direct-image plan explicitly requires the architectural pixels.
Ruling: the plan's user-review checkpoint takes precedence over the execution
skill's general instruction to continue through all tasks.

## Implemented A–C (2026-11-08)

- Extracted the original architectural raster, rather than material swatches:
  360×366 native RGBA, 218,576 bytes. RGB is identical to the original JPEG crop;
  a hand-traced binary mask removes the presentation background and ground shadow.
- Source provenance, masks, planes and 16 fitted landmarks live in
  `.stitch/exports/town-center-direct-skin/`. The exporter checks the source hash
  and reproduces byte-identical PNG/manifest files.
- Added isolated source-fitted 3D geometry: real wall/roof planes, dormer, shared
  stair boundaries, an open portal, recessed interior and depth closure. A single
  architectural image supplies its painted details. No new art was generated.
- Fixed-reference-camera UVs are baked in object space. Camera elevation is 30°,
  derived from the source axes; the existing game camera is unchanged.
- Independent loader/material ownership, white unlit sRGB map, no vertex tint or
  extra shading, alpha test/depth writes, strict geometry-contract validation,
  coalesced loading/retry, dimension checks and safe late disposal.
- Review includes old baseline, old material skin, direct design, source/game
  views, quarter turns, landmark/silhouette overlay, wireframe, highlighted
  fallback surfaces and red/cyan doorway depth probes.
- Only the developer review imports these modules. Factory, main, domain,
  citizens and construction code are unchanged. Production JS retains the same
  `index-CeANc3Y6.js` artifact as before this prototype.

## Measured visual evidence

Evidence directory: `test-results/direct-skin/` (ignored runtime artifacts).

- `comparison.png` and `reference.png`: original design / projected 3D comparison.
- `turn-0.png` through `turn-3.png`: all quarter turns; missing-source areas remain
  visibly provisional. `coverage.png` highlights those areas in purple.
- `wireframe.png`: noncoplanar 3D planes, not a whole-building billboard.
- `depth.png`: red marker in front of the portal is visible; cyan marker behind
  the recess is occluded. Ray tests also verify that the front wall has a real opening.
- `native.png`: WebGL drawing buffer verified at 360×366. Browser screenshot
  rounding adds one bottom row (capture 360×367); evaluation trims that row.
- Silhouette IoU **0.98959**, measured at the native crop against exported alpha
  using a 5-channel-value background tolerance. This measures silhouette only.
- 16 landmark projection errors: median **1.2e-7 px**, max **2.5e-7 px**. Points
  were fitted from the source and verify projection math/alignment; these are
  **not independent measurements of reconstruction accuracy**.
- Default direct model: **24 meshes / one 360×366 texture**. The review can retain
  the old atlas on the GPU as well; its renderer-wide texture count is not the
  per-model count. Depth inspection adds two temporary diagnostic meshes.

## Verification and review

- Export test observed RED before exporter creation, then GREEN. Original RGB,
  alpha, native size and deterministic bytes checked.
- Projection/loader tests observed RED before implementation, then GREEN.
- Dormer seam regression observed RED (0.15-unit separation), then GREEN after
  matching roof/gable planes and adding explicit untextured hidden reveals.
- Native browser capture exposed a real responsive-layout defect: the canvas's
  intrinsic height kept its parent at 519px when width shrank to 360px. Absolute
  canvas positioning restores the parent's aspect ratio; the native-size check passes.
- Fresh independent review found no Critical/Important blockers for A–C. Two
  findings were corrected as required usability/contract fixes: initialization
  must preserve a user's skin choice, and validation must establish every
  geometry precondition before marking the loader ready. Both regression tests
  were observed RED, then GREEN. No unresolved review findings are deferred.
- Full Vitest: **287 passed across 35 files**.
- Full Python assets: **40 passed**. Set TEMP/TMP to the project-local
  `test-results/python-temp` on this host; sandbox Windows temp paths prevented
  existing tests from creating their own fixtures on the first attempt.
- Full browser regression: **26 passed** after the canvas-layout fix.
- Production smoke: **1 passed**. Final TypeScript/Vite build passed; existing
  ~634 kB bundle advisory remains unchanged.

Ruling: complete validation and preservation of in-flight user choices are part
of this checkpoint, despite the review's Minor labels. Incomplete manifests could
otherwise enter a partially allocated geometry build; ignored choices could hide
the requested prototype. Cost: geometry contract changes now require synchronized
manifest/loader updates; delayed-loading behavior has an extra regression test.

## Checkpoint and limitations

Review URL: `http://127.0.0.1:3000/?buildingReview=town_center&appearance=direct`.
The local server was started and the review endpoint returned HTTP 200.

This is the **single-source-angle prototype**, not a finished four-view skin.
Back wall, right wall, rear roof, hidden dormer reveals and other occluded surfaces
have no original image; they remain brown fallback geometry. Quarter turns expose
that limitation and some painted depth appears stretched off-axis. Small facade
relief is painted into the map. Source resolution cannot support invented detail
at higher zoom. Approval of the source-angle appearance is required before D.

Stage D (additional source coverage), E (game integration), all other buildings,
and animation are untouched. Stop here for the user's visual review.
