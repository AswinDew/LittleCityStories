# Civilization Town — Ancient Settlement MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Delegasi tidak diaktifkan oleh dokumen ini; gunakan subagent hanya jika kelak diizinkan secara eksplisit.

**Goal:** Melanjutkan Little City Stories menjadi Civilization Town, game browser Ancient Settlement dengan konstruksi, ekonomi, warga pixel art, riset, serta save/load yang benar-benar berfungsi.

**Architecture:** Pertahankan TypeScript/Vite/vanilla Three.js dan fondasi rendering yang ada. Tambahkan simulasi deterministik tanpa ketergantungan Three.js/DOM, lalu hubungkan snapshot simulasi ke renderer dan Zustand vanilla untuk presentasi UI. Seluruh aset esensial dihasilkan oleh kode lokal.

**Tech Stack:** TypeScript strict, Three.js, Vite, Zustand vanilla, HTML/CSS, Python 3 + Pillow, IndexedDB native, Vitest, dan Playwright.

**Spec:** Dokumen pengguna “CIVILIZATION TOWN — MASTER DEVELOPMENT PROMPT V2”, sumber: `C:/Users/ROG/.codex/attachments/3cee12ae-5ee0-4225-9ecd-37cb8c69b672/Pasted text.txt`.

**Status (2026-10-17):** M1–M3 / Task 1–9 telah diimplementasikan, diverifikasi, dan direview. M4–M8 belum dijalankan. Berhenti sampai pengguna meminta lanjut. Bukti pemeriksaan dan keputusan transisi dicatat di `docs/progress/m1-foundation.md`, `docs/progress/m2-assets.md`, dan `docs/progress/m3-construction.md`.

## Global Constraints

- “TypeScript with strict mode”; “Prefer Vanilla Three.js for rendering.”
- “All essential game assets must be generated through local code.”
- “Use a deterministic simulation tick.”; “Do not couple production timing to requestAnimationFrame.”
- “Deduct resources atomically when construction succeeds.”; “Do not deduct resources when construction fails.”
- “Do not serialize Three.js meshes or rendering objects.”; “Serialize plain simulation data.”
- “Never invent successful validation results.”
- Tidak menambahkan React/R3F, Phaser, Babylon.js, backend, autentikasi, layanan berbayar wajib, atau marketplace aset wajib.
- Hanya Ancient Settlement MVP: tanpa combat, multiplayer, diplomasi, era medieval/industrial/modern, dunia tak terbatas, atau skeletal animation.
- Target awal 32×32 tile, 3 warga, satu Town Center; seluruh nilai awal dapat dikonfigurasi.
- Delapan milestone berikut merupakan urutan implementasi. Kemajuan ke milestone berikutnya memerlukan pemeriksaan yang relevan lulus dan isu kritis terselesaikan.

## Review Focus

1. Interaksi pointer: drag kamera, pointer cancel, dan klik HUD tidak boleh membangun atau membongkar secara tidak sengaja. Pemilik: Task 9 dan 20.
2. Dunia berubah saat warga berjalan/bekerja: jalan, rumah, tempat kerja, atau sumber bahan hilang tidak boleh meninggalkan assignment yatim atau produksi palsu. Pemilik: Task 13–15.
3. Pause, speed, frame rate, tab tidak aktif, serta load tidak boleh menggandakan atau menghilangkan tick produksi/konsumsi. Pemilik: Task 2, 11, dan 19.
4. Save terpotong, versi terlalu baru, ID duplikat, referensi hilang, serta angka tidak valid harus ditolak tanpa merusak sesi aktif. Pemilik: Task 18–19.
5. Demolisi storage dan refund ketika gudang penuh tidak boleh menghilangkan barang, menciptakan sumber daya, atau menghasilkan angka negatif. Pemilik: Task 7–8 dan 11.

## 1. Baseline dan strategi melanjutkan proyek

Baseline dari pembacaan kode dan verifikasi pada giliran sebelumnya: 44 tes di 10 file lulus dan `tsc --noEmit` lulus. Ini catatan historis, bukan hasil pemeriksaan baru untuk rencana ini. Belum ada hasil Playwright, profiling, atau pengujian visual yang dapat diklaim.

| Sistem sekarang | Strategi |
|---|---|
| `src/game/Renderer.ts`, `Lighting.ts` | Pertahankan; ubah hanya konfigurasi yang diperlukan oleh dunia lebih besar dan pixel art. |
| `CameraController.ts` | Pertahankan pan/zoom/damping; jadikan batas kamera mengikuti konfigurasi peta. Rotasi kamera disembunyikan pada MVP. |
| Grid 20×20 dan konstanta koordinat global | Generalisasikan menjadi konfigurasi grid 32×32 tanpa mencampur ukuran logis dan ukuran visual. |
| `PlacementSystem.ts` | Pertahankan ghost/snap/rotasi footprint; pindahkan mutasi domain ke command simulasi. |
| `GameStore.ts`: treasury dan placedBuildings | Ganti treasury menjadi inventory empat sumber daya; store menyajikan snapshot simulasi dan state UI. |
| `BuildingRegistry.ts` dan `BuildingFactory.ts` | Pertahankan pemisahan katalog data dan mesh; ganti katalog aktif menjadi bangunan kuno. |
| `assets/procedural/` dan `MaterialLibrary.ts` | Gunakan kembali komponen geometri yang cocok; tambahkan palet/tekstur/bangunan kuno. |
| `HUD.ts` | Pisahkan panel berdasarkan tanggung jawab ketika menambah resource bar, inspector, riset, dan kontrol sesi. |
| Tes placement/demolition yang sebagian meniru langkah manual | Tambahkan tes melalui command/domain system yang benar-benar dipakai game. Jangan hanya menguji perhitungan tiruan. |

Pilih migrasi bertahap dalam repository yang sama. Tidak membuat proyek baru, tidak mengganti engine, dan tidak melakukan upgrade dependency besar tanpa kebutuhan yang terukur. Nama tampilan menjadi **Civilization Town**; rename folder repository tidak diperlukan.

## 2. Keputusan arsitektur untuk implementasi

### 2.1 Batas modul dan kepemilikan data

- `src/config/`: konfigurasi dunia dan balancing dalam data TypeScript.
- `src/simulation/`: tipe domain, PRNG, clock, session, command dispatcher, dan urutan tick. Tidak mengimpor Three.js, DOM, atau Zustand.
- `src/world/`: grid logis, occupancy, world generation, navigasi, serta adapter raycast/grid renderer. Modul logis menggunakan koordinat plain object; konversi ke `Vector3` tetap di sisi rendering.
- `src/construction/`, `src/economy/`, `src/citizens/`, `src/technology/`: aturan domain masing-masing; render warga dipisahkan dari state machine warga.
- `src/assets/`: factory dan cache aset Three.js; `tools/assets/` untuk generator Python; `public/generated/` untuk PNG/atlas/manifest hasil generator.
- `src/persistence/`: schema, validasi, IndexedDB, dan lifecycle save/load.
- `src/ui/`: DOM/CSS dan command pengguna. UI tidak langsung mengubah inventory, occupancy, warga, atau status riset.

`SimulationState` menjadi sumber kebenaran untuk seed/PRNG, grid dan environment, bangunan, inventory, warga, assignment, riset, serta tick. `SimulationSession` memiliki state tersebut. GridSystem beroperasi pada data grid yang dimiliki sesi; tidak ada grid kedua yang disinkronkan manual. Renderer menyimpan mesh menurut ID domain dan hanya merekonsiliasi snapshot.

Kontrak bersama yang ditetapkan oleh task pemiliknya:

| Kontrak | Pemilik | Konsumen |
|---|---|---|
| `GridMetrics = { size: number; cellSize: number }`; `GridCoord = { x: number; z: number }` | Task 1 | Dunia, placement, renderer, navigasi |
| `SimulationSession.dispatch(command: GameCommand): CommandResult` | Task 3 | Placement, HUD, test hooks |
| `SimulationSession.step(ticks: number): void`; `getSnapshot(): Readonly<SimulationState>` | Task 2–3 | Clock, renderer, persistence, tes |
| `CommandResult = { ok: true } \| { ok: false; reason: CommandFailure }` | Task 3 | UI dan tes; reason terstruktur, bukan parsing teks |
| `ResourceId = 'wood' \| 'stone' \| 'food' \| 'coins'`; `ResourceBundle = Record<ResourceId, number>` | Tipe: Task 1; ledger: Task 7 | Konstruksi, ekonomi, riset, persistence |
| `findPath(grid: NavigationGrid, start: GridCoord, goal: GridCoord): GridCoord[] \| null` | Task 13 | Warga dan validasi akses |
| `SaveRepository.save(slotId: string, data: SaveGameV1): Promise<void>`; `load(slotId: string): Promise<SaveGameV1 \| null>` | Task 18 | Kontrol sesi dan autosave |

Command union bertambah sesuai milestone: `placeBuilding`, `cancelConstruction`, `demolishBuilding`, `placeRoad`, `clearEnvironment`, `assignWorker`, `unassignWorker`, `startResearch`, dan `upgradeBuilding`. Semua ID, angka, footprint, dan prasyarat divalidasi di dispatcher/domain system; validasi ghost UI bukan pengaman utama.

### 2.2 Waktu, determinisme, dan rendering

- Fixed tick **100 ms / 10 Hz**, speed **pause, 1×, 2×**. Semua durasi domain disimpan sebagai jumlah tick integer.
- Scheduler monotonic berbasis `performance.now()` memompa accumulator; `requestAnimationFrame` hanya memperbarui kamera/presentasi dan menggambar. Simulasi juga dapat dijalankan headless melalui `step(ticks)`.
- Batasi catch-up menjadi 20 tick per callback dan simpan utang accumulator untuk callback berikutnya. Jangan membuang waktu simulasi diam-diam.
- Tab tersembunyi otomatis menangguhkan simulasi; saat kembali, reset baseline clock. MVP tidak melakukan offline progression. Pertahankan preferensi pause pengguna sehingga tab terlihat tidak otomatis melanjutkan game yang sebelumnya dipause.
- Urutan tick tetap: navigasi/aktivitas → konstruksi → produksi → konsumsi/pajak saat jatuh tempo → riset → happiness/growth. Urutan iterasi entity memakai ID stabil.
- Command diproses sinkron di antara tick, dengan urutan pemanggilan yang tercatat; tidak ada perubahan domain dari callback render. Seed, counter ID, dan PRNG state ikut save.
- Interpolasi visual tidak mengubah posisi domain. Status kerja dan animasi mengambil sumber yang sama.
- Durasi frame sprite boleh memakai milidetik/FPS karena merupakan presentasi; waktu animasi diturunkan dari waktu simulasi ditambah interpolasi, dan berhenti saat pause. Timer ekonomi/konstruksi/riset tetap tick integer.

### 2.3 Aturan gameplay usulan

Angka berikut **usulan balancing awal**, bukan angka yang ditetapkan master prompt. Simpan terpusat dan ubah berdasarkan playtest.

| Parameter | Usulan awal |
|---|---|
| Dunia | 32×32, cell size 2 world unit, grassland, seed dapat diisi pengguna |
| Awal permainan | Town Center selesai, 3 warga, wood 160, stone 100, food 90, coins 50 |
| Penyimpanan | Town Center menyediakan kapasitas 300 **per jenis resource**; Storage Hut selesai menambah 300 per jenis |
| Tempat tinggal awal | Town Center menampung 3 warga; Primitive House menambah kapasitas 4 |
| Produksi per pekerja aktif | Lumber Camp 2 wood/10 detik; Quarry 1 stone/10 detik; Farm 3 food/10 detik |
| Konsumsi | 1 food/warga/60 detik, urutan pembagian stabil ketika makanan terbatas |
| Coins | Pajak 1 coin/warga yang mendapat makan dan tempat tinggal per 60 detik; belum ada upkeep berkala pada MVP |
| Pertumbuhan | Maksimum 1 pendatang/120 detik jika housing kosong, happiness ≥60, dan tersedia food untuk dua kali makan seluruh populasi setelah pendatang masuk |
| Kekurangan makanan | Hentikan pertumbuhan dan turunkan produktivitas warga lapar menjadi 50%; tanpa kematian permanen pada MVP |
| Happiness | `clamp(70 - 40*hungryFraction - 20*homelessFraction + 10*employedFraction, 0, 100)` |
| Jalur | A* empat arah; grass/dirt cost 2 dan road cost 1; bangunan, pohon, serta batu memblokir. Jalan membantu rute, tetapi bukan syarat awal bergerak. |
| Sumber ekstraksi | Camp/quarry memerlukan tree/rock dalam radius 3 tile dari footprint; sumber tidak habis pada MVP. Clearing sumber dapat menghentikan produksi. |
| Konstruksi | Satu pekerja per site; warga unemployed otomatis dapat menjadi builder. Progres hanya ketika builder benar-benar tiba dan bekerja. |
| Pembongkaran | Town Center dilindungi; cancel planned mengembalikan 100%, under construction/completed mengembalikan 50% resource yang benar-benar dibayar, dibulatkan ke bawah per resource |

Jika kapasitas storage turun di bawah inventory atau refund melampaui kapasitas, pertahankan barang yang sudah dimiliki dan tampilkan status over-capacity. Tolak penambahan hasil produksi pada resource yang tidak memiliki ruang; konsumsi/pembangunan tetap dapat menguranginya. Jangan menghapus barang atau membuat kapasitas negatif.

Produksi menggunakan accumulator kerja integer dan menyimpan remainder untuk modifier 50%. Hasil satu batch ditambahkan atomik; jika tidak cukup ruang, tahan batch pada status storage-full, tanpa menimbun hasil tak terbatas.

Usulan katalog aktif; biaya ditulis sebagai **wood/stone/food/coins**, waktu sebagai detik kerja satu builder:

| Bangunan | Footprint | Biaya | Kerja | Fungsi |
|---|---|---|---|---|
| Town Center | 3×3 | Starter; tidak dapat dibeli ulang pada MVP | Selesai saat awal | Housing awal, storage dasar, pajak |
| Primitive House | 1×1 | 30/10/0/0 | 15 | +4 housing |
| Farm | 2×2 | 40/0/0/0 | 20 | 2 slot farmer; produksi food |
| Lumber Camp | 2×2 | 35/5/0/0 | 20 | 2 slot lumberjack; produksi wood |
| Stone Quarry | 2×2 | 40/10/0/0 | 25 | 2 slot pekerja; produksi stone |
| Storage Hut | 2×2 | 50/20/0/0 | 25 | Menambah kapasitas storage setelah selesai |
| Research Hut | 2×2 | 60/30/0/10 | 30 | 1 slot researcher; membuka panel riset aktif |
| Dirt Road | 1×1 | 0/1/0/0 | Instan | Tile infrastruktur; tanpa builder |

Setiap definisi memiliki entrance/work point walkable di luar footprint dan transformasi entrance mengikuti rotasi. World generator menjamin area Town Center dan entrance bersih, ruang ekspansi awal, serta tree/rock yang bisa dijangkau. Tidak menempatkan warga di dalam mesh/footprint.

Untuk bootstrap, Town Center menjadi home sampai house tersedia. Assignment kerja manual tidak boleh mencuri warga yang sedang menjadi builder; UI menyediakan unassign terlebih dahulu. Quarry/research menggunakan occupation villager dengan variasi aktivitas kerja generik; empat keluarga sprite wajib tetap Villager, Farmer, Lumberjack, dan Builder.

## 3. Roadmap dan dependensi

| Milestone | Task | Hasil yang bisa ditinjau | Prasyarat |
|---|---|---|---|
| M1 Foundation | 1–3 | Dunia configurable, seed, clock/domain boundary | Baseline |
| M2 Asset Pipeline | 4–6 | Aset kuno dan warga pixel art tervalidasi | M1 |
| M3 Construction | 7–9 | Konstruksi berbasis resource dan menu minimal | M1–M2 |
| M4 Economy | 10–11 | Aturan produksi, konsumsi, storage, dan operating status | M3 |
| M5 Population | 12–15 | 3 warga nyata, A*, pekerjaan, animasi, growth | M2–M4 |
| M6 Technology | 16–17 | Tiga teknologi dan efek mekanik nyata | M5 |
| M7 Persistence & UI | 18–20 | IndexedDB, lifecycle sesi, HUD lengkap | M6 |
| M8 Polish & QA | 21–23 | Playtest loop penuh, profiling, build siap dimainkan | M7 |

M3–M4 menyediakan domain API dan tes headless, tetapi tidak memakai pekerja palsu pada game. Site menunggu builder dan produksi menunggu warga aktif sampai M5 terhubung. Engine pause/speed dibuat sejak M1; tombol final dan penyempurnaan UX diselesaikan pada M7. Browser smoke test mulai M1, bukan menunggu M8.

Migrasi state dilakukan bertahap: Task 3 memperkenalkan kontrak session/bridge dan schema plain data; pemindahan authoritative gameplay state dan semua consumer legacy diselesaikan bersama Task 7–9. Selama transisi, jangan memelihara dua inventory atau dua daftar bangunan yang dapat dimutasi. API lama yang masih dipakai harus menjadi adapter ke owner yang sama, kemudian dilepas setelah konsumen dan tesnya dimigrasikan. Setiap task wajib tetap typecheck dan lulus tes relevan sebelum lanjut.

## 4. Cara mengerjakan task ketika implementasi diizinkan

- Untuk tiap task: tulis tes perilaku → pastikan gagal karena perilaku belum ada → implementasi minimum → jalankan tes terkait serta typecheck. Langkah implementasi di bawah mencakup siklus ini, bukan izin untuk mengerjakannya sekarang.
- Contoh assertion dalam task merupakan kontrak tes yang akan ditulis, bukan kode yang telah ditambahkan.
- Perubahan data/model harus memperbarui konsumen dan tes pada task yang sama. Tes lama yang masih relevan dipertahankan; ekspektasi 20×20 diubah hanya ketika menguji default, lalu tetap tambah kasus konfigurasi 20×20.
- Pada akhir setiap milestone: jalankan suite penuh, `npm.cmd run build`, browser smoke yang relevan, update README/catatan isu, dan tinjau diff. Commit atomik hanya pada fase eksekusi sesuai workflow yang diizinkan; tidak ada commit dalam pekerjaan planning ini.
- Gunakan skill three-js/pixel-art untuk task terkait, serta TDD/debugging/review/verification sesuai kebutuhan aktual. Jangan menyatakan skill telah dijalankan jika belum.

## M1 — Foundation

### Task 1 — Konfigurasi grid dan dunia seeded

**Files:** Buat `src/config/WorldConfig.ts`, `src/economy/types.ts`, `src/world/GridMath.ts`, `src/simulation/Random.ts`, `src/world/WorldGenerator.ts`; ubah `src/utils/coordinates.ts`, `src/world/GridSystem.ts`, `GridRenderer.ts`, `RaycastSystem.ts`, `CameraController.ts`, `src/game/Lighting.ts`; tes `tests/coordinates.test.ts`, `grid.test.ts`, `camera.test.ts`, `raycast.test.ts`, dan `tests/worldGeneration.test.ts`.

**Interfaces:** `WorldConfig` memuat metrics, seed, starting population/resources, dan parameter environment. `ResourceId`/`ResourceBundle` sejak task ini hanya tipe plain data, belum ledger. `generateWorld(config: WorldConfig): WorldData` menghasilkan plain data terrain/environment/starter area. `GridMath.ts` memiliki `GridCoord`, `Footprint`, bounds/occupied-cell helpers dan konversi X/Z plain data tanpa Three.js; `coordinates.ts` menjadi adapter Vector3 dan re-export yang menjaga import lama. Tambahkan metrics opsional sebagai argumen terakhir helper koordinat dan constructor visual; hentikan ketergantungan modul pada lebar peta global.

- [x] Tulis tes round-trip 20×20 dan 32×32, origin grid 32×32 dengan cell size 2, bounds dan footprint integer; assert `expect(cell00).toEqual({ x: -31, z: -31 })` pada hasil world X/Z, serta `expect(lastCell).toEqual({ x: 31, z: 31 })`.
- [x] Tulis tes seed: `expect(generateWorld(config)).toEqual(generateWorld(config))`; seed berbeda mengubah environment, tanpa menutup Town Center/entrance atau menghilangkan akses sumber awal. Tolak size/cellSize tidak positif dan koordinat pecahan/NaN.
- [x] Generalisasikan grid/raycast/batas kamera/shadow frustum dan implementasikan PRNG seeded dengan state tersimpan. ID domain tidak memakai `Date.now()`/`Math.random()`.
- [x] Jalankan `npm.cmd test -- tests/coordinates.test.ts tests/grid.test.ts tests/camera.test.ts tests/raycast.test.ts tests/worldGeneration.test.ts`; semua kasus harus PASS, lalu typecheck.

### Task 2 — Fixed simulation clock

**Files:** Buat `src/simulation/SimulationClock.ts`, `src/simulation/types.ts`, `tests/simulationClock.test.ts`.

**Interfaces:** `SimulationClock.advance(elapsedMs: number): number` mengembalikan jumlah tick yang harus dijalankan, maksimum 20 per pemanggilan. `setSpeed(speed: 0 | 1 | 2): void`, `suspend(): void`, dan `resume(): void`; suspend tidak mengubah pilihan speed pengguna. Clock dapat menerima elapsed 0 untuk melunasi accumulator.

- [x] Tulis tes `expect(ticksAfter1000msAt1x).toBe(10)`, `expect(ticksAfter1000msAt2x).toBe(20)`, `expect(ticksWhilePaused).toBe(0)`, dan kesetaraan total tick untuk potongan waktu 16/33/100 ms dengan total durasi sama.
- [x] Tambah tes stall: 5000 ms pada 1× akhirnya menghasilkan 50 tick melalui beberapa pump, bukan hanya 20; hidden→visible tidak mengejar waktu offline dan tidak menimpa manual pause.
- [x] Implementasikan accumulator, validasi elapsed finite/nonnegative, speed, suspend/resume, dan scheduler monotonic; simpan pecahan waktu tanpa memengaruhi tick domain.
- [x] Jalankan `npm.cmd test -- tests/simulationClock.test.ts`; tidak ada tes yang bergantung sleep nyata.

### Task 3 — Session dan bridge rendering

**Files:** Buat `src/simulation/SimulationSession.ts`, `commands.ts`, `src/citizens/types.ts`, `src/game/WorldView.ts`, `tests/simulationSession.test.ts`, `playwright.config.ts`, `tests/e2e/foundation.spec.ts`; ubah `src/game/Game.ts`, `SceneManager.ts`, `src/state/GameStore.ts`, `src/main.ts`, `vitest.config.ts`, `package.json`, `package-lock.json`.

**Interfaces:** Tetapkan `SimulationState`, `GameCommand`, `CommandFailure`, dan kontrak session di §2.1. Definisikan schema Citizen plain data sejak task ini agar tes ekonomi M4 tidak bergantung pada implementasi AI M5; isi awal citizen collection dapat kosong sampai bootstrap Task 12. `WorldView.sync(snapshot: Readonly<SimulationState>): void` hanya merekonsiliasi objek visual. Store menyediakan `publishSnapshot(snapshot)` dan aksi UI, bukan duplikasi inventory/bangunan yang dapat dimutasi sendiri. Terapkan adapter transisi §3 sampai cutover M3.

- [x] Tulis tes dua sesi dengan config dan urutan command/tick sama: `expect(snapshotA).toEqual(snapshotB)`; snapshot tidak memuat Object3D/DOM dan mutasi snapshot luar tidak mengubah sesi.
- [x] Hubungkan loop simulasi dan render; buat grup terrain/roads/buildings/vegetation/citizens/effects/selection; hilangkan spawn tiga sample house modern. Town Center final dipasang setelah katalog M2–M3 tersedia.
- [x] Siapkan Playwright sebagai dev dependency, script `test:e2e` → `playwright test`, dan test hook khusus mode test: `getSnapshot()`, `dispatch(command)`, `advanceTicks(ticks)`, `gridToScreen(cell)`. Scheduler dinonaktifkan untuk tes yang menggunakan advance manual; hook tidak diekspos pada production build. Batasi Vitest ke `tests/**/*.test.ts` agar file Playwright `tests/e2e/*.spec.ts` tidak ikut dijalankan Vitest.
- [x] Jalankan unit test/session dan browser smoke `npm.cmd run test:e2e -- tests/e2e/foundation.spec.ts`: terrain tampil, pan/zoom bekerja, tidak ada page error. Rotasi kamera Q/E dan tombolnya dinonaktifkan selama arah sprite belum mendukung rotasi.

## M2 — Asset Pipeline

### Task 4 — Palet, generator lokal, dan skill proyek

**Files:** Buat `tools/assets/palette.json`, `requirements.txt`, `generate_assets.py`, `validate_assets.py`, `tests/assets/test_asset_generation.py`; definisikan output `public/generated/manifest.json`. Pada fase implementasi buat `.agents/skills/city-builder-engine/SKILL.md`, `economy-simulation/SKILL.md`, `procedural-game-assets/SKILL.md`, `game-playtesting/SKILL.md`.

**Interfaces:** CLI `python tools/assets/generate_assets.py --seed 42 --output public/generated` dan `python tools/assets/validate_assets.py --input public/generated`. Manifest memuat versi generator, seed, palette hash, file, dimensi, serta atlas metadata; tidak ada absolute path mesin pengguna.

- [x] Tulis tes generator dua kali dengan seed sama: `self.assertEqual(first_hashes, second_hashes)`; PNG tidak memiliki warna di luar palet, dimensi salah, atau alpha antara 1–254.
- [x] Implementasikan shared drawing primitives, generator grass/dirt/path texture, delapan jenis ikon UI wajib dan ikon katalog/teknologi. Gunakan original art, Pillow, serta integer pixel coordinates.
- [x] Tulis empat skill singkat dengan ownership, workflow, command dan batas tanggung jawab nyata; tidak menyalin seluruh master prompt atau menciptakan framework skill baru. Dokumentasikan reproduksi aset dari checkout bersih.
- [x] Jalankan `python -m unittest discover -s tests/assets` dan kedua CLI; proses validasi harus exit 0. Dependencies Python dipasang hanya jika fase implementasi membutuhkannya.

### Task 5 — Bangunan kuno dan environment

**Files:** Buat `src/assets/procedural/ancientBuildings.ts`, `ancientEnvironment.ts`, `src/assets/GeneratedAssetLoader.ts`; ubah `BuildingFactory.ts`, `MaterialLibrary.ts`, `procedural/walls.ts`, `roofs.ts`, `windows.ts`; tambah `tests/ancientAssets.test.ts`.

**Interfaces:** Pertahankan `BuildingFactory.createBuildingMesh(defId, level, seed): THREE.Group`; dukung ID `town_center`, `primitive_house`, `farm`, `lumber_camp`, `stone_quarry`, `storage_hut`, `research_hut`, `dirt_road`. Loader menyediakan texture cache menurut asset key, dengan nearest filtering dan pengaturan color space yang sesuai.

- [x] Tulis tes semua model menghasilkan geometri finite/nonempty dan berada dalam footprint yang ditetapkan, kecuali overhang visual kecil yang terdokumentasi; `expect(requiredIds.every(id => factorySupports(id))).toBe(true)` menjadi matriks katalog tes, bukan API produksi tambahan.
- [x] Susun model melalui wall/roof/door/window/fence bersama; buat tree, bush, rock, grass decoration, dan crop. Pertahankan skala bangunan terhadap cell size; tidak mengaktifkan model modern pada katalog baru.
- [x] Tetapkan ownership: preview memiliki material clone, mesh bangunan memakai material bersama; geometri cache memakai release/ref-count, bukan dibuang setiap demolisi. Tidak mengklaim shared material otomatis menyatukan draw call.
- [x] Jalankan `npm.cmd test -- tests/ancientAssets.test.ts tests/materials.test.ts tests/houses.test.ts`; browser scene memverifikasi palet, siluet, tekstur, dan proporsi.

### Task 6 — Sprite atlas dan animasi empat arah

**Files:** Buat `tools/assets/characters.py`, `atlas.py`, `src/assets/SpriteAtlas.ts`, `src/citizens/SpriteAnimator.ts`, `tests/spriteAnimator.test.ts`; tambah validasi di `tests/assets/`.

**Interfaces:** Atlas metadata `animations[occupation][direction][state]` berisi frame rect integer, configurable FPS/frame durationMs, loop, dan anchor kaki. `SpriteAnimator.sample(occupation, direction, activity, elapsedMs: number): FrameRect` menghasilkan frame tanpa memutasi simulasi; elapsedMs berasal dari clock presentasi yang mengikuti waktu simulasi, bukan wall clock terpisah.

- [x] Gunakan draft target 32×32 px dengan foot anchor `(16, 30)`; evaluasi pada zoom gameplay sebelum seluruh variasi dibuat. Beralih ke 48×48 hanya jika readability gagal, lalu regenerasi seluruh atlas secara konsisten.
- [x] Tulis tes empat arah NE/NW/SE/SW, idle/walk semua role, harvest farmer, chop lumberjack, build builder; termasuk transisi/reset frame, loop, durasi, dan semua frame di dalam atlas.
- [x] Buat layered anatomy kepala/badan/lengan/kaki/pakaian/tool; usulan idle 2 frame, walk 6, work 6. Gambar perspektif tool per arah; jangan memakai mirror yang menukar tangan atau arah cahaya. Tambahkan gerak kerja generik villager untuk quarry/research.
- [x] Jalankan validator aset dan `npm.cmd test -- tests/spriteAnimator.test.ts`; verifikasi alpha biner, dimensi/anchor seragam dan nearest filtering. Tidak membuat pekerjaan domain hanya agar animasi terlihat aktif.

## M3 — Construction

### Task 7 — Katalog dan inventory multi-resource

**Files:** Buat `src/config/BalanceConfig.ts`, `src/economy/ResourceLedger.ts`, `tests/resourceLedger.test.ts`; ubah `src/buildings/types.ts`, `BuildingRegistry.ts`, `src/simulation/types.ts`, `commands.ts`, `SimulationSession.ts`, `src/state/GameStore.ts`, `src/world/PlacementSystem.ts`, `src/ui/HUD.ts`, `tests/buildingRegistry.test.ts`, dan tes legacy konsumen treasury.

**Interfaces:** `ResourceLedger.canAfford(cost: Partial<ResourceBundle>): boolean`, `trySpend(cost): boolean`, `tryDeposit(bundle): boolean`, `refund(bundle): void`. Definisi bangunan memuat cost vector, footprint, entrance, requiredWorkTicks, workerSlots, fungsi housing/storage/production, dan unlock requirement.

- [x] Tulis tes biaya house `30 wood + 10 stone`: setelah sukses `expect(resources.wood).toBe(130)` dan `expect(resources.stone).toBe(90)`; kekurangan salah satu resource meninggalkan **seluruh** bundle semula.
- [x] Tambah tes cost negatif, pecahan, NaN/Infinity dan resource asing ditolak; batch deposit penuh tidak parsial; refund di atas capacity tidak hilang.
- [x] Terapkan katalog pada §2.3; bootstrap completed Town Center, inventory awal, dan counter ID seeded. Hapus ketergantungan gameplay pada treasury/maintenanceCost katalog modern, tanpa menambah upkeep yang belum direncanakan.
- [x] Jalankan tes ledger/katalog/session. Migrasikan tes legacy cost/refund ke vector resource dengan mempertahankan maksud perilakunya.

### Task 8 — Command konstruksi dan pembongkaran atomik

**Files:** Buat `src/construction/ConstructionSystem.ts`, `ConstructionView.ts`, `tests/construction.test.ts`; ubah `GridSystem.ts`, `PlacementSystem.ts`, `SimulationSession.ts`, `commands.ts`, `tests/placement.test.ts`, `demolition.test.ts`.

**Interfaces:** `ConstructionSystem.place(command, state): CommandResult`, `cancel(instanceId, state): CommandResult`, `demolish(instanceId, state): CommandResult`, dan `step(state): void`. Building state memuat `planned | under_construction | completed`, paidResources, workTicks, entrance, serta rotation. Seluruh mutasi dijalankan oleh session.

- [x] Tulis tes command sebenarnya untuk batas grid, overlap, environment block, tile warga yang sedang ditempati, resource shortage, entrance tertutup, rotasi footprint 2×1→1×2, serta repeat demolition: `expect(secondDemolition.ok).toBe(false)` dan inventory tidak berubah.
- [x] Tempatkan validasi sebelum commit seluruh inventory/occupancy/entity; planned langsung mereservasi footprint. Jalan selesai instan. Building biasa menunggu kontribusi builder M5; model staged/scaffold mengikuti progres, tanpa timer konstruksi palsu.
- [x] Implementasikan cancel/refund, release seluruh footprint, proteksi Town Center, dan penghapusan environment tanpa hasil resource gratis. Storage capacity dihitung dari bangunan completed; barang berlebih tetap tersimpan.
- [x] Jalankan tes construction/placement/demolition melalui dispatcher. Tes kegagalan memastikan `expect(after.resources).toEqual(before.resources)` dan occupancy/entity count tidak berubah.

### Task 9 — Placement UI dan selection minimal

**Files:** Ubah `src/world/PlacementSystem.ts`, `RaycastSystem.ts`, `CameraController.ts`, `src/ui/HUD.ts`, `src/styles/global.css`, `src/game/Game.ts`; tambah `tests/e2e/construction.spec.ts`, `tests/pointerIntent.test.ts`.

**Interfaces:** Placement mengonsumsi snapshot getter dan `(command: GameCommand) => CommandResult`. Idle click memilih instance ID; UI state selection tidak menjadi sumber kebenaran bangunan. Helper pointer intent membedakan click dan drag dengan ambang 4 CSS px.

- [x] Tulis tes bahwa pointerup tanpa pointerdown yang valid, drag >4 px, right/middle/modified click, pointercancel, dan click HUD tidak mengeksekusi placement/demolition.
- [x] Hubungkan ghost, footprint hijau/merah, alasan resource/occupancy/entrance invalid, R rotate building, Escape cancel, serta kategori Housing/Production/Infrastructure/Community. Resource bar minimal menggantikan treasury lama.
- [x] Tambahkan inspector minimal status planned/under construction/completed, biaya dan aksi cancel/demolish. Tampilkan “menunggu builder” secara nyata sampai warga M5 tersedia; pilihan bangunan tidak berpura-pura sudah selesai.
- [x] Jalankan `npm.cmd test -- tests/pointerIntent.test.ts` dan E2E construction: valid place memotong tepat satu biaya, invalid place tidak memotong apa pun, select/demolish memperbarui snapshot dan mesh.

## M4 — Economy

### Task 10 — Produksi dan operating status

**Files:** Buat `src/economy/ProductionSystem.ts`, `tests/production.test.ts`; perluas types/domain session dan balance config.

**Interfaces:** `ProductionSystem.step(state: SimulationState): void`; `getOperatingStatus(buildingId, state): OperatingStatus` dengan alasan `under_construction`, `no_workers`, `unreachable`, `no_source`, `storage_full`, atau `working`. Assignment dan arrival yang diperlukan ditetapkan pada tipe warga, lalu dihubungkan ke warga nyata di M5.

- [ ] Tulis tes pada state domain dengan warga/assignment lengkap: 100 tick kerja satu farmer menghasilkan tepat 3 food; `expect(outputWithoutWorker).toBe(0)`; dua pekerja menghasilkan 6; bangunan belum selesai, warga belum tiba, sumber hilang, atau rute invalid menghasilkan 0.
- [ ] Implementasikan interval integer, kapasitas pekerja, radius sumber, modifier dan remainder; validasi workerId bukan sekadar angka workerCount. Worker yang sama tidak dihitung dua kali.
- [ ] Hubungkan hasil produksi ke ledger, tanpa increment resource di frame render atau subscription UI. Fixture pekerja hanya untuk tes domain, bukan injection warga palsu ke game.
- [ ] Jalankan `npm.cmd test -- tests/production.test.ts`; bandingkan snapshot setelah jumlah tick sama pada simulasi yang dipompa 30/60/144 FPS.

### Task 11 — Konsumsi, pajak, dan kapasitas storage

**Files:** Buat `src/economy/ConsumptionSystem.ts`, `StorageSystem.ts`, `tests/economy.test.ts`; ubah session dan ledger.

**Interfaces:** Kedua system memiliki `step(state): void`; storage menghitung ulang capacity ketika lifecycle bangunan berubah. Hunger tersimpan per warga dan menjadi input produktivitas/happiness.

- [ ] Tulis tes 3 warga/600 tick mengonsumsi 3 food, tidak pernah negatif; jika hanya 2 food, tepat dua warga mendapat makan menurut urutan ID. Pajak hanya untuk warga fed dan housed.
- [ ] Tulis tes storage dihancurkan ketika wood 500: `expect(woodAfterDemolition).toBeGreaterThanOrEqual(500)` termasuk refund; capacity turun ke 300; produksi wood terblokir sampai ada ruang. Satu batch tidak dideposit parsial atau digandakan setelah unblock.
- [ ] Terapkan kebijakan shortage, overflow dan no offline progression; tes pause/2× berdasarkan elapsed berbeda tetapi tick domain setara memberi state sama.
- [ ] Jalankan `npm.cmd test -- tests/economy.test.ts tests/production.test.ts tests/simulationClock.test.ts` dan typecheck.

## M5 — Population

### Task 12 — Citizen identity, housing, dan assignment

**Files:** Buat `src/citizens/CitizenSystem.ts`, `AssignmentSystem.ts`, `tests/citizens.test.ts`; perluas `src/citizens/types.ts` yang sudah didefinisikan Task 3; ubah bootstrap session, UI inspector, dan types.

**Interfaces:** Citizen menyimpan id/name/occupation/homeId/workplaceId/activity/position/destination/animationState, termasuk pathProgress, hunger dan timer yang memengaruhi lanjutan simulasi. `assignWorker`/`unassignWorker` melalui dispatcher; builder site menggunakan assignment eksklusif yang sama.

- [ ] Tulis tes bootstrap `expect(citizens).toHaveLength(3)`, ID unik/nama seeded, home awal Town Center, posisi awal walkable. Satu citizen tidak dapat menghuni dua slot kerja atau sekaligus bekerja dan menjadi builder.
- [ ] Implementasikan alokasi housing stabil, assignment manual, slot capacity, unassign, dan auto-builder dari unemployed. Rumah/site/place kerja yang dihancurkan melepaskan seluruh referensi terkait.
- [ ] Hubungkan inspector pekerja dan pekerjaan yang tersedia ke warga sebenarnya; progress construction M3 memperoleh kontribusi hanya setelah arrival/working yang ditetapkan Task 14.
- [ ] Jalankan `npm.cmd test -- tests/citizens.test.ts tests/construction.test.ts`; tidak ada citizen ID yatim setelah lifecycle bangunan.

### Task 13 — A* dan invalidasi navigasi

**Files:** Buat `src/world/NavigationGrid.ts`, `Pathfinder.ts`, `tests/pathfinding.test.ts`; ubah world/session/construction untuk navigation revision.

**Interfaces:** `NavigationGrid` menyediakan walkability/cost/revision dari state domain; `findPath(...)` mengikuti kontrak §2.1. Occupancy bangunan/environment memblokir; entrance eksternal dan jalan dapat dilalui.

- [ ] Tulis tes rute empat arah, cost road 1 versus grass 2, tie-break stabil, start=goal, no route, bounds, serta entrance yang berpindah akibat rotation.
- [ ] Implementasikan A* dengan Manhattan heuristic minimum cost 1. Cache berdasarkan start/goal/revision; tidak menghitung ulang tiap frame. Revisi hanya ketika walkability/cost berubah.
- [ ] Uji jalan/gedung berubah saat perjalanan: rute tidak valid dihentikan/dihitung ulang sebelum memasuki tile terblokir; tidak ada lintasan menembus bangunan atau teleport ketika gagal menemukan rute.
- [ ] Jalankan `npm.cmd test -- tests/pathfinding.test.ts`; pastikan hasil deterministik untuk query yang sama.

### Task 14 — Activity state machine dan kontribusi kerja

**Files:** Buat `src/citizens/ActivitySystem.ts`, `tests/citizenActivities.test.ts`; hubungkan `ConstructionSystem.ts`, `ProductionSystem.ts`, dan session.

**Interfaces:** `ActivitySystem.step(state): void` mengelola Idle → Navigate → Work → Return → Idle. Durasi kerja sebelum return: usulan 60 detik, lalu idle di home 10 detik; konfigurabel. Builder menyelesaikan site lalu pulang; researcher memakai mekanisme work presence yang sama.

- [ ] Tulis tes warga berjalan ke entrance, baru menghasilkan work contribution setelah tiba, kembali setelah jadwal kerja, dan menunggu jika unemployed. `expect(workTicksBeforeArrival).toBe(0)`.
- [ ] Implementasikan movement pada fixed tick dengan kecepatan usulan 1 tile/detik, path progress tersimpan, arah berasal dari gerak terakhir, dan indikator work presence untuk produksi/konstruksi/riset.
- [ ] Tambah tes workplace/home/source hilang di tengah Work/Navigate, assignment dibatalkan, serta jalur terblokir: output/progress berhenti dan warga mendapat state waiting/idle dengan alasan yang terbaca.
- [ ] Jalankan suite activities/construction/production/citizens; browser smoke satu builder menyelesaikan house dan satu farmer berjalan ke farm, bekerja, lalu pulang.

### Task 15 — Warga terlihat hidup dan pertumbuhan populasi

**Files:** Buat `src/citizens/CitizenRenderer.ts`, `PopulationSystem.ts`, `tests/population.test.ts`, `tests/e2e/citizens.spec.ts`; hubungkan WorldView, atlas dan UI.

**Interfaces:** `CitizenRenderer.sync(previous, current, interpolationAlpha): void` memetakan ID warga ke plane vertikal yang menghadap kamera tetap. `PopulationSystem.step(state): void` menghitung hunger/housing/happiness/growth berdasarkan aturan §2.3.

- [ ] Tulis tes growth setelah 1200 tick dengan syarat cukup menghasilkan tepat satu warga; `expect(growthWithNoFood).toBe(0)` dan kapasitas tidak dilampaui. Demolisi house mengubah housing/happiness tanpa menghapus warga.
- [ ] Render sprite dengan anchor kaki di tanah, nearest filtering, `depthTest=true`, `depthWrite=true`, dan alphaTest untuk alpha biner; hindari renderOrder global yang membuat warga selalu berada di depan bangunan. Animasi memakai activity nyata.
- [ ] Integrasikan pertumbuhan, role/wardrobe assignment dan indikator kebahagiaan. Tidak memutar harvest/chop/build pada warga yang belum tiba, unemployed, atau production blocked.
- [ ] Jalankan unit population dan E2E citizens; ambil screenshot depan/belakang bangunan, empat arah, zoom minimum/normal/maksimum, dan transparansi. Verifikasi skala kaki/sprite tidak flicker atau terpotong atlas.

## M6 — Technology

### Task 16 — Katalog riset dan progres deterministik

**Files:** Buat `src/technology/types.ts`, `TechnologyRegistry.ts`, `ResearchSystem.ts`, `tests/research.test.ts`; perluas command/session.

**Interfaces:** `startResearch(technologyId)` melalui dispatcher; satu research aktif, memerlukan Research Hut completed dan researcher yang tiba/bekerja. Simpan paidResources/progressTicks/status; hilangnya researcher menghentikan progres tanpa memotong biaya lagi.

- [ ] Definisikan Basic Agriculture: biaya 30 wood/20 food/10 coins, kerja 120 detik, tidak ada prerequisite; efek food ×2. Woodworking: setelah Agriculture, biaya 40 wood/20 stone/10 coins, 180 detik, efek wood ×1.5. Organized Settlement: setelah Woodworking dan population ≥6, biaya 60 wood/40 stone/20 food/20 coins, 240 detik, membuka upgrade house kapasitas 6.
- [ ] Tulis tes prasyarat, resource kurang, hut belum selesai, worker belum hadir, dua riset bersamaan, dan riset yang sudah selesai tidak dapat dibeli lagi. `expect(progressWithoutResearcher).toBe(0)`.
- [ ] Implementasikan katalog data ber-field era `'ancient'`, condition/effect terbatas yang diperlukan MVP, tanpa engine scripting era generik.
- [ ] Jalankan `npm.cmd test -- tests/research.test.ts`; biaya atomik dan timer tidak bergantung frame rate.

### Task 17 — Efek mekanik dan panel riset

**Files:** Buat `src/ui/ResearchPanel.ts`, `tests/technologyEffects.test.ts`, `tests/e2e/research.spec.ts`; ubah production system, construction commands, HUD dan model house.

**Interfaces:** Modifier diturunkan dari set completed technology, bukan menambah multiplier berulang pada callback/load. `upgradeBuilding(instanceId)` memerlukan Organized Settlement, house completed, belum upgrade, dan biaya 40 wood/20 stone/10 coins; footprint tetap 1×1.

- [ ] Tulis tes satu farmer/100 work tick menghasilkan 6 food setelah Agriculture; satu lumberjack menghasilkan 3 wood setelah Woodworking. Upgrade house mengubah kapasitas 4→6 tepat sekali.
- [ ] Terapkan efek idempotent serta visual upgrade house yang dapat dibedakan. Population ≥6 menjadi milestone settlement pertama; tidak membuka medieval era.
- [ ] Hubungkan panel biaya/prasyarat/researcher/progres/unlock ke snapshot. Tombol disabled menyampaikan alasan; tidak menampilkan countdown berjalan ketika researcher berhenti.
- [ ] Jalankan tes effects dan E2E research melalui clock manual. Simulasikan save/load state riset completed pada tingkat domain untuk memastikan modifier tidak diterapkan dua kali; IndexedDB diuji M7.

## M7 — Persistence dan UI

### Task 18 — Save schema V1 dan IndexedDB

**Files:** Buat `src/persistence/SaveSchema.ts`, `SaveValidator.ts`, `SaveRepository.ts`, `tests/saveSchema.test.ts`, `tests/e2e/persistenceStorage.spec.ts`.

**Interfaces:** `SaveGameV1` memuat `schemaVersion: 1`, config/seed/PRNG/nextId, terrain/environment changes, buildings beserta paid cost/construction progress, resources/capacity inputs, citizens/assignments, technology/progress, simTick dan relevant settings. Repository mengikuti kontrak §2.1 dan menyediakan `listSlots(): Promise<SaveSlotSummary[]>`.

- [ ] Tulis round-trip plain data dengan `expect(restoredState).toEqual(savedState)`; pastikan tidak ada mesh/material/texture/DOM. Path cache dapat dibangun ulang, tetapi posisi/progress aktivitas/timer tidak boleh direset.
- [ ] Tulis validator batas ukuran, integer/nonnegative/finite, enum ID katalog, ID duplikat, occupancy overlap, cross-reference rumah/worker/workplace, dan tick timers. Reject versi lebih baru serta save rusak sebelum menyentuh sesi aktif.
- [ ] Implementasikan database native IndexedDB dengan object store slot dan write transaction atomik. Belum perlu migrasi format legacy karena proyek awal tidak memiliki save game; versi tidak didukung diberi pesan jelas.
- [ ] Jalankan unit schema/validator dan E2E IndexedDB nyata untuk create/replace/read/list slot serta simulated write failure. Gagal menyimpan tidak menghapus save terakhir yang valid.

### Task 19 — New/Continue/Save/Load/Autosave lifecycle

**Files:** Buat `src/game/SessionController.ts`, `src/persistence/AutosaveController.ts`, `tests/sessionLifecycle.test.ts`, `tests/e2e/saveLoad.spec.ts`; ubah Game/main/WorldView/clock/store.

**Interfaces:** `newGame(config): Promise<void>`, `continueGame(): Promise<void>`, `saveGame(slotId): Promise<void>`, `loadGame(slotId): Promise<void>`. Load memvalidasi lalu membangun calon session, baru menukar sesi aktif; dispose view/session lama setelah penggantian sukses.

- [ ] Tulis tes save saat warga berjalan, bangunan separuh selesai, dan riset berjalan; lanjutkan save dan sesi asal 1000 tick: `expect(restoredAfterTicks).toEqual(originalAfterTicks)` pada state domain kanonik.
- [ ] Implementasikan autosave usulan tiap 60 detik wall time selama sesi aktif, termasuk manual pause jika ada perubahan; hindari write bersamaan dan snapshot di tengah tick. Error/quota menampilkan status gagal tanpa mengganggu permainan.
- [ ] Saat load/new game, hentikan scheduler lama, clear selection/ghost/path cache, rekonstruksi renderer, dan pulihkan pause/speed/config. Jangan memberi offline resource atau menjalankan dua loop/listener. New Game tidak menghapus manual save lama tanpa tindakan pengguna yang jelas.
- [ ] Jalankan unit lifecycle dan E2E save/load/new/continue, invalid save, serta pergantian sesi berulang. Pastikan jumlah listener/mesh tidak terus bertambah dan state aktif bertahan jika load gagal.

### Task 20 — HUD lengkap, settings, dan aksesibilitas

**Files:** Buat `src/ui/ResourceBar.ts`, `ConstructionMenu.ts`, `BuildingInspector.ts`, `SessionControls.ts`, `SettingsPanel.ts`; refactor terarah `HUD.ts`, `global.css`, `index.html`; tambah `tests/e2e/hud.spec.ts`.

**Interfaces:** Semua panel membaca snapshot/UI state dan mengirim command/session action. Settings MVP: volume tidak ditampilkan karena audio belum termasuk scope; sediakan shadow quality, UI scale, dan reduced motion dengan persistence.

- [ ] Bangun top bar wood/stone/food/coins/population/happiness, empat kategori konstruksi, inspector produksi/pekerja/status/cost, ResearchPanel, pause/1×/2×, Save/Load/Continue/New Game, dan settings.
- [ ] Tulis E2E bahwa angka resource mengikuti hasil tick, alasan no_workers/unreachable/storage_full terlihat, tombol load/save menampilkan busy/error, serta input seed/name tidak memicu shortcut game.
- [ ] Sediakan label aksesibel, focus visible, keyboard traversal, format angka konsisten, kontras terbaca, serta layout desktop 1280×720 dan 1920×1080 tanpa panel menutup kontrol penting. Hilangkan copy debug “Phase B / 12 Building Catalog Active”.
- [ ] Jalankan HUD E2E dan ulangi construction pointer tests setelah layout berubah; UI tidak boleh memotong biaya melalui event bubbling atau double click.

## M8 — Polish dan QA

### Task 21 — Skenario gameplay penuh dan balancing

**Files:** Buat `tests/scenarios/ancientSettlement.test.ts`, `tests/e2e/gameplayLoop.spec.ts`; sesuaikan `BalanceConfig.ts` hanya berdasarkan hasil; dokumentasikan hasil saat eksekusi di `docs/qa/ancient-settlement.md`.

**Interfaces:** Scenario runner memakai session/dispatcher/step yang sama dengan game. Browser test sebagian memakai gridToScreen+pointer nyata, sebagian test hook deterministik; jangan hanya membuktikan DOM terpasang.

- [ ] Buat skenario seed tetap: start 3 warga → bangun house/farm/lumber/quarry → assign worker → konsumsi dan produksi → tambah housing/populasi → bangun research hut → selesaikan Agriculture → unlock/progres Organized Settlement → save → load → lanjutkan.
- [ ] Tambahkan skenario pemulihan: makanan habis lalu pulih, semua warga sempat menjadi builder, sumber ekstraksi di-clear, jalan dibongkar, storage penuh, dan home/place kerja dihancurkan. Tidak ada hard softlock tanpa penjelasan atau jalan pemulihan.
- [ ] Jalankan simulasi paling sedikit 30 menit waktu game untuk beberapa seed; catat minimum resource, population, idle/wait reasons, dan waktu teknologi pertama. Target balancing usulan: Agriculture tercapai sekitar 10–20 menit permainan pada 1×; sesuaikan bila data aktual berbeda.
- [ ] Jalankan scenario/unit suite serta gameplay E2E; hasil wajib memuat seed, konfigurasi, dan outcome aktual, termasuk kegagalan yang tersisa.

### Task 22 — Visual QA, profiling, dan perbaikan terukur

**Files:** Tambah `tests/e2e/visual.spec.ts`, `tools/qa/benchmark.ts`; ubah renderer/view/assets/navigasi hanya untuk masalah yang terukur; catat di `docs/qa/ancient-settlement.md`.

**Interfaces:** Fixture benchmark seeded 32×32 berisi sekitar 100 bangunan, 100 warga, dan environment. Laporan menyimpan perangkat, browser, resolusi/DPR, shadow setting, frame p50/p95, tick time, draw calls, geometry/texture count, dan pathfinding calls.

- [ ] Verifikasi visual seluruh bangunan/environment/empat role/empat arah/state kerja: siluet kuno, palet konsisten, nearest filtering, foot anchor, depth occlusion, tidak blur/flicker/Z-fighting, dan HUD terbaca. Tambahkan generator pixel effect lokal serta partikel ringan untuk completion/impact yang dipicu event domain nyata; efek presentasi tidak menambah resource atau mengubah state simulasi.
- [ ] Ukur scene normal dan benchmark di 1920×1080 dengan DPR dibatasi 2. Target 60 FPS diperlakukan sebagai target; laporkan hasil nyata. Usulan budget tick p95 <10 ms dan frame p95 mendekati ≤16,7 ms pada perangkat pengujian yang dicatat.
- [ ] Jika ditemukan bottleneck, prioritaskan cache geometri/atlas, InstancedMesh untuk environment berulang, pembatasan shadow, dan invalidasi path. Hindari ECS/worker thread/instancing seluruh warga sebelum profiling membuktikan manfaat.
- [ ] Jalankan ulang benchmark dan tes yang relevan setelah perubahan; periksa repeated new/load/demolish terhadap kebocoran resource. Jangan memberi klaim “zero allocation” hanya karena beberapa scratch object digunakan ulang.

### Task 23 — Final verification dan dokumentasi penggunaan

**Files:** Update `README.md`, scripts di `package.json` bila diperlukan, dan `docs/qa/ancient-settlement.md`.

- [ ] Dokumentasikan generator aset, dependency lokal, seed, aturan ekonomi/growth/riset, controls, IndexedDB, kebijakan tab/offline, known issues, dan cara menjalankan unit/browser tests.
- [ ] Jalankan dari kondisi output aset bersih: generator + validator + Python tests, `npm.cmd test`, `npm.cmd run build`, dan `npm.cmd run test:e2e`. Python dan Playwright setup dilakukan saat eksekusi, bukan pada pekerjaan planning.
- [ ] Uji production preview: new settlement → konstruksi → pekerjaan warga → riset → save → refresh → continue. Pastikan test hooks tidak tersedia pada production dan tidak ada request aset/font wajib ke layanan eksternal; gunakan font lokal/system agar permainan local-first.
- [ ] Cocokkan semua kriteria penerimaan di bawah dengan bukti aktual, catat isu tersisa, dan lakukan review perubahan. Jangan menyebut MVP selesai jika masih ada blocker gameplay, save/load, ekonomi, atau aset.

## 5. Matriks penerimaan akhir

| Kebutuhan master prompt | Bukti yang wajib tersedia setelah implementasi |
|---|---|
| Browser launch, start settlement, navigasi isometrik | M1/M7 E2E dan production preview |
| Dunia 32×32, seeded, Town Center, 3 warga | Tes config/world/bootstrap dan snapshot browser |
| Rumah, bangunan produksi, jalan, preview, cancel, demolition, selection | M3 command tests dan construction E2E |
| Gather/produce/consume, kapasitas storage, shortage, coins | M4 unit/integration dan M8 scenario |
| Warga berjalan, assignment, home/workplace, A* | M5 domain tests dan citizens E2E |
| Empat role, empat arah, animasi sesuai aktivitas | Validator atlas, animator tests, visual evidence |
| Housing, happiness, population growth | M5 population tests dan scenario growth |
| Tiga teknologi, prasyarat, biaya, efek nyata | M6 research/effects tests dan research E2E |
| Save, autosave, continue, load, new game, schema validation | M7 validator/IndexedDB/lifecycle tests |
| Pause, normal/fast speed, settings, HUD data nyata | Clock tests dan M7 HUD E2E |
| Aset orisinal dari kode lokal, empat skill proyek | Generator reproducibility/asset audit dan file skill M2 |
| Kinerja dan polish | Laporan M8 dengan perangkat dan pengukuran aktual |
| Tidak ada sistem inti palsu/placeholder | Skenario end-to-end memakai session yang sama dengan game |

## 6. Batas review dan status sekarang

- Dokumen ini mencakup seluruh delapan milestone, tetapi eksekusi sebaiknya berhenti untuk review pada akhir tiap milestone, bukan menggabungkan semua perubahan menjadi satu patch besar.
- Usulan angka biaya/produksi/riset, perilaku sumber tidak habis, absence of citizen death, dan target balancing perlu ditinjau sebagai keputusan desain MVP. Semua tercantum eksplisit agar tidak menjadi asumsi tersembunyi.
- Rotasi kamera, audio, logistic hauling individual, resource depletion, advanced terrain, serta era lain ditunda. Rotasi bangunan tetap termasuk MVP.
- Belum dibuat skill proyek, aset, source code, dependency baru, test baru, database, atau build baru sebagai bagian pekerjaan ini. Satu-satunya artefak baru adalah implementation plan ini.
- Implementasi baru dimulai setelah pengguna memberikan instruksi lanjutan untuk mengeksekusi rencana.
