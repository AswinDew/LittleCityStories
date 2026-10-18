import type { Occupation, Citizen } from '@/citizens/types';

export const DIRECTIONS = ['NE', 'NW', 'SE', 'SW'] as const;
export const OCCUPATIONS = ['villager', 'farmer', 'lumberjack', 'builder'] as const;
export type SpriteDirection = typeof DIRECTIONS[number];
export type SpriteActivity = Citizen['animationState'];
export interface FrameRect { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
export interface AnimationClip {
  readonly frames: readonly FrameRect[];
  readonly frameDurationMs: number;
  readonly loop: boolean;
  readonly anchor: Readonly<{ x: number; y: number }>;
}
interface AtlasData {
  asset: string; width: number; height: number; frameSize: { width: number; height: number };
  animations: Record<Occupation, Record<SpriteDirection, Record<string, AnimationClip>>>;
}
const work = { villager: 'work', farmer: 'harvest', lumberjack: 'chop', builder: 'build' } as const;
const clips = (role: Occupation): [SpriteActivity, number][] => [ ['idle', 2], ['walk', 6], [work[role], 6],
  ...(role === 'villager' ? [['mine', 8], ['research', 8]] as [SpriteActivity, number][] : []),
  ...(role === 'farmer' ? [['water', 6]] as [SpriteActivity, number][] : []) ];

export class SpriteAtlas {
  readonly width: number;
  readonly height: number;
  private readonly clips = new Map<string, AnimationClip>();
  constructor(input: unknown) {
    const data = structuredClone(input) as AtlasData;
    if (!data || data.asset !== 'citizens' || !Number.isInteger(data.width) || !Number.isInteger(data.height) ||
        data.width < 32 || data.height < 32 || data.frameSize?.width !== 32 || data.frameSize.height !== 32) {
      throw new Error('Invalid citizen atlas');
    }
    this.width = data.width; this.height = data.height;
    const used = new Set<string>();
    for (const role of OCCUPATIONS) for (const direction of DIRECTIONS) {
      for (const [activity, count] of clips(role)) {
        const clip = data.animations?.[role]?.[direction]?.[activity];
        if (!clip || !Array.isArray(clip.frames) || clip.frames.length !== count ||
            !Number.isFinite(clip.frameDurationMs) || clip.frameDurationMs <= 0 ||
            typeof clip.loop !== 'boolean' || clip.anchor?.x !== 16 || clip.anchor.y !== 30) {
          throw new Error(`Invalid animation ${role}/${direction}/${activity}`);
        }
        for (const frame of clip.frames) {
          const key = `${frame.x},${frame.y}`;
          if (![frame.x, frame.y, frame.width, frame.height].every(Number.isInteger) ||
              frame.width !== 32 || frame.height !== 32 || frame.x < 0 || frame.y < 0 ||
              frame.x % 32 || frame.y % 32 || frame.x + 32 > data.width || frame.y + 32 > data.height || used.has(key)) {
            throw new Error('Invalid or overlapping sprite frame');
          }
          used.add(key); Object.freeze(frame);
        }
        Object.freeze(clip.frames); Object.freeze(clip.anchor); Object.freeze(clip);
        this.clips.set(`${role}/${direction}/${activity}`, clip);
      }
    }
  }
  getClip(role: Occupation, direction: SpriteDirection, activity: SpriteActivity): AnimationClip {
    const state = activity === 'work' ? work[role] : activity;
    const clip = this.clips.get(`${role}/${direction}/${state}`);
    if (!clip) throw new Error(`Unsupported sprite activity: ${role}/${direction}/${activity}`);
    return clip;
  }
}
