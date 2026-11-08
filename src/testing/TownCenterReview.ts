import * as THREE from 'three';
import { BuildingFactory } from '@/assets/BuildingFactory';
import { disposeBuilding } from '@/assets/procedural/houses';
import { MaterialLibrary } from '@/assets/MaterialLibrary';
import { GameRenderer } from '@/game/Renderer';
import { TownCenterSkin } from '@/assets/TownCenterSkin';
import { TownCenterDirectSkin } from '@/assets/TownCenterDirectSkin';
import { createProjectionCamera, projectTownCenterUV } from '@/assets/TownCenterProjection';
import { createProjectedTownCenter } from '@/assets/procedural/townCenterProjection';

/** Development-only comparison. The model is the same factory asset used in the settlement. */
export async function createTownCenterReview(root: HTMLElement): Promise<void> {
  const source = new URL('../../.stitch/designs/ancient-sites-master.jpg', import.meta.url).href;
  root.innerHTML = `<style>
    .town-review{position:fixed;inset:0;overflow:auto;background:#e7dabc;color:#302c36;padding:28px;pointer-events:auto;font:14px/1.5 'Segoe UI',sans-serif}
    .town-review header,.town-review footer{max-width:1100px;margin:auto}
    .town-review h1{font:600 28px Georgia;margin:0 0 8px}.town-review p{margin:6px 0}
    .town-review-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:1100px;margin:24px auto}
    .town-review article{border:1px solid #96704d;background:#e7dabc;padding:14px;border-radius:4px;min-width:0}
    .town-review h2{font-size:15px;margin:0 0 8px}.town-review svg{display:block;width:100%;height:auto;aspect-ratio:1}
    .town-review-canvas{width:100%;aspect-ratio:1;position:relative}.town-review canvas{display:block;position:absolute;inset:0;width:100%;height:100%}
    .town-review .direct-inspect{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;aspect-ratio:auto}
    .town-review .direct-inspect[hidden]{display:none}
    .town-review button,.town-review a{display:inline-block;padding:7px 12px;margin:4px 5px 4px 0;border:1px solid #65483c;border-radius:3px;background:#f4ebd9;color:#302c36;font:inherit;text-decoration:none;cursor:pointer}
    .town-review [aria-pressed=true]{background:#59845a;color:white}
    @media(max-width:700px){.town-review{padding:16px}.town-review-grid{grid-template-columns:1fr}}
    </style><main class="town-review"><header><h1>Town Center · review satu bangunan</h1>
    <p>Bandingkan siluet, pasangan batu, rangka kayu, jendela atap, jerami dan banner. Bangunan lain menunggu review kamu.</p>
    <a href="./">Lihat di dalam game</a></header><div class="town-review-grid">
    <article><h2>Master Stitch asli</h2><svg viewBox="20 0 360 365" role="img" aria-label="Master Town Center asli dari Stitch">
    <image href="${source}" width="1376" height="768"/></svg><p>Potongan tampilan dari master asli; gambar sumber tidak diubah.</p></article>
    <article><h2>Model game / prototipe terpisah</h2><div class="town-review-canvas"></div>
    <div><button data-appearance="baseline" aria-pressed="false">Tanpa tekstur</button><button data-appearance="skin" aria-pressed="true" disabled>Dengan tekstur</button><button data-appearance="direct" aria-pressed="false">Desain Stitch langsung</button></div>
    <p data-skin-status="loading" role="status">Memuat skin Stitch…</p>
    <p data-direct-status="idle" role="status">Prototipe gambar langsung belum dimuat. Belum diterapkan ke game.</p>
    <div><button data-view="reference" aria-pressed="true">Sudut Stitch</button><button data-view="game" aria-pressed="false">Sudut game</button><button data-turn="1">Putar 90°</button></div>
    <div><button data-inspect="overlay" aria-pressed="false" disabled>Landmark / siluet</button><button data-inspect="wireframe" aria-pressed="false" disabled>Wireframe</button><button data-inspect="coverage" aria-pressed="false" disabled>Tandai sisi tanpa sumber</button><button data-inspect="depth" aria-pressed="false" disabled>Uji kedalaman pintu</button></div>
    <p>Model tetap tiga dimensi. Tombol hanya mengubah sudut inspeksi.</p></article></div>
    <footer><p>Fokus saat ini hanya Town Center. Karakter, terrain, HUD game dan bangunan lain tidak diubah pada perbaikan ini.</p></footer></main>`;
  const canvas = root.querySelector<HTMLElement>('.town-review-canvas')!;
  const renderer = new GameRenderer(canvas), scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe7dabc);
  const camera = new THREE.OrthographicCamera(-3.65, 3.65, 3.65, -3.65, 0.1, 100);
  const target = new THREE.Vector3(0, 2.25, -0.10);
  camera.position.copy(target).add(new THREE.Vector3(12, 12, 12)); camera.lookAt(target);
  const model = BuildingFactory.createBuildingMesh('town_center', 1, 42);
  const skin = new TownCenterSkin();
  const direct = new TownCenterDirectSkin();
  const legacyCamera = camera.clone();
  let projected: THREE.Group | null = null, appearance = 'skin';
  let wantedAppearance = new URLSearchParams(location.search).get('appearance') === 'direct' ? 'direct' : 'skin';
  let viewMode = 'reference', turns = 0;
  const inspect = { overlay: false, wireframe: false, coverage: false, depth: false };
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlay.classList.add('direct-inspect'); overlay.setAttribute('viewBox', '0 0 360 366'); overlay.setAttribute('hidden', '');
  const depthGroup = new THREE.Group();
  for (const [z, color] of [[1.85, '#ff4b31'], [.8, '#27c9fa']] as const) {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8),
      new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    marker.position.set(0, 1.15, z); marker.userData.ownsMaterial = true; depthGroup.add(marker);
  }
  depthGroup.visible = false; scene.add(depthGroup);
  scene.add(model); model.rotation.y = Math.PI / 2;
  canvas.appendChild(overlay);
  const abort = new AbortController(); let disposed = false;
  const setCamera = () => {
    const isDirect = appearance === 'direct' && direct.spec;
    camera.copy(isDirect && viewMode === 'reference' ? createProjectionCamera(direct.spec!) : legacyCamera);
    camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
    model.rotation.y = (viewMode === 'reference' ? Math.PI / 2 : 0) + turns * Math.PI / 2;
    if (projected) { projected.rotation.y = turns * Math.PI / 2; depthGroup.rotation.copy(projected.rotation); }
    canvas.style.aspectRatio = isDirect ? '360 / 366' : '1';
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-view]')) {
      button.setAttribute('aria-pressed', String(turns % 4 === 0 && button.dataset.view === viewMode));
    }
  };
  const render = () => {
    if (disposed) return;
    overlay.toggleAttribute('hidden', !(inspect.overlay && appearance === 'direct' && direct.spec));
    if (!overlay.hasAttribute('hidden') && direct.spec && projected) {
      projected.updateMatrixWorld(true);
      const shapes = viewMode === 'reference' && turns % 4 === 0 ? direct.spec.coverage.filter(p => p.status === 'source')
        .map(p => `<polygon points="${p.sourcePolygon.map(v => v.join(',')).join(' ')}" fill="none" stroke="#ff3dba" stroke-width=".6"/>`).join('') : '';
      overlay.innerHTML = shapes + direct.spec.landmarks.map((l, i) => {
        const p = projected!.localToWorld(new THREE.Vector3(...l.modelPoint)).project(camera);
        const x = (p.x + 1) * 180, y = (1 - p.y) * 183;
        return `<circle cx="${x}" cy="${y}" r="2" fill="#03ffff" stroke="#30232b" stroke-width=".6"/><text x="${x + 3}" y="${y}" font-size="6" fill="#30232b">${i + 1}</text>`;
      }).join('');
    }
    renderer.resize(); renderer.render(scene, camera);
    root.dataset.modelDrawCalls = String(renderer.renderer.info.render.calls);
    root.dataset.modelTextures = String(renderer.renderer.info.memory.textures);
  };
  const resize = new ResizeObserver(render); resize.observe(canvas);
  const updateButtons = () => {
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-appearance]')) {
      button.setAttribute('aria-pressed', String(button.dataset.appearance === appearance));
    }
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-inspect]')) {
      button.disabled = appearance !== 'direct';
      button.setAttribute('aria-pressed', String(inspect[button.dataset.inspect as keyof typeof inspect]));
    }
  };
  const activateDirect = async () => {
    const status = root.querySelector<HTMLElement>('[data-direct-status]')!;
    status.dataset.directStatus = 'loading'; status.textContent = 'Memuat gambar arsitektur asli…';
    try {
      await direct.load(); if (disposed) return;
      if (!projected) {
        projected = createProjectedTownCenter(direct.spec!, direct.material, direct.fallbackMaterial);
        projected.visible = false; scene.add(projected);
      }
      status.dataset.directStatus = 'ready';
      const errors = direct.spec!.landmarks.map(l => {
        const uv = projectTownCenterUV(new THREE.Vector3(...l.modelPoint), direct.spec!);
        return Math.hypot(uv.x * 360 - l.imagePixel[0], (1 - uv.y) * 366 - l.imagePixel[1]);
      });
      root.dataset.directLandmarkMaxError = String(Math.max(...errors));
      status.textContent = 'Gambar Stitch langsung · 360×366 piksel native · prototipe satu sudut. Belakang, sisi kanan dan atap belakang belum memiliki sumber. Landmark mengukur alignment proyeksi, bukan kesetiaan 360°.';
      if (wantedAppearance !== 'direct') return;
      appearance = 'direct'; model.visible = false; projected.visible = true;
      root.dataset.appearance = 'direct';
      depthGroup.visible = inspect.depth; turns = 0; viewMode = 'reference'; setCamera(); updateButtons(); render();
    } catch (error) {
      if (disposed) return;
      status.dataset.directStatus = 'fallback';
      status.textContent = 'Gambar langsung tidak tersedia; model sekarang tetap dipakai. ' + String(error);
      updateButtons(); render();
    }
  };
  const showAppearance = (appearance: string) => {
    wantedAppearance = appearance;
    if (appearance === 'direct') { void activateDirect(); return; }
    showLegacy(appearance);
  };
  const showLegacy = (next: string) => {
    appearance = next; model.visible = true; if (projected) projected.visible = false;
    depthGroup.visible = false;
    const material = MaterialLibrary.getInstance().get(next === 'skin' ? 'stitch_civic_skin' : 'stitch_civic_illustrated');
    model.traverse(node => { if (node instanceof THREE.Mesh) node.material = material; });
    root.dataset.appearance = next; setCamera(); updateButtons();
  };
  root.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button.dataset.view) { viewMode = button.dataset.view; turns = 0; setCamera(); }
    if (button.dataset.turn) { turns++; setCamera(); }
    if (button.dataset.inspect && appearance === 'direct') {
      const key = button.dataset.inspect as keyof typeof inspect;
      inspect[key] = !inspect[key];
      direct.material.wireframe = direct.fallbackMaterial.wireframe = inspect.wireframe;
      direct.fallbackMaterial.color.set(inspect.coverage ? '#c325d9' : '#856f59');
      depthGroup.visible = inspect.depth; updateButtons();
    }
    if (button.dataset.appearance) showAppearance(button.dataset.appearance);
    if (button.dataset.view || button.dataset.turn) for (const view of root.querySelectorAll<HTMLButtonElement>('[data-view]')) {
      view.setAttribute('aria-pressed', String(!button.dataset.turn && view === button));
    }
    render();
  }, { signal: abort.signal });
  const cleanup = () => {
    if (disposed) return;
    disposed = true; resize.disconnect(); abort.abort();
    if (projected) disposeBuilding(projected);
    disposeBuilding(depthGroup); direct.dispose();
    skin.dispose(); disposeBuilding(model); MaterialLibrary.getInstance().dispose(); renderer.dispose();
  };
  window.addEventListener('pagehide', event => { if (!event.persisted) cleanup(); }, { signal: abort.signal });
  window.addEventListener('pageshow', render, { signal: abort.signal });
  render();
  const reference = new Image(); reference.src = source;
  await Promise.all([reference.decode(), skin.load().catch(() => {})]);
  if (!disposed) {
    const status = root.querySelector<HTMLElement>('[data-skin-status]')!;
    status.dataset.skinStatus = skin.status;
    status.textContent = skin.status === 'ready' ? 'Skin Stitch aktif · bandingkan dengan tampilan tanpa tekstur.' :
      'Skin tidak tersedia; tampilan tanpa tekstur tetap digunakan. ' + skin.error;
    root.querySelector<HTMLButtonElement>('[data-appearance=skin]')!.disabled = skin.status !== 'ready';
    if (wantedAppearance === 'direct') {
      if (appearance !== 'direct') await activateDirect();
      if (appearance !== 'direct') showLegacy(skin.status === 'ready' ? 'skin' : 'baseline');
    } else showLegacy(wantedAppearance === 'skin' && skin.status !== 'ready' ? 'baseline' : wantedAppearance);
    render(); root.dataset.townReviewReady = 'true';
  }
}
