import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import manifest from '../public/building-skins/town-center/manifest.json';
import { TownCenterSkin } from '../src/assets/TownCenterSkin';

const texture = (width = 1024) => new THREE.Texture({ width, height: width } as HTMLImageElement);
const material = () => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });

it('loads once with BASE_URL, activates only its civic material, and releases the shared texture once', async () => {
  const map = texture(), target = material(), baseline = material();
  const fetchTexture = vi.fn(async () => map), fetchManifest = vi.fn(async () => manifest);
  const release = vi.spyOn(map, 'dispose'), releaseMaterial = vi.spyOn(target, 'dispose');
  const skin = new TownCenterSkin({ material: target, fetchTexture, fetchManifest, baseUrl: '/village/' });
  await Promise.all([skin.load(), skin.load()]);
  expect(fetchTexture).toHaveBeenCalledTimes(1); expect(fetchManifest).toHaveBeenCalledTimes(1);
  expect(fetchTexture).toHaveBeenCalledWith('/village/building-skins/town-center/atlas.png');
  expect(fetchManifest).toHaveBeenCalledWith('/village/building-skins/town-center/manifest.json');
  expect(target.map).toBe(map); expect(target.vertexColors).toBe(false); expect(target.color.getHex()).toBe(0xffffff);
  expect(baseline.map).toBeNull(); expect(baseline.vertexColors).toBe(true);
  expect(map.colorSpace).toBe(THREE.SRGBColorSpace); expect(map.minFilter).toBe(THREE.NearestFilter);
  expect(map.wrapS).toBe(THREE.ClampToEdgeWrapping); expect(map.generateMipmaps).toBe(false);
  expect(skin.status).toBe('ready');
  skin.dispose(); skin.dispose();
  expect(release).toHaveBeenCalledTimes(1); expect(releaseMaterial).not.toHaveBeenCalled();
  expect(target.map).toBeNull(); expect(target.vertexColors).toBe(true);
  await expect(skin.load()).rejects.toThrow('disposed');
});

it('rejects wrong layout, dimensions, and paths before fetching a map and leaves the fallback usable', async () => {
  for (const field of ['layout', 'region', 'size', 'path']) {
    const data = structuredClone(manifest);
    if (field === 'layout') data.layoutHash = '0'.repeat(64);
    if (field === 'region') data.regions.wood_front[0]++;
    if (field === 'size') data.atlas.width = 4096;
    if (field === 'path') data.atlas.file = '../other.png';
    const target = material(), fetchTexture = vi.fn(async () => texture());
    const skin = new TownCenterSkin({ material: target, fetchTexture, fetchManifest: async () => data });
    await expect(skin.load()).rejects.toThrow();
    expect(fetchTexture).not.toHaveBeenCalled(); expect(target.map).toBeNull();
    expect(target.vertexColors).toBe(true); expect(skin.status).toBe('fallback'); skin.dispose();
  }
});

it('retries failed loads and rejects/disposes a decoded atlas with the wrong actual size', async () => {
  const invalid = texture(8), valid = texture(), target = material();
  const release = vi.spyOn(invalid, 'dispose');
  const fetchTexture = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(invalid).mockResolvedValueOnce(valid);
  const skin = new TownCenterSkin({ material: target, fetchTexture, fetchManifest: async () => manifest });
  await expect(skin.load()).rejects.toThrow('offline'); expect(target.map).toBeNull();
  await expect(skin.load()).rejects.toThrow('dimensions'); expect(release).toHaveBeenCalledTimes(1);
  await skin.load(); expect(target.map).toBe(valid); expect(skin.error).toBeNull(); skin.dispose();
});

it('disposes a late atlas without mutating the material after teardown', async () => {
  let resolve!: (map: THREE.Texture) => void;
  const map = texture(), target = material(), release = vi.spyOn(map, 'dispose');
  const fetchTexture = vi.fn(() => new Promise<THREE.Texture>(r => { resolve = r; }));
  const skin = new TownCenterSkin({ material: target, fetchTexture, fetchManifest: async () => manifest });
  const pending = skin.load(); await vi.waitFor(() => expect(fetchTexture).toHaveBeenCalledOnce());
  skin.dispose(); const version = target.version; resolve(map);
  await expect(pending).rejects.toThrow('disposed');
  expect(release).toHaveBeenCalledTimes(1); expect(target.map).toBeNull();
  expect(target.version).toBe(version); expect(skin.status).toBe('disposed');
});
