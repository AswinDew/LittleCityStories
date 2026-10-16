import type { Occupation } from './types';
import { SpriteAtlas, SpriteActivity, SpriteDirection, FrameRect } from '@/assets/SpriteAtlas';

/** One sampler per visual citizen. Supply simulation presentation time, never Date.now(). */
export class SpriteAnimator {
  private key = '';
  private startedAt = 0;
  private lastTime = 0;
  constructor(private readonly atlas: SpriteAtlas) {}
  reset(): void { this.key = ''; }
  sample(occupation: Occupation, direction: SpriteDirection, activity: SpriteActivity, elapsedMs: number): FrameRect {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Invalid animation time');
    const clip = this.atlas.getClip(occupation, direction, activity);
    const key = `${occupation}/${direction}/${activity}`;
    if (this.key !== key || elapsedMs < this.lastTime) {
      this.startedAt = elapsedMs; this.key = key;
    }
    this.lastTime = elapsedMs;
    const frame = Math.floor((elapsedMs - this.startedAt) / clip.frameDurationMs);
    const index = clip.loop ? frame % clip.frames.length : Math.min(frame, clip.frames.length - 1);
    return clip.frames[index];
  }
}
