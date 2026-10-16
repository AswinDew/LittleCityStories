import * as THREE from 'three';
import type { Game } from '@/game/Game';
import { GeneratedAssetLoader } from './GeneratedAssetLoader';
import { MaterialLibrary } from './MaterialLibrary';

export async function applyWorldTextures(game: Game, loader: GeneratedAssetLoader): Promise<void> {
  const [grass, dirt, path] = await Promise.all([
    loader.load('terrain_grass'), loader.load('terrain_dirt'), loader.load('terrain_path'),
  ]);
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping;
  // One 32px patch covers four logical tiles: avoid minification noise at gameplay zoom.
  grass.repeat.set(game.gridSystem.size / 4, game.gridSystem.size / 4);
  for (const [key, texture] of [['ground_grass', grass], ['ancient_soil', dirt], ['ancient_road', path]] as const) {
    const material = MaterialLibrary.getInstance().get(key) as THREE.MeshLambertMaterial;
    material.map = texture; material.color.set(0xffffff); material.needsUpdate = true;
  }
}
