import layout from '../../tools/assets/town-center-skin-layout.json';

export const TOWN_CENTER_SKIN_LAYOUT = layout;
export type SkinRegion = readonly [number, number, number, number];
export type SkinUV = [number, number];
export interface SkinSpan { u: number; v: number }
export const CIVIC_TEXELS_PER_UNIT = 24;
type Direction = { x: number; y: number; z: number };

/** Inputs use top-left image coordinates; TextureLoader flipY is left at its default. */
export function mapTownCenterUV(region: readonly number[], u: number, v: number): SkinUV {
  if (![u, v].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) throw new Error('Invalid civic UV');
  const [x, y, w, h] = region;
  return [(x + 0.5 + u * (w - 1)) / layout.width, 1 - (y + 0.5 + v * (h - 1)) / layout.height];
}

export function civicSkinUV(tone: string, normal: Direction, u: number, v: number, seed = 0, size: SkinSpan = { u: 1, v: 1 }): SkinUV {
  const face = normal.y > 0.5 ? 'top' : normal.z > 0.5 ? 'front' : normal.x > 0.5 ? 'side' : 'dark';
  const region = (layout.regions as Record<string, number[]>)[tone + '_' + face];
  const material = (layout.materials as Record<string, { source?: string; texelDensity?: number }>)[tone];
  if (!region || !material) throw new Error('Unknown civic skin tone: ' + tone);
  if (!material.source) return mapTownCenterUV(region, 0.5, 0.5);
  // Bounded varied crops, never repeated UVs from a source whose seams are unverified.
  const random = (n: number) => { const value = Math.sin(seed + n) * 43758.5453; return value - Math.floor(value); };
  const density = material.texelDensity ?? CIVIC_TEXELS_PER_UNIT;
  const spanU = Math.min(0.96, Math.max(1, size.u * density) / (region[2] - 1));
  const spanV = Math.min(0.96, Math.max(1, size.v * density) / (region[3] - 1));
  return mapTownCenterUV(region, u * spanU + random(2) * (1 - spanU), v * spanV + random(3) * (1 - spanV));
}

/** All primitive coordinates remain local, so grain follows the physical long axis. */
export function projectCivicBoxUV(p: Direction, normal: Direction, size: Direction): SkinUV {
  if (Math.abs(normal.z) > 0.5) return size.y >= size.x ? [p.x + 0.5, 0.5 - p.y] : [p.y + 0.5, 0.5 - p.x];
  if (Math.abs(normal.x) > 0.5) return size.y >= size.z ? [p.z + 0.5, 0.5 - p.y] : [p.y + 0.5, 0.5 - p.z];
  return size.x >= size.z ? [p.z + 0.5, 0.5 - p.x] : [p.x + 0.5, 0.5 - p.z];
}

export function civicBoxSpan(normal: Direction, size: Direction): SkinSpan {
  if (Math.abs(normal.z) > 0.5) return size.y >= size.x ? { u: size.x, v: size.y } : { u: size.y, v: size.x };
  if (Math.abs(normal.x) > 0.5) return size.y >= size.z ? { u: size.z, v: size.y } : { u: size.y, v: size.z };
  return size.x >= size.z ? { u: size.z, v: size.x } : { u: size.x, v: size.z };
}
