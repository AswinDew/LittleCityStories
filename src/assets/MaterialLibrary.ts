import * as THREE from 'three';

/**
 * Shared palette and material library to guarantee batching, prevent memory leaks,
 * and enforce a cohesive Kairosoft-style warm pastel aesthetic.
 */
export class MaterialLibrary {
  private static instance: MaterialLibrary | null = null;
  private materials: Map<string, THREE.Material> = new Map();

  private constructor() {
    this.initDefaultMaterials();
  }

  public static getInstance(): MaterialLibrary {
    if (!MaterialLibrary.instance) {
      MaterialLibrary.instance = new MaterialLibrary();
    }
    return MaterialLibrary.instance;
  }

  private initDefaultMaterials(): void {
    // Walls - pastel warm tones
    this.register('wall_cream', new THREE.MeshLambertMaterial({ color: 0xfff3e0 }));
    this.register('wall_white', new THREE.MeshLambertMaterial({ color: 0xfafafa }));
    this.register('wall_terracotta', new THREE.MeshLambertMaterial({ color: 0xdf8a68 }));
    this.register('wall_pastel_blue', new THREE.MeshLambertMaterial({ color: 0xa4c8e1 }));
    this.register('wall_mint', new THREE.MeshLambertMaterial({ color: 0xb5e2c7 }));
    this.register('wall_brick', new THREE.MeshLambertMaterial({ color: 0xc86452 }));
    this.register('wall_wood', new THREE.MeshLambertMaterial({ color: 0xb58a63 }));

    // Roofs
    this.register('roof_red_tile', new THREE.MeshLambertMaterial({ color: 0xd9534f }));
    this.register('roof_slate_blue', new THREE.MeshLambertMaterial({ color: 0x4a6572 }));
    this.register('roof_cedar', new THREE.MeshLambertMaterial({ color: 0x8d5b4c }));
    this.register('roof_dark_slate', new THREE.MeshLambertMaterial({ color: 0x34495e }));
    this.register('roof_moss', new THREE.MeshLambertMaterial({ color: 0x5a7d5a }));

    // Architectural Trim & Details
    this.register('trim_white', new THREE.MeshLambertMaterial({ color: 0xffffff }));
    this.register('trim_wood', new THREE.MeshLambertMaterial({ color: 0x5c4033 }));
    this.register('door_wood', new THREE.MeshLambertMaterial({ color: 0x795548 }));
    this.register('window_glass', new THREE.MeshLambertMaterial({ color: 0xcbe8f6 }));
    this.register('window_frame', new THREE.MeshLambertMaterial({ color: 0xffffff }));
    this.register('chimney_brick', new THREE.MeshLambertMaterial({ color: 0xa25244 }));

    // Roads & Pavement
    this.register('road_asphalt', new THREE.MeshLambertMaterial({ color: 0x3d4451 }));
    this.register('road_marking_white', new THREE.MeshBasicMaterial({ color: 0xf1f5f9 }));
    this.register('road_marking_yellow', new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    this.register('sidewalk_concrete', new THREE.MeshLambertMaterial({ color: 0xd6dbdf }));

    // Nature & Foliage
    this.register('tree_trunk', new THREE.MeshLambertMaterial({ color: 0x6d4c41 }));
    this.register('tree_canopy_round', new THREE.MeshLambertMaterial({ color: 0x43a047 }));
    this.register('tree_canopy_dark', new THREE.MeshLambertMaterial({ color: 0x2e7d32 }));
    this.register('tree_canopy_light', new THREE.MeshLambertMaterial({ color: 0x7cb342 }));
    this.register('flower_pink', new THREE.MeshLambertMaterial({ color: 0xf06292 }));
    this.register('flower_yellow', new THREE.MeshLambertMaterial({ color: 0xfdd835 }));

    // Ground & Terrain
    this.register('ground_slab', new THREE.MeshLambertMaterial({ color: 0x6e503b }));
    this.register('ground_grass', new THREE.MeshLambertMaterial({ color: 0x98cf7e }));

    // Street Furniture & Props
    this.register('metal_black', new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
    this.register('lamp_light_warm', new THREE.MeshBasicMaterial({ color: 0xfff59d }));
    // Fallback material for missing keys
    this.register('__fallback_default__', new THREE.MeshLambertMaterial({ color: 0xff00ff }));
  }

  public register(name: string, material: THREE.Material): void {
    this.materials.set(name, material);
  }

  public get(name: string): THREE.Material {
    const mat = this.materials.get(name);
    if (!mat) {
      console.warn(`[MaterialLibrary] Material "${name}" not found. Falling back to default.`);
      return this.materials.get('__fallback_default__')!;
    }
    return mat;
  }

  public dispose(): void {
    this.materials.forEach((mat) => mat.dispose());
    this.materials.clear();
    MaterialLibrary.instance = null;
  }
}
