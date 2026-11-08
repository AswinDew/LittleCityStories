import * as THREE from 'three';
import { validateProjectionSpec, type TownCenterProjectionSpec } from './TownCenterProjection';

interface Options {
  baseUrl?: string;
  fetchManifest?: (url: string) => Promise<unknown>;
  fetchTexture?: (url: string) => Promise<THREE.Texture>;
}

/** Review-only owner. No MaterialLibrary mutation, factory routing or simulation state. */
export class TownCenterDirectSkin {
  status: 'idle' | 'loading' | 'ready' | 'fallback' | 'disposed' = 'idle';
  error: string | null = null;
  spec: TownCenterProjectionSpec | null = null;
  readonly material = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: false,
    toneMapped: false, alphaTest: .5, transparent: false, depthTest: true, depthWrite: true });
  readonly fallbackMaterial = new THREE.MeshBasicMaterial({ color: '#856f59', toneMapped: false });
  private pending: Promise<void> | null = null;
  private texture: THREE.Texture | null = null;
  private completionTexture: THREE.Texture | null = null;
  private readonly base: string;
  private readonly fetchManifest: (url: string) => Promise<unknown>;
  private readonly fetchTexture: (url: string) => Promise<THREE.Texture>;
  private isDisposed(): boolean { return this.status === 'disposed'; }

  constructor(options: Options = {}) {
    const prefix = options.baseUrl ?? import.meta.env.BASE_URL;
    this.base = prefix.replace(/\/?$/, '/') + 'building-skins/town-center-direct/';
    this.fetchManifest = options.fetchManifest ?? (async url => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Direct Stitch manifest HTTP ' + response.status);
      return response.json();
    });
    this.fetchTexture = options.fetchTexture ?? (url => new THREE.TextureLoader().loadAsync(url));
  }

  load(): Promise<void> {
    if (this.status === 'disposed') return Promise.reject(new Error('Direct Stitch skin disposed'));
    if (this.status === 'ready') return Promise.resolve();
    if (this.pending) return this.pending;
    this.status = 'loading'; this.error = null;
    this.pending = (async () => {
      const spec = validateProjectionSpec(await this.fetchManifest(this.base + 'manifest.json'));
      if (this.isDisposed()) throw new Error('Direct Stitch skin disposed');
      const images = [spec.image, ...(spec.completion ? [spec.completion.image] : [])];
      const results = await Promise.allSettled(images.map(image => this.fetchTexture(this.base + image.file)));
      const maps = results.filter((r): r is PromiseFulfilledResult<THREE.Texture> => r.status === 'fulfilled').map(r => r.value);
      const failure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (this.isDisposed() || failure || maps.some((map, i) => map.image?.width !== images[i].width || map.image?.height !== images[i].height)) {
        maps.forEach(map => map.dispose());
        if (this.isDisposed()) throw new Error('Direct Stitch skin disposed');
        if (failure) throw failure.reason;
        throw new Error('Direct Stitch image dimensions mismatch');
      }
      for (const map of maps) {
        map.colorSpace = THREE.SRGBColorSpace;
        map.minFilter = map.magFilter = THREE.NearestFilter;
        map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
        map.generateMipmaps = false; map.flipY = true; map.needsUpdate = true;
      }
      this.texture = maps[0]; this.completionTexture = maps[1] ?? null; this.spec = spec;
      this.material.map = this.texture; this.material.needsUpdate = true;
      this.fallbackMaterial.map = this.completionTexture;
      this.fallbackMaterial.color.set(this.completionTexture ? 0xffffff : '#856f59');
      this.fallbackMaterial.needsUpdate = true; this.status = 'ready';
    })().catch(error => {
      if (this.status !== 'disposed') { this.status = 'fallback'; this.error = String(error); }
      throw error;
    }).finally(() => { this.pending = null; });
    return this.pending;
  }

  dispose(): void {
    if (this.status === 'disposed') return;
    this.status = 'disposed'; this.texture?.dispose(); this.texture = null;
    this.completionTexture?.dispose(); this.completionTexture = null; this.fallbackMaterial.map = null;
    this.material.map = null; this.material.dispose(); this.fallbackMaterial.dispose(); this.spec = null;
  }
}
