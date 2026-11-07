# Town Center fidelity correction

**Authorized scope:** User requested one corrected building, then a pause for
their visual review before touching any other building or asset family.
Town Center is the implementation choice because it is the initial civic landmark.

**Source:** `.stitch/designs/ancient-sites-master.jpg`, first building. Keep the
existing hybrid Three.js engine, domain ID, 3×3 footprint and entrance. The prior
user direction permits technical 3D adaptation; this pass must reproduce the
reference's structure rather than only its colors.

**Design:** Raised masonry base, plaster upper storey with dark cross-braced
timber frame, deep layered irregular straw roof, roof dormer, two long blue cloth
banners, recessed portal and three broad stone steps. Surface detail and dark edge
accents belong to this building only. Model remains fully three-dimensional for
camera movement; source-image billboards would lose correct occlusion/other views.
Batch repeated static surface details to keep draw calls bounded. No global
material, lighting, terrain, citizen, animation or other building changes.

**Acceptance:** Inspect the actual source and render together; mechanical tests
do not certify visual approval. Reference silhouette, masonry, half timbering,
dormer, thick straw and banners must read at a close game view. Preserve footprint,
open citizen doorway, deterministic geometry, preview and disposal behavior.

- [x] Add Town Center portal, footprint and shared-ownership regression coverage;
  reproduce the missing roof dormer/open civic doorway before implementation.
- [x] Implement a dedicated Town Center model and route only that asset to it.
- [x] Provide a development-only isolated Town Center review view with the exact
  source alongside the live model and a link to the settlement.
- [x] Inspect screenshots and refine; run unit/build and browser regression checks.
- [x] Fresh code review, fix findings and stop for user visual review.

User visual acceptance remains pending. No authorization to apply this to other buildings.
