import { GameRenderer } from './Renderer';
import { SceneManager } from './SceneManager';
import { GameLighting } from './Lighting';
import { WorldView } from './WorldView';
import { CameraController } from '@/world/CameraController';
import { GridSystem } from '@/world/GridSystem';
import { GridRenderer } from '@/world/GridRenderer';
import { RaycastSystem } from '@/world/RaycastSystem';
import { PlacementSystem } from '@/world/PlacementSystem';
import { useGameStore } from '@/state/GameStore';
import { MaterialLibrary } from '@/assets/MaterialLibrary';
import { SimulationSession } from '@/simulation/SimulationSession';
import { SimulationClock, SimulationSpeed } from '@/simulation/SimulationClock';
import type { GameCommand, CommandResult } from '@/simulation/commands';
import type { WorldOverrides } from '@/config/WorldConfig';
import { ConstructionView } from '@/construction/ConstructionView';

export interface GameOptions { world?: WorldOverrides; manualSimulation?: boolean }

export class Game {
  public readonly renderer: GameRenderer;
  public readonly sceneManager: SceneManager;
  public readonly lighting: GameLighting;
  public readonly cameraController: CameraController;
  public readonly gridSystem: GridSystem;
  public readonly gridRenderer: GridRenderer;
  public readonly raycastSystem: RaycastSystem;
  public readonly placementSystem: PlacementSystem;
  public readonly session: SimulationSession;
  private readonly clock = new SimulationClock();
  private readonly worldView: WorldView;
  private readonly constructionView: ConstructionView;
  private readonly manualSimulation: boolean;
  private isRunning = false;
  private disposed = false;
  private animationFrameId: number | null = null;
  private simulationTimer: ReturnType<typeof setInterval> | null = null;
  private lastFrameTime = 0;
  private lastSimulationTime = 0;

  constructor(container: HTMLElement, options: GameOptions = {}) {
    this.session = new SimulationSession(options.world);
    this.manualSimulation = options.manualSimulation ?? false;
    const metrics = this.session.getSnapshot().config.metrics;
    useGameStore.getState().resetGame();
    this.renderer = new GameRenderer(container);
    this.sceneManager = new SceneManager(metrics);
    this.lighting = new GameLighting(metrics);
    this.sceneManager.scene.add(this.lighting.group);
    this.cameraController = new CameraController(container, metrics);
    this.gridSystem = this.session.gridSystem;
    this.gridRenderer = new GridRenderer(metrics);
    this.sceneManager.terrainGroup.add(this.gridRenderer.group);
    this.raycastSystem = new RaycastSystem(container, this.cameraController.camera,
      this.gridRenderer.groundPlane, metrics);
    this.placementSystem = new PlacementSystem(container, this.sceneManager,
      this.gridRenderer, this.raycastSystem, metrics, () => useGameStore.getState().simulationSnapshot!, this.dispatch.bind(this));
    this.worldView = new WorldView(this.sceneManager, metrics);
    this.constructionView = new ConstructionView(this.sceneManager, metrics);
    this.publishSnapshot();
    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.start();
  }

  private publishSnapshot(): void {
    const snapshot = this.session.getSnapshot();
    this.worldView.sync(snapshot);
    this.constructionView.sync(snapshot);
    useGameStore.getState().publishSnapshot(snapshot);
  }

  public dispatch(command: GameCommand): CommandResult {
    const result = this.session.dispatch(command);
    if (result.ok) this.publishSnapshot();
    return result;
  }

  public advanceTicks(ticks: number): void {
    if (!this.manualSimulation) throw new Error('Manual stepping requires a manual session');
    this.session.step(ticks);
    this.publishSnapshot();
  }

  public setSpeed(speed: SimulationSpeed): void {
    if (this.isRunning && !this.manualSimulation) this.pumpSimulation();
    this.clock.setSpeed(speed);
  }

  public start(): void {
    if (this.isRunning || this.disposed) return;
    this.isRunning = true;
    this.lastFrameTime = this.lastSimulationTime = performance.now();
    if (document.hidden) this.clock.suspend(); else this.clock.resume();
    if (!this.manualSimulation) this.simulationTimer = setInterval(this.pumpSimulation, 25);
    this.loop(this.lastFrameTime);
  }

  public stop(): void {
    if (this.isRunning && !this.manualSimulation) this.pumpSimulation();
    this.isRunning = false;
    if (this.animationFrameId !== null) cancelAnimationFrame(this.animationFrameId);
    if (this.simulationTimer !== null) clearInterval(this.simulationTimer);
    this.animationFrameId = null;
    this.simulationTimer = null;
  }

  private pumpSimulation = (): void => {
    if (!this.isRunning) return;
    const now = performance.now();
    const ticks = this.clock.advance(Math.max(0, now - this.lastSimulationTime));
    this.lastSimulationTime = now;
    if (ticks > 0) {
      this.session.step(ticks);
      this.publishSnapshot();
    }
  };

  private onVisibilityChange = (): void => {
    // Hidden time never becomes offline progression; manual pause stays intact.
    if (document.hidden) {
      if (!this.manualSimulation) this.pumpSimulation();
      this.clock.suspend();
    } else this.clock.resume();
    this.lastSimulationTime = performance.now();
  };

  private loop = (time: number): void => {
    if (!this.isRunning) return;
    const deltaTime = Math.min((time - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = time;
    this.cameraController.update(deltaTime);
    this.raycastSystem.update();
    this.placementSystem.update();
    this.renderer.render(this.sceneManager.scene, this.cameraController.camera);
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private onWindowResize = (): void => {
    const { width, height } = this.renderer.resize();
    this.cameraController.resize(width, height);
  };

  public dispose(): void {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.placementSystem.dispose();
    this.raycastSystem.dispose();
    this.cameraController.dispose();
    this.worldView.dispose();
    this.constructionView.dispose();
    this.gridRenderer.group.removeFromParent();
    this.gridRenderer.dispose();
    this.lighting.dispose();
    this.sceneManager.dispose();
    this.renderer.dispose();
    MaterialLibrary.getInstance().dispose();
  }
}
