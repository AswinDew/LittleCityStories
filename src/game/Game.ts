import { GameRenderer } from './Renderer';
import { SceneManager } from './SceneManager';
import { GameLighting } from './Lighting';
import { CameraController } from '@/world/CameraController';
import { GridSystem } from '@/world/GridSystem';
import { GridRenderer } from '@/world/GridRenderer';
import { RaycastSystem } from '@/world/RaycastSystem';
import { PlacementSystem } from '@/world/PlacementSystem';
import { createSmallHouse } from '@/assets/procedural/houses';
import { gridToWorld } from '@/utils/coordinates';
import { useGameStore } from '@/state/GameStore';

export class Game {
  public readonly renderer: GameRenderer;
  public readonly sceneManager: SceneManager;
  public readonly lighting: GameLighting;
  public readonly cameraController: CameraController;
  public readonly gridSystem: GridSystem;
  public readonly gridRenderer: GridRenderer;
  public readonly raycastSystem: RaycastSystem;
  public readonly placementSystem: PlacementSystem;

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

    // 7. Interactive Placement & Construction System
    this.placementSystem = new PlacementSystem(
      container,
      this.sceneManager,
      this.gridSystem,
      this.gridRenderer,
      this.raycastSystem
    );

    // 8. Place initial starter houses registered into both grid and store
    this.spawnSampleHouse(9, 9, 1, 42);
    this.spawnSampleHouse(11, 9, 2, 88);
    this.spawnSampleHouse(10, 11, 3, 105);

    // 9. Event listeners
    window.addEventListener('resize', this.onWindowResize);

    // 10. Start Game Loop
    this.start();
  }

  /**
   * Spawns sample houses and registers them into the placement system so they can be inspected/demolished.
   */
  private spawnSampleHouse(gx: number, gz: number, level = 1, seed = 0): void {
    const instanceId = `sample-house-${gx}-${gz}`;
    const houseMesh = createSmallHouse(level, seed);
    const worldPos = gridToWorld(gx, gz);
    houseMesh.position.copy(worldPos);
    houseMesh.name = instanceId;

    this.sceneManager.buildingsGroup.add(houseMesh);
    this.gridSystem.setBuilding(gx, gz, instanceId);
    this.placementSystem.registerBuildingMesh(instanceId, houseMesh);

    useGameStore.setState((state) => ({
      placedBuildings: {
        ...state.placedBuildings,
        [instanceId]: {
          instanceId,
          defId: 'small_house',
          gridX: gx,
          gridZ: gz,
          level,
          seed,
          placedAt: Date.now(),
        },
      },
    }));
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

    // Update Raycast and Placement preview
    this.raycastSystem.update();
    this.placementSystem.update();

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
    this.placementSystem.dispose();
    this.raycastSystem.dispose();
    this.cameraController.dispose();
    this.gridRenderer.dispose();
    this.lighting.dispose();
    this.sceneManager.dispose();
    this.renderer.dispose();
  }
}
