# Town Center Stitch skin — execution ledger

User authorized implementation after the texture/skin plan. Current increment:
Stage A only, ending at the planned swatch review checkpoint. Later atlas, UV,
runtime material and game integration stages remain pending that review.

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
Status: **awaiting user material review at Checkpoint A**.

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

Stop here. Await the user's material review before Stage B atlas production or
Stage C/D UV/material changes. Scope remains Town Center only.
