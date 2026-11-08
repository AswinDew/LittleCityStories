# Town Center — Direct Stitch Skin Implementation Plan

> **Status: A–C SELESAI — MENUNGGU REVIEW TOWN CENTER.**
> Pengguna memerintahkan eksekusi pada 2026-11-08. Prototipe sumber langsung
> sudah tersedia di developer review; belum diintegrasikan ke game.
> Bukti: `docs/progress/2026-11-07-town-center-direct-stitch-skin.md`.
>
> **For agentic workers:** Setelah pengguna memerintahkan implementasi, gunakan
> `superpowers:executing-plans` secara bertahap. Tahap D/E masih menunggu review
> dan instruksi pengguna. Jangan melewati checkpoint review satu bangunan.

**Goal:** Memasang gambar arsitektur Town Center asli dari Stitch sebagai skin
yang mempertahankan komposisi, warna, dan detail lukisannya pada bangunan 3D.

**Architecture:** Proyeksikan gambar sumber dari kamera referensi yang dikalibrasi
ke UV model 3D khusus Town Center. Model mempertahankan volume utama dan bukaan
pintu, sementara detail permukaan memakai lukisan asli. UV dikunci pada model;
kamera game yang bergerak tidak menggeser proyeksi tekstur.

**Tech Stack:** Three.js yang sudah terpasang, TypeScript/Vite, Python/Pillow untuk
ekspor teknis, Vitest dan Playwright. Tidak mengganti engine atau menambah renderer.

**Spec:** Permintaan terbaru pengguna: desain Stitch langsung menjadi skin model
3D; buat implementation plan dahulu dan jangan jalankan. Batas sebelumnya tetap
satu Town Center dahulu, menunggu review sebelum bangunan lain. Referensi proyek:
`.stitch/DESIGN.md`, `docs/progress/2026-11-07-town-center-fidelity.md`, dan
`docs/progress/2026-11-07-town-center-stitch-skin.md`.

## Global Constraints

- Hanya Town Center; karakter, animasi, terrain, HUD, ekonomi dan bangunan lain di luar scope.
- Gambar arsitektur Stitch adalah sumber visual. Tidak membuat ulang fasad melalui
  warna prosedural, noise, atau kumpulan swatch material.
- Simpan model dan loader skin sekarang sebagai pembanding serta fallback.
- Prototipe pertama hanya di halaman developer review, belum aktif di game.
- Jangan mengubah kamera global, footprint 3×3, transform bangunan, jalur warga,
  titik masuk Town Center, picking, atau aturan bangunan terlindungi.
- Tidak membuat aset atau menjalankan langkah implementasi saat menyusun rencana ini.

## Review Focus

1. Atap/dormer/banner saling menutupi: gambar tidak terproyeksi dua kali pada bagian berbeda.
2. Kamera diputar: skin tetap melekat pada model; bagian tanpa sumber teridentifikasi.
3. Pintu dan warga: bukaan tetap memiliki kedalaman dan occlusion yang benar.
4. PNG/manifest gagal dimuat: model lama tetap terlihat; tidak ada material global yang rusak.
5. Zoom dekat dan tepi transparan: batas resolusi asli terlihat jujur, tanpa halo latar atau penghalusan berlebihan.

## 1. Keputusan pendekatan

**Gunakan camera-projected UV pada model 3D yang mengikuti sumber.** Perubahan
utama adalah mengambil gambar bangunannya—susunan kayu, batu, atap, pintu dan
banner—secara langsung. Pendekatan sebelumnya hanya mengambil karakter bahannya.

| Bagian | Penanganan |
|---|---|
| Volume dinding, massa atap, dormer, pondasi dan tangga | Geometri 3D yang mengikuti siluet dan titik penting sumber |
| Serat, susunan batu, balok kecil, lukisan banner dan shading | Piksel dari desain Stitch, tanpa pewarnaan ulang |
| Pintu | Lubang geometri dengan rongga di belakangnya; posisi masuk warga tetap |
| Detail kecil yang tidak memengaruhi siluet | Menjadi bagian tekstur; tidak perlu semuanya memiliki relief 3D |
| Permukaan belakang/tersembunyi | Fallback yang ditandai sampai tersedia gambar sumber tambahan |

Model sekarang memiliki banyak detail timbul. Menempelkan gambar utuh ke seluruh
detail tersebut berisiko menggandakan balok, merusak alignment dan memotong gambar.
Karena itu buat varian model khusus berisi volume utama yang sesuai gambar,
tanpa menimpa model sekarang. Ini tetap bangunan 3D dengan beberapa bidang dan
kedalaman, bukan gambar utuh pada satu plane yang selalu menghadap kamera.

**Batas sumber:** `.stitch/designs/ancient-sites-master.jpg` berukuran 1376×768 dan
memuat delapan bangunan. Town Center ada di kiri atas, dengan detail efektif sekitar
300×350 piksel; crop tepat ditentukan saat implementasi. Sumber ini hanya satu
sudut dan sudah mengandung shading. Proyeksi dapat mendekatkan tampilan dari sudut
tersebut, tetapi tidak menghasilkan detail belakang atau resolusi tinggi baru.
Kesetiaan dari semua arah memerlukan sumber tambahan dan review tersendiri.

## 2. Struktur file yang direncanakan

Semua path di bawah relatif terhadap root proyek; belum dibuat oleh rencana ini.

| File | Tanggung jawab |
|---|---|
| `.stitch/exports/town-center-direct-skin/source-spec.json` | Hash sumber, crop, ukuran, koordinat kamera, landmark dan cakupan bagian |
| `.stitch/exports/town-center-direct-skin/masks.json` | Polygon foreground dan bagian tampak, serta area tanpa sumber |
| `tools/assets/export_town_center_direct_skin.py` | Crop/masking teknis, ekspor PNG dan manifest secara deterministik |
| `public/building-skins/town-center-direct/design.png` | Gambar arsitektur ber-alpha pada resolusi crop asli |
| `public/building-skins/town-center-direct/manifest.json` | Kontrak sumber, proyeksi dan kompatibilitas geometri |
| `src/assets/TownCenterProjection.ts` | Tipe kontrak dan perhitungan UV dari kamera referensi |
| `src/assets/procedural/townCenterProjection.ts` | Varian volume 3D yang mengikuti sumber, dengan portal sungguhan |
| `src/assets/TownCenterDirectSkin.ts` | Validasi manifest, pemuatan tekstur, material dan disposal varian baru |
| `src/testing/TownCenterReview.ts` | Perbandingan sumber, model sekarang, dan skin langsung |
| `tests/assets/test_town_center_direct_skin.py` | Verifikasi crop, alpha, provenance dan determinisme ekspor |
| `tests/townCenterProjection.test.ts` | UV, cakupan, geometri dan landmark |
| `tests/townCenterDirectSkin.test.ts` | Material, kegagalan muat dan siklus hidup |
| `tests/e2e/stitch.spec.ts` | Review visual/browser dan occlusion |
| `docs/progress/2026-11-07-town-center-direct-stitch-skin.md` | Bukti visual, hasil pengukuran dan keputusan review |

Integrasi game pada tahap terakhir hanya menyentuh titik pemilihan model di
`BuildingFactory.ts`, penerusan ke factory ancient/Stitch, pemuatan di `main.ts`,
serta invalidasi tampilan di `ConstructionView.ts` jika diperlukan. Jangan mengubah
loader `TownCenterSkin.ts` atau melonggarkan manifest atlas bahan lama.

## 3. Tahapan implementasi setelah diperintahkan

### Tahap A — Siapkan sumber arsitektur langsung

**Deliverable:** PNG Town Center dari gambar asli, bukan atlas serat bahan.

- [x] Catat hash master, tentukan crop yang mencakup seluruh siluet, dan tandai
  minimal 12 landmark: sudut pondasi, ujung atap, puncak, dormer dan portal.
- [x] Tentukan polygon foreground serta cakupan dinding/atap/dormer/banner.
  Keluarkan latar dan bayangan tanah; pertahankan shading pada bangunannya.
- [x] Buat pengujian exporter: RGB piksel foreground sama dengan crop sumber,
  ukuran tetap native, alpha latar nol, dan dua ekspor menghasilkan hash sama.
- [x] Implementasikan `export_town_center_direct_skin.py` dengan argumen
  `--spec`, `--masks`, `--output`; tulis `design.png` dan manifest schemaVersion 1.
  Jangan melakukan repaint, upscale, remap palet atau normalisasi warna bahan.
- [x] Jalankan tes Python terarah dan inspeksi crop di atas latar terang/gelap.

**Kontrak sumber:** manifest menyimpan `buildingId: town_center`, `sourceSha256`,
`geometryVersion`, `image: { file, width, height, sha256 }`, `crop: [x,y,w,h]`,
`referenceCamera: { position, target, up, left, right, top, bottom, near, far }`,
`landmarks: [{ id, modelPoint, imagePixel }]` dan
`coverage: [{ partId, sourcePolygon, status }]`. `imagePixel` memakai origin kiri
atas crop; `modelPoint` memakai koordinat lokal bangunan, sebelum rotasi dunia.
`status` hanya `source` atau `fallback`; jangan menamai sisi rekaan sebagai sumber.

### Tahap B — Sesuaikan volume dan bake UV

**Deliverable:** Model review 3D dengan gambar asli menempel pada bidang yang tepat.

- [x] Definisikan tipe `TownCenterProjectionSpec` sesuai manifest tahap A dan
  `projectTownCenterUV(point: THREE.Vector3, spec: TownCenterProjectionSpec): THREE.Vector2`.
  Tambahkan tes pusat/sudut crop, orientasi V dan transform lokal-ke-dunia.
- [x] Kalibrasi kamera orthographic sumber dari sumbu dan landmark; jangan langsung
  menyamakan sudut sumber dengan kamera game. Jika satu kamera tidak cukup karena
  distorsi ilustrasi, catat selisih dan gunakan penyesuaian UV per bagian yang
  eksplisit; jangan menggeser tekstur berdasarkan kamera aktif.
- [x] Buat `createProjectedTownCenter(spec, sourceMaterial, fallbackMaterial): THREE.Group`
  di file varian model baru. Pertahankan footprint dan portal, sesuaikan volume
  atap/dormer/pondasi dengan sumber. Pisahkan vertex pada seam antarbagian.
- [x] Bake UV menggunakan kamera referensi tetap. Pilih triangle yang memang tampak
  pada sumber; permukaan tertutup dormer atau di belakang bangunan memakai fallback.
  Mask bagian mencegah banner atau dormer tercetak lagi pada dinding di belakangnya.
- [x] Verifikasi geometri memiliki volume pada tiga sumbu, portal terbuka, UV valid,
  serta tidak ada bidang sumber yang menembus bagian lain. Jangan membuat rongga
  palsu hanya dengan menghapus alpha di tengah dinding solid.
- [x] Implementasikan `TownCenterDirectSkin` dengan `load(): Promise<void>` dan
  `dispose(): void`; status `idle | loading | ready | fallback | disposed`.
  Validasi schema, buildingId, geometryVersion, ukuran dan path aset yang diizinkan.
- [x] Gunakan material khusus `MeshBasicMaterial`: map sRGB, warna putih,
  `vertexColors: false`, `toneMapped: false`, tanpa pengali shading lama. Gunakan
  nearest filtering, clamp, depth test/write dan alpha test pada tepi; hindari
  transparent blending untuk seluruh bangunan. Material ini tidak mengubah material bersama lama.
- [x] Uji concurrent load, BASE_URL bersubfolder, manifest salah, PNG gagal,
  dispose saat loading, pemuatan ulang setelah gagal, dan pemisahan kepemilikan aset.

Proyeksi memakai `Vector3.project()` dan mengonversi NDC ke koordinat UV. Orientasi
gambar/flipY diuji dengan corner fixture, bukan diasumsikan. Three.js mendokumentasikan
[proyeksi vektor](https://threejs.org/docs/pages/Vector3.html) serta
[material tanpa pengaruh lampu dan color map](https://threejs.org/docs/pages/MeshBasicMaterial.html).

### Tahap C — Review satu bangunan, lalu berhenti

**Deliverable:** Halaman perbandingan yang memperlihatkan perbedaan pendekatan.

- [x] Tambahkan mode **Desain Stitch langsung** ke halaman review yang sudah ada;
  pertahankan sumber asli, mode tanpa tekstur dan skin bahan sebagai pembanding.
- [x] Sediakan sudut sumber terkalibrasi, sudut game, rotasi 90°, wireframe,
  overlay landmark/siluet dan penanda area fallback. Tampilkan resolusi sumber.
- [x] Ukur pada ukuran crop native. Target awal: median error landmark ≤2 piksel,
  maksimum ≤5 piksel dan silhouette IoU ≥0,95. Jika tidak tercapai, jelaskan area
  selisih; jangan menganggap skor sebagai pengganti review visual pengguna.
- [x] Periksa atap, dormer, pintu, batu, kayu dan banner: pola arsitektur asli
  terlihat, tidak terduplikasi, tidak bertumpuk dengan detail prosedural lama.
- [x] Periksa empat arah dan transisi putar. Tekstur harus melekat; sisi tanpa
  gambar tidak boleh disajikan seolah telah cocok dengan Stitch.
- [x] Gunakan objek uji depth di depan/belakang model dan melalui portal untuk
  memverifikasi occlusion. Periksa tepi PNG pada latar terang/gelap dan zoom dekat.
- [x] Jalankan unit test terarah, `npm run build` dan Playwright review terkait.
  Catat screenshot sumber/model, metrik, mesh/texture count dan area yang belum tercakup.
- [x] **STOP — minta review visual pengguna terhadap satu Town Center ini.**
  Jangan mengaktifkan model baru di game, menghasilkan sisi tambahan, atau
  menerapkan ke bangunan lain sebelum pengguna menanggapi checkpoint ini.

### Tahap D — Lengkapi sisi yang belum memiliki sumber, setelah review

**Deliverable:** Cakupan skin untuk empat orientasi game pada Town Center saja.

- [ ] Berdasarkan review, daftar permukaan tanpa sumber dan sudut yang memerlukan
  perbaikan. Jika diperlukan, gunakan Stitch untuk menghasilkan referensi tambahan
  Town Center yang sama; review kesamaan arsitektur sebelum ekspor.
- [ ] Cocokkan jumlah/posisi pintu, dormer, banner, proporsi dan arah shading antar
  referensi. Jangan otomatis mirror fasad depan menjadi fasad belakang.
- [ ] Tambahkan sumber yang diterima ke manifest dan pemetaan tetap per permukaan.
  Pakai atlas dengan gutter jika dibutuhkan, tanpa upscale art asli. Batas awal
  atlas 1024×1024 RGBA dan target maksimal 24 mesh; ukur kebutuhan sebelum menaikkan.
- [ ] Uji seam, coverage, warna dan keempat sudut termasuk saat kamera bertransisi.
  Jangan mengganti gambar seluruh bangunan mengikuti arah kamera sehingga terjadi popping.
- [ ] **STOP untuk review cakupan Town Center.** Jika referensi tambahan belum
  konsisten, pertahankan prototipe sebagai review satu sudut, jangan klaim selesai 360°.

### Tahap E — Integrasi Town Center ke game, setelah disetujui

**Deliverable:** Varian yang telah direview muncul di settlement dengan fallback aman.

- [ ] Tambahkan pilihan tampilan terbatas `town_center` pada alur factory yang sama
  dengan review; bangunan lain tetap memakai factory/material sekarang.
- [ ] Muat aset nonblocking. Jika siap setelah model lama dibuat, refresh hanya
  visual Town Center melalui appearance revision pada signature view. Jika gagal,
  pertahankan model lama tanpa mengubah state simulasi.
- [ ] Pastikan disposal geometry/material/texture punya satu pemilik dan tidak
  membebaskan aset yang masih dipakai instance lain atau halaman review.
- [ ] Verifikasi pintu dan warga pulang/masuk, picking, footprint, empat orientasi,
  zoom, load/save, fallback serta produksi dari BASE_URL yang benar.
- [ ] Town Center awal sudah selesai dan tidak dapat dibeli. Jangan menambahkan
  konstruksi atau animasi baru pada pilot ini. Penerapan ke bangunan yang dapat
  dibangun nanti wajib menangani interaksi UV dengan animasi skala konstruksi
  dalam rencana berikutnya, agar lukisan tidak meregang selama pembangunan.
- [ ] Jalankan tes regresi yang relevan, suite unit, build dan smoke production;
  simpan bukti di dokumen progress. Jangan membawa master `.stitch` atau overlay
  debug ke bundle produksi.
- [ ] **STOP setelah review integrasi Town Center.** Bangunan lain dan animasi
  membutuhkan instruksi lanjutan pengguna.

## 4. Hasil yang diharapkan dan batas penerimaan

Hasil pertama harus menunjukkan perubahan besar pada kesetiaan desain: susunan
fasad dan atap berasal langsung dari gambar Stitch. Geometri tetap menyediakan
volume, depth dan portal, dengan pengurangan relief pada detail kecil sebagai
trade-off. Dari satu gambar, kesamaan paling tinggi dinilai pada sudut sumber;
sisi tersembunyi dan detail di atas resolusi asli tidak dapat dipulihkan otomatis.

Urutan persetujuan: **prototipe sumber langsung → review satu Town Center →
kelengkapan sudut → review → integrasi game → review**. Penyusunan dokumen ini
tidak memberikan persetujuan untuk menjalankan salah satu tahap tersebut.
