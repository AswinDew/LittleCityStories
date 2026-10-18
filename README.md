# Civilization Town

Pengembangan bertahap dari Little City Stories menjadi Ancient Settlement dengan TypeScript, Vite, vanilla Three.js, dan Zustand vanilla.

## Status: M5 — Population

- Tiga warga nyata dengan nama/ID seeded, home awal Town Center dan spawn pada tile walkable. Housing dialokasikan stabil; kehilangan rumah tidak menghapus warga.
- Warga tanpa pekerjaan menjadi satu builder per site. Inspector menyediakan assignment/unassign pekerja nyata dengan batas slot dan pekerjaan eksklusif; farmer, lumberjack dan pekerja quarry berjalan sebelum menghasilkan resource.
- A* empat arah memilih road cost 1 versus grass/dirt 2, memakai tie-break deterministik dan cache berdasarkan revision dunia. Jalan, bangunan, clearing dan terrain menginvalidasi rute ketika walkability/cost berubah; warga tidak teleport saat unassign, jalur gagal atau tujuan berubah.
- Aktivitas navigate → work → return → idle berjalan pada fixed tick: 1 tile/detik, shift kerja 60 detik, istirahat home 10 detik. Builder pulang setelah site selesai. Source/storage/access blocker menghentikan animasi kerja dan output, lalu pulih saat syarat kembali valid. Warga lapar memiliki produktivitas 50%, termasuk builder.
- Sprite atlas kini menjadi plane vertikal dengan anchor kaki, nearest filtering, alpha test dan depth test/write; tidak selalu tampil di depan bangunan. Posisi diinterpolasi dari snapshot; pause menghentikan waktu animasi. Resource/geometry/texture clone milik sprite dilepas saat view dihapus.
- Bangunan terbentuk bertahap dari fondasi, rangka, dinding hingga atap berdasarkan kredit kerja nyata. Komponen tumbuh terus tanpa mengganti seluruh model saat selesai; scaffold dilepas setelah konstruksi selesai.
- Warga melewati pintu menuju posisi kerja di dalam footprint: petani mencangkul/menyiram, penebang mengayun kapak, penambang memakai beliung, peneliti membaca/menulis, dan builder memukul palu. Dua slot produksi memakai posisi berbeda. Research Hut membuka dinding yang menghadap kamera saat digunakan agar interior terlihat, termasuk saat bangunan diputar.
- Setelah bekerja, warga berjalan masuk melalui pintu rumah/Town Center, tersembunyi selama beristirahat, lalu keluar sebelum berangkat lagi. Pergantian pekerjaan dan demolisi mempertahankan gerak yang kontinu; jalur evakuasi tetap direservasi sampai warga keluar.
- Happiness mengikuti hunger/housing/employment. Satu pendatang muncul setelah 1200 tick berturut-turut dengan housing kosong, happiness ≥60 dan food untuk dua kali makan populasi setelah pendatang masuk. Counter reset saat syarat gagal; tanpa tile spawn, growth menunggu tanpa crash.

Ekonomi M4 tetap tersedia:

- Produksi Farm/Lumber Camp/Quarry berjalan pada fixed tick dan memerlukan ID warga, assignment, kedatangan, aktivitas/animasi kerja, serta akses kerja yang valid. Batas dua slot, sumber tree/rock dalam radius 3 dari footprint, dan modifier produktivitas dihitung di domain.
- Kredit kerja integer tersimpan per warga; lapar mengurangi produktivitas menjadi 50%. Batch hasil atomik menunggu jika storage penuh, dibatasi satu batch per pekerja tanpa penumpukan hasil selama terblokir.
- Setiap 600 tick, warga makan 1 food menurut urutan ID stabil. Warga yang mendapat makan dan slot rumah completed menghasilkan 1 coin; coin storage penuh melewatkan pajak tersebut tanpa utang pajak. Inventory tidak pernah dipotong menjadi negatif.
- Kapasitas dihitung dari Town Center dan storage completed. Demolisi/refund mempertahankan inventory berlebih; produksi resource terkait menunggu ruang yang cukup. Konsumsi dan biaya pembangunan tetap dapat mengurangi inventory berlebih.
- Inspector menampilkan alasan operasional: menunggu konstruksi/pekerja, akses belum valid, sumber hilang, storage penuh, atau bekerja. Produksi kini dihubungkan ke warga M5 yang benar-benar sudah tiba dan bekerja.

Konstruksi M3 tetap tersedia:

- Katalog kuno aktif dengan kategori Housing, Production, Infrastructure, dan Community. Satu Town Center selesai muncul saat awal.
- Session menjadi pemilik tunggal resources, capacity, grid, dan building instances. Store hanya menyimpan snapshot presentasi, tool, selection, dan feedback; treasury lama sudah dilepas.
- Resource awal: wood 160, stone 100, food 90, coins 50. Biaya dipotong atomik setelah validasi footprint, terrain/environment, tile warga, entrance, rotasi, unlock, dan kemampuan membayar.
- House/Farm/Camp/Quarry/Storage/Research menjadi site planned dengan scaffold. Progres memerlukan builder yang benar-benar ditugaskan, berada di posisi kerja dalam site, dan aktif bekerja. M5 menghubungkan warga nyata; tidak ada progres konstruksi dari timer palsu.
- Dirt Road selesai instan dengan biaya 1 stone. Cancel/demolish planned mengembalikan seluruh biaya; under construction/completed mengembalikan setengah biaya yang dibayar, dibulatkan ke bawah. Town Center dilindungi. Resource berlebih tetap disimpan saat capacity berkurang atau menerima refund.
- Ghost/footprint hijau-merah, rotasi, resource bar, alasan penolakan, clear vegetation tanpa hasil gratis, selection dan inspector sudah terhubung ke command nyata. Pointer intent menolak drag, modified/right click, pointercancel, orphan pointerup dan klik HUD.

Aset M2 tetap tersedia:

- Pipeline Pillow lokal dengan palet warm earth 28 warna: 3 tekstur seamless, 19 ikon resource/UI/katalog/teknologi, dan atlas warga 312 frame.
- Delapan factory model kuno: Town Center, Primitive House, Farm, Lumber Camp, Stone Quarry, Storage Hut, Research Hut, dan Dirt Road; lima jenis environment: tree, bush, rock, grass decoration, crop.
- Empat profesi, empat arah NE/NW/SE/SW, idle 2 frame, walk 6 frame, harvest/chop/build/work/water 6 frame, serta mine/research 8 frame dengan tempo berbeda. Target 32×32 dengan anchor kaki (16,30), alpha biner dan nearest filtering.
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

Katalog modern sudah tidak aktif. Generator model lama dipertahankan sebagai kode aset terpisah beserta tesnya. Aturan konstruksi/ekonomi/warga sudah terhubung ke session. Riset mengikuti M6 dan save/load M7. Fixture pekerja tetap hanya digunakan dalam tes headless; browser playtest memakai warga yang di-bootstrap dan ditugaskan melalui gameplay.

Rencana lengkap: [Implementation plan](docs/superpowers/plans/2026-10-15-civilization-town-mvp.md). Catatan verifikasi: [M1](docs/progress/m1-foundation.md), [M2](docs/progress/m2-assets.md), [M3](docs/progress/m3-construction.md), [M4](docs/progress/m4-economy.md), [M5](docs/progress/m5-population.md).

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
| Klik kiri | Pasang bangunan / demolisi / clear sesuai tool; idle memilih bangunan |
| Drag kanan atau tengah | Pan kamera |
| Shift/Alt + drag kiri | Alternatif pan |
| Scroll / tombol + dan − | Zoom |
| R | Putar footprint bangunan |
| 1–4 | Pilih Primitive House, Dirt Road, Farm, Lumber Camp |
| B | Toggle demolisi |
| C | Toggle clear vegetation (tanpa resource gain) |
| Escape | Batalkan tool |
| Inspector workplace | Pilih warga tersedia → Assign worker; Unassign untuk melepas pekerjaan |

Gesture placement memiliki ambang travel 4 CSS px dan hanya menerima primary pointer yang dimulai/diakhiri di playfield. Kontrol pause/speed final serta polish layout/accessibility lebih lanjut mengikuti M7; engine waktunya sudah tersedia. Tidak ada save/load pada M5.

## Batas modul

| Lokasi | Tanggung jawab |
|---|---|
| `src/config/` | Konfigurasi dan nilai awal |
| `src/simulation/` | PRNG, clock, session, command dan plain state; tanpa Three.js/DOM/Zustand |
| `src/world/GridMath.ts`, `GridSystem.ts`, `WorldGenerator.ts` | Grid logis dan generation |
| `src/utils/coordinates.ts` | Adapter plain position ke Three.js Vector3 |
| `src/game/` | Scheduler, rendering, pencahayaan, dan rekonsiliasi snapshot |
| `src/world/CameraController.ts`, `GridRenderer.ts`, `RaycastSystem.ts`, `PlacementSystem.ts`, `PointerIntent.ts` | Kamera, presentasi grid, pointer gesture, command placement dan selection |
| `src/construction/` | Layout/entrance, validasi domain, transaksi konstruksi dan view scaffold |
| `src/assets/` | Factory procedural dan material cache |
| `src/state/`, `src/ui/` | Snapshot presentasi dan state UI tanpa inventory/bangunan mutable kedua |
| `src/economy/`, `src/config/BalanceConfig.ts` | Ledger atomik, produksi/operating status, konsumsi/pajak, kapasitas dan balancing |
| `src/citizens/` | Identitas, housing, assignment, aktivitas, growth dan renderer warga |
| `src/testing/`, `tests/` | Hook khusus mode test, unit/integration test dan Playwright |

Perbaikan animasi dan kehadiran warga setelah M5 dicatat di [Living settlement](docs/progress/2026-10-18-living-settlement.md). Pengembangan berhenti setelah verifikasi sampai pengguna meminta melanjutkan. Berikutnya M6 riset; M7 persistence/HUD; M8 playtest dan polish.
