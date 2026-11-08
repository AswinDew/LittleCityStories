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
      const texture = await this.fetchTexture(this.base + spec.image.file);
      if (this.isDisposed()) { texture.dispose(); throw new Error('Direct Stitch skin disposed'); }
      if (texture.image?.width !== spec.image.width || texture.image?.height !== spec.image.height) {
        texture.dispose(); throw new Error('Direct Stitch image dimensions mismatch');
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = texture.magFilter = THREE.NearestFilter;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.generateMipmaps = false; texture.flipY = true; texture.needsUpdate = true;
      this.texture = texture; this.spec = spec;
      this.material.map = texture; this.material.needsUpdate = true; this.status = 'ready';
    })().catch(error => {
      if (this.status !== 'disposed') { this.status = 'fallback'; this.error = String(error); }
      throw error;
    }).finally(() => { this.pending = null; });
    return this.pending;
  }

  dispose(): void {
    if (this.status === 'disposed') return;
    this.status = 'disposed'; this.texture?.dispose(); this.texture = null;
    this.material.map = null; this.material.dispose(); this.fallbackMaterial.dispose(); this.spec = null;
  }
}
