import './styles/global.css';
import { Game } from './game/Game';

document.addEventListener('DOMContentLoaded', () => {
  const canvasContainer = document.getElementById('canvas-container');
  if (!canvasContainer) {
    throw new Error('Canvas container element not found!');
  }

  // Initialize Game Engine
  const game = new Game(canvasContainer);

  // Setup Phase A HUD & Controls hints
  const uiRoot = document.getElementById('ui-root');
  if (uiRoot) {
    uiRoot.innerHTML = `
      <div style="position: absolute; top: 16px; left: 16px; display: flex; flex-direction: column; gap: 8px;">
        <div class="glass-panel" style="padding: 12px 18px; display: flex; align-items: center; gap: 12px;">
          <div style="width: 14px; height: 14px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981;"></div>
          <div>
            <h1 style="font-size: 1.1rem; font-weight: 700; margin: 0; color: #0f172a; letter-spacing: -0.02em;">Little City Stories</h1>
            <p style="font-size: 0.8rem; color: #64748b; margin: 2px 0 0 0;">Phase A · Isometric 3D Engine Ready</p>
          </div>
        </div>

        <div class="glass-panel" style="padding: 10px 14px; font-size: 0.78rem; color: #475569; display: flex; flex-direction: column; gap: 4px;">
          <div>🖱️ <b>Right/Middle Drag:</b> Pan Camera</div>
          <div>🔍 <b>Scroll Wheel:</b> Zoom In/Out</div>
          <div>🔄 <b>Q / E:</b> Rotate Camera 90°</div>
        </div>
      </div>

      <div style="position: absolute; bottom: 20px; right: 20px; display: flex; gap: 10px;">
        <button id="btn-rot-ccw" class="glass-panel" style="width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; background: white;">↺</button>
        <button id="btn-rot-cw" class="glass-panel" style="width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; background: white;">↻</button>
        <button id="btn-zoom-in" class="glass-panel" style="width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; background: white;">+</button>
        <button id="btn-zoom-out" class="glass-panel" style="width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; background: white;">−</button>
      </div>
    `;

    // Hook up rotation and zoom buttons
    document.getElementById('btn-rot-ccw')?.addEventListener('click', () => {
      game.cameraController.rotateCounterClockwise();
    });
    document.getElementById('btn-rot-cw')?.addEventListener('click', () => {
      game.cameraController.rotateClockwise();
    });
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      game.cameraController.zoomIn();
    });
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      game.cameraController.zoomOut();
    });

    // Keyboard shortcuts for rotation with clean lifecycle management
    const abortController = new AbortController();
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'q' || e.key === 'Q') {
          game.cameraController.rotateCounterClockwise();
        } else if (e.key === 'e' || e.key === 'E') {
          game.cameraController.rotateClockwise();
        }
      },
      { signal: abortController.signal }
    );

    // Cleanup on unload
    window.addEventListener('beforeunload', () => {
      abortController.abort();
      game.dispose();
    });
  }
});
