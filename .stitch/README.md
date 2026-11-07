# Living Settlement - Stitch art sources

Open `index.html` to review the current static masters. Every illustrated master
and board screenshot originates in Stitch project `9572784485551125903`, design
system `assets/7e69032a14294b34916f28326fae80ba`. The local gallery only arranges
the exported files; it does not redraw the art.

The user approved project/design-system creation and technical adaptation on
2026-11-07. Approval of the generated visual results is still pending.

Current coverage: world composition; 16 neutral citizen views; eight ancient
sites; four cutaway interiors and ten components; nature; five ground appearance
references including three separate terrain masters; eleven props/equipment;
nineteen icons; HUD components; twelve inactive legacy factory assets.

Use `metadata.json` for inventory, current source selection and export gaps.
`designs/*provenance.json` preserve prompts, screen/file resource names and Stitch
feedback. `designs/download-index.json` maps local images to source resources;
`designs/audit.json` records file integrity and hashes. Raw Stitch HTML keeps its
original remote image/font/CDN references; the local `index.html` gallery uses
local images and CSS and can be viewed independently.

## Current masters versus archived drafts

- `char-master.jpg` replaces the overly realistic initial citizen scale lineup.
- `icons-master.jpg` replaces `icons-initial-master.jpg` and matches BLDG-01.
- `terrain-grass-master.jpg` and `terrain-dirt-master.jpg` replace the framed
  grass/cracked-earth drafts saved as `*-initial.jpg`.
- `ui-02-board.png` / `ui-02.source.html` replace the uncorrected ICON-UI-01 HUD.
- WORLD-01 and ENV-01 board snapshots remain historical; use the current master
  files selected by the gallery, not the outdated pictures inside those snapshots.

Stitch's first edit feedback claimed HTML changes that were absent when downloaded.
This was caught by inspecting the files. Corrected standalone image masters were
retained, and a new UI-02 DESIGN screen was generated and checked instead.

## Static milestone still open

The source gallery preserves the high-resolution Stitch masters. The next export
increment is now available in `exports/`: 100 individual native PNGs, alpha cutouts,
source crops, audit and a ZIP download. Sixteen neutral citizens, nineteen icons,
eleven props and five ground textures are 2D candidates; forty-nine other rasters
remain references. Actual 3D meshes and static runtime adaptation are still pending. Passing file-integrity checks does not establish visual approval.
The existing game assets, rendering, simulation and animation are unchanged.
Do not start animation until all static production assets and review are complete.
