import { GameRenderer } from './Renderer';
import { SceneManager } from './SceneManager';
import { GameLighting } from './Lighting';
import { CameraController } from '@/world/CameraController';
import { GridSystem } from '@/world/GridSystem';
import { GridRenderer } from '@/world/GridRenderer';
import { RaycastSystem } from '@/world/RaycastSystem';
import { createSmallHouse } from '@/assets/procedural/houses';
import { gridToWorld } from '@/utils/coordinates';

export class Game {
  public readonly renderer: GameRenderer;
  public readonly sceneManager: SceneManager;
  public readonly lighting: GameLighting;
  public readonly cameraController: CameraController;
  public readonly gridSystem: GridSystem;
  public readonly gridRenderer: GridRenderer;
  public readonly raycastSystem: RaycastSystem;

  private isRunning = false;
  private animationFrameId: number | null = null;
  private lastTime = 0;

  constructor(container: HTMLElement) {
    // 1. Core Three.js Renderer
    this.renderer = new GameRenderer(container);

    // 2. Scene Graph
    this.sceneManager = new SceneManager();

    // 3. Lighting
    this.lighting = new GameLighting();
    this.sceneManager.scene.add(this.lighting.group);

    // 4. Isometric Camera Controller
    this.cameraController = new CameraController(container);

    // 5. Grid Logic & Visuals
    this.gridSystem = new GridSystem(20);
    this.gridRenderer = new GridRenderer();
    this.sceneManager.scene.add(this.gridRenderer.group);

    // 6. Raycast Interaction
    this.raycastSystem = new RaycastSystem(
      container,
      this.cameraController.camera,
      this.gridRenderer.groundPlane
    );

    // 7. Place initial procedural house for Phase A milestone verification
    // TODO(Phase B): Remove sample house scaffolding once PlacementSystem & New Game kit are active
    this.spawnSampleHouse(9, 9, 1, 42);
    this.spawnSampleHouse(11, 9, 2, 88);
    this.spawnSampleHouse(10, 11, 3, 105);

    // 8. Event listeners
    window.addEventListener('resize', this.onWindowResize);

    // 9. Start Game Loop
    this.start();
  }

  /**
   * TODO(Phase B): Scaffolding helper for Phase A visual verification. Remove when PlacementSystem is implemented.
   */
  private spawnSampleHouse(gx: number, gz: number, level = 1, seed = 0): void {
    const houseMesh = createSmallHouse(level, seed);
    const worldPos = gridToWorld(gx, gz);
    houseMesh.position.copy(worldPos);
    this.sceneManager.buildingsGroup.add(houseMesh);
    this.gridSystem.setBuilding(gx, gz, `sample-house-${gx}-${gz}`);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (time: number): void => {
    if (!this.isRunning) return;

    const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    // Update Camera
    this.cameraController.update(deltaTime);

    // Update Raycast and Hover Cell
    const hit = this.raycastSystem.update();
    if (hit) {
      const isAvailable = this.gridSystem.isCellAvailable(hit.cell.x, hit.cell.z);
      this.gridRenderer.setHoverCell(hit.cell.x, hit.cell.z, 1, 1, isAvailable);
    } else {
      this.gridRenderer.setHoverCell(null, null);
    }

    // Render Scene
    this.renderer.render(this.sceneManager.scene, this.cameraController.camera);

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private onWindowResize = (): void => {
    const { width, height } = this.renderer.resize();
    this.cameraController.resize(width, height);
  };

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    this.raycastSystem.dispose();
    this.cameraController.dispose();
    this.gridRenderer.dispose();
    this.lighting.dispose();
    this.sceneManager.dispose();
    this.renderer.dispose();
  }
}
