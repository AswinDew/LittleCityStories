# Town Center Stitch Texture/Skin — Implementation Plan

> **Status: TAHAP A SELESAI — MENUNGGU REVIEW BAHAN.** Pengguna telah memerintahkan
> implementasi. Lima kandidat bahan telah disiapkan; Tahap B–E belum dijalankan.
> Tunggu review Checkpoint A sebelum membuat atlas, UV dan integrasi material.
> Persetujuan terhadap Town Center sebelumnya bukan izin memperluas ke bangunan lain.
>
> **For agentic workers:** Setelah diizinkan, gunakan `superpowers:executing-plans`
> untuk implementasi bertahap. Jangan menjalankan semua tahap melewati checkpoint
> review pengguna. Rencana ini bukan persetujuan eksekusi.

**Goal:** Mempertahankan bentuk Town Center yang sudah mendapat tanggapan positif,
sambil membawa detail permukaan Stitch ke model 3D melalui texture atlas dan UV.

**Architecture:** Geometri menangani siluet, volume, pintu, tangga, jendela atap,
dan tebal jerami. Tekstur menangani serat, retakan, noda, tenunan dan detail kecil.
Gunakan sumber Stitch yang terlacak, atlas khusus Town Center, serta material
terisolasi dengan fallback ke tampilan vertex-color yang sekarang.

**Tech stack:** Vanilla Three.js, TypeScript/Vite, Stitch MCP dan workflow
`stitch::generate-design`; normalisasi/packing teknis melalui pipeline aset lokal.
Tidak membutuhkan engine baru, Blender, atau generator gambar lain.

**Spec:** Permintaan pengguna: susun implementation plan saja untuk memakai desain
Stitch sebagai texture/skin; implementasi menunggu perintah. Scope tetap satu
Town Center sebagaimana `docs/progress/2026-11-07-town-center-fidelity.md`.

## 1. Keputusan desain yang diusulkan

**Rekomendasi: tekstur per bahan pada model 3D yang sekarang.** Gunakan satu atlas
yang berisi jerami, batu, kayu, plester, kain/banner, serta warna trim dan rongga.
Model mempertahankan bentuk yang sudah lebih dekat ke referensi, termasuk ujung
jerami membulat. Detail material memperkaya permukaan tersebut.

Alternatif yang dipertimbangkan:

| Pendekatan | Kesesuaian dengan game |
|---|---|
| Memproyeksikan seluruh gambar bangunan ke model | Cocok untuk membandingkan satu sudut; sisi tersembunyi tidak tersedia dan gambar berperspektif meregang saat diputar. Bukan pilihan utama. |
| Atlas material + pemetaan UV | Mempertahankan volume, pintu terbuka, konstruksi dan empat arah pandang; paling sesuai dengan model yang sekarang. Direkomendasikan. |
| Mengganti bangunan dengan sprite/billboard | Mendekati gambar sumber dari satu sudut, tetapi mengubah presentasi/occlusion. Di luar scope ini. |

Gambar sumber adalah ilustrasi isometrik, bukan UV atlas siap pakai. **Tidak ada
janji bahwa menempelkan JPEG utuh akan menghasilkan tampilan identik.** Perspektif,
bayangan ilustrasi, tepi objek dan latar perlu dipisahkan dari bahan teksturnya.

## 2. Kondisi kode saat ini

- `src/assets/procedural/townCenter.ts`: `CivicSurfaces` menggabungkan posisi dan
  warna ke delapan mesh berdasarkan tahap konstruksi. Belum mengeluarkan UV.
  Transformasi box, beam, triangle dan capsule terjadi sebelum batching.
- `stitch_civic_illustrated` di `MaterialLibrary.ts` memakai `MeshBasicMaterial`,
  `vertexColors: true`, `toneMapped: false`. Warna sudah mengandung shading.
  Menambahkan texture map begitu saja akan mengalikan tekstur dengan warna lama.
- Cache geometri memakai key `stitch/civic-v2/...`; penambahan atribut UV perlu
  versi key baru, tanpa mengubah kepemilikan/ref count.
- `GeneratedAssetLoader` saat ini melayani manifest ikon, terrain dan atlas warga.
  Validator/generator lama menerapkan palet raster terkunci. Jangan memaksa skin
  bangunan melewati konversi 32px/28 warna yang membuang detail referensi.
- Halaman `/?buildingReview=town_center` sudah membandingkan sumber asli dan model
  dari factory yang sama dengan game. Halaman ini menjadi tempat review skin.

## 3. Batas scope dan ukuran awal

- Hanya Town Center. Tidak mengubah bangunan lain, warga, terrain, HUD, ekonomi,
  jalur warga, footprint 3×3, titik masuk, simulasi, atau animasi.
- Pertahankan geometri/siluet sekarang. Tidak menghapus ikatan jerami, batu,
  dormer atau detail besar hanya karena sudah tersedia tekstur.
- Acuan asli: `.stitch/designs/ancient-sites-master.jpg`, bangunan pertama.
  Project Stitch: `9572784485551125903`; design system:
  `assets/7e69032a14294b34916f28326fae80ba`.
- Tidak menimpa sumber/master, desain atau hasil review Town Center sebelumnya.
- Target awal satu atlas opaque **1024×1024 PNG**, total alokasi texel dasar sekitar
  4 MiB RGBA tanpa mipmap. Ini batas atlas, bukan ukuran unduhan atau total VRAM.
- Target tetap delapan mesh/draw calls dasar untuk Town Center; pertahankan tes
  batas maksimal 24 mesh. Jangan membuat material per batu atau per ikat jerami.
- Tidak menambah normal/roughness/metalness map, PBR, custom shader atau efek global
  pada pilot ini. Bahan berilustrasi dan warna menjadi prioritas.
- Kualitas detail tekstur menentukan resolusi patch, bukan upscaling semu dari
  crop kecil. Bila atlas 1024 tidak cukup, jelaskan bukti sebelum mengubah budget.

## 4. Review focus

1. Tekstur tidak gepeng, miring, terbalik atau meregang pada atap, balok dan dormer.
2. Bayangan/warna tidak dikalikan dua kali sehingga bangunan terlalu gelap.
3. Sambungan atlas tidak menampilkan garis latar, tulisan, UV bleed atau jahitan.
4. Tekstur gagal/lambat dimuat tetap menghasilkan model sekarang yang dapat dipakai.
5. Cache, preview, konstruksi dan cleanup tidak merusak instance lain atau aset lain.

## 5. Tahapan implementasi setelah ada perintah

### Tahap A — Menyiapkan bahan tekstur dari Stitch

**Files baru yang direncanakan:**

- `.stitch/designs/town-center-skin/`: sumber/calon material asli dan metadata.
- `.stitch/exports/town-center-skin/source-spec.json`: sumber hash, crop atau empat
  titik bidang untuk rectification, orientasi serat dan hasil penilaian.
- `.stitch/exports/town-center-skin/review.html`: swatch pada ukuran asli dan ulangannya.

- [x] Audit crop sumber: pisahkan area yang berisi tekstur bahan dari outline besar,
  latar, tulisan, benda lain dan bayangan bangunan. Catat resolusi yang benar-benar ada.
- [x] Untuk bidang yang memadai, lakukan ekstraksi/rectification teknis dan simpan
  transformasinya. Jangan meratakan seluruh bangunan menjadi satu kulit.
- [x] Bila crop tidak memadai atau sisi tidak terlihat, minta **swatch material datar,
  tampak tegak lurus** melalui Stitch dalam project/design system yang sama, memakai
  master sebagai referensi. Tidak mengklaim Stitch mengekspor UV/mesh/PBR map.
  Inspeksi file gambar asli, bukan hanya screenshot board atau uraian tool.
- [x] Swatch baru tidak boleh mengubah gaya. Jika hasil Stitch tidak memadai, catat
  gap dan berhenti pada bahan itu; jangan menggantinya dengan art prosedural lain.
- [x] Jerami mengikuti arah serat, kayu mengikuti panjang balok; batu menyediakan
  **grain permukaan**, bukan pola dinding bata kedua di dalam tiap batu 3D.
  Plester bernoda halus; kain mempertahankan corak banner yang khas.
- [x] Hindari bayangan arah matahari yang kuat pada swatch dasar. Pertahankan detail
  ilustratif kecil, tetapi pisahkan shading orientasi bidang dari gambar bahan.

**Checkpoint A:** Tunjukkan swatch dan asalnya kepada pengguna. Tunggu review sebelum
memasang skin ke model. Tahap ini belum mengganti aset game.

### Tahap B — Atlas dan kontrak aset yang dapat direproduksi

**Files baru yang direncanakan:**

- `tools/assets/export_town_center_skin.py`.
- `tools/assets/town-center-skin-layout.json`: kontrak region tetap, diimpor helper
  TypeScript dan dibaca exporter Python; UV bisa dibentuk sebelum texture dimuat.
- `tests/assets/test_town_center_skin.py`.
- `public/building-skins/town-center/atlas.png` dan `manifest.json`.

**Interface:** `export_skin(source_spec: Path, output: Path) -> dict`.
CLI yang dituju: `python tools/assets/export_town_center_skin.py --source-spec
.stitch/exports/town-center-skin/source-spec.json --output public/building-skins/town-center`.

Manifest schema version 1 mencatat `buildingId: town_center`, ukuran atlas, hash PNG,
hash sumber, `regions` dengan rectangle pixel `[x,y,width,height]`, arah serat dan
orientasi shading, serta `colorSpace: srgb`. Path relatif; tanpa timestamp/path mesin.
Rectangles tidak bertumpang tindih dan mempunyai gutter edge-extrusion 8px.
Susunan region berasal dari `town-center-skin-layout.json`, bukan packing bebas
yang berubah pada setiap generasi. Manifest mencantumkan versi/hash layout yang
sama. Runtime menolak layout yang berbeda dari kontrak geometri; tidak mengimpor
file dari `public/` langsung ke TypeScript.

- [ ] Tulis/run tes gagal untuk hash sumber berubah, path keluar folder, region
  keluar batas/bertumpuk, dan gutter yang salah; kegagalan tidak menulis output parsial.
- [ ] Implementasikan packing deterministik; jangan mengubah `public/generated/`
  atau menjalankan regenerasi atlas warga/ikon/terrain.
- [ ] Tes memastikan manifest dan kontrak layout TypeScript/Python identik. Region
  yang hilang atau berubah tanpa versi baru harus ditolak sebelum publish.
- [ ] Sediakan patch varian terang/sisi/gelap yang terkalibrasi dari bahan yang sama
  serta swatch trim/rongga. Varian orientasi membawa shading ilustratif satu kali.
  Hindari pola kuat yang menggandakan garis grout/rangka pada geometri.
- [ ] Pertahankan warna/detail sumber; validasi skin melalui kontrak tersendiri,
  tanpa quantization ke palet sprite 28 warna. Tidak perlu alpha transparan pada atlas.
- [ ] Verifikasi tes lulus dan dua ekspor menghasilkan file byte-identik.

### Tahap C — UV Town Center tanpa perubahan bentuk

**Modify:** `src/assets/procedural/townCenter.ts`.
**Create:** `src/assets/TownCenterSkinLayout.ts`, `tests/townCenterSkin.test.ts`.

**Interface:** `mapTownCenterUV(region: SkinRegion, u: number, v: number): [number, number]`.
`SkinRegion` memakai rectangle pixel/ukuran atlas dari manifest; output normalized
UV berada di bagian dalam gutter. Tetapkan konvensi V secara eksplisit agar tidak
terjadi flip ganda dengan `TextureLoader`.
Helper mengimpor kontrak layout bersama dari Tahap B; manifest runtime harus cocok
dengan kontrak tersebut. Geometri tidak menunggu fetch dan UV tidak diubah setelah
di-cache. Region mencakup lima bahan, varian orientasinya, dan swatch trim/rongga.

- [ ] Tes gagal: `uv.count === position.count`, nilai finite, semua UV di region
  interior yang benar; uji sudut region dan orientasi V dengan fixture asimetris.
- [ ] Simpan UV lokal saat `stamp()` mentransformasi vertex. Jangan menebak UV
  dari posisi dunia gabungan setelah semua bagian kehilangan identitasnya.
- [ ] Box/beam memakai proyeksi per muka; serat balok mengikuti sumbu panjang lokal.
  Capsule jerami memakai arah panjang lokal dan seam di sisi bawah. Triangle/gable
  dan banner memiliki mapping tersendiri. Hindari satu patch stretched pada semua muka.
- [ ] Pilih region berdasarkan bahan dan arah muka lokal; variasikan crop secara
  deterministik agar semua batu/ikatan jerami tidak tampak seperti salinan identik.
- [ ] Atlas patch yang tidak seamless tidak boleh diulang seolah seamless. Pilih
  crop yang sesuai atau verifikasi tepinya terlebih dahulu.
- [ ] Versikan key geometri cache ke `stitch/civic-v3-uv/...`. Pertahankan warna lama
  untuk baseline/fallback, posisi vertex, bounds, pintu dan metadata konstruksi.
- [ ] Jalankan tes UV serta tes Town Center/ownership/footprint yang sudah ada.

### Tahap D — Material, loading dan fallback yang terisolasi

**Create:** `src/assets/TownCenterSkin.ts`, `tests/townCenterSkinLoading.test.ts`.
**Modify:** `MaterialLibrary.ts`, `townCenter.ts`, `src/main.ts`,
`src/testing/TownCenterReview.ts`.

**Interface:** `TownCenterSkin.load(): Promise<void>` dan `dispose(): void`.
Owner ini memegang texture; `MaterialLibrary` memegang material. Dependency loader
dapat diinjeksi untuk menguji load gagal/terlambat. Tidak mencampur manifest skin
dengan manifest warga/terrain yang dipakai `GeneratedAssetLoader`.

- [ ] Tes gagal untuk load sekali, retry, dimensi/metadata invalid, load gagal,
  dispose dua kali, dan texture yang selesai setelah owner sudah disposed.
  Validasi versi/hash layout terhadap kontrak UV dan dimensi gambar hasil decode
  sebelum material diaktifkan; hash sumber/PNG juga diverifikasi dalam pipeline ekspor.
- [ ] Material `stitch_civic_skin` adalah material bersama **terpisah** dari
  `stitch_civic_illustrated`. Sebelum siap, parameter tampilannya meniru fallback lama.
- [ ] Setelah atlas tervalidasi, aktifkan `map`, warna putih, `vertexColors: false`,
  `toneMapped: false` dan `needsUpdate`. Shading berasal dari region atlas; warna/shading
  vertex lama tidak dikalikan lagi. Jangan menambah Lambert/PBR di atas baked shading.
- [ ] Sampling awal: `SRGBColorSpace`, `NearestFilter` untuk min/mag, tanpa mipmap,
  `ClampToEdgeWrapping`. Inspeksi shimmer saat zoom; perubahan sampling harus berdasarkan
  perbandingan render dan tidak mengubah sampling sprite/terrain global.
- [ ] Terapkan pembaruan pada material bersama Town Center saja, tanpa menukar model,
  mengubah snapshot, memulai ulang simulasi atau memblokir input sambil menunggu texture.
- [ ] Jika gagal, pertahankan fallback berwarna lama dan tampilkan alasan di halaman
  review developer; jangan membuat aplikasi gagal atau otomatis memakai art lain.
- [ ] Bereskan cleanup main/review agar texture dilepas tepat sekali, material hanya
  oleh library, dan penyelesaian async setelah teardown tidak memasang ulang aset.
- [ ] Preview clone tetap memiliki materialnya sendiri; disposal clone tidak melepas
  texture bersama. Baseline review menggunakan material lama yang tidak dimutasi.

### Tahap E — Perbandingan visual dan regresi

**Modify:** `src/testing/TownCenterReview.ts`, `tests/e2e/stitch.spec.ts`,
`tests/e2e/production.spec.ts`. **Dokumentasi hasil:**
`docs/progress/2026-11-07-town-center-stitch-skin.md`.

- [ ] Tambahkan perbandingan master asli / model baseline / model bertekstur dengan
  skala dan kamera sama, toggle jelas dan sudut 0/90/180/270°. Gunakan factory model
  yang sama dengan game; jangan mengganti preview dengan gambar render palsu.
- [ ] Ambil gambar pada zoom game 1× dan 2.8×, sudut Stitch dan sudut game. Periksa
  detail jerami, ukuran grain, plester, batu, kayu, banner, seam dan konsistensi warna.
- [ ] Inspeksi kiri/belakang yang tidak terlihat pada sumber: bahan harus konsisten,
  tanpa tulisan/objek duplikat atau claim bahwa sisi itu diekspor langsung dari JPEG.
- [ ] Uji request atlas hanya sekali, jalur berbasis `BASE_URL`, gagal load dengan
  fallback yang nyata, pergantian baseline/skin, disposal dan console/network error.
- [ ] Pastikan konstruksi, pintu/kehadiran warga, bounds dan mesh budget tetap lulus.
  Catat draw calls, jumlah texture dan ukuran file; jangan menyimpulkan FPS perangkat
  pengguna hanya dari software WebGL.
- [ ] Jalankan `python -m unittest discover -s tests/assets`, `npm.cmd test`,
  `npm.cmd run build`, dan dengan `PLAYWRIGHT_CHANNEL=chrome` jalankan
  `npm.cmd run test:e2e` serta `npm.cmd run test:e2e:production`.
- [ ] Production memuat atlas lokal dan tidak memuat sumber JPEG `.stitch` atau halaman
  review developer. Lakukan fresh code review dan perbaiki masalah fungsi yang ditemukan.

**Checkpoint B:** Tunjukkan hasil Town Center bertekstur dan perbandingan langsung
kepada pengguna. **Berhenti dan tunggu review.** Lulus tes bukan persetujuan visual.
Jangan menerapkan skin ke bangunan lain atau melanjutkan karakter/animasi otomatis.

## 6. Kriteria penerimaan

- Serat jerami/kayu dan detail batu/kain lebih dekat ke ilustrasi Stitch, terbaca
  di game, dan tidak mengorbankan bentuk Town Center yang sekarang.
- Tidak ada pola bata di dalam bata, tekstur terbalik, perspektif terpanggang pada
  bidang datar, seam terang, atau warna terlalu gelap akibat tint ganda.
- Empat arah pandang tetap merupakan model 3D utuh; pintu, konstruksi, footprint,
  resource ownership dan kontrol game tetap benar.
- Sumber/hash dan proses ekspor dapat ditelusuri serta diulang. Aset lain identik
  dengan sebelum pilot. Atlas tidak memperbanyak mesh/material per detail.
- Fallback tetap dapat dimainkan jika texture gagal dimuat.
- Pengguna menilai Town Center bertekstur sudah sesuai sebelum rollout lebih luas.

## 7. Kondisi awal dan handoff terbaru

Saat penyusunan awal, hanya dokumen rencana ini dibuat. Setelah perintah implementasi,
Tahap A menghasilkan lima kandidat bahan dari Stitch dan galeri review lokal.
Lihat `docs/progress/2026-11-07-town-center-stitch-skin.md` untuk sumber, penolakan
draft yang tidak sesuai, validasi dan hasil review teknis. Runtime tetap tidak diubah.
**Checkpoint A masih menunggu review pengguna; seluruh Tahap B–E tetap pending.**
