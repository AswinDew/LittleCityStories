# Citizen Sprite Art Upgrade — Implementation Plan

> **For agentic workers:** Gunakan `superpowers:executing-plans` saat pengguna meminta implementasi. Jalankan satu tahap, periksa hasilnya, lalu berhenti sampai pengguna meminta lanjut. Checklist di bawah belum dijalankan. Dokumen ini tidak mengizinkan perubahan kode, pembuatan sprite, regenerasi aset, commit, atau push pada giliran perencanaan.

**Goal:** Menggambar ulang sprite warga agar kualitas bentuk, wajah, pakaian, warna dan animasinya mendekati karakter pixel art pada referensi pengguna, lalu mengintegrasikannya ke game yang ada.

**Architecture:** Pertahankan simulasi dan renderer Three.js. Kerjakan contoh visual terlebih dahulu, siapkan dukungan metadata ukuran frame, kemudian gambar ulang seluruh pose dan ekspor atlas secara atomik. Sumber gambar tetap berupa kode lokal yang dapat direproduksi; hasil PNG mengikuti sumber generator.

**Tech Stack:** TypeScript strict, vanilla Three.js, Python/Pillow, Vitest, Playwright; tanpa dependency atau engine baru.

**Spec:** Brief visual dan spesifikasi usulan pada bagian 1–3 dokumen ini. Sumber: gambar pengguna `C:/Users/ROG/AppData/Local/Temp/codex-clipboard-37859064-eee1-4bfe-bf22-be4927276f91.png`. Semua keputusan visual di sini merupakan usulan untuk ditinjau, bukan desain yang sudah disetujui.

**Status 2026-10-19:** Tahap 1 menghasilkan delapan pose villager/idle 64px, lalu kepala SE/SW direvisi sesuai feedback. Pengguna meminta tahap berikutnya setelah revisi tersebut. Tahap 2 selesai: dukungan metadata 32/64px, 269 tes unit, build, 10 tes browser dan review kode lulus tanpa mengganti aset aktif. Tahap 3–5 belum dijalankan. Catatan: `docs/progress/2026-10-19-sprite-art-stage-1.md` dan `docs/progress/2026-10-19-sprite-art-stage-2.md`.

## 1. Brief visual

Permintaan eksplisit: ubah kualitas dan style sprite mengikuti referensi; buat rencana dulu.

Asumsi lingkup: sprite warga, termasuk pose dan animasi pekerja. Bangunan, terrain, UI dan kamera hybrid 3D isometrik tetap menjadi konteks tampilannya. Jika yang dimaksud juga seluruh dunia pada gambar, pekerjaan lingkungan perlu rencana tersendiri sebelum dimasukkan ke implementasi ini.

| Ciri pada referensi | Penerapan yang direncanakan |
|---|---|
| Kepala/wajah menonjol, karakter mudah dibedakan | Kepala lebih ekspresif, bentuk rambut dan aksesori khas, variasi proporsi antarprofesi; wajah tidak diisi detail acak. |
| Outline gelap yang jelas | Outline utama 1 pixel pada resolusi kerja, penebalan terkontrol pada bayangan/overlap, tanpa garis hitam tebal merata di semua bagian dalam. |
| Bentuk organik dengan kelompok pixel yang rapi | Gambar ulang kontur kepala, bahu, tangan, pakaian dan sepatu dengan kelompok pixel yang disengaja. Hindari badan kotak dan lengan yang hanya berupa garis bergerak. |
| Warna redup dengan aksen hangat | Dominasi linen/ochre, hijau zaitun, biru redup, tanah dan abu; profesi dibedakan oleh bentuk serta alat, bukan warna baju saja. |
| Volume terbaca meskipun sederhana | Dua–tiga tingkat shading per material, pencahayaan konsisten dari kanan atas, pemisahan kulit/rambut/pakaian/alat yang jelas. |
| Pose punya kepribadian | Berat badan dan bahu ikut bergerak; gerakan alat memiliki persiapan, kontak dan pemulihan. |

Ambil bahasa bentuk dan kualitas pengerjaannya. Karakter tetap warga permukiman kuno dengan desain sendiri. Perspektif karakter disesuaikan ke NE/NW/SE/SW pada game; komposisi top-down, bangunan kota modern, dialog dan efek layar pada referensi tidak dimasukkan ke lingkup ini.

## 2. Kondisi kode yang sudah diperiksa

Baseline kode: commit `54c72bc` — `Fix animation`; working tree bersih sebelum dokumen ini dibuat.

- `tools/assets/characters.py`: gambar procedural 32×32; bentuk dan sebagian struktur pose masih dibangun dari primitive yang seragam.
- `tools/assets/atlas.py`: 312 frame dalam atlas 512×640, 16 kolom, anchor (16,30).
- `src/assets/SpriteAtlas.ts`: validasi mengunci frame 32×32 dan anchor tersebut.
- `src/citizens/CitizenSpriteView.ts`: perhitungan anchor masih membagi dengan konstanta 32.
- `src/citizens/CitizenRenderer.ts`: plane vertikal, nearest filtering, depth test/write, posisi interpolasi dan visibilitas warga dalam rumah sudah tersedia.
- `src/citizens/SpriteAnimator.ts`: sampling mengikuti waktu simulasi, reset saat aktivitas/arah berubah, pause konsisten. Tidak perlu diganti untuk perubahan style.
- `src/testing/AssetGallery.ts`: empat profesi × empat arah; kontrol `work` baru menampilkan pekerjaan dasar, sehingga clip mine/research/water perlu pilihan inspeksi yang valid untuk profesinya.
- Validator dan tes Python/TypeScript masih memiliki angka 32, anchor lama dan koordinat batas atlas lama. Semua perlu diperbarui secara sengaja, termasuk tes negatif; angka 512 tidak lagi boleh dianggap otomatis di luar atlas baru.

Hasil historis giliran implementasi sebelumnya: 238 tes unit, 9 tes Python, 19 browser development dan 1 browser production lulus. Angka ini bukan hasil eksekusi ulang pada giliran perencanaan.

## 3. Spesifikasi usulan dan batas pekerjaan

### Pilihan pendekatan

| Opsi | Dampak | Penilaian |
|---|---|---|
| Gambar ulang pada 64×64, integrasi bertahap | Ruang untuk wajah, tangan, alat dan lipatan; membutuhkan migrasi kontrak frame dan audit ukuran tampilan | **Direkomendasikan**, dengan contoh visual sebelum migrasi atlas aktif. |
| Gambar ulang tetap 32×32 | Perubahan teknis lebih sedikit, siluet dapat membaik | Detail ekspresi dan gerakan lebih terbatas. |
| Ubah seluruh game menjadi 2D seperti referensi | Perlu mengganti presentasi bangunan/terrain dan banyak interaksi | Di luar rencana sprite ini. |

64×64 adalah ukuran kerja usulan, bukan pembesaran nearest-neighbor sprite lama atau perkiraan resolusi asli gambar referensi. Bila contoh tidak terlihat lebih baik di kamera game, revisi proporsi/ukuran kerja sebelum melanjutkan.

### Kontrak visual yang diusulkan

- Frame 64×64, transparansi biner, anchor kaki konsisten (32,60), padding alat minimal 2 pixel dari tepi; tanpa trimming frame.
- Target tinggi karakter netral sekitar 48–54 pixel, kepala sekitar sepertiga tinggi karakter; boleh berbeda antarprofesi selama anchor dan batas frame tetap konsisten.
- Gunakan palet warm-earth 28 warna yang ada di `tools/assets/palette.json`; pilih subset warna yang lebih terkendali untuk karakter. Tidak mengubah palet global terrain/ikon demi filter warna pada screenshot.
- Gambar NE/NW/SE/SW secara khusus. Arah cahaya, tangan pemegang alat, serta muka/belakang kepala tidak boleh berubah karena mirror otomatis.
- Empat role domain tetap: villager, farmer, lumberjack, builder. Penambang/peneliti tetap menggunakan clip khusus pada role villager; tidak menambah pekerjaan atau aturan ekonomi.
- Semua 312 frame digambar ulang. Pertahankan jumlah frame dan durasi saat migrasi pertama: idle 2/500 ms, walk 6/100 ms, work/harvest/chop/build 6/120 ms, mine 8/140 ms, research 8/180 ms, water 6/160 ms.
- Farmer: topi jerami, kain/apron sederhana, hoe dan penyiram terbaca. Lumberjack: bahu/badan lebih kokoh, kapak dua pose ekstrem yang jelas. Builder: ikat kepala, pakaian kerja dan palu. Villager: pakaian sederhana, wajah/rambut khas; pose mine/research mengutamakan beliung atau buku/pena.
- Skala dunia awal tetap seperti saat ini: plane sekitar 1,1 × ukuran tile; 64 pixel tidak berarti warga dua kali lebih besar. Nilai final dibandingkan dengan pintu rumah dan meja kerja pada checkpoint visual.
- Detail wajah dinilai pada zoom dekat; siluet dinilai pada 0,5×; profesi/alat dinilai pada 1× dan 2,8×. Detail wajah tidak dijanjikan terbaca pada seluruh tingkat zoom.
- Atlas 16 kolom × 20 baris pada 64px menghasilkan 1024×1280: sekitar 5 MiB RGBA dasar, dibanding 1,25 MiB sebelumnya, tanpa mipmap. Ukur pemuatan dan alokasi runtime; jangan menyamakan ukuran PNG dengan biaya GPU.

### Global constraints

- Giliran awal 2026-10-18 hanya perencanaan. Tahap 1 dan revisi contoh telah dikerjakan. Permintaan lanjut terbaru mengizinkan tahap 2 saja; tahap 3–5 menunggu pengguna.
- Tahap yang sudah berjalan baik—progres konstruksi, workstation, rumah tersembunyi, produksi, navigasi dan penugasan—menjadi syarat regresi.
- Waktu animasi mengikuti simulasi; tidak menambah timer gameplay atau gerak kosmetik yang mengubah posisi domain.
- Semua aset esensial tetap dihasilkan melalui kode lokal. Tidak menggambar langsung di PNG generated atau mengandalkan sprite sheet hasil generasi tanpa sumber yang dapat direproduksi.
- Perubahan ukuran menyentuh ketentuan 32px pada skill proyek `procedural-game-assets`; saat implementasi, sinkronkan panduan tersebut dengan spesifikasi yang akhirnya disetujui. Pertahankan palet, alpha biner, sumber lokal dan pemeriksaan visualnya.
- Tidak menjalankan M6, menambah varian populasi/identitas baru, efek CRT/blur, delapan arah, portrait dialog, atau mengganti engine.
- Pertahankan rencana MVP yang sudah ada; dokumen ini merupakan pekerjaan visual tambahan setelah M5.

### Review focus

1. Atlas lama/baru dan metadata tidak cocok: tolak kontrak rusak secara jelas; jangan tampilkan potongan sprite yang keliru. Pemilik Task 2 dan 5.
2. Frame berubah arah/pekerjaan: kaki tetap menapak, alat tidak terpotong, tangan tidak bertukar secara tidak disengaja. Pemilik Task 1, 3 dan 4.
3. Tampilan kecil/occlusion: sprite tidak menjadi raksasa, mengambang, atau selalu menembus bangunan. Pemilik Task 2 dan 6.
4. Transisi kerja–pulang–masuk rumah: upgrade visual tidak menggandakan produksi, membuka rumah kosong secara keliru, atau membuat warga terlihat saat istirahat. Pemilik Task 6.
5. Galeri memanggil clip yang tidak dimiliki role: tampilkan hanya kombinasi valid, termasuk mine/research/water, dengan pause yang stabil. Pemilik Task 6.

## Tahap 1 — Contoh visual dan penguncian style

### Task 1: Satu karakter percontohan yang layak ditinjau

**Dependency:** Tidak ada. **Scope:** kecil; belum terhubung ke atlas game.

**Files:** buat `tools/assets/citizen_style.py`, `tools/assets/preview_citizens.py`, `tests/assets/test_citizen_style.py`, dan `docs/art/citizen-style-guide.md`. Preview PNG kelak masuk `test-results/`, bukan mengganti `public/generated/`.

**Interface:** `draw_citizen(role, direction, state, frame) -> PIL.Image.Image` menghasilkan frame RGBA berukuran kerja yang disepakati. Pada task ini hanya villager/idle yang wajib tersedia; kombinasi yang belum dibuat ditolak secara eksplisit. Modul hanya memakai palet/primitives lokal dan belum diimpor generator produksi.

- [x] Tulis tes frame contoh: ukuran 64×64, alpha hanya 0/255, warna dari palet, opaque bounds tidak terpotong; arah mempunyai tampilan yang berbeda.
- [x] Jalankan tes tersebut dan amati gagal sebelum kode gambar baru ditulis.
- [x] Gambar ulang villager idle dua frame × empat arah; buat preview pada ukuran asli dan pembesaran nearest-neighbor 4×, disertai siluet.
- [x] Jalankan tes fokus, validator pixel-art, dan periksa bentuk kepala, ekspresi, kontur bahu, tangan, kaki serta perbedaan arah secara visual.
- [x] Catat ukuran, anchor, proporsi, shade ramp, aturan outline dan padding yang lolos tinjauan pada style guide.

**Checkpoint:** Tunjukkan delapan pose contoh kepada pengguna. Berhenti setelah tahap ini. Jika style belum cocok, revisi contoh yang sama; jangan memproduksi ratusan frame atau mengubah game dulu.

## Tahap 2 — Renderer menerima ukuran frame dari metadata

### Task 2: Dukungan frame 64 tanpa mengganti aset aktif

**Dependency:** Task 1 dan persetujuan contoh. **Scope:** medium.

**Files:** ubah `src/assets/SpriteAtlas.ts`, `src/citizens/CitizenSpriteView.ts`, `tests/spriteAnimator.test.ts`, `tests/citizenRenderer.test.ts`.

**Interface:** tambahkan `readonly frameWidth: number` dan `readonly frameHeight: number` ke `SpriteAtlas`; gunakan nilai tersebut pada perhitungan anchor. `getClip(...)` dan `SpriteAnimator.sample(...)` tetap sama. Transisi hanya mendukung frame square 32 atau 64; bukan penerimaan ukuran bebas tanpa validasi.

- [x] Tambahkan fixture metadata 64 dari struktur clip valid: seluruh koordinat/dimensi/anchor disesuaikan; tes frame campuran, overlap, anchor di luar frame, nilai non-finite dan rectangle di luar batas memakai `atlas.width/height` aktual.
- [x] Amati tes dukungan 64 gagal pada validator lama, lalu implementasikan validasi metadata serta normalisasi anchor yang sesuai frame.
- [x] Uji plane 32 dan 64 dengan anchor relatif setara mempunyai tapak/skala dunia setara; UV memilih frame benar pada baris terakhir.
- [x] Jalankan tes fokus dan `npm.cmd run build`; atlas aktif 32px tetap berjalan selama tahap ini.

**Checkpoint:** Tidak ada perubahan perilaku warga atau PNG aktif; kedua fixture ukuran lulus. Berhenti untuk review tahap.

## Tahap 3 — Gambar ulang seluruh karakter dan gerakan

### Task 3: Empat profesi dengan idle/walk yang konsisten

**Dependency:** Task 1–2. **Scope:** medium.

**Files:** perluas `tools/assets/citizen_style.py`, `tools/assets/preview_citizens.py`, `tests/assets/test_citizen_style.py`; perbarui style guide.

- [ ] Tulis tes ketersediaan empat role × empat arah × idle 2/walk 6, palette/alpha/padding serta anchor yang konsisten.
- [ ] Gambar key pose tiap profesi, lalu isi pose walk: contact, passing dan recovery. Gunakan tubuh/rambut/pakaian yang mengikuti gerakan, bukan hanya menggeser alat atau mewarnai ulang badan yang sama.
- [ ] Ekspor contact sheet/preview animasi terpisah; review bentuk pada ukuran asli dan pergerakan kaki. Perbaiki foot sliding dan perubahan volume yang tidak disengaja.

### Task 4: Semua clip kerja mempunyai bobot dan siluet yang berbeda

**Dependency:** Task 3. **Scope:** medium; files sama dengan Task 3.

- [ ] Tulis tes untuk work/harvest/chop/build/mine/research/water: jumlah frame/durasi sesuai kontrak; seluruh clip berisi pose berbeda, tetap di dalam bounds dan memakai palet sah.
- [ ] Gambar gerakan dengan key pose: farmer membungkuk/mencangkul dan memiringkan penyiram; lumberjack mengangkat–mengayun–memulihkan kapak; miner mengangkat–menghantam–menarik beliung; builder menahan benda dan memukul palu; researcher memegang buku, membaca/menulis dengan gerak tangan kecil.
- [ ] Periksa setiap arah secara terpisah: tangan, cahaya dan alat konsisten. Buat preview slow motion serta kecepatan normal; jangan menyimpulkan kualitas animasi hanya dari tes byte gambar berbeda.
- [ ] Pastikan total tetap 312 frame; audit semua frame sebelum ekspor final.

**Checkpoint tahap 3:** Tinjau contact sheet dan loop animasi seluruh profesi. Sprite baru masih berupa preview, game tetap memakai aset lama. Berhenti untuk review tahap.

## Tahap 4 — Integrasi atlas baru secara atomik

### Task 5: Generator, metadata, validator dan output berpindah bersama

**Dependency:** Task 2–4 dan visual disetujui. **Scope:** dua perubahan yang harus diselesaikan dalam tahap yang sama.

**Files sumber:** `tools/assets/characters.py`, `tools/assets/atlas.py`, `tools/assets/generate_assets.py`, `tools/assets/validate_assets.py`.

**Files pengujian/output:** `tests/assets/test_characters.py`, `tests/assets/test_asset_generation.py`, `public/generated/characters/citizens.png`, `public/generated/manifest.json`.

**Interface:** fungsi `character(role, direction, state, frame)` yang lama mendelegasikan gambar ke `draw_citizen(...)`; `citizen_atlas()` mempertahankan struktur key role/direction/activity. Dimensi frame dan anchor berasal dari spesifikasi generator yang sama; runtime membacanya dari manifest.

- [ ] Perbarui tes kontrak ke ukuran/anchor yang disetujui dan semua 312 frame; amati kegagalan sebelum migrasi output.
- [ ] Alihkan generator karakter ke sumber baru, susun 16 kolom, lalu turunkan tinggi sheet dari jumlah frame. Naikkan generator version dari 2 ke 3 agar manifest lama tidak lolos sebagai kontrak baru.
- [ ] Perbarui validator dan tes negatif tanpa melonggarkan pemeriksaan alpha, palette, bounds, overlap, hash dan path. Hindari konstanta 512 sebagai input invalid setelah atlas melebar.
- [ ] Regenerasi PNG/manifest bersama dari seed 42. Terrain dan ikon harus mempertahankan hash karena lingkupnya tidak berubah.
- [ ] Generate dua kali ke folder sementara dan bandingkan hash: hasil harus identik. Jalankan audit pixel-art, seluruh tes Python, tes TypeScript dan build.

**Checkpoint:** Game memuat sprite baru melalui loader publik yang sama, tidak ada mismatch manifest/PNG, frame hilang atau perubahan ukuran dunia yang tidak direncanakan. Berhenti untuk review tahap.

## Tahap 5 — Pemeriksaan dalam game dan penyelesaian

### Task 6: Galeri lengkap dan playtest perilaku yang sudah ada

**Dependency:** Task 5. **Scope:** galeri dan verifikasi; bukan fitur gameplay baru.

**Files:** `src/testing/AssetGallery.ts`, `tests/e2e/assets.spec.ts`, `tests/e2e/citizens.spec.ts`, `tests/e2e/production.spec.ts`, `README.md`. Sinkronkan panduan `.agents/skills/procedural-game-assets/SKILL.md` bila ukuran baru disetujui, dengan memperhatikan akses tulis saat implementasi.

- [ ] Tampilkan dimensi atlas dari metadata; sediakan preview clip kerja khusus hanya untuk role yang mendukungnya. Tambahkan tes pemilihan mine/research/water dan pause; jangan menampilkan clip pengganti yang tidak sesuai.
- [ ] Playtest warga nyata: berjalan empat arah, membangun, bekerja di Farm/Lumber Camp/Quarry/Research Hut, pulang, tersembunyi di rumah, lalu keluar lagi. Uji rotasi bangunan dan pergantian pekerjaan/demolisi yang sebelumnya diperbaiki.
- [ ] Bandingkan screenshot pada zoom 0,5/1/2,8, termasuk karakter di belakang/depan dinding, di pintu, pada meja dan di antara tanaman. Periksa keterbacaan, ukuran, outline, clipping dan anchor; jangan menambah outline global atau memperbesar semua warga tanpa membandingkan hasilnya.
- [ ] Periksa tidak ada perubahan resource, jumlah tick kerja atau rute yang disebabkan migrasi visual; seluruh tes domain tetap lulus.
- [ ] Catat ukuran PNG, jumlah texture/draw calls sebelum/sesudah pada skenario sama. Pastikan cache/disposal tetap bekerja dan tidak memuat atlas satu kali untuk setiap frame. Hasil software WebGL bukan jaminan FPS perangkat pengguna.
- [ ] Jalankan full unit, aset, development/production browser tests, build, dan review diff. Perbaiki semua defect penting yang ditemukan sebelum menyatakan selesai.
- [ ] Dokumentasikan screenshot sebelum/sesudah dan hasil aktual. Berhenti tanpa melanjutkan M6 atau melakukan commit/push otomatis.

## Perintah verifikasi saat implementasi nanti

Gunakan executable Python nyata bila alias WindowsApps belum dikonfigurasi. Untuk preview awal, jalankan unittest fokus `test_citizen_style.py` dahulu; full asset tests baru diwajibkan setelah pipeline aktif dimigrasikan.

```powershell
python -m unittest discover -s tests/assets -p test_citizen_style.py
python tools/assets/generate_assets.py --seed 42 --output public/generated
python tools/assets/validate_assets.py --input public/generated
python -m unittest discover -s tests/assets
npm.cmd test
npm.cmd run build
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd run test:e2e
npm.cmd run test:e2e:production
```

Untuk audit kualitas gunakan `C:/Users/ROG/.codex/skills/pixel-art/scripts/quality_audit.py --help` lebih dahulu, lalu audit preview/final PNG dengan grid 64 dan batas 28 warna. Jangan mengklaim style cocok hanya karena audit teknis lulus.

## Kriteria selesai keseluruhan

- [x] Pengguna sudah melihat contoh style sebelum produksi seluruh frame.
- [ ] Siluet, wajah, kontur pakaian dan alat terlihat digambar ulang; perubahan bukan sekadar upscaling, blur atau penggantian warna.
- [ ] Empat arah, empat role dan seluruh clip kerja tersedia, anchor konsisten, tidak ada frame terpotong atau semi-transparan.
- [ ] Warga proporsional dengan bangunan serta tetap bekerja/masuk rumah sesuai sistem yang sudah berjalan.
- [ ] Generator dapat direproduksi; validasi dan seluruh pemeriksaan relevan lulus dengan bukti aktual.

**Status dokumen:** tahap 2 menyiapkan dukungan metadata ukuran frame; aset aktif tetap 32px. Tidak ada perubahan perilaku simulasi atau produksi seluruh sprite. Berhenti setelah verifikasi/review tahap 2; tahap 3–5 menunggu pengguna.
