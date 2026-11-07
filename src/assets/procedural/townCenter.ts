import * as THREE from 'three';
import { cachedMesh } from '../GeometryCache';
import { MaterialLibrary } from '../MaterialLibrary';
import palette from '../../../tools/assets/palette.json';

type Tone = keyof typeof palette.colors;
// Civic reference has warm grey masonry and umber timber, rather than the terrain's green-grey.
const civicColors = { ...palette.colors, ink: '#30232b', wood_dark: '#4a3435', wood: '#856f59',
  wood_light: '#b99b73', stone_dark: '#675b59', stone: '#a49a87', stone_light: '#c5b99e',
  linen: '#cbbb9e', straw: '#caa265', straw_light: '#e3bc7a' };
type Point = [number, number, number];
interface Surface { positions: number[]; colors: number[]; stage: string; start: number; end: number }

/** Only the civic landmark: static details batched by construction stage, not per straw/brick. */
class CivicSurfaces {
  private readonly surfaces = new Map<string, Surface>();
  private readonly box = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  private readonly bundle = new THREE.CapsuleGeometry(0.5, 1, 2, 6).rotateX(Math.PI / 2).toNonIndexed();
  private readonly matrix = new THREE.Matrix4();
  private readonly rotation = new THREE.Quaternion();
  private readonly normalMatrix = new THREE.Matrix3();
  private readonly point = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly color = new THREE.Color();
  private current!: Surface;

  use(name: string, stage: string, start: number, end: number): void {
    if (!this.surfaces.has(name)) this.surfaces.set(name, { positions: [], colors: [], stage, start, end });
    this.current = this.surfaces.get(name)!;
  }
  private vertex(point: THREE.Vector3, normal: THREE.Vector3, tone: Tone, variation: number): void {
    // Fixed illustrated light preserves ink/ochre contrast under the game's warm lighting.
    const light = 0.68 + Math.max(0, normal.y) * 0.26 + Math.max(0, normal.z) * 0.16 + Math.max(0, normal.x) * 0.04;
    this.color.set(civicColors[tone]).multiplyScalar(light * variation);
    this.current.positions.push(point.x, point.y, point.z);
    this.current.colors.push(this.color.r, this.color.g, this.color.b);
  }
  block(tone: Tone, w: number, h: number, d: number, x: number, y: number, z: number,
    rx = 0, ry = 0, rz = 0, variation = 1): void {
    this.stamp(this.box, tone, w, h, d, x, y, z, rx, ry, rz, variation);
  }
  sheaf(w: number, h: number, length: number, x: number, y: number, z: number, slope: number, variation: number): void {
    this.stamp(this.bundle, 'straw', w, h, length / 2, x, y, z, slope, 0, 0, variation);
  }
  private stamp(shape: THREE.BufferGeometry, tone: Tone, w: number, h: number, d: number,
    x: number, y: number, z: number, rx: number, ry: number, rz: number, variation: number): void {
    this.rotation.setFromEuler(new THREE.Euler(rx, ry, rz));
    this.matrix.compose(new THREE.Vector3(x, y, z), this.rotation, new THREE.Vector3(w, h, d));
    this.normalMatrix.getNormalMatrix(this.matrix);
    const p = shape.getAttribute('position'), n = shape.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      this.point.fromBufferAttribute(p, i).applyMatrix4(this.matrix);
      this.normal.fromBufferAttribute(n, i).applyMatrix3(this.normalMatrix).normalize();
      this.vertex(this.point, this.normal, tone, variation);
    }
  }
  triangle(tone: Tone, a: Point, b: Point, c: Point, variation = 1): void {
    const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b), r = new THREE.Vector3(...c);
    const normal = q.clone().sub(p).cross(r.clone().sub(p)).normalize();
    for (const vertex of [p, q, r]) this.vertex(vertex, normal, tone, variation);
  }
  beam(tone: Tone, a: Point, b: Point, width: number, depth = width): void {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), middle = from.clone().add(to).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    const e = new THREE.Euler().setFromQuaternion(q);
    this.block(tone, width, from.distanceTo(to), depth, middle.x, middle.y, middle.z, e.x, e.y, e.z);
  }
  finish(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'town_center'; group.userData.artSource = 'Stitch BLDG-01/town_center';
    for (const [name, data] of this.surfaces) {
      const mesh = cachedMesh(`stitch/civic-v2/${name}`, () => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
        geometry.computeVertexNormals(); geometry.computeBoundingBox();
        return geometry;
      }, MaterialLibrary.getInstance().get('stitch_civic_illustrated'));
      mesh.name = `town-center-${name}`;
      Object.assign(mesh.userData, { assembly: data.stage, assemblyStart: data.start, assemblyEnd: data.end });
      group.add(mesh);
    }
    this.box.dispose();
    this.bundle.dispose();
    return group;
  }
}

/** Technical 3D reconstruction of the first building in ancient-sites-master.jpg. */
export function createDetailedTownCenter(): THREE.Group {
  const s = new CivicSurfaces();
  const front = 1.5, back = -2.05, side = 2.08, eaves = 3.22, ridge = 4.72, center = -0.275;
  s.use('foundation', 'foundation', 0, 0.1);
  s.block('soil_dark', 4.43, 0.06, 3.86, 0, 0.03, center);
  s.block('stone_dark', 4.30, 0.10, 3.67, 0, 0.11, center);
  s.block('wood_dark', 3.94, 0.06, 3.30, 0, 0.13, center);

  s.use('masonry', 'wall', 0.12, 0.42);
  // Four separate hollow walls; the entry is a real gap, not a black painted rectangle.
  for (const sign of [-1, 1]) {
    s.block('stone_dark', 1.57, 1.40, 0.16, sign * 1.345, 0.84, front);
    s.block('stone_dark', 0.16, 1.40, 3.57, sign * side, 0.84, center);
  }
  s.block('stone_dark', 4.20, 1.40, 0.16, 0, 0.84, back);
  const courses = (lo: number, hi: number, row: number, width: number) => {
    const segments: { middle: number; width: number }[] = [];
    for (let from = lo - (row % 2) * width / 2; from < hi; from += width) {
      const a = Math.max(lo, from), b = Math.min(hi, from + width);
      if (b - a > 0.04) segments.push({ middle: (a + b) / 2, width: b - a - 0.026 });
    }
    return segments;
  };
  for (let row = 0; row < 6; row++) {
    const y = 0.255 + row * 0.222;
    for (const sign of [-1, 1]) {
      for (const [col, brick] of courses(0.56, 2.13, row, 0.51).entries()) {
        const x = sign * brick.middle;
        s.block((row + col) % 3 ? 'stone' : 'stone_light', brick.width, 0.204, 0.19, x, y, front + 0.035);
        s.block('stone_light', brick.width - 0.017, 0.021, 0.012, x, y + 0.087, front + 0.137, 0, 0, 0, 0.9);
      }
      for (const [col, brick] of courses(back - 0.04, front + 0.04, row, 0.53).entries()) {
        s.block((row + col) % 4 ? 'stone' : 'stone_light', 0.19, 0.204, brick.width, sign * (side + 0.025), y, brick.middle);
        s.block('stone_light', 0.012, 0.02, brick.width - 0.017, sign * (side + 0.126), y + 0.087, brick.middle, 0, 0, 0, 0.85);
      }
    }
    for (let col = 0; col < 8; col++) s.block('stone', 0.48, 0.204, 0.19, -1.76 + col * 0.50, y, back - 0.025);
  }

  s.use('plaster', 'wall', 0.28, 0.70);
  for (const sign of [-1, 1]) {
    s.block('linen', 1.56, 1.68, 0.12, sign * 1.34, 2.37, front);
    s.block('linen', 0.12, 1.68, 3.55, sign * side, 2.37, center);
  }
  s.block('linen', 1.12, 0.50, 0.12, 0, 2.94, front);
  s.block('linen', 4.18, 1.68, 0.12, 0, 2.37, back);
  // The portal reveals a shaded inner room; its front remains physically open.
  s.block('ink', 3.96, 2.94, 0.035, 0, 1.65, back + 0.12);
  for (const sign of [-1, 1]) s.block('ink', 0.035, 2.94, 3.28, sign * 1.98, 1.65, center);
  s.block('wood_dark', 3.95, 0.06, 3.30, 0, 0.50, center);
  // Gables on the short ends: main roof ridge runs over the long civic facade.
  for (const sign of [-1, 1]) {
    const x = sign * 2.09;
    const a: Point = [x, eaves, back], b: Point = [x, eaves, front], c: Point = [x, ridge + 0.12, center];
    if (sign > 0) s.triangle('linen', b, a, c); else s.triangle('linen', a, b, c);
  }

  s.use('half-timber', 'frame', 0.20, 0.68);
  const timber = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    s.block('wood_dark', w + 0.025, h + 0.018, d + 0.025, x, y, z);
    s.block('wood', w, h, d, x + 0.006, y + 0.008, z + 0.008);
  };
  for (const z of [front + 0.09, back - 0.09]) {
    for (const y of [1.53, 2.36, 3.16]) {
      if (z === front + 0.09 && y < 3) {
        for (const sign of [-1, 1]) timber(1.58, 0.13, 0.14, sign * 1.37, y, z);
      } else timber(4.32, 0.13, 0.14, 0, y, z);
    }
    for (const x of [-2.08, -0.60, 0.60, 2.08]) timber(0.12, 1.73, 0.15, x, 2.35, z);
    for (const sign of [-1, 1]) {
      s.beam('wood_dark', [sign * 0.72, 1.62, z + 0.018], [sign * 1.97, 2.26, z + 0.018], 0.09, 0.11);
      s.beam('wood', [sign * 0.72, 2.46, z + 0.025], [sign * 1.97, 3.06, z + 0.025], 0.08, 0.12);
    }
  }
  for (const sign of [-1, 1]) {
    const x = sign * 2.17;
    for (const y of [1.53, 2.36, 3.16]) timber(0.13, 0.13, 3.65, x, y, center);
    for (const z of [back + 0.04, center, front - 0.04]) timber(0.14, 1.73, 0.12, x, 2.35, z);
    s.beam('wood_dark', [x, 1.62, back + 0.18], [x, 2.26, center - 0.15], 0.10);
    s.beam('wood_dark', [x, 2.46, center + 0.16], [x, 3.06, front - 0.16], 0.10);
    s.beam('wood_dark', [x, eaves, back - 0.02], [x, ridge + 0.12, center], 0.13);
    s.beam('wood_dark', [x, eaves, front + 0.02], [x, ridge + 0.12, center], 0.13);
    s.beam('wood', [x, eaves + 0.02, center], [x, ridge + 0.08, center], 0.11);
    for (const z of [center - 0.67, center + 0.67]) s.beam('wood_dark', [x, eaves + 0.03, z], [x, ridge - 0.64, z], 0.08);
  }

  s.use('entry-and-windows', 'detail', 0.64, 0.88);
  // Deep narrow civic vents interrupt the masonry, as on the reference's gable side.
  for (const sign of [-1, 1]) for (const z of [-1.15, 0.63]) {
    s.block('wood_dark', 0.025, 0.46, 0.20, sign * 2.215, 0.93, z);
    s.block('ink', 0.025, 0.36, 0.12, sign * 2.232, 0.94, z);
    s.block('stone_light', 0.08, 0.045, 0.23, sign * 2.205, 0.68, z);
  }
  for (const sign of [-1, 1]) {
    timber(0.13, 2.38, 0.23, sign * 0.59, 1.37, front + 0.04);
    s.block('wood_light', 0.025, 2.20, 0.025, sign * 0.53, 1.37, front + 0.17);
    // Recessed narrow windows remain legible behind the banners.
    s.block('wood_dark', 0.40, 0.53, 0.045, sign * 1.34, 2.50, front + 0.10);
    s.block('ink', 0.29, 0.41, 0.02, sign * 1.34, 2.50, front + 0.132);
    s.block('wood_light', 0.44, 0.045, 0.12, sign * 1.34, 2.23, front + 0.14);
  }
  const arch: Point[] = [[-0.59, 2.32, front + 0.15], [-0.38, 2.59, front + 0.15],
    [0, 2.68, front + 0.15], [0.38, 2.59, front + 0.15], [0.59, 2.32, front + 0.15]];
  for (let i = 1; i < arch.length; i++) s.beam('wood_dark', arch[i - 1], arch[i], 0.12, 0.18);
  for (let i = 0; i < 3; i++) {
    const z = 2.48 - i * 0.34, y = 0.18 + i * 0.16, w = 1.98 - i * 0.14;
    s.block('stone_dark', w + 0.04, y, 0.41, 0, y / 2 + 0.04, z);
    s.block('stone', w, 0.07, 0.40, 0, y + 0.055, z);
    s.block('stone_light', w - 0.03, 0.025, 0.025, 0, y + 0.087, z + 0.193);
    for (const x of [-0.46, 0.43]) s.block('stone_dark', 0.014, 0.008, 0.32, x, y + 0.094, z);
  }

  s.use('thatch', 'roof', 0.70, 0.96);
  // Broad overlapping sheaves, an uneven eave and fine straw seams instead of four flat stripes.
  const slope = Math.atan2(1.50, 2.13), length = Math.hypot(1.50, 2.13);
  for (const sign of [-1, 1]) {
    s.block('wood_dark', 4.93, 0.15, length + 0.08, 0, eaves + 0.65, center + sign * 1.065, sign * slope);
    for (let row = 0; row < 5; row++) {
      const fraction = (row + 0.5) / 5;
      const layer = 0.32 - row * 0.07;
      for (let col = 0; col < 34; col++) {
        const x = -2.39 + col * 0.145;
        const variation = Math.sin(col * 2.17 + row * 0.83 + sign) * 0.016;
        const y = ridge - fraction * 1.50 + layer + variation;
        const z = center + sign * (fraction * 2.13 + 0.015);
        s.sheaf(0.168, 0.18, length / 5 + 0.19,
          x, y, z, sign * slope, 0.94 + ((col * 3 + row) % 5) * 0.018);
        s.block('wood', 0.008, 0.014, length / 5 - 0.01, x + 0.060, y + 0.092, z, sign * slope, 0, 0, 0.87);
        s.block('straw_light', 0.009, 0.013, length / 5 - 0.07, x - 0.031, y + 0.094, z - sign * 0.015, sign * slope);
        // Each sheaf has a scalloped dark underside; these expose the five overlapping rows.
        const tip = (row + 1) / 5;
        const endZ = center + sign * (tip * 2.13 + 0.09 + variation);
        const endY = ridge - tip * 1.50 + layer - 0.01 + variation;
        s.block('wood_dark', 0.145, 0.052, 0.075, x, endY, endZ, sign * slope, 0, 0, 1.2);
        s.sheaf(0.143, 0.082, 0.16, x, endY + 0.052, endZ - sign * 0.01, sign * slope, 1.04);
      }
    }
    // Visible dark bar under the deep straw fringe.
    s.block('wood_dark', 4.99, 0.10, 0.12, 0, eaves - 0.015, center + sign * 2.16);
  }
  s.block('wood_dark', 5.03, 0.15, 0.18, 0, ridge + 0.33, center);
  s.block('wood_light', 5.06, 0.055, 0.17, 0, ridge + 0.42, center);
  for (const sign of [-1, 1]) {
    const x = sign * 2.49;
    s.beam('wood_dark', [x, eaves + 0.02, center - 2.18], [x, ridge + 0.35, center], 0.10);
    s.beam('wood_dark', [x, eaves + 0.02, center + 2.18], [x, ridge + 0.35, center], 0.10);
  }

  s.use('dormer', 'roof', 0.76, 0.97);
  s.block('wood_dark', 1.0, 0.57, 0.10, -0.12, 3.84, 1.36);
  s.block('linen', 0.85, 0.48, 0.12, -0.12, 3.84, 1.39);
  s.triangle('linen', [-0.62, 4.10, 1.45], [0.38, 4.10, 1.45], [-0.12, 4.59, 1.45]);
  s.block('wood_dark', 0.43, 0.48, 0.05, -0.12, 3.88, 1.47);
  s.block('ink', 0.29, 0.36, 0.02, -0.12, 3.88, 1.51);
  s.block('wood_light', 0.48, 0.05, 0.14, -0.12, 3.60, 1.49);
  for (const sign of [-1, 1]) {
    s.beam('wood_dark', [-0.12 + sign * 0.51, 4.08, 1.48], [-0.12, 4.62, 1.48], 0.095);
    s.block('wood_dark', 0.10, 0.58, 0.13, -0.12 + sign * 0.48, 3.84, 1.46);
    const angle = Math.atan2(0.54, 0.65);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 9; col++) {
      const f = (row + 0.5) / 3, z = 0.12 + col * 0.16;
      s.block('straw', Math.hypot(0.65, 0.54) / 3 + 0.08, 0.10, 0.171,
        -0.12 + sign * f * 0.65, 4.63 - f * 0.54, z, 0, 0, -sign * angle, 0.94 + (col % 3) * 0.025);
      s.block('wood', Math.hypot(0.65, 0.54) / 3 - 0.01, 0.012, 0.009,
        -0.12 + sign * f * 0.65, 4.70 - f * 0.54, z + 0.06, 0, 0, -sign * angle);
    }
  }
  s.block('wood_dark', 0.10, 0.10, 1.53, -0.12, 4.68, 0.76);

  s.use('banners', 'detail', 0.78, 0.99);
  for (const x of [-1.34, 1.34]) {
    s.block('wood_dark', 0.69, 0.075, 0.10, x, 2.78, front + 0.25);
    s.block('wood_light', 0.64, 0.025, 0.03, x, 2.82, front + 0.30);
    const width = 0.49, top = 2.75, height = 1.35;
    const clothPoint = (u: number, v: number, border = false): Point => [
      x + (u - 0.5) * (width + (border ? 0.035 : 0)),
      top - v * height + (v === 1 ? Math.abs(u - 0.5) * 0.16 : 0),
      front + 0.24 + Math.sin(v * Math.PI) * 0.055 + Math.sin(u * Math.PI * 3) * 0.018 + (border ? -0.006 : 0),
    ];
    for (const border of [true, false]) for (let row = 0; row < 8; row++) for (let col = 0; col < 6; col++) {
      const u = col / 6, v = row / 8;
      const a = clothPoint(u, v, border), b = clothPoint((col + 1) / 6, v, border);
      const c = clothPoint((col + 1) / 6, (row + 1) / 8, border), d = clothPoint(u, (row + 1) / 8, border);
      const tone = border ? 'wood_dark' : col === 0 || col === 5 ? 'blue' : 'blue_light';
      s.triangle(tone, a, d, b); s.triangle(tone, b, d, c);
    }
    // A stitched hem and a restrained V-shaped woven motif, fully static.
    s.beam('blue', [x - 0.17, 2.16, front + 0.30], [x, 2.01, front + 0.33], 0.018);
    s.beam('blue', [x, 2.01, front + 0.33], [x + 0.17, 2.16, front + 0.30], 0.018);
  }
  return s.finish();
}
