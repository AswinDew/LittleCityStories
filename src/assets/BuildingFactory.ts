import * as THREE from 'three';
import { createSmallHouse } from './procedural/houses';
import { createRoadTile } from './procedural/roads';
import { createShop } from './procedural/shops';
import { createPark } from './procedural/parks';
import { createFamilyHouse, createApartment } from './procedural/apartments';
import { createSchool, createClinic } from './procedural/civic';
import { createBakery, createRestaurant } from './procedural/commercialExtra';
import { createShadeTree, createStreetlight } from './procedural/decorations';

export class BuildingFactory {
  /**
   * Instantiates the complete 3D procedural mesh for any of the 12 building definitions.
   */
  public static createBuildingMesh(defId: string, level = 1, seed = 0): THREE.Group {
    switch (defId) {
      // Transport
      case 'road':
        return createRoadTile();
      case 'streetlight':
        return createStreetlight();

      // Residential
      case 'small_house':
        return createSmallHouse(level, seed);
      case 'family_house':
        return createFamilyHouse(level, seed);
      case 'apartment':
        return createApartment(level, seed);

      // Commercial
      case 'shop':
        return createShop(level, seed);
      case 'bakery':
        return createBakery(level, seed);
      case 'restaurant':
        return createRestaurant(level, seed);

      // Municipal
      case 'school':
        return createSchool(level, seed);
      case 'clinic':
        return createClinic(level, seed);

      // Nature
      case 'park':
        return createPark(level, seed);
      case 'tree':
        return createShadeTree(seed);

      default:
        console.warn(`[BuildingFactory] Unknown definition "${defId}", falling back to small house.`);
        return createSmallHouse(1, seed);
    }
  }

  /**
   * Creates a semi-transparent ghost preview mesh used for placement hovering.
   */
  public static createGhostPreviewMesh(defId: string): THREE.Group {
    const mesh = BuildingFactory.createBuildingMesh(defId, 1, 0);
    mesh.name = `GhostPreview_${defId}`;

    mesh.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;

        // Clone material to avoid mutating shared MaterialLibrary palette
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map((mat) => {
              const clone = mat.clone();
              clone.transparent = true;
              clone.opacity = 0.55;
              clone.depthWrite = false;
              return clone;
            });
          } else {
            const clone = child.material.clone();
            clone.transparent = true;
            clone.opacity = 0.55;
            clone.depthWrite = false;
            child.material = clone;
          }
        }
      }
    });

    return mesh;
  }
}
