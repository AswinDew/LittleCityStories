# Stitch static exports - 2026-11-07

Baseline HEAD: f4f40d9306abcbb2b5a718a963a8afa38db0a811, existing
`citizen-style-preview` branch. The user requested continuation after viewing the
Stitch masters, authorizing the next technical export increment. No commit/push.

Ruling: use the existing shared checkout because the authorized frozen Stitch
sources and uncommitted art documents already live here. Preserve them in place.
This increment prepares individual static 2D outputs; it does not complete 3D
adaptation or introduce animations/runtime replacement.

Added `tools/assets/export_stitch_assets.py`, a hash-pinned extraction pipeline;
source rectangles and material subsets are in `.stitch/export-spec.json`. No
procedural character/terrain painting or alternate image generator is involved.
Background masks use local corner estimates, preserve enclosed linen, optionally
clear holes in foliage, and normalize with nearest-neighbor sampling. Character
feet use (32,60); the palette is reread per asset. A one-pixel periodic boundary
pass changes only opposing tile border samples, preserving source interior pixels.

Produced 100 native PNGs and 100 full-resolution alpha cutouts from 12 frozen
Stitch sheets: 16 neutral citizens, 19 icons, 11 props, five terrain textures and
49 reference-only building/nature/architecture/interior/legacy rasters. Exported
the eight UI component references as original Stitch CSS/HTML, not invented UI
art or a replacement HUD. Sources are copied into the review pack for inspection.

Visual fixes: tightened source rectangles to exclude sheet captions and prevent
clipping; removed backing in foliage gaps; kept fabric interiors opaque. A
sheet-wide matte color was rejected because JPEG backing tint varies by position.
Restricted dominant-component cleanup to five caption-contaminated icons, retaining
intentional detached pieces such as the stone chip. Selected a 512px source region
for the path to avoid aliasing the complete source into repetitive cross shapes.
Inspected native/enlarged citizens, icons, props, reference sheets and repeated tiles.

Verification: seven new tests observed failing before their functionality existed,
then passing. Full Python asset suite: 34/34 passed. The installed pixel-art auditor
checked all 100 native PNGs: binary alpha, no orphan alpha pixels, palette limit,
palette membership and grid alignment; character baselines and native padding
passed. All source crop-boundary candidates were eliminated. Independent exports
matched all 233 generator files byte-for-byte; original source hashes are unchanged.
Windows Temp tests required approved escalation due sandbox filesystem restrictions.

A fresh reviewer inspected the exporter, manifest and sheets. No unresolved
Critical/Important findings. Minor deferred: preview exports update files in place,
so a failed later entry can leave partial output until a successful rerun. This
does not touch production assets; use the completed manifest/audit for acceptance.
Border equality is reported only as a technical property, not perceptual proof.

Status: static 2D export increment complete and reviewable in `.stitch/exports/`.
The overall static-art milestone remains open for actual 3D models, UI adaptation
and static runtime review. Existing gameplay code, public assets, animation logic
and the rejected procedural citizen generator remain unchanged.

Delivery: local gallery `http://127.0.0.1:4174/exports/` and a 241-file ZIP archive
passed integrity checks. All 557 links across both review galleries resolve; HTTP
checks returned 200 for the export gallery and a native character PNG. Queued the
export gallery beside the chat. This is a static review server, not game runtime QA.
