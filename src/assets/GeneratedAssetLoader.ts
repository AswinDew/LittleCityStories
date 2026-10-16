import * as THREE from 'three';

export interface GeneratedManifest {
  assets: Record<string, { file: string; width: number; height: number }>;
  atlases: { citizens: unknown };
}

export class GeneratedAssetLoader {
  private readonly pending = new Map<string, Promise<THREE.Texture>>();
  private readonly textures = new Set<THREE.Texture>();
  private disposed = false;
  private manifest: Promise<GeneratedManifest> | null = null;
  constructor(private readonly fetchTexture = (url: string) => new THREE.TextureLoader().loadAsync(url),
    private readonly fetchManifest = async (): Promise<GeneratedManifest> => {
      const response = await fetch(`${import.meta.env.BASE_URL}generated/manifest.json`);
      if (!response.ok) throw new Error(`Asset manifest: HTTP ${response.status}`);
      return response.json() as Promise<GeneratedManifest>;
    }) {}

  async getManifest(): Promise<GeneratedManifest> {
    if (this.disposed) throw new Error('Asset loader disposed');
    if (!this.manifest) this.manifest = this.fetchManifest().then(data => {
      if (!data?.assets || !data.atlases?.citizens) throw new Error('Invalid asset manifest');
      for (const asset of Object.values(data.assets)) {
        if (!/^[a-z][a-z0-9_/-]*\.png$/.test(asset.file) || !Number.isInteger(asset.width) || asset.width <= 0 ||
            !Number.isInteger(asset.height) || asset.height <= 0 || asset.width > 4096 || asset.height > 4096) {
          throw new Error('Invalid asset metadata');
        }
      }
      return data;
    }).catch(error => { this.manifest = null; throw error; });
    return this.manifest;
  }

  async load(key: string): Promise<THREE.Texture> {
    if (this.disposed) throw new Error('Asset loader disposed');
    const manifest = await this.getManifest();
    if (this.disposed) throw new Error('Asset loader disposed');
    const asset = manifest.assets[key];
    if (!asset) throw new Error(`Unknown generated asset: ${key}`);
    let result = this.pending.get(key);
    if (!result) {
      result = this.fetchTexture(`${import.meta.env.BASE_URL}generated/${asset.file}`).then(texture => {
        if (this.disposed) { texture.dispose(); throw new Error('Asset loader disposed'); }
        texture.magFilter = texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = false;
        texture.needsUpdate = true;
        this.textures.add(texture);
        return texture;
      }).catch(error => { this.pending.delete(key); throw error; });
      this.pending.set(key, result);
    }
    return result;
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.textures.forEach(texture => texture.dispose());
    this.textures.clear(); this.pending.clear();
  }
}
