import * as THREE from 'three';

export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly buildingsGroup: THREE.Group;
  public readonly effectsGroup: THREE.Group;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.name = 'CitySceneRoot';

    // Soft sky background
    this.scene.background = new THREE.Color(0xaedbf0);

    // Optional subtle fog to blend distant edges into the pastel sky
    this.scene.fog = new THREE.FogExp2(0xaedbf0, 0.007);

    // Building container
    this.buildingsGroup = new THREE.Group();
    this.buildingsGroup.name = 'BuildingsGroup';
    this.scene.add(this.buildingsGroup);

    // Dynamic effects container
    this.effectsGroup = new THREE.Group();
    this.effectsGroup.name = 'EffectsGroup';
    this.scene.add(this.effectsGroup);
  }

  public dispose(): void {
    // Traverse and clean up
    this.scene.traverse((obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m: THREE.Material) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });
  }
}
