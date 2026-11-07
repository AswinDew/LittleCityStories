# Town Center Stitch skin — execution ledger

## B–E continuation

User's latest "okay lanjutkan" approves the five reviewed Stage A materials for
this pilot. Execute atlas, UV, material integration and visual/runtime verification
for Town Center only; stop again at Checkpoint B for the user's model review.

Pre-flight interfaces: source-spec → validated atlas/manifest; shared layout JSON →
exporter and synchronous UV generation; one skin owner → shared civic skin material;
review/game both consume the same factory geometry. Existing baseline material
remains separate. No other building, citizen or simulation changes are authorized.

Ruling: use one atlas with material and face-light variants, including solid trim
swatches, so eight existing construction batches remain eight draw calls. The
skin material ignores the old colored vertices; baked light is applied in linear
color space once. Baseline vertex colors stay intact for fallback/comparison.

Historical first increment: Stage A source preparation ended at the material-review checkpoint. The user approved those materials with the latest continuation; the current B–E result is recorded below.

Plan: `docs/superpowers/plans/2026-11-07-town-center-stitch-skin.md`.

## Pre-flight

- A → B: approved swatches and source-spec feed the future atlas exporter.
- B → C/D: one shared atlas-region contract must exist before UV/loading changes.
- Current Stage A has no production-code interface changes and needs no code TDD.
- Ruling: preserve the explicit user-review checkpoints in the accepted plan;
  the executing-plans skill's general continuous-execution guideline does not
  authorize bypassing this session's visual-review boundary.
- Ruling: existing source crops are inspected but not upscaled into fake high-detail
  material masters. Small/incomplete perspective crops require new flat material
  swatches from the same Stitch project, as the plan allows.

## Stage A

Complete as preparation: original-master audit, five source material candidates in
Stitch, actual image inspection, saved provenance and a local review gallery.
Historical status at that handoff: awaiting user material review at Checkpoint A. That checkpoint is now approved.

Runtime baseline hashes saved in `.stitch/town-center-skin-runtime-baseline.json`.
No model, texture loading, animation, other building or game asset is to change
before Checkpoint A is reviewed.

### Material inspection record

- Initial raw swatches: five 1024px JPEG files downloaded via Stitch MCP, verified
  against transfer length/checks and decoded. Source hashes are in `native-audit.json`.
- Oak: vertical grain without joined boards. Stone: one surface without brick/grout;
  crop 64px from each side to exclude the slab edge/shadow. Plaster: crop the same
  amount to exclude its presentation rim. Original JPEGs remain intact.
- Initial straw looked like branching bark. An edit did not fix that structure;
  a genuinely new A2 source gave finer, predominantly vertical strands and is selected.
- Initial/edited/A2 linen retained a maze-like pattern and was rejected. A3 quiet
  cloth was supplied as native SVG despite the prose calling it a raster; rejected
  under the plan's bitmap-source requirement. A4 then produced a genuine native
  JPEG with fine natural flax fibres; that source is selected as the cloth candidate.
- Optional original board PNG archive was interrupted by automatic approval review,
  which rejected another append to a source-named file because it could corrupt an
  original. No retry to that file was made. The partial download is quarantined as
  `board.download.incomplete`, excluded from candidates/gallery links; the board HTML
  and all five raw material JPEGs are complete. New selected source downloads use
  a separate temporary file and decode/transfer validation before publication.

### Rulings

- Preserve every rejected source/pointer for provenance; tool prose is not proof of
  a visual correction. Re-generate only a material whose fundamental content failed.
- SVG cloth is not silently promoted to a raster source. If the final raster attempt
  fails, retain an explicit cloth gap and stop that material per Stage A's requirement.
  The A4 raster attempt succeeded, so no cloth gap remains in this handoff.

## Verification and handoff

- Five selected material JPEG masters: straw, oak and linen are 1024×1024 sources;
  the stone and plaster candidates are 896×896 interior crops of 1024px masters.
- Candidate PNG pixels exactly match the decoded source crops. No resize, drawing,
  palette quantization or source overwrite occurred.
- Reproduced all five candidate PNGs and source-spec: six byte-identical files.
- Browser audit: all five images decoded; source links returned HTTP 200; no page
  or console errors; 390px viewport has no horizontal overflow.
- Runtime baseline: all 155 hashed code/test/tool/public files remain unchanged.
  No atlas, UV, material loader, model, other building or animation integration.
- Fresh reviewer found no required implementation changes after inspecting source
  IDs, images, crop metadata, provenance, local links and saved browser audit.
  Their stale-status documentation observation was corrected before handoff.
- Unverified: seamless repetition, final grain density/tone on actual 3D surfaces,
  and user visual approval. The review page identifies all sources as candidates.

Review: `http://127.0.0.1:4174/exports/town-center-skin/review.html`.
Manifest/audits: `source-spec.json`, `source-audit.json`, `browser-audit.json`,
`verification.json` in `.stitch/exports/town-center-skin/`.
Overview: `.stitch/exports/town-center-skin/swatches-overview.png`.

The Stage A stop was satisfied by the user's continuation. Current handoff follows.

## B–E result — awaiting Checkpoint B visual review

- Published one 1024×1024 opaque RGB atlas (562,831 bytes) with 52 material/face-light
  regions and 8px extruded gutters. Shared layout digest is validated by both the
  exporter and runtime. Source/candidate hashes remain pinned to the five Stitch
  materials approved at Checkpoint A.
- Added local primitive UVs before batching, continuous banner coordinates,
  long-axis timber grain and bounded varied crops. No unverified texture repeats.
  The model remains eight meshes; the isolated renderer measured eight draw calls
  and one GPU texture. Base RGBA allocation estimate is 4 MiB without mipmaps;
  this is not a total VRAM or device-FPS claim.
- Regression hash of all approved position/color buffers remains exactly
  `faf118e5058f2026b84c8f2ab57fa339114409493c8e093b7d0cb9408d12acee`.
  Existing footprint, door, parts/assembly metadata and fallback vertex colors remain.
- New civic skin material is isolated from the illustrated baseline. One asynchronous
  owner loads/caches the atlas, validates layout and decoded size, supports retry,
  and releases the texture once, including late completion after teardown.
- Applied to the actual factory model in the settlement. The developer comparison
  offers master / baseline / skin at the same camera, plus four quarter turns.
  Missing atlas is tested: the preview reports fallback and the real game stays usable.

### Calibration ruling

Initial full-patch-per-primitive mapping was too noisy. A failing density test
reproduced the issue; corrected UV spans use 24 texels per model unit, with 64 for
fine cloth. Source-detail variation is calibrated around the approved civic base
tones in linear space and baked once into the atlas. The old colored vertices are
ignored only by the active skin material, preventing a second tint/shadow multiply.
Raw Stitch material images remain unchanged. Cost if this artistic calibration is
not preferred: only this pilot needs density/strength/tone adjustment; it does not
alter other assets or simulation. Final visual acceptance belongs to the user.

### Final verification

- Python assets: 39 tests passed; Vitest: 280 tests in 33 files passed.
- Chrome development: 23 tests passed, including baseline/skin render difference,
  four angles, single atlas request, fallback, camera, construction, work and home entry.
- Chrome production smoke: 1 passed, atlas served locally and test hooks absent.
- TypeScript/Vite build passed; existing bundle-size advisory remains (634kB JS).
- Fresh code review: no required code fixes; stale checkpoint documentation corrected.
- Atlas and manifest reproduced byte-identically from frozen sources/shared config.
- Baseline hash audit restricts existing code changes to civic integration and its
  tests; all old `public/generated/` assets and all other building models are intact.
- Inspected front/back/side images and game zooms. Seam continuity, grain scale and
  color are ready for the user's visual verdict; no claim of pixel-identical artwork.

Regeneration:

```powershell
python tools/assets/export_town_center_skin.py --source-spec .stitch/exports/town-center-skin/source-spec.json --output public/building-skins/town-center
```

Live review: `http://127.0.0.1:3000/?buildingReview=town_center`.
Game: `http://127.0.0.1:3000/`. Review screenshots are in `test-results/`, including
`town-center-reference-review.png`, `town-center-skin-baseline-review.png`,
`town-center-skin-turn-0.png` through `town-center-skin-turn-3.png`, and
`town-center-skin-unavailable.png`.

**Stop at Checkpoint B. Await user review of this one textured Town Center before
any rollout to other buildings or work on citizens, environment or animation.**
