import './styles/global.css';
import { Game } from './game/Game';
import { HUD } from './ui/HUD';

document.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('canvas-container');
  if (!canvasContainer) {
    throw new Error('Canvas container element not found!');
  }

  // Initialize Game Engine
  const game = new Game(canvasContainer);

  // Setup HUD
  const uiRoot = document.getElementById('ui-root');
  let hud: HUD | null = null;
  if (uiRoot) {
    hud = new HUD(uiRoot, game);
  }

  // Handle page lifecycle cleanup
  const cleanup = () => {
    hud?.dispose();
    game.dispose();
  };

  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('pagehide', cleanup);
});
