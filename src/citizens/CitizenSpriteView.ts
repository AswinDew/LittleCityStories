import * as THREE from 'three';
import type { Occupation } from './types';
import { SpriteAnimator } from './SpriteAnimator';
import { SpriteAtlas, SpriteActivity, SpriteDirection, FrameRect } from '@/assets/SpriteAtlas';

/** Visual only. No movement, job assignment or simulation mutation. */
export class CitizenSpriteView {
  readonly sprite: THREE.Sprite;
  private readonly texture: THREE.Texture;
  private readonly animator: SpriteAnimator;
  private frame: FrameRect | null = null;
  private disposed = false;
  constructor(private readonly atlas: SpriteAtlas, source: THREE.Texture,
    private readonly role: Occupation, private readonly direction: SpriteDirection) {
    this.texture = source.clone();
    const clip = atlas.getClip(role, direction, 'idle');
    const material = new THREE.SpriteMaterial({ map: this.texture, transparent: true, alphaTest: 0.5,
      depthTest: true, depthWrite: false, toneMapped: false });
    this.sprite = new THREE.Sprite(material);
    this.sprite.center.set(clip.anchor.x / 32, 1 - clip.anchor.y / 32);
    this.sprite.scale.set(2.2, 2.2, 1);
    this.animator = new SpriteAnimator(atlas);
    this.update('idle', 0);
  }
  update(activity: SpriteActivity, simulationTimeMs: number): FrameRect {
    if (this.disposed) throw new Error('Sprite view disposed');
    const frame = this.animator.sample(this.role, this.direction, activity, simulationTimeMs);
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
    this.sprite.material.dispose(); this.texture.dispose();
  }
}
