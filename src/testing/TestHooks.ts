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
      .map(mesh => {
        const parts: { stage: string; height: number }[] = [];
        mesh.traverse(part => { if (part.userData.assembly && part.visible) parts.push({ stage: part.userData.assembly, height: part.scale.y }); });
        return { id: mesh.name, stage: mesh.userData.stage as string, progress: mesh.userData.progress as number, parts };
      }),
    getSelection: () => useGameStore.getState().selectedBuildingId,
    getCitizenViews: () => game.sceneManager.citizensGroup.children.map(mesh => ({ id: mesh.name, visible: mesh.visible,
      activity: mesh.userData.activity as string, direction: mesh.userData.direction as string,
      frame: mesh.userData.frame as { x: number; y: number; width: number; height: number },
      position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z } })),
    setCameraZoom: (zoom: number) => game.cameraController.setZoom(zoom),
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
