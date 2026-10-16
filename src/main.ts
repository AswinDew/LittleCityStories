import './styles/global.css';
import { Game } from './game/Game';
import { HUD } from './ui/HUD';

document.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('canvas-container');
  if (!canvasContainer) {
    throw new Error('Canvas container element not found!');
  }

  // Initialize Game Engine
  const game = new Game(canvasContainer, {
    manualSimulation: import.meta.env.MODE === 'test' && new URLSearchParams(location.search).get('manual') === '1',
  });
  let removeTestHooks: (() => void) | undefined;
  let disposed = false;
  if (import.meta.env.MODE === 'test') {
    void import('./testing/TestHooks').then(({ installTestHooks }) => {
      if (!disposed) removeTestHooks = installTestHooks(game);
    });
  }

  // Setup HUD
  const uiRoot = document.getElementById('ui-root');
  let hud: HUD | null = null;
  if (uiRoot) {
    hud = new HUD(uiRoot, game);
  }

  // Handle page lifecycle cleanup
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    removeTestHooks?.();
    hud?.dispose();
    game.dispose();
  };

  window.addEventListener('pagehide', event => { if (event.persisted) game.stop(); else cleanup(); });
  window.addEventListener('pageshow', event => { if (event.persisted) game.start(); });
});
