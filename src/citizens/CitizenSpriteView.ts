import * as THREE from 'three';
import type { Occupation } from './types';
import { SpriteAnimator } from './SpriteAnimator';
import { SpriteAtlas, SpriteActivity, SpriteDirection, FrameRect } from '@/assets/SpriteAtlas';

/** Visual only. No movement, job assignment or simulation mutation. */
export class CitizenSpriteView {
  readonly sprite: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly texture: THREE.Texture;
  private readonly animator: SpriteAnimator;
  private frame: FrameRect | null = null;
  private disposed = false;
  constructor(private readonly atlas: SpriteAtlas, source: THREE.Texture,
    private readonly role: Occupation, private readonly direction: SpriteDirection) {
    this.texture = source.clone();
    this.texture.magFilter = this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    const clip = atlas.getClip(role, direction, 'idle');
    const material = new THREE.MeshBasicMaterial({ map: this.texture, alphaTest: 0.5,
      depthTest: true, depthWrite: true, toneMapped: false });
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.translate(0.5 - clip.anchor.x / 32, clip.anchor.y / 32 - 0.5, 0);
    this.sprite = new THREE.Mesh(geometry, material);
    this.sprite.rotation.y = Math.PI / 4;
    this.sprite.scale.set(2.2, 2.2, 1);
    this.animator = new SpriteAnimator(atlas);
    this.update('idle', 0);
  }
  update(activity: SpriteActivity, simulationTimeMs: number, role = this.role, direction = this.direction): FrameRect {
    if (this.disposed) throw new Error('Sprite view disposed');
    const frame = this.animator.sample(role, direction, activity, simulationTimeMs);
    if (frame !== this.frame) {
      this.texture.repeat.set(frame.width / this.atlas.width, frame.height / this.atlas.height);
      this.texture.offset.set(frame.x / this.atlas.width, 1 - (frame.y + frame.height) / this.atlas.height);
      this.texture.updateMatrix(); this.frame = frame;
    }
    return frame;
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.sprite.removeFromParent();
    this.sprite.geometry.dispose();
    this.sprite.material.dispose(); this.texture.dispose();
  }
}
