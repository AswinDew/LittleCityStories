import { Game } from '@/game/Game';
import { useGameStore, ActiveTool } from '@/state/GameStore';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';
import { BuildingDefinition, BuildingCategory } from '@/buildings/types';

type TabCategory = 'featured' | BuildingCategory;

export class HUD {
  private container: HTMLElement;
  private game: Game;
  private abortController: AbortController;
  private unsubscribeStore: () => void;
  private currentTab: TabCategory = 'featured';

  constructor(container: HTMLElement, game: Game) {
    this.container = container;
    this.game = game;
    this.abortController = new AbortController();

    this.initLayout();
    this.attachEventListeners();
    this.renderBuildingCards();

    // Subscribe to Zustand store for Treasury and Active Tool updates
    this.unsubscribeStore = useGameStore.subscribe((state) => {
      this.updateTreasury(state.treasury);
      this.updateActiveTool(state.activeTool);
    });

    // Initial sync
    const state = useGameStore.getState();
    this.updateTreasury(state.treasury);
    this.updateActiveTool(state.activeTool);
  }

  private getBuildingsForCurrentTab(): BuildingDefinition[] {
    const registry = BuildingRegistry.getInstance();
    if (this.currentTab === 'featured') {
      return [
        registry.get('small_house')!,
        registry.get('family_house')!,
        registry.get('apartment')!,
        registry.get('road')!,
        registry.get('shop')!,
        registry.get('bakery')!,
        registry.get('restaurant')!,
        registry.get('school')!,
        registry.get('clinic')!,
        registry.get('park')!,
        registry.get('tree')!,
        registry.get('streetlight')!,
      ].filter(Boolean);
    }
    return registry.getByCategory(this.currentTab);
  }

  private initLayout(): void {
    this.container.innerHTML = `
      <!-- Top Left: Title & Controls Hint -->
      <div style="position: absolute; top: 16px; left: 16px; display: flex; flex-direction: column; gap: 8px; pointer-events: none;">
        <div class="glass-panel" style="padding: 12px 18px; display: flex; align-items: center; gap: 12px; pointer-events: auto;">
          <div style="width: 14px; height: 14px; border-radius: 50%; background: #10b981; box-shadow: 0 0 10px #10b981;"></div>
          <div>
            <h1 style="font-size: 1.1rem; font-weight: 700; margin: 0; color: #0f172a; letter-spacing: -0.02em;">Little City Stories</h1>
            <p style="font-size: 0.8rem; color: #64748b; margin: 2px 0 0 0;">Phase B · 12 Building Catalog Active</p>
          </div>
        </div>

        <div class="glass-panel" style="padding: 10px 14px; font-size: 0.78rem; color: #475569; display: flex; flex-direction: column; gap: 4px; pointer-events: auto;">
          <div>🖱️ <b>Left Click:</b> Place / Demolish</div>
          <div>🖱️ <b>Right/Middle Drag:</b> Pan Camera</div>
          <div>🔄 <b>Q / E:</b> Rotate Camera 90° · <b>R:</b> Rotate Building</div>
          <div>⌨️ <b>1–4:</b> Quick Build · <b>B:</b> Demolish · <b>Esc:</b> Cancel</div>
        </div>
      </div>

      <!-- Top Right: Treasury Display -->
      <div style="position: absolute; top: 16px; right: 16px;">
        <div class="glass-panel treasury-panel" id="treasury-badge">
          <span>💰</span>
          <span id="treasury-val">$10,000</span>
        </div>
      </div>

      <!-- Bottom Center: Construction Toolbar Dock -->
      <div style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; max-width: 90vw;">
        <!-- Category Filter Tabs -->
        <div class="category-tabs glass-panel" id="category-tabs-bar" style="padding: 4px 8px;">
          <button class="category-tab active" data-cat="featured">All (12)</button>
          <button class="category-tab" data-cat="residential">🏠 Residential</button>
          <button class="category-tab" data-cat="commercial">🏪 Commercial</button>
          <button class="category-tab" data-cat="municipal">🏛️ Civic</button>
          <button class="category-tab" data-cat="nature">🌳 Nature</button>
          <button class="category-tab" data-cat="transport">🛣️ Roads</button>
        </div>

        <!-- Buttons Dock -->
        <div class="glass-panel toolbar-dock" style="max-width: 100%; overflow-x: auto; display: flex; align-items: center; gap: 8px;">
          <div id="dock-building-list" style="display: flex; gap: 8px;"></div>

          <div class="tool-divider"></div>

          <button id="btn-tool-demolish" class="tool-btn" title="Demolish Building (+50% refund) [Key: B]">
            <span class="btn-icon">🚜</span>
            <span class="btn-label">Bulldoze</span>
            <span class="btn-cost" style="color: #dc2626;">Refund</span>
          </button>

          <button id="btn-tool-cancel" class="tool-btn" title="Cancel Tool (Idle mode) [Key: Esc]">
            <span class="btn-icon">✖</span>
            <span class="btn-label">Cancel</span>
            <span class="btn-cost" style="color: #64748b;">Esc</span>
          </button>
        </div>
      </div>

      <!-- Bottom Right: Camera Controls -->
      <div style="position: absolute; bottom: 20px; right: 20px; display: flex; gap: 10px;">
        <button id="btn-rot-ccw" class="glass-panel" style="width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; background: white;" title="Rotate Left (Q)">↺</button>
        <button id="btn-rot-cw" class="glass-panel" style="width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; background: white;" title="Rotate Right (E)">↻</button>
        <button id="btn-zoom-in" class="glass-panel" style="width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; background: white;" title="Zoom In (+)">+</button>
        <button id="btn-zoom-out" class="glass-panel" style="width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; background: white;" title="Zoom Out (−)">−</button>
      </div>
    `;
  }

  private renderBuildingCards(): void {
    const listEl = this.container.querySelector('#dock-building-list');
    if (!listEl) return;

    const buildings = this.getBuildingsForCurrentTab();
    listEl.innerHTML = buildings
      .map(
        (b) => `
        <button id="btn-tool-${b.id}" class="tool-btn" data-def-id="${b.id}" title="${b.name} ($${b.cost}) · ${b.footprint.width}×${b.footprint.depth}">
          <span class="btn-icon">${b.icon}</span>
          <span class="btn-label">${b.name}</span>
          <span class="btn-cost">$${b.cost}</span>
        </button>
      `
      )
      .join('');

    this.updateActiveTool(useGameStore.getState().activeTool);
  }

  private attachEventListeners(): void {
    const { signal } = this.abortController;

    // Camera buttons
    this.container.querySelector('#btn-rot-ccw')?.addEventListener(
      'click',
      () => {
        this.game.cameraController.rotateCounterClockwise();
      },
      { signal }
    );

    this.container.querySelector('#btn-rot-cw')?.addEventListener(
      'click',
      () => {
        this.game.cameraController.rotateClockwise();
      },
      { signal }
    );

    this.container.querySelector('#btn-zoom-in')?.addEventListener(
      'click',
      () => {
        this.game.cameraController.zoomIn();
      },
      { signal }
    );

    this.container.querySelector('#btn-zoom-out')?.addEventListener(
      'click',
      () => {
        this.game.cameraController.zoomOut();
      },
      { signal }
    );

    // Category Tabs via Event Delegation on Tabs Bar
    const tabsBar = this.container.querySelector('#category-tabs-bar');
    tabsBar?.addEventListener(
      'click',
      (e) => {
        const tabBtn = (e.target as HTMLElement).closest('.category-tab');
        if (!tabBtn) return;

        const cat = tabBtn.getAttribute('data-cat') as TabCategory;
        if (cat && cat !== this.currentTab) {
          this.currentTab = cat;
          // Update active class on tab buttons
          tabsBar.querySelectorAll('.category-tab').forEach((t) => t.classList.remove('active'));
          tabBtn.classList.add('active');

          // Only update the building list without re-rendering the whole HUD
          this.renderBuildingCards();
        }
      },
      { signal }
    );

    // Building buttons via Event Delegation on dock
    const dockBuildingList = this.container.querySelector('#dock-building-list');
    dockBuildingList?.addEventListener(
      'click',
      (e) => {
        const btn = (e.target as HTMLElement).closest('.tool-btn[data-def-id]');
        if (!btn) return;

        const defId = btn.getAttribute('data-def-id');
        if (defId) {
          const store = useGameStore.getState();
          const current = store.activeTool;
          if (current.mode === 'place' && current.defId === defId) {
            store.clearTool();
          } else {
            store.setPlacementTool(defId);
          }
        }
      },
      { signal }
    );

    // Demolish and Cancel buttons
    this.container.querySelector('#btn-tool-demolish')?.addEventListener(
      'click',
      () => {
        const store = useGameStore.getState();
        const current = store.activeTool;
        if (current.mode === 'demolish') store.clearTool();
        else store.setDemolishTool();
      },
      { signal }
    );

    this.container.querySelector('#btn-tool-cancel')?.addEventListener(
      'click',
      () => {
        useGameStore.getState().clearTool();
      },
      { signal }
    );

    // Keyboard shortcuts (Registered ONCE on window, guarded against repeat)
    window.addEventListener(
      'keydown',
      (e) => {
        // Ignore key repeat and form inputs
        if (e.repeat) return;
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        const store = useGameStore.getState();

        switch (e.key) {
          case '1':
            store.setPlacementTool('small_house');
            break;
          case '2':
            store.setPlacementTool('road');
            break;
          case '3':
            store.setPlacementTool('shop');
            break;
          case '4':
            store.setPlacementTool('park');
            break;
          case 'b':
          case 'B':
            if (store.activeTool.mode === 'demolish') {
              store.clearTool();
            } else {
              store.setDemolishTool();
            }
            break;
          case 'r':
          case 'R':
            // Rotate building during placement mode
            this.game.placementSystem.rotatePlacement();
            break;
          case 'Escape':
            store.clearTool();
            break;
          case 'q':
          case 'Q':
            this.game.cameraController.rotateCounterClockwise();
            break;
          case 'e':
          case 'E':
            this.game.cameraController.rotateClockwise();
            break;
        }
      },
      { signal }
    );
  }

  private updateTreasury(amount: number): void {
    const el = this.container.querySelector('#treasury-val');
    if (el) {
      el.textContent = `$${amount.toLocaleString()}`;
    }
  }

  private updateActiveTool(tool: ActiveTool): void {
    const buttons = this.container.querySelectorAll('.tool-btn');
    buttons.forEach((b) => b.classList.remove('active', 'demolish-active'));

    if (tool.mode === 'place' && tool.defId) {
      const activeBtn = this.container.querySelector(`.tool-btn[data-def-id="${tool.defId}"]`);
      activeBtn?.classList.add('active');
    } else if (tool.mode === 'demolish') {
      this.container.querySelector('#btn-tool-demolish')?.classList.add('demolish-active');
    }
  }

  public dispose(): void {
    this.unsubscribeStore();
    this.abortController.abort();
    this.container.innerHTML = '';
  }
}
