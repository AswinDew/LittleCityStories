import * as THREE from 'three';
import { BuildingFactory } from '@/assets/BuildingFactory';
import { disposeBuilding } from '@/assets/procedural/houses';
import { MaterialLibrary } from '@/assets/MaterialLibrary';
import { GameRenderer } from '@/game/Renderer';

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
    .town-review-canvas{width:100%;aspect-ratio:1}.town-review canvas{display:block;width:100%;height:100%}
    .town-review button,.town-review a{display:inline-block;padding:7px 12px;margin:4px 5px 4px 0;border:1px solid #65483c;border-radius:3px;background:#f4ebd9;color:#302c36;font:inherit;text-decoration:none;cursor:pointer}
    .town-review [aria-pressed=true]{background:#59845a;color:white}
    @media(max-width:700px){.town-review{padding:16px}.town-review-grid{grid-template-columns:1fr}}
    </style><main class="town-review"><header><h1>Town Center · review satu bangunan</h1>
    <p>Bandingkan siluet, pasangan batu, rangka kayu, jendela atap, jerami dan banner. Bangunan lain menunggu review kamu.</p>
    <a href="./">Lihat di dalam game</a></header><div class="town-review-grid">
    <article><h2>Master Stitch asli</h2><svg viewBox="20 0 360 365" role="img" aria-label="Master Town Center asli dari Stitch">
    <image href="${source}" width="1376" height="768"/></svg><p>Potongan tampilan dari master asli; gambar sumber tidak diubah.</p></article>
    <article><h2>Model 3D yang dipasang ke game</h2><div class="town-review-canvas"></div>
    <div><button data-view="reference" aria-pressed="true">Sudut Stitch</button><button data-view="game" aria-pressed="false">Sudut game</button><button data-turn="1">Putar 90°</button></div>
    <p>Model tetap tiga dimensi. Tombol hanya mengubah sudut inspeksi.</p></article></div>
    <footer><p>Fokus saat ini hanya Town Center. Karakter, terrain, HUD game dan bangunan lain tidak diubah pada perbaikan ini.</p></footer></main>`;
  const canvas = root.querySelector<HTMLElement>('.town-review-canvas')!;
  const renderer = new GameRenderer(canvas), scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe7dabc);
  const camera = new THREE.OrthographicCamera(-3.65, 3.65, 3.65, -3.65, 0.1, 100);
  const target = new THREE.Vector3(0, 2.25, -0.10);
  camera.position.copy(target).add(new THREE.Vector3(12, 12, 12)); camera.lookAt(target);
  const model = BuildingFactory.createBuildingMesh('town_center', 1, 42);
  scene.add(model); model.rotation.y = Math.PI / 2;
  const abort = new AbortController(); let disposed = false;
  const render = () => {
    if (disposed) return;
    renderer.resize(); renderer.render(scene, camera);
  };
  const resize = new ResizeObserver(render); resize.observe(canvas);
  root.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!button) return;
    if (button.dataset.view) model.rotation.y = button.dataset.view === 'reference' ? Math.PI / 2 : 0;
    if (button.dataset.turn) model.rotation.y += Math.PI / 2;
    for (const view of root.querySelectorAll<HTMLButtonElement>('[data-view]')) {
      view.setAttribute('aria-pressed', String(!button.dataset.turn && view === button));
    }
    render();
  }, { signal: abort.signal });
  const cleanup = () => {
    if (disposed) return;
    disposed = true; resize.disconnect(); abort.abort();
    disposeBuilding(model); MaterialLibrary.getInstance().dispose(); renderer.dispose();
  };
  window.addEventListener('pagehide', event => { if (!event.persisted) cleanup(); }, { signal: abort.signal });
  window.addEventListener('pageshow', render, { signal: abort.signal });
  render();
  const reference = new Image(); reference.src = source;
  await reference.decode();
  if (!disposed) root.dataset.townReviewReady = 'true';
}
