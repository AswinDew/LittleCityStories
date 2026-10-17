import type { Game } from '@/game/Game';
import type { GridCoord } from '@/world/GridMath';
import { gridToWorld } from '@/utils/coordinates';
import { useGameStore } from '@/state/GameStore';

function createHooks(game: Game) {
  return {
    getSnapshot: () => game.session.getSnapshot(),
    dispatch: game.dispatch.bind(game),
    advanceTicks: game.advanceTicks.bind(game),
    setSpeed: game.setSpeed.bind(game),
    getSceneGroups: () => game.sceneManager.scene.children.map(child => child.name),
    getRenderCalls: () => game.renderer.renderer.info.render.calls,
    getBuildingViews: () => [...game.sceneManager.buildingsGroup.children, ...game.sceneManager.roadsGroup.children]
      .map(mesh => ({ id: mesh.name, stage: mesh.userData.stage as string })),
    getSelection: () => useGameStore.getState().selectedBuildingId,
    getCameraState: () => ({ zoom: game.cameraController.camera.zoom,
      rotation: game.cameraController.getRotationAngle(),
      target: { x: game.cameraController.target.x, z: game.cameraController.target.z } }),
    gridToScreen: (cell: GridCoord) => {
      const camera = game.cameraController.camera;
      camera.updateMatrixWorld();
      const point = gridToWorld(cell.x, cell.z, undefined, game.session.getSnapshot().config.metrics).project(camera);
      const rect = game.renderer.renderer.domElement.getBoundingClientRect();
      return { x: rect.left + (point.x + 1) * rect.width / 2,
        y: rect.top + (1 - point.y) * rect.height / 2 };
    },
  };
}

declare global { interface Window { __CIV_TOWN_TEST__?: ReturnType<typeof createHooks> } }

export function installTestHooks(game: Game): () => void {
  window.__CIV_TOWN_TEST__ = createHooks(game);
  return () => { delete window.__CIV_TOWN_TEST__; };
}
