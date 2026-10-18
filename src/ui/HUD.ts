import type { Game } from '@/game/Game';
import { useGameStore } from '@/state/GameStore';
import { BuildingRegistry } from '@/buildings/BuildingRegistry';
import type { BuildingCategory } from '@/buildings/types';
import { RESOURCE_IDS } from '@/economy/ResourceLedger';
import type { ResourceBundle } from '@/economy/types';
import type { CommandFailure } from '@/simulation/commands';
import { ProductionSystem, type OperatingStatus } from '@/economy/ProductionSystem';

const messages: Record<CommandFailure, string> = {
  invalid_command: 'Perintah tidak valid.', invalid_cell: 'Pilih tile pada peta.', invalid_terrain: 'Terrain tidak valid.',
  unknown_building: 'Bangunan tidak tersedia.', invalid_rotation: 'Rotasi tidak valid.', out_of_bounds: 'Footprint keluar dari peta.',
  occupied: 'Tile sudah ditempati.', environment_blocked: 'Tanah terhalang pohon, batu, atau air.', citizen_occupied: 'Ada warga pada tile ini.',
  insufficient_resources: 'Resource tidak cukup.', entrance_blocked: 'Pintu masuk harus tetap terbuka.', protected_building: 'Town Center dilindungi.',
  not_found: 'Objek sudah tidak ada.', invalid_state: 'Aksi tidak tersedia pada status ini.', locked: 'Teknologi belum dibuka.',
  already_assigned: 'Warga sudah memiliki pekerjaan. Unassign terlebih dahulu.', no_worker_slot: 'Slot pekerja sudah penuh.',
};
const icon = (key: string, label = '') => `<img src="${import.meta.env.BASE_URL}generated/icons/${key}.png" alt="${label}" width="24" height="24">`;
const costText = (cost: ResourceBundle) => RESOURCE_IDS.filter(key => cost[key] > 0).map(key => `${cost[key]} ${key}`).join(' · ') || 'Starter';
const operatingMessages: Record<OperatingStatus, string> = {
  under_construction: 'Menunggu konstruksi', no_workers: 'Menunggu pekerja', unreachable: 'Pekerja belum tiba atau akses tidak valid',
  no_source: 'Tidak ada sumber dalam radius', storage_full: 'Storage penuh', working: 'Bekerja',
};

export class HUD {
  private category: BuildingCategory = 'housing';
  private readonly abort = new AbortController();
  private readonly unsubscribe: () => void;
  private readonly production = new ProductionSystem();
  private inspectorMarkup = '';
  constructor(private readonly container: HTMLElement, private readonly game: Game) {
    container.innerHTML = `<header class="settlement-header">
      <div class="glass-panel settlement-title"><h1>Civilization Town</h1><p>M5 · Ancient Settlement</p>
      <p data-population></p><p data-happiness></p></div>
      <div class="glass-panel resource-bar" aria-label="Settlement resources">${RESOURCE_IDS.map(key => `<div data-resource="${key}">${icon(key)}<span>${key}</span><strong>0</strong><small>/ 300</small></div>`).join('')}</div>
      </header><aside class="glass-panel construction-inspector" aria-label="Building inspector" hidden></aside>
      <div class="glass-panel construction-hints">Klik: bangun / pilih · drag kanan/tengah: pan · scroll: zoom · R: rotasi · Esc: batal</div>
      <nav class="glass-panel construction-dock" aria-label="Construction menu"><div class="construction-tabs">${(['housing', 'production', 'infrastructure', 'community'] as const).map(category => `<button type="button" data-category="${category}">${category[0].toUpperCase() + category.slice(1)}</button>`).join('')}</div>
      <div class="construction-cards"></div><div class="construction-tools"><button type="button" data-tool="demolish">Demolish [B]</button><button type="button" data-tool="clear">Clear vegetation [C]</button><button type="button" data-tool="idle">Cancel tool [Esc]</button></div>
      <p class="construction-feedback" role="status" aria-live="polite"></p></nav>
      <div class="camera-zoom"><button type="button" data-camera="in" title="Zoom In (+)" aria-label="Zoom in">+</button><button type="button" data-camera="out" title="Zoom Out (−)" aria-label="Zoom out">−</button></div>`;
    this.renderCards(); this.render();
    this.unsubscribe = useGameStore.subscribe((state, previous) => {
      if (state.simulationSnapshot !== previous.simulationSnapshot || state.activeTool !== previous.activeTool ||
          state.selectedBuildingId !== previous.selectedBuildingId || state.feedback !== previous.feedback) this.render();
    });
    container.addEventListener('click', this.onClick, { signal: this.abort.signal });
    window.addEventListener('keydown', this.onKey, { signal: this.abort.signal });
  }
  private renderCards(): void {
    const cards = this.container.querySelector('.construction-cards')!;
    cards.innerHTML = BuildingRegistry.getInstance().getByCategory(this.category).filter(def => def.purchasable).map(def =>
      `<button type="button" class="construction-card" data-def-id="${def.id}" title="${def.description}">${icon(def.id)}<strong>${def.name}</strong><small>${costText(def.cost)}</small><small>${def.footprint.width}×${def.footprint.depth} · ${def.requiredWorkTicks ? `${def.requiredWorkTicks / 10}s kerja` : 'Instan'}</small></button>`).join('');
  }
  private render(): void {
    const state = useGameStore.getState(), snapshot = state.simulationSnapshot;
    if (!snapshot) return;
    const citizens = Object.values(snapshot.citizens).sort((a, b) => a.id.localeCompare(b.id));
    this.container.querySelector('[data-population]')!.textContent = `${citizens.length} warga / ${snapshot.population.housingCapacity} tempat`;
    this.container.querySelector('[data-happiness]')!.textContent = `Happiness ${Math.round(snapshot.population.happiness)}%`;
    for (const key of RESOURCE_IDS) {
      const badge = this.container.querySelector<HTMLElement>(`[data-resource="${key}"]`)!;
      badge.querySelector('strong')!.textContent = String(snapshot.resources[key]);
      badge.querySelector('small')!.textContent = `/ ${snapshot.capacity[key]}`;
      badge.classList.toggle('over-capacity', snapshot.resources[key] > snapshot.capacity[key]);
      badge.title = snapshot.resources[key] > snapshot.capacity[key] ? 'Over capacity: resource tetap tersimpan.' : key;
    }
    this.container.querySelectorAll<HTMLButtonElement>('[data-category]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.category === this.category));
    });
    this.container.querySelectorAll<HTMLButtonElement>('[data-def-id]').forEach(button => {
      button.setAttribute('aria-pressed', String(state.activeTool.mode === 'place' && state.activeTool.defId === button.dataset.defId));
    });
    this.container.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(button => {
      button.setAttribute('aria-pressed', String(state.activeTool.mode === button.dataset.tool));
    });
    const feedback = this.container.querySelector('.construction-feedback')!;
    feedback.textContent = state.feedback ? messages[state.feedback] : state.activeTool.mode === 'place' ?
      'Pilih tile kosong. Builder tersedia akan berjalan ke site; R memutar footprint dan entrance.' : state.activeTool.mode === 'clear' ?
      'Bersihkan pohon/batu tanpa hasil resource gratis.' : state.activeTool.mode === 'demolish' ?
      'Klik site untuk batal; bangunan selesai mengembalikan 50% biaya, dibulatkan ke bawah.' : 'Pilih bangunan untuk melihat status dan tindakan.';
    const panel = this.container.querySelector<HTMLElement>('.construction-inspector')!;
    const building = state.selectedBuildingId ? snapshot.buildings[state.selectedBuildingId] : null;
    panel.hidden = !building;
    if (!building) { panel.innerHTML = ''; this.inspectorMarkup = ''; return; }
    const def = BuildingRegistry.getInstance().get(building.defId)!;
    const status = building.status === 'planned' ? 'Menunggu builder' : building.status === 'under_construction' ?
      'Dalam konstruksi · <span data-work-progress></span> tick kerja' : 'Selesai';
    const operating = def.production ? this.production.getOperatingStatus(building.instanceId, snapshot) : null;
    const workers = citizens.filter(c => c.workplaceId === building.instanceId), available = citizens.filter(c => !c.workplaceId);
    const workerMarkup = building.status !== 'completed' || def.workerSlots > 0 ? `<section class="worker-panel" aria-label="Building workers"><h3>Pekerja ${workers.length}/${building.status === 'completed' ? def.workerSlots : 1}</h3>
      <ul>${workers.map(c => `<li>${c.name} · ${c.waitingReason ? operatingMessages[c.waitingReason === 'no_home' ? 'unreachable' : c.waitingReason] : c.activity}
      <button type="button" data-unassign="${c.id}">Unassign ${c.name}</button></li>`).join('') || '<li>Belum ada pekerja.</li>'}</ul>
      ${building.status === 'completed' ? `<label for="worker-choice">Tambah pekerja</label><select id="worker-choice" aria-label="Available worker" ${!available.length || workers.length >= def.workerSlots ? 'disabled' : ''}>
      ${available.map(c => `<option value="${c.id}">${c.name}</option>`).join('') || '<option>Tidak ada warga tersedia</option>'}</select>
      <button type="button" data-assign="${building.instanceId}" ${!available.length || workers.length >= def.workerSlots ? 'disabled' : ''}>Assign worker</button>` : '<p>Builder dipilih otomatis dari warga tanpa pekerjaan.</p>'}</section>` : '';
    const markup = `${icon(building.defId)}<h2>${def.name}</h2><p data-building-status="${building.status}">${status}</p>
      ${operating ? `<p data-operating-status="${operating}">Operasional: ${operatingMessages[operating]}</p>` : ''}
      <p>Biaya dibayar: ${costText(building.paidResources)}</p><p>${def.description}</p>${building.defId === 'town_center' ? '<p>Bangunan awal dilindungi.</p>' :
      `<button type="button" data-action="${building.status === 'completed' ? 'demolishBuilding' : 'cancelConstruction'}" data-instance="${building.instanceId}">${building.status === 'completed' ? 'Demolish building' : 'Cancel construction'}</button>`}${workerMarkup}`;
    // Compare source templates: browser serialization normalizes attributes/whitespace.
    if (this.inspectorMarkup !== markup) {
      const previousSelect = panel.querySelector<HTMLSelectElement>('#worker-choice');
      const choice = previousSelect?.value, focused = previousSelect !== null && document.activeElement === previousSelect;
      panel.innerHTML = markup; this.inspectorMarkup = markup;
      const nextSelect = panel.querySelector<HTMLSelectElement>('#worker-choice');
      if (nextSelect && choice && [...nextSelect.options].some(option => option.value === choice)) {
        nextSelect.value = choice;
        if (focused) nextSelect.focus({ preventScroll: true });
      }
    }
    const progress = panel.querySelector('[data-work-progress]');
    if (progress) progress.textContent = `${building.workTicks}/${def.requiredWorkTicks}`;
  }
  private onClick = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button'); if (!button) return;
    const store = useGameStore.getState();
    if (button.dataset.assign || button.dataset.unassign) {
      const citizenId = button.dataset.unassign ?? this.container.querySelector<HTMLSelectElement>('#worker-choice')?.value;
      if (citizenId) {
        const result = button.dataset.assign ? this.game.dispatch({ type: 'assignWorker', citizenId, buildingId: button.dataset.assign }) :
          this.game.dispatch({ type: 'unassignWorker', citizenId });
        store.setFeedback(result.ok ? null : result.reason);
      }
    }
    if (button.dataset.category) { this.category = button.dataset.category as BuildingCategory; this.renderCards(); this.render(); }
    if (button.dataset.defId) store.setPlacementTool(button.dataset.defId);
    if (button.dataset.tool === 'demolish') store.setDemolishTool();
    if (button.dataset.tool === 'clear') store.setClearTool();
    if (button.dataset.tool === 'idle') store.clearTool();
    if (button.dataset.camera === 'in') this.game.cameraController.zoomIn();
    if (button.dataset.camera === 'out') this.game.cameraController.zoomOut();
    if (button.dataset.action && button.dataset.instance) {
      const result = this.game.dispatch({ type: button.dataset.action as 'demolishBuilding' | 'cancelConstruction', instanceId: button.dataset.instance });
      store.setFeedback(result.ok ? null : result.reason);
    }
  };
  private onKey = (event: KeyboardEvent): void => {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement || (event.target as HTMLElement)?.isContentEditable) return;
    const store = useGameStore.getState();
    switch (event.key.toLowerCase()) {
      case '1': store.setPlacementTool('primitive_house'); break;
      case '2': store.setPlacementTool('dirt_road'); break;
      case '3': store.setPlacementTool('farm'); break;
      case '4': store.setPlacementTool('lumber_camp'); break;
      case 'b': store.activeTool.mode === 'demolish' ? store.clearTool() : store.setDemolishTool(); break;
      case 'c': store.activeTool.mode === 'clear' ? store.clearTool() : store.setClearTool(); break;
      case 'r': this.game.placementSystem.rotatePlacement(); break;
      case 'escape': store.clearTool(); break;
    }
  };
  dispose(): void { this.unsubscribe(); this.abort.abort(); this.container.replaceChildren(); }
}
