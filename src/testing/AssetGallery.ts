import * as THREE from 'three';
import type { Game } from '@/game/Game';
import { BuildingFactory } from '@/assets/BuildingFactory';
import { ANCIENT_FOOTPRINTS } from '@/assets/procedural/ancientBuildings';
import { createAncientEnvironment } from '@/assets/procedural/ancientEnvironment';
import { disposeBuilding } from '@/assets/procedural/houses';
import { GeneratedAssetLoader } from '@/assets/GeneratedAssetLoader';
import { SpriteAtlas, DIRECTIONS, OCCUPATIONS, SpriteActivity } from '@/assets/SpriteAtlas';
import { CitizenSpriteView } from '@/citizens/CitizenSpriteView';
import { useGameStore } from '@/state/GameStore';

/** Explicit development inspection mode. Samples use simulation ticks; no citizen is spawned. */
export function createAssetGallery(game: Game, root: HTMLElement, loader: GeneratedAssetLoader): () => void {
  const group = new THREE.Group(); group.name = 'asset-gallery';
  game.sceneManager.scene.add(group);
  game.sceneManager.vegetationGroup.visible = false;
  game.sceneManager.buildingsGroup.visible = false;
  game.sceneManager.roadsGroup.visible = false;
  game.cameraController.setZoom(1.4);
  game.cameraController.target.z = -6;
  game.cameraController.update(1);
  const labels: { node: HTMLElement; point: THREE.Vector3 }[] = [];
  const models: THREE.Group[] = [];
  const sprites: CitizenSpriteView[] = [];
  let frameId = 0, disposed = false;
  let activity: SpriteActivity = 'walk';
  const abort = new AbortController();
  root.innerHTML = `<section class="asset-gallery-panel" aria-label="Asset inspection">
    <h1>Civilization Town · M2 Asset Gallery</h1>
    <p>Art inspection only · 32px sprites · NE / NW / SE / SW · drag right to pan, scroll to zoom</p>
    <div class="asset-gallery-actions"><button type="button" data-state="idle">Idle poses</button>
    <button type="button" data-state="walk">Walk poses</button><button type="button" data-state="work">Work poses</button>
    <button type="button" data-speed="0">Pause</button><button type="button" data-speed="1">Play</button></div>
    <div class="asset-gallery-icons"></div><p data-gallery-status>Loading generated atlas…</p>
    <a href="./">Back to settlement</a></section>`;
  const panel = root.querySelector('section')!;
  const status = root.querySelector<HTMLElement>('[data-gallery-status]')!;
  const icons = root.querySelector('.asset-gallery-icons')!;
  panel.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest('button');
    if (button?.dataset.state) activity = button.dataset.state as SpriteActivity;
    if (button?.dataset.speed) game.setSpeed(Number(button.dataset.speed) as 0 | 1);
  }, { signal: abort.signal });
  for (const [index, id] of Object.keys(ANCIENT_FOOTPRINTS).entries()) {
    const model = BuildingFactory.createBuildingMesh(id, 1, 42);
    model.position.set((index % 4 - 1.5) * 11, 0.01, Math.floor(index / 4) * 10 - 12);
    group.add(model); models.push(model);
    const label = document.createElement('span'); label.className = 'asset-gallery-label';
    label.dataset.assetLabel = id; label.textContent = id.replaceAll('_', ' '); root.append(label);
    labels.push({ node: label, point: model.position.clone().add(new THREE.Vector3(0, 0, 3.6)) });
  }
  for (const [index, kind] of (['tree', 'bush', 'rock', 'grass', 'crop'] as const).entries()) {
    const model = createAncientEnvironment(kind, 42); model.position.set(-12 + index * 6, 0.01, 5);
    group.add(model); models.push(model);
  }
  void (async () => {
    const manifest = await loader.getManifest();
    if (disposed) return;
    for (const [key, asset] of Object.entries(manifest.assets)) if (key.startsWith('icon_')) {
      const image = document.createElement('img'); image.src = `${import.meta.env.BASE_URL}generated/${asset.file}`;
      image.alt = key.slice(5).replaceAll('_', ' '); image.title = image.alt; image.dataset.icon = key;
      icons.append(image);
    }
    const texture = await loader.load('citizens');
    if (disposed) return;
    const atlas = new SpriteAtlas(manifest.atlases.citizens);
    for (const [row, role] of OCCUPATIONS.entries()) for (const [column, direction] of DIRECTIONS.entries()) {
      const view = new CitizenSpriteView(atlas, texture, role, direction);
      view.sprite.position.set((row - 1.5) * 11 + (column - 1.5) * 1.9, 0.01, 12);
      group.add(view.sprite); sprites.push(view);
      if (column === 0) {
        const label = document.createElement('span'); label.className = 'asset-gallery-label';
        label.textContent = `${role} · NE NW SE SW`; label.dataset.roleLabel = role; root.append(label);
        labels.push({ node: label, point: new THREE.Vector3((row - 1.5) * 11, 0, 14) });
      }
    }
    status.textContent = '23 generated PNGs · 8 buildings · 5 environment types · 16 sprite previews';
    status.dataset.galleryReady = 'true';
  })().catch(error => { if (!disposed) { status.textContent = `Asset loading failed: ${String(error)}`; console.error(error); } });
  const update = () => {
    if (disposed) return;
    const time = (useGameStore.getState().simulationSnapshot?.tick ?? 0) * 100;
    status.dataset.activity = activity;
    for (const sprite of sprites) {
      const rect = sprite.update(activity, time); status.dataset.frame = `${rect.x},${rect.y}`;
    }
    const canvas = game.renderer.renderer.domElement;
    for (const { node, point } of labels) {
      const projected = point.clone().project(game.cameraController.camera);
      node.style.left = `${(projected.x + 1) * canvas.clientWidth / 2}px`;
      node.style.top = `${(1 - projected.y) * canvas.clientHeight / 2}px`;
    }
    frameId = requestAnimationFrame(update);
  };
  update();
  return () => {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(frameId); abort.abort();
    sprites.forEach(sprite => sprite.dispose());
    models.forEach(model => { model.removeFromParent(); disposeBuilding(model); });
    group.removeFromParent(); root.replaceChildren();
  };
}
