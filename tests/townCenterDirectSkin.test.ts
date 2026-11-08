import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import fullManifest from '../public/building-skins/town-center-direct/manifest.json';
import { TownCenterDirectSkin } from '../src/assets/TownCenterDirectSkin';

const texture = () => new THREE.Texture({ width: 360, height: 366 } as HTMLImageElement);
const manifest = { ...fullManifest };
delete (manifest as { completion?: unknown }).completion;

it('loads the additional Stitch face atlas atomically and disposes both maps once', async () => {
  const base = texture(), extra = new THREE.Texture({ width: 512, height: 512 } as HTMLImageElement);
  const fetchTexture = vi.fn(async (url: string) => url.endsWith('/completion.png') ? extra : base);
  const a = vi.spyOn(base, 'dispose'), b = vi.spyOn(extra, 'dispose');
  const skin = new TownCenterDirectSkin({ fetchManifest: async () => fullManifest, fetchTexture });
  await skin.load();
  expect(fetchTexture).toHaveBeenCalledTimes(2);
  expect(skin.fallbackMaterial.map).toBe(extra); expect(skin.fallbackMaterial.color.getHex()).toBe(0xffffff);
  expect(extra.colorSpace).toBe(THREE.SRGBColorSpace); expect(extra.generateMipmaps).toBe(false);
  skin.dispose(); skin.dispose(); expect(a).toHaveBeenCalledOnce(); expect(b).toHaveBeenCalledOnce();
});

it('releases the successful image if the other face atlas fails, and rejects untrusted completion paths', async () => {
  const base = texture(), release = vi.spyOn(base, 'dispose');
  const skin = new TownCenterDirectSkin({ fetchManifest: async () => fullManifest,
    fetchTexture: async url => { if (url.endsWith('/completion.png')) throw new Error('unavailable'); return base; } });
  await expect(skin.load()).rejects.toThrow('unavailable'); expect(release).toHaveBeenCalledOnce();
  expect(skin.material.map).toBeNull(); expect(skin.fallbackMaterial.map).toBeNull(); skin.dispose();
  const raw = structuredClone(fullManifest); raw.completion.image.file = '../other.png';
  const fetchTexture = vi.fn(async () => texture());
  const invalid = new TownCenterDirectSkin({ fetchManifest: async () => raw, fetchTexture });
  await expect(invalid.load()).rejects.toThrow(); expect(fetchTexture).not.toHaveBeenCalled(); invalid.dispose();
});

it('loads once below BASE_URL, preserves original colors and owns only its own assets', async () => {
  const map = texture(), fetchTexture = vi.fn(async () => map);
  const fetchManifest = vi.fn(async () => manifest), release = vi.spyOn(map, 'dispose');
  const other = new THREE.MeshBasicMaterial({ color: 'red' });
  const skin = new TownCenterDirectSkin({ baseUrl: '/city/', fetchManifest, fetchTexture });
  await Promise.all([skin.load(), skin.load()]);
  expect(fetchManifest).toHaveBeenCalledOnce(); expect(fetchTexture).toHaveBeenCalledOnce();
  expect(fetchTexture).toHaveBeenCalledWith('/city/building-skins/town-center-direct/design.png');
  expect(skin.material.map).toBe(map); expect(skin.material.color.getHex()).toBe(0xffffff);
  expect(skin.material.vertexColors).toBe(false); expect(skin.material.toneMapped).toBe(false);
  expect(skin.material.transparent).toBe(false); expect(skin.material.depthWrite).toBe(true);
  expect(skin.material.side).toBe(THREE.FrontSide); expect(map.colorSpace).toBe(THREE.SRGBColorSpace);
  expect(other.map).toBeNull(); expect(other.color.getHex()).toBe(0xff0000);
  skin.dispose(); skin.dispose(); expect(release).toHaveBeenCalledTimes(1);
  await expect(skin.load()).rejects.toThrow('disposed'); other.dispose();
});

it('rejects bad manifests and failed textures, then retries without poisoning any existing model', async () => {
  for (const raw of [{ ...manifest, image: { ...manifest.image, file: '../x.png' } },
    { ...manifest, image: { ...manifest.image, width: 0 } },
    { ...manifest, referenceCamera: { ...manifest.referenceCamera, position: [0, 0, 0] } }]) {
    const fetchTexture = vi.fn(async () => texture());
    const skin = new TownCenterDirectSkin({ fetchManifest: async () => raw, fetchTexture });
    await expect(skin.load()).rejects.toThrow(); expect(fetchTexture).not.toHaveBeenCalled();
    expect(skin.status).toBe('fallback'); skin.dispose();
  }
  const fetchTexture = vi.fn().mockRejectedValueOnce(new Error('missing')).mockResolvedValueOnce(texture());
  const skin = new TownCenterDirectSkin({ fetchManifest: async () => manifest, fetchTexture });
  await expect(skin.load()).rejects.toThrow('missing'); expect(skin.status).toBe('fallback');
  await skin.load(); expect(skin.status).toBe('ready'); skin.dispose();
});

it('releases late textures after disposal and rejects mismatching dimensions', async () => {
  let resolve!: (map: THREE.Texture) => void;
  const map = texture(), release = vi.spyOn(map, 'dispose');
  const skin = new TownCenterDirectSkin({ fetchManifest: async () => manifest,
    fetchTexture: () => new Promise<THREE.Texture>(r => { resolve = r; }) });
  const pending = skin.load(); await vi.waitFor(() => expect(resolve).toBeDefined());
  skin.dispose(); resolve(map); await expect(pending).rejects.toThrow('disposed');
  expect(release).toHaveBeenCalledOnce(); expect(skin.status).toBe('disposed');
  const wrong = new THREE.Texture({ width: 1, height: 1 } as HTMLImageElement);
  const wrongRelease = vi.spyOn(wrong, 'dispose');
  const invalid = new TownCenterDirectSkin({ fetchManifest: async () => manifest, fetchTexture: async () => wrong });
  await expect(invalid.load()).rejects.toThrow('dimensions'); expect(wrongRelease).toHaveBeenCalledOnce(); invalid.dispose();
});
