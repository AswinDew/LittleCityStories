---
name: city-builder-engine
description: Use when changing Civilization Town scene orchestration, grid rendering, camera controls, or the simulation-to-view boundary.
---

# City builder engine

## Ownership

`src/game/`, visual adapters in `src/world/`, and `src/utils/coordinates.ts`. Domain grid math stays in `src/world/GridMath.ts`; simulation never imports Three.js, DOM or Zustand.

## Workflow

1. Read `docs/superpowers/plans/2026-10-15-civilization-town-mvp.md` and the current milestone ledger before changing the boundary.
2. Derive positions, raycasting and view bounds from the same GridMetrics. Procedural models use cell size 2; placement/view adapters scale them by configured cellSize/2.
3. Keep the fixed 100ms scheduler outside requestAnimationFrame. Rendering consumes immutable snapshots; hidden time is excluded and manual pause survives visibility changes.
4. Release owned geometries with `disposeBuilding`; cached ancient meshes acquire/release references. Materials belong to MaterialLibrary, preview clones to their preview. Texture owners dispose their own textures.
5. Run `npm.cmd test -- tests/gridMetrics.test.ts tests/gameLifecycle.test.ts tests/worldView.test.ts` and `npm.cmd run build`; use `npm.cmd run test:e2e` for browser changes.

Do not migrate treasury/construction early: the legacy adapter remains until M3. Rendering work does not authorize new gameplay, persistence, or a later milestone.
