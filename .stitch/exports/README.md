# Stitch static export pack

This pack contains 100 individual PNG assets extracted from the frozen Stitch
masters, plus source cutouts, the original JPEGs, metadata and a review gallery.

- 16 neutral citizen views: 64x64 RGBA, foot anchor (32,60), maximum 16 colors.
- 19 UI/resource/building icons: 24x24 RGBA.
- 11 equipment/prop images: 32x32 RGBA.
- 5 ground textures: 32x32 RGB, matching opposite edge pixels.
- 49 reference rasters: building/nature/components/interiors/legacy, 128px or 256px.
  These remain reference images; no new 3D meshes are included.
- 8 UI component references are packaged as original Stitch HTML/CSS in `ui/`.

All native PNG colors belong to the existing 28-color project palette. Native
transparent pixels use binary alpha. The `cutouts/` images retain source RGB colors
at extraction resolution and are not subject to the native palette count.

No sprite motion or duplicated placeholder animation clips are included. The pack
has its own `static-manifest.json`; it does not replace the active game manifest.
`index.html` shows native and enlarged views on a checkerboard; the checkerboard
is not baked into the files. Ground repeat samples use the same native tile.

`export-spec.json` records every source rectangle and its original source hash.
`static-manifest.json` records native dimensions, anchors, usage and PNG hashes.
`audit.json` records the technical checks; these do not constitute user visual
approval or prove how the assets will look in the 3D scene. Terrain border checks
do not establish perceptual seamlessness on their own.

Reproduce from the repository with Pillow installed:

```powershell
python tools/assets/export_stitch_assets.py
python -m unittest discover -s tests/assets -p test_stitch_export.py
```

The original Stitch masters are unchanged. The generator writes only an isolated
review pack and rejects output under the project's public directory. Next work:
adapt the 3D models and UI, inspect static runtime scale/occlusion, then complete
the static milestone before authoring animation.
