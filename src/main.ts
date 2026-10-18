import './styles/global.css';
import { Game } from './game/Game';
import { HUD } from './ui/HUD';
import { GeneratedAssetLoader } from './assets/GeneratedAssetLoader';
import { applyWorldTextures } from './assets/WorldTextures';
import { SpriteAtlas } from './assets/SpriteAtlas';

document.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('canvas-container');
  if (!canvasContainer) {
    throw new Error('Canvas container element not found!');
  }

  // Initialize Game Engine
  const game = new Game(canvasContainer, {
    manualSimulation: import.meta.env.MODE === 'test' && new URLSearchParams(location.search).get('manual') === '1',
    world: import.meta.env.DEV && new URLSearchParams(location.search).get('assets') === '1' ? { startingPopulation: 0 } : undefined,
  });
  let removeTestHooks: (() => void) | undefined;
  let disposed = false;
  const assetLoader = new GeneratedAssetLoader();
  const texturesReady = applyWorldTextures(game, assetLoader);
  void Promise.all([assetLoader.getManifest(), assetLoader.load('citizens')]).then(([manifest, texture]) => {
    if (!disposed) game.setCitizenAssets(new SpriteAtlas(manifest.atlases.citizens), texture);
  }).catch(error => { if (!disposed) console.error('Citizen atlas failed to load:', error); });
  void texturesReady.catch(error => {
    if (!disposed) console.error('Generated textures failed to load:', error);
  });
  if (import.meta.env.MODE === 'test') {
    void import('./testing/TestHooks').then(({ installTestHooks }) => {
      if (!disposed) removeTestHooks = installTestHooks(game);
    });
  }

  // Setup HUD
  const uiRoot = document.getElementById('ui-root');
  let hud: HUD | null = null;
  let disposeGallery: (() => void) | undefined;
  if (uiRoot && import.meta.env.DEV && new URLSearchParams(location.search).get('assets') === '1') {
    void import('./testing/AssetGallery').then(({ createAssetGallery }) => {
      if (!disposed) disposeGallery = createAssetGallery(game, uiRoot, assetLoader);
    });
  } else if (uiRoot) {
    hud = new HUD(uiRoot, game);
  }

  // Handle page lifecycle cleanup
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    removeTestHooks?.();
    disposeGallery?.();
    assetLoader.dispose();
    hud?.dispose();
    game.dispose();
  };

  window.addEventListener('pagehide', event => { if (event.persisted) game.stop(); else cleanup(); });
  window.addEventListener('pageshow', event => { if (event.persisted) game.start(); });
});
