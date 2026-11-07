import * as THREE from 'three';
import palette from '../../tools/assets/palette.json';

/**
 * Shared palette and material library to reuse materials, prevent memory leaks,
 * and keep the Stitch settlement and legacy extension in one material family.
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
    this.register('stitch_civic_illustrated', new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
    this.register('stitch_civic_skin', this.get('stitch_civic_illustrated').clone());
    for (const [key, color] of Object.entries(palette.colors)) {
      this.register(`ancient_${key}`, new THREE.MeshLambertMaterial({ color }));
    }
    this.register('ancient_road', new THREE.MeshLambertMaterial({ color: palette.colors.soil_light }));
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

    // Commercial & Park details
    this.register('awning_red', new THREE.MeshLambertMaterial({ color: 0xef4444 }));
    this.register('awning_blue', new THREE.MeshLambertMaterial({ color: 0x3b82f6 }));
    this.register('park_path', new THREE.MeshLambertMaterial({ color: 0xdfd3c3 }));
    this.register('park_bench_wood', new THREE.MeshLambertMaterial({ color: 0x8d5b4c }));
    this.register('cross_red', new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    this.register('umbrella_yellow', new THREE.MeshLambertMaterial({ color: 0xfbbf24 }));
    this.register('cupola_copper', new THREE.MeshLambertMaterial({ color: 0x4d7c67 }));

    // Stitch LEGACY-01 preserves the existing inactive meshes and harmonizes their materials.
    const stitch: Record<string, keyof typeof palette.colors> = {
      wall_cream: 'linen', wall_white: 'stone_light', wall_terracotta: 'clay_light', wall_pastel_blue: 'blue_light',
      wall_mint: 'green_light', wall_brick: 'clay', wall_wood: 'wood_light', roof_red_tile: 'clay',
      roof_slate_blue: 'stone_dark', roof_cedar: 'wood', roof_dark_slate: 'stone_dark', roof_moss: 'green_dark',
      trim_white: 'linen', trim_wood: 'wood_dark', door_wood: 'wood', window_glass: 'blue_light', window_frame: 'wood_dark',
      chimney_brick: 'clay', road_asphalt: 'stone_dark', sidewalk_concrete: 'stone', tree_trunk: 'wood_dark',
      tree_canopy_round: 'green', tree_canopy_dark: 'green_dark', tree_canopy_light: 'green_light',
      ground_slab: 'wood_dark', ground_grass: 'grass', metal_black: 'ink', awning_red: 'clay', awning_blue: 'blue',
      park_path: 'soil_light', park_bench_wood: 'wood', cross_red: 'clay', umbrella_yellow: 'straw_light', cupola_copper: 'green_dark',
    };
    for (const [key, color] of Object.entries(stitch)) {
      const material = this.materials.get(key);
      if (material instanceof THREE.MeshLambertMaterial || material instanceof THREE.MeshBasicMaterial) material.color.set(palette.colors[color]);
    }

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
