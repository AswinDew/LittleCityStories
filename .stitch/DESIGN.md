---
name: Civilization Town - Living Settlement
colors:
  primary: '#59845A'
  secondary: '#527B8C'
  tertiary: '#C2A05B'
  background: '#E7DABC'
  surface: '#E7DABC'
  on-surface: '#302C36'
  outline: '#65483C'
typography:
  heading:
    fontFamily: Noto Serif
    fontWeight: '600'
  body:
    fontFamily: Noto Sans
    fontWeight: '400'
rounded:
  DEFAULT: 4px
spacing:
  base: 4px
  panel: 24px
---

# Design System: Civilization Town - Living Settlement
**Project ID:** 9572784485551125903
**Status:** Approved 2026-11-07. Static art production; animation deferred.

## 1. Visual Theme & Atmosphere
An inhabited ancient settlement with expressive pixel-art inhabitants, tactile
handmade buildings and organic vegetation. Use the user's earlier market-scene
reference for craftsmanship, silhouette clarity and restrained material shading.
Create original ancient-world designs; do not copy its characters or modern shops.
Previous procedural citizen previews were rejected and are not approved masters.

Maintain the existing hybrid isometric 3D world and 2D citizen presentation.
Stitch is the requested design source. Its screens are art-direction boards until
individual game assets have been exported and verified. A screenshot or HTML card
is not a transparent sprite, seamless tile or usable 3D model.

Prioritize shape and anatomy before detail: continuous shoulder-to-elbow-to-wrist
forms, two readable arms, an intact pelvis and connected legs. Avoid mitten blobs,
floating hands, stretched torsos and overlarge heads. Faces need calm readable
expressions. Give each profession a distinct silhouette and equipment.

Use connected pixel clusters, restrained one-pixel contours at final sprite size,
two or three shade steps per material, and consistent upper-right light. Avoid
random pixel noise, blur, glossy plastic shading and cinematic screen filters.

## 2. Color Palette & Roles
- Warm parchment (#E7DABC): presentation surface and linen.
- Plum charcoal (#302C36): text and selected sprite contours.
- Deep timber (#65483C), aged wood (#96704D), warm timber (#C19B68): structures.
- Clay (#AD644D), sunlit clay (#D28B64): earthen walls and warm accents.
- Moss (#385C46), foliage (#59845A), leaf light (#8BA66A): vegetation and farmer.
- Muted blue (#527B8C), sky blue (#8DB9BE): villager cloth and banners.
- Straw (#C2A05B), straw light (#E3C882): thatch and farmer hat.
- Stone shadow (#687574), stone (#919B8B), stone light (#BEC5AE): rock and tools.
- Skin shadow (#B97456), skin (#DEA078), skin light (#F2C49A): skin volume.
- Soil (#B28E65), soil shadow (#96734F), soil light (#C7AA7B): ground.
- Grass (#93AF75), grass shadow (#78965C), grass light (#AEC38A): ground cover.
- Harvest gold (#E8BA55): grain and coins. Muted purple (#87709B): research accent.
These are the existing 28 project colors. Do not alter the runtime palette during
design exploration. Final palette reduction must preserve the intended silhouettes.

## 3. Typography Rules
Noto Serif for board titles; Noto Sans for labels and game controls. Typography
belongs outside asset pixels. Resource numerals must be legible at small size.
Do not bake labels, grids, backgrounds or decorative borders into exported art.

## 4. Component Stylings
- Boards: large art with generous separation, neutral scale guides and clear IDs.
- Characters: four professions, four authored views NE/NW/SE/SW; neutral pose first.
  Villager: simple tunic and pouch. Farmer: straw hat and tied apron. Lumberjack:
  robust build and leather vest. Builder: headband, linen shirt and tool apron.
- Buildings: readable entrances, textured thatch/wood/plaster, distinct rooflines,
  restrained wear. Show isometric exterior and static cutaway/interior references.
  Preserve footprints: town center 3x3, house/road 1x1, other ancient sites 2x2.
- Nature: irregular foliage masses and grounded trunks; varied rocks and crops.
- Icons: individual pictograms with distinct silhouettes; no generic emoji/font
  substitutions. Farm/food/agriculture and quarry/stone must remain distinguishable.
- UI art: compact parchment/wood panels, shallow 4px corners, readable controls,
  coordinated selection and placement indicators. Preserve the visible playfield.

## 5. Layout Principles
Present a full settlement composition alongside asset sheets at consistent scale.
Characters must fit doorways and workplaces. Review actual small-size readability,
not only enlarged images. Working sprite target is 64x64, anchor (32,60), with
padding; terrain currently 32x32 and icons 24x24. These are export constraints,
not permission to stretch an unsuitable image into a slot.

## 6. Static Art Before Animation
Complete the inventory of static masters, individual exports and visual review
before authoring any walk, idle, work or construction animation. No new GIFs or
procedural motion in this phase. Do not import the rejected preview into the game.
Stitch cannot be assumed to deliver meshes, valid sprite atlases or seamless tiles;
record missing export capabilities rather than labeling concepts production-ready.
