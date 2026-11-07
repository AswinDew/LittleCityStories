import * as THREE from 'three';
import { MaterialLibrary } from './MaterialLibrary';
import { TOWN_CENTER_SKIN_LAYOUT as layout } from './TownCenterSkinLayout';

interface SkinManifest {
  schemaVersion: number; buildingId: string; layoutVersion: number; layoutHash: string;
  regions: Record<string, number[]>; gutter: number; colorSpace: string;
  atlas: { file: string; width: number; height: number; sha256: string };
}
interface SkinOptions {
  material?: THREE.MeshBasicMaterial;
  baseUrl?: string;
  fetchManifest?: (url: string) => Promise<unknown>;
  fetchTexture?: (url: string) => Promise<THREE.Texture>;
}

function validate(raw: unknown): SkinManifest {
  const data = raw as SkinManifest | null;
  const regions = data?.regions;
  if (!data || data.schemaVersion !== 1 || data.buildingId !== 'town_center' ||
    data.layoutVersion !== layout.version || data.layoutHash !== layout.layoutHash ||
    data.gutter !== layout.gutter || data.colorSpace !== 'srgb' ||
    data.atlas?.file !== 'atlas.png' || data.atlas.width !== layout.width || data.atlas.height !== layout.height ||
    !/^[a-f0-9]{64}$/.test(data.atlas.sha256) || !regions || Object.keys(regions).length !== Object.keys(layout.regions).length ||
    !Object.entries(layout.regions).every(([key, expected]) => Array.isArray(regions[key]) &&
      regions[key].length === 4 && expected.every((value, i) => regions[key][i] === value))) {
    throw new Error('Invalid Town Center skin manifest or UV layout');
  }
  return data;
}

/** Owns one shared civic texture. Material ownership remains in MaterialLibrary. */
export class TownCenterSkin {
  status: 'idle' | 'loading' | 'ready' | 'fallback' | 'disposed' = 'idle';
  error: string | null = null;
  private pending: Promise<void> | null = null;
  private texture: THREE.Texture | null = null;
  private disposed = false;
  private readonly material: THREE.MeshBasicMaterial;
  private readonly base: string;
  private readonly fetchManifest: (url: string) => Promise<unknown>;
  private readonly fetchTexture: (url: string) => Promise<THREE.Texture>;

  constructor(options: SkinOptions = {}) {
    this.material = options.material ?? MaterialLibrary.getInstance().get('stitch_civic_skin') as THREE.MeshBasicMaterial;
    const prefix = options.baseUrl ?? import.meta.env.BASE_URL;
    this.base = (prefix.endsWith('/') ? prefix : prefix + '/') + 'building-skins/town-center/';
    this.fetchManifest = options.fetchManifest ?? (async url => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Town Center skin manifest: HTTP ' + response.status);
      return response.json();
    });
    this.fetchTexture = options.fetchTexture ?? (url => new THREE.TextureLoader().loadAsync(url));
  }

  load(): Promise<void> {
    if (this.disposed) return Promise.reject(new Error('Town Center skin disposed'));
    if (this.pending) return this.pending;
    this.status = 'loading'; this.error = null;
    this.pending = (async () => {
      const manifest = validate(await this.fetchManifest(this.base + 'manifest.json'));
      if (this.disposed) throw new Error('Town Center skin disposed');
      const texture = await this.fetchTexture(this.base + manifest.atlas.file);
      if (this.disposed) { texture.dispose(); throw new Error('Town Center skin disposed'); }
      if (texture.image?.width !== manifest.atlas.width || texture.image?.height !== manifest.atlas.height) {
        texture.dispose(); throw new Error('Invalid Town Center atlas dimensions');
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = texture.magFilter = THREE.NearestFilter;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.flipY = true; texture.generateMipmaps = false; texture.needsUpdate = true;
      this.texture = texture;
      this.material.map = texture; this.material.color.set(0xffffff);
      this.material.vertexColors = false; this.material.toneMapped = false; this.material.needsUpdate = true;
      this.status = 'ready';
    })().catch(error => {
      this.pending = null;
      if (!this.disposed) { this.status = 'fallback'; this.error = String(error instanceof Error ? error.message : error); }
      throw error;
    });
    return this.pending;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.status = 'disposed';
    if (this.texture) {
      if (this.material.map === this.texture) {
        this.material.map = null; this.material.vertexColors = true; this.material.needsUpdate = true;
      }
      this.texture.dispose(); this.texture = null;
    }
  }
}
