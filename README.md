# Civilization Town

Pengembangan bertahap dari Little City Stories menjadi Ancient Settlement dengan TypeScript, Vite, vanilla Three.js, dan Zustand vanilla.

## Status: M2 — Asset Pipeline

- Pipeline Pillow lokal dengan palet warm earth 28 warna: 3 tekstur seamless, 19 ikon resource/UI/katalog/teknologi, dan atlas warga 224 frame.
- Delapan factory model kuno: Town Center, Primitive House, Farm, Lumber Camp, Stone Quarry, Storage Hut, Research Hut, dan Dirt Road; lima jenis environment: tree, bush, rock, grass decoration, crop.
- Empat profesi, empat arah NE/NW/SE/SW, idle 2 frame, walk 6 frame, serta 6 frame harvest/chop/build/work. Target 32×32 dengan anchor kaki (16,30), alpha biner dan nearest filtering.
- Loader texture cache, geometri model dengan reference counting, material bersama dan clone material milik ghost preview. Animator menerima waktu simulasi; tidak menentukan pekerjaan warga.
- Galeri pemeriksaan khusus development: [http://localhost:3000/?assets=1](http://localhost:3000/?assets=1). Tombol pose/pause hanya memeriksa animasi aset; tidak membuat warga domain.
- Empat skill lokal di `.agents/skills/` memandu engine, ekonomi, aset procedural, dan playtesting sesuai batas milestone.

Fondasi M1 tetap tersedia:

- Dunia grassland seeded dengan default 32×32 tile, cell size 2, pohon/batu/semak, serta area awal yang bersih. Dunia yang sama dapat dibuat ulang dari config dan seed yang sama.
- Konfigurasi di `src/config/WorldConfig.ts`: ukuran dunia 12–128 tile, seed uint32, kepadatan environment, populasi awal, dan empat resource awal. Batas minimum menyediakan ruang starter dan dua sumber awal. Grid math mandiri juga mendukung grid lebih kecil.
- Fixed tick 100 ms dengan pause/1×/2×, maksimum 20 tick per pump, dan sisa waktu tetap disimpan. Scheduler terpisah dari render. Tab tersembunyi menghentikan simulasi; waktu tersembunyi tidak dihitung saat kembali.
- Session headless dengan snapshot immutable; renderer memproyeksikan data ke grup terrain, roads, buildings, vegetation, citizens, effects, dan selection.
- Kamera mengikuti ukuran dunia, mempertahankan pan/zoom. Rotasi view dinonaktifkan selama MVP.
- Unit test dan smoke test browser mencakup determinisme, clock, lifecycle, snapshot, rendering, kamera, placement, dan demolisi.

Game utama masih menggunakan katalog modern 12 bangunan dan treasury $10,000 sebagai adapter transisi. Sumber data bangunan/treasury tetap di store lama; grid dimiliki oleh session. Cutover inventory, katalog kuno aktif, dan bootstrap Town Center dilakukan pada M3. Model Town Center sudah ada di galeri M2. Nilai awal 3 warga dan resource 160 wood / 100 stone / 90 food / 50 coins masih berupa konfigurasi. Warga domain, ekonomi, riset, dan save/load mengikuti milestone berikutnya. Tiga rumah contoh tidak lagi muncul.

Rencana lengkap: [Implementation plan](docs/superpowers/plans/2026-10-15-civilization-town-mvp.md). Catatan verifikasi: [M1](docs/progress/m1-foundation.md), [M2](docs/progress/m2-assets.md).

## Menjalankan proyek

Gunakan Node.js **22.12+ pada jalur 22, 24.x, atau 26+** (sesuai engine Vitest 5) dan npm. Node 18/20 tidak didukung oleh tooling pengujian saat ini.

```powershell
npm.cmd ci
npm.cmd run dev
```

Buka [http://localhost:3000](http://localhost:3000). Pada shell non-Windows, gunakan `npm` sebagai pengganti `npm.cmd`.

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

Build menjalankan TypeScript strict sebelum bundling. Peringatan ukuran chunk Three.js dicatat sebagai baseline; optimasi bundle/profiling tetap milik milestone berikutnya.

## Browser smoke test

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Alternatif jika Chrome lokal sudah tersedia:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd run test:e2e
npm.cmd run test:e2e:production
```

Playwright membuat profil browser terpisah, menjalankan dev server mode `test` pada port 3100, dan memakai software WebGL untuk smoke test. Tes production membangun bundle lalu menjalankan preview port 3101 untuk memastikan canvas tampil tanpa test hook. Port yang digunakan harus kosong. Screenshot tersimpan di `test-results/m1-foundation.png`; trace kegagalan disimpan di `test-results/`.

Mode `test` saja mengekspos `window.__CIV_TOWN_TEST__`: snapshot, command terrain, manual stepping, konversi grid ke layar, dan inspeksi kamera. `/?manual=1` mematikan scheduler hanya pada mode ini. Development biasa dan production tidak mengekspos hook; parameter manual diabaikan pada keduanya.

## Reproduksi aset

Gunakan Python 3.12+ dengan executable nyata; alias WindowsApps `python` mungkin belum menunjuk instalasi Python. Runtime Python/Pillow bawaan Codex juga dapat digunakan. Untuk checkout bersih dengan Python tersedia:

```powershell
python -m pip install -r tools/assets/requirements.txt
python tools/assets/generate_assets.py --seed 42 --output public/generated
python tools/assets/validate_assets.py --input public/generated
python -m unittest discover -s tests/assets
npm.cmd test
npm.cmd run build
```

PNG dan manifest di `public/generated/` disertakan dalam repository sehingga menjalankan game tidak memerlukan Python. Edit generator/palet, kemudian regenerasi seluruh output; jangan menggambar ulang PNG secara manual. Manifest mencatat seed, versi, palette hash, file hash, dimensi dan atlas metadata tanpa timestamp atau path mesin. Seed identik menghasilkan file identik. Validator memeriksa file wajib, alpha/palet/dimensi, batas frame, anchor dan hash. Texture terrain merupakan patch warna seamless; ukuran patch visual tidak mengubah grid logis.

## Kontrol saat ini

| Input | Aksi |
|---|---|
| Klik kiri | Pasang bangunan / demolisi sesuai tool aktif |
| Drag kanan atau tengah | Pan kamera |
| Shift/Alt + drag kiri | Alternatif pan |
| Scroll / tombol + dan − | Zoom |
| R | Putar footprint bangunan |
| 1–4 | Pilih house, road, shop, park |
| B | Toggle demolisi |
| Escape | Batalkan tool |

Penanganan drag/cancel dan touch yang lengkap dijadwalkan pada Task 9. Kontrol pause/speed final dijadwalkan pada M7; engine waktunya sudah tersedia.

## Batas modul

| Lokasi | Tanggung jawab |
|---|---|
| `src/config/` | Konfigurasi dan nilai awal |
| `src/simulation/` | PRNG, clock, session, command dan plain state; tanpa Three.js/DOM/Zustand |
| `src/world/GridMath.ts`, `GridSystem.ts`, `WorldGenerator.ts` | Grid logis dan generation |
| `src/utils/coordinates.ts` | Adapter plain position ke Three.js Vector3 |
| `src/game/` | Scheduler, rendering, pencahayaan, dan rekonsiliasi snapshot |
| `src/world/CameraController.ts`, `GridRenderer.ts`, `RaycastSystem.ts`, `PlacementSystem.ts` | Kamera, presentasi grid dan adapter interaksi lama |
| `src/assets/` | Factory procedural dan material cache |
| `src/state/`, `src/ui/` | Snapshot presentasi, state UI dan adapter construction transisi |
| `src/citizens/types.ts`, `src/economy/types.ts` | Kontrak data untuk milestone selanjutnya |
| `src/testing/`, `tests/` | Hook khusus mode test, unit/integration test dan Playwright |

Pengembangan berhenti setelah verifikasi M2 sampai pengguna meminta melanjutkan. Berikutnya M3 konstruksi/resource; M4 ekonomi; M5 warga dan navigasi; M6 riset; M7 persistence/HUD; M8 playtest dan polish.
