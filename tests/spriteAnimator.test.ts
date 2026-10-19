import { describe, it, expect } from 'vitest';
import manifest from '../public/generated/manifest.json';
import { SpriteAtlas, DIRECTIONS, OCCUPATIONS } from '../src/assets/SpriteAtlas';
import { SpriteAnimator } from '../src/citizens/SpriteAnimator';
import { citizenAtlasFixture } from './fixtures/citizenAtlas';

describe.each([32, 64] as const)('%spx sprite atlas metadata', size => {
  it('exposes frame dimensions and samples valid clips through the last atlas row', () => {
    const data = citizenAtlasFixture(size), atlas = new SpriteAtlas(data);
    expect(atlas.frameWidth).toBe(size); expect(atlas.frameHeight).toBe(size);
    for (const role of OCCUPATIONS) for (const direction of DIRECTIONS) {
      expect(atlas.getClip(role, direction, 'idle').anchor).toEqual({ x: size / 2, y: size * 15 / 16 });
    }
    const clip = atlas.getClip('builder', 'SW', 'build'), animator = new SpriteAnimator(atlas);
    animator.sample('builder', 'SW', 'build', 0);
    const last = animator.sample('builder', 'SW', 'build', clip.frameDurationMs * 5);
    expect(last).toEqual(clip.frames[5]);
    expect(last.y + last.height).toBe(atlas.height);
    expect(last.width).toBe(size); expect(last.height).toBe(size);
  });

  it.each(['mixed frame', 'overlap', 'outside x', 'outside y', 'non-finite x', 'non-finite duration',
    'outside anchor', 'non-finite anchor', 'wrong anchor', 'non-finite atlas', 'unsupported size', 'rectangular frame'])('rejects %s', mutation => {
    const data = citizenAtlasFixture(size), clip = data.animations.villager.NE.idle;
    switch (mutation) {
      case 'mixed frame': clip.frames[0].width = size === 32 ? 64 : 32; break;
      case 'overlap': clip.frames[1] = { ...clip.frames[0] }; break;
      case 'outside x': clip.frames[0].x = data.width; break;
      case 'outside y': clip.frames[0].y = data.height; break;
      case 'non-finite x': clip.frames[0].x = NaN; break;
      case 'non-finite duration': clip.frameDurationMs = Infinity; break;
      case 'outside anchor': clip.anchor.y = size + 1; break;
      case 'non-finite anchor': clip.anchor.x = NaN; break;
      case 'wrong anchor': clip.anchor.y -= 1; break;
      case 'non-finite atlas': data.width = Infinity; break;
      case 'unsupported size': data.frameSize = { width: 48, height: 48 }; break;
      case 'rectangular frame': data.frameSize.height = size / 2; break;
    }
    expect(() => new SpriteAtlas(data)).toThrow();
  });
});

describe('sprite atlas and simulation-time sampling', () => {
  const atlas = new SpriteAtlas(manifest.atlases.citizens);
  it('provides every role, direction and required activity within the atlas', () => {
    for (const role of OCCUPATIONS) for (const direction of DIRECTIONS) {
      for (const activity of ['idle', 'walk', 'work'] as const) {
        const clip = atlas.getClip(role, direction, activity);
        expect(clip.frames.length).toBe(activity === 'idle' ? 2 : 6);
        expect(clip.anchor).toEqual({ x: 16, y: 30 });
        for (const frame of clip.frames) expect(frame.x + frame.width).toBeLessThanOrEqual(atlas.width);
      }
    }
  });
  it('loops at configured duration, freezes at equal simulation time, resets on transitions and rewind', () => {
    const animator = new SpriteAnimator(atlas);
    const clip = atlas.getClip('farmer', 'SE', 'walk');
    expect(animator.sample('farmer', 'SE', 'walk', 1000)).toEqual(clip.frames[0]);
    expect(animator.sample('farmer', 'SE', 'walk', 1100)).toEqual(clip.frames[1]);
    expect(animator.sample('farmer', 'SE', 'walk', 1100)).toEqual(clip.frames[1]);
    expect(animator.sample('farmer', 'SE', 'walk', 1600)).toEqual(clip.frames[0]);
    expect(animator.sample('farmer', 'SE', 'harvest', 1700)).toEqual(atlas.getClip('farmer', 'SE', 'harvest').frames[0]);
    expect(animator.sample('farmer', 'NE', 'harvest', 1900)).toEqual(atlas.getClip('farmer', 'NE', 'harvest').frames[0]);
    expect(animator.sample('farmer', 'NE', 'harvest', 100)).toEqual(atlas.getClip('farmer', 'NE', 'harvest').frames[0]);
    expect(() => animator.sample('farmer', 'SE', 'idle', NaN)).toThrow();
  });
  it('clamps non-looping animations and supports an explicit restart', () => {
    const data = structuredClone(manifest.atlases.citizens);
    data.animations.builder.SW.build.loop = false;
    const altered = new SpriteAtlas(data);
    const animator = new SpriteAnimator(altered);
    const clip = altered.getClip('builder', 'SW', 'build');
    animator.sample('builder', 'SW', 'build', 0);
    expect(animator.sample('builder', 'SW', 'build', 10000)).toEqual(clip.frames[5]);
    animator.reset();
    expect(animator.sample('builder', 'SW', 'build', 10000)).toEqual(clip.frames[0]);
  });
  it('rejects invalid metadata and unsupported activity rather than silently showing unrelated frames', () => {
    const invalid = structuredClone(manifest.atlases.citizens);
    invalid.animations.villager.NE.idle.frames[0].x = invalid.width;
    expect(() => new SpriteAtlas(invalid)).toThrow();
    expect(() => atlas.getClip('builder', 'SE', 'harvest')).toThrow();
    const clip = atlas.getClip('villager', 'NE', 'idle');
    expect(Object.isFrozen(clip.frames[0])).toBe(true);
  });
});
