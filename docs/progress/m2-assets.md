# M2 execution ledger — plan: docs/superpowers/plans/2026-10-15-civilization-town-mvp.md

Scope: Tasks 4–6 only; stop before M3. Base commit: 14a6688 (M1), branch codex/m2-assets.

- Pre-flight 4→5: generator manifest/texture keys feed the cached nearest-filtered Three.js loader. Shared palette is the source for both pixels and ancient material colors.
- Pre-flight 4→6: atlas metadata is plain JSON; integer frame rectangles, fixed 32×32 size and foot anchor (16,30) are shared by Python validation and TypeScript sampling.
- Ruling: preserve the legacy playable catalog until M3; expose ancient models and sprite animation in a development-only asset inspection gallery. Do not fake active citizens or domain construction in M2.
- Ruling: use bundled Python 3.12/Pillow 12.3 because Windows python alias is unavailable; document portable Python installation commands as well.
- Ruling: stay in the current checkout on a new feature branch; no commit, merge or push is requested.

- Ruling: keep 32×32 character frames after inspecting the four-role draft and actual Three.js gallery at 1×/1.4× gameplay zoom. The 16/30 foot anchor remains unchanged across all 224 frames. No 48px fallback was needed.
- Ruling: load `public/generated/manifest.json` through its public URL. Vite explicitly rejects importing public assets into JavaScript; the loader caches the fetched manifest and validates relative PNG metadata.
- Ruling: palette hash uses canonical JSON rather than raw bytes so Git CRLF/LF conversion or formatting does not invalidate identical palette contents. PNG content hashes remain byte-exact.
- Ruling: generated grass patches cover four logical tiles to reduce minification noise. This presentation scale does not alter grid coordinates or building footprints.

## Delivered

- Task 4: original warm-earth 28-color palette, deterministic Pillow primitives and generator, three seamless terrain textures, nineteen resource/UI/catalog/technology icons, portable hashed manifest, CLI validator, and four scoped project skills in `.agents/skills/`.
- Task 5: eight ancient building factories and five environment types. Reusable wall/roof/opening/fence components share cached geometry with reference-counted release; previews own material clones. Model geometry is finite/nonempty and fits its declared footprint without an overhang exception.
- Task 6: 512×448 atlas containing 224 frames (four professions × four directions × two idle/six walk/six work frames). Explicit directional anatomy and tools, binary alpha, palette checks, stable foot anchors, immutable metadata, transition/reset/rewind/loop sampling and a disposable sprite view.
- Normal settlement rendering uses generated grass and ancient environment. The legacy playable catalog remains as planned until M3. `/?assets=1` on the development server inspects every generated asset, model and animation without adding citizens/buildings to simulation state. Production excludes the gallery and test hook.

## Verification — 2026-10-16

| Check | Actual result |
|---|---|
| `npm.cmd test` | 104 tests passed across 18 files |
| `python -m unittest discover -s tests/assets` | 8 tests passed, including reproducibility, palette/alpha/dimensions/seams, tampering, missing atlas PNG entry, frame matrix and canonical palette hash |
| Generator + `validate_assets.py --input public/generated` | 23 PNGs generated and validated, all required frames and metadata present |
| Pixel-art skill `quality_audit.py`, every generated PNG | All 23 passed; binary alpha, color budget, orphan/grid checks |
| Skill-creator `quick_validate.py` | All four project skills valid; reviewer also checked ownership, references, workflows and milestone limits |
| `PLAYWRIGHT_CHANNEL=chrome npm.cmd run test:e2e` | 6 passed: M1 interactions/lifecycle plus M2 gallery, all icons loaded, frame advancement and no page/console errors |
| `PLAYWRIGHT_CHANNEL=chrome npm.cmd run test:e2e:production` | 1 passed; generated terrain PNGs load successfully, no test hook or development gallery even with query parameters |
| `npm.cmd run build` | TypeScript strict and Vite production build passed |
| Production artifact search | No `__CIV_TOWN_TEST__`, `createAssetGallery` or gallery title in dist |
| Screenshots | `test-results/m2-asset-gallery.png` and normal-world `test-results/m1-foundation.png` inspected |

The Python executable used here was `C:/Users/ROG/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe` (3.12.14, Pillow 12.3.0). No new runtime npm dependency was added. Official skill validation needed PyYAML; it was installed only under ignored `test-results/skill-validation`, leaving the bundled/global Python installation unchanged.

## Review and fixes

- Fresh read-only review examined generators, atlas, factories, cache ownership, loader retry/late disposal, animation transitions/UV/anchor and all four skills.
- A new missing-atlas regression test demonstrated the validator could return success without `assets.citizens`. Added that required key; the suite now rejects the corrupt manifest. Reviewer confirmed the fix and found no further high-confidence M2 defect.
- Added corruption tests that update file hashes to ensure actual alpha rules still reject bad pixels, and tests for out-of-bounds frame metadata.
- Model tests caught rocks below ground; corrected their centers and retested. Cache release then passed after all models could be disposed normally.
- Portability test first failed for absent canonical hashing, then passed after shared canonical JSON hashing; reviewer approved this targeted follow-up.
- Browser testing caught unsupported direct imports of public manifest JSON; switched runtime loading to a cached fetch from the Vite public URL and reran the suite.

Vite still reports an advisory main-chunk warning: 576.56 kB minified / 151.15 kB gzip. This remains a measured build-size baseline for Task 22; no threshold was weakened. Software WebGL/Chrome smoke tests do not certify device FPS, full later gameplay, or genuine BFCache eligibility.

M2 is complete after verification/review. M3 construction/resource cutover, M5 population behavior, M7 persistence and M8 measured polish remain intentionally unimplemented. Stop until the user requests continuation.
