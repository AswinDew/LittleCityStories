import { Game } from '@/game/Game';

export class HUD {
  private container: HTMLElement;
  private game: Game;
  private abortController: AbortController;

  constructor(container: HTMLElement, game: Game) {
    this.container = container;
    this.game = game;
    this.abortController = new AbortController();

    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <div style="position: absolute; top: 16px; left: 16px; display: flex; flex-direction: column; gap: 8px;">
        <div class="glass-panel" style="padding: 12px 18px; display: flex; align-items: center; gap: 12px;">
          <div style="width: 14px; height: 14px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981;"></div>
          <div>
            <h1 style="font-size: 1.1rem; font-weight: 700; margin: 0; color: #0f172a; letter-spacing: -0.02em;">Little City Stories</h1>
            <p style="font-size: 0.8rem; color: #64748b; margin: 2px 0 0 0;">Phase A · Isometric 3D Engine Ready</p>
          </div>
        </div>

        <div class="glass-panel" style="padding: 10px 14px; font-size: 0.78rem; color: #475569; display: flex; flex-direction: column; gap: 4px;">
          <div>🖱️ <b>Right/Middle/Touch Drag:</b> Pan Camera</div>
          <div>🔍 <b>Scroll Wheel:</b> Zoom In/Out</div>
          <div>🔄 <b>Q / E:</b> Rotate Camera 90°</div>
        </div>
      </div>

      <div style="position: absolute; bottom: 20px; right: 20px; display: flex; gap: 10px;">
        <button id="btn-rot-ccw" class="glass-panel" style="width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; background: white;" title="Rotate Left (Q)">↺</button>
        <button id="btn-rot-cw" class="glass-panel" style="width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; background: white;" title="Rotate Right (E)">↻</button>
        <button id="btn-zoom-in" class="glass-panel" style="width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; background: white;" title="Zoom In (+)">+</button>
        <button id="btn-zoom-out" class="glass-panel" style="width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; background: white;" title="Zoom Out (−)">−</button>
      </div>
    `;
  }

  private attachEventListeners(): void {
    const { signal } = this.abortController;

    const rotCCW = document.getElementById('btn-rot-ccw');
    rotCCW?.addEventListener('click', () => this.game.cameraController.rotateCounterClockwise(), { signal });

    const rotCW = document.getElementById('btn-rot-cw');
    rotCW?.addEventListener('click', () => this.game.cameraController.rotateClockwise(), { signal });

    const zoomIn = document.getElementById('btn-zoom-in');
    zoomIn?.addEventListener('click', () => this.game.cameraController.zoomIn(), { signal });

    const zoomOut = document.getElementById('btn-zoom-out');
    zoomOut?.addEventListener('click', () => this.game.cameraController.zoomOut(), { signal });

    // Keyboard shortcuts for discrete 90-degree isometric rotation
    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'q' || e.key === 'Q') {
          this.game.cameraController.rotateCounterClockwise();
        } else if (e.key === 'e' || e.key === 'E') {
          this.game.cameraController.rotateClockwise();
        }
      },
      { signal }
    );
  }

  public dispose(): void {
    this.abortController.abort();
    this.container.innerHTML = '';
  }
}
