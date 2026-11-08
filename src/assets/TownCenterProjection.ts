import * as THREE from 'three';

export type Pixel = [number, number];
export type Point = [number, number, number];
export type ProjectionPlane = [number, number, number, number];
export interface ProjectionPart {
  partId: string; status: 'source' | 'fallback'; sourcePolygon: Pixel[];
  plane?: ProjectionPlane; holes?: Pixel[][]; vertexPlanes?: ProjectionPlane[];
}
export interface CompletionBinding {
  region: string; origin: Point; uVector: Point; vVector: Point;
}
export interface TownCenterCompletion {
  image: { file: string; width: number; height: number; sha256: string };
  sourceSha256: string; screenName: string; gutter: number;
  regions: Record<string, [number, number, number, number]>;
  bindings: Record<string, CompletionBinding>;
  cornerUVs?: Record<string, Pixel[]>;
}
export interface TownCenterProjectionSpec {
  schemaVersion: number; buildingId: string; geometryVersion: number; sourceSha256: string;
  crop: number[]; image: { file: string; width: number; height: number; sha256: string };
  referenceCamera: { position: Point; target: Point; up: Point; left: number; right: number;
    top: number; bottom: number; near: number; far: number };
  landmarks: { id: string; partId: string; modelPoint: Point; imagePixel: Pixel }[];
  coverage: ProjectionPart[];
  completion?: TownCenterCompletion;
}

const finite = (a: unknown, size: number): a is number[] => Array.isArray(a) && a.length === size && a.every(Number.isFinite);
const hash = (a: unknown) => typeof a === 'string' && /^[a-f0-9]{64}$/.test(a);

export function validateProjectionSpec(raw: unknown): TownCenterProjectionSpec {
  const s = raw as TownCenterProjectionSpec | null, c = s?.referenceCamera;
  const polygon = (p: unknown): p is Pixel[] => Array.isArray(p) && p.length >= 3 && p.length <= 100 &&
    p.every(v => finite(v, 2) && v[0] >= 0 && v[0] <= 360 && v[1] >= 0 && v[1] <= 366);
  const plane = (p: unknown) => finite(p, 4) && Math.hypot(p[0], p[1], p[2]) > .01;
  if (!s || s.schemaVersion !== 1 || s.buildingId !== 'town_center' || s.geometryVersion !== 1 ||
    !hash(s.sourceSha256) || !hash(s.image?.sha256) || s.image.file !== 'design.png' ||
    s.image.width !== 360 || s.image.height !== 366 || !finite(s.crop, 4) ||
    ![20, 0, 360, 366].every((v, i) => s.crop[i] === v) || !c ||
    !finite(c.position, 3) || !finite(c.target, 3) || !finite(c.up, 3) ||
    new THREE.Vector3(...c.position).distanceTo(new THREE.Vector3(...c.target)) < 1 ||
    new THREE.Vector3(...c.up).length() < .1 ||
    ![c.left, c.right, c.top, c.bottom, c.near, c.far].every(Number.isFinite) ||
    c.right <= c.left || c.top <= c.bottom || c.near <= 0 || c.far <= c.near ||
    !Array.isArray(s.landmarks) || s.landmarks.length < 12 || !s.landmarks.every(l =>
      typeof l.id === 'string' && typeof l.partId === 'string' && finite(l.modelPoint, 3) && finite(l.imagePixel, 2)) ||
    !Array.isArray(s.coverage) || s.coverage.length < 5 || s.coverage.length > 24 ||
    new Set(s.coverage.map(p => p.partId)).size !== s.coverage.length || !s.coverage.every(p =>
      typeof p.partId === 'string' && (p.status === 'fallback' || (p.status === 'source' &&
      polygon(p.sourcePolygon) && plane(p.plane) && (!p.holes || p.holes.every(polygon)) &&
      (!p.vertexPlanes || (p.vertexPlanes.length === p.sourcePolygon.length && p.vertexPlanes.every(plane))))))) {
    throw new Error('Invalid direct Stitch skin manifest or projection geometry');
  }
  const required = ['left-wall', 'front-wall', 'front-roof', 'ridge-timber', 'left-roof-edge',
    'dormer-roof', 'dormer-gable', 'dormer-cheek', 'door-recess', 'portal-floor',
    ...Array.from({ length: 6 }, (_, i) => 'stair-' + i), 'stair-left', 'stair-right-edge'];
  const roof = s.coverage.find(p => p.partId === 'front-roof');
  const insideRoof = (pixel: Pixel) => {
    const polygon = roof!.sourcePolygon; let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a[1] > pixel[1]) !== (b[1] > pixel[1]) && pixel[0] <
        (b[0] - a[0]) * (pixel[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  };
  const direction = createProjectionCamera(s).getWorldDirection(new THREE.Vector3());
  if (!required.every(id => s.coverage.some(p => p.partId === id && p.status === 'source')) ||
    !roof?.holes || roof.holes.length !== 1 || !roof.holes[0].every(insideRoof) ||
    !s.coverage.filter(p => p.status === 'source').every(p => [p.plane!, ...(p.vertexPlanes ?? [])].every(n =>
      Math.abs(new THREE.Vector3(n[0], n[1], n[2]).normalize().dot(direction)) > .0001))) {
    throw new Error('Incomplete direct Stitch geometry contract');
  }
  if (s.completion) {
    const extra = s.completion;
    const regions = ['back-wall', 'right-wall', 'right-gable', 'back-roof', 'dormer-side', 'roof-edge', 'ridge-edge', 'floor'];
    if (extra.image?.file !== 'completion.png' || extra.image.width !== 512 || extra.image.height !== 512 ||
      !hash(extra.image.sha256) || !hash(extra.sourceSha256) || extra.gutter !== 8 ||
      !/^projects\/9572784485551125903\/screens\/[a-f0-9]{32}$/.test(extra.screenName) ||
      !extra.regions || !regions.every(id => {
        const r = extra.regions[id];
        return finite(r, 4) && r.every(Number.isInteger) && r[0] >= 8 && r[1] >= 8 &&
          r[2] > 0 && r[3] > 0 && r[0] + r[2] <= 504 && r[1] + r[3] <= 504;
      }) || !extra.bindings || !['back-wall', 'right-wall', 'roof-end', 'back-roof', 'floor'].every(id => {
        const b = extra.bindings[id];
        return b && regions.includes(b.region) && finite(b.origin, 3) && finite(b.uVector, 3) && finite(b.vVector, 3) &&
          new THREE.Vector3(...b.uVector).length() > .01 && new THREE.Vector3(...b.vVector).length() > .01 &&
          Math.abs(new THREE.Vector3(...b.uVector).normalize().dot(new THREE.Vector3(...b.vVector).normalize())) < .001;
      }) || !extra.cornerUVs || ![['right-wall', 7], ['back-wall', 6]].every(([id, count]) => {
        const points = extra.cornerUVs![String(id)];
        return Array.isArray(points) && points.length === count && points.every(v => finite(v, 2) && v.every(n => n >= 0 && n <= 1));
      })) throw new Error('Invalid additional Stitch face atlas');
  }
  return s;
}

export function atlasCornerUV(skin: TownCenterCompletion, region: string, uv: number[]): THREE.Vector2 {
  const [x, y, w, h] = skin.regions[region];
  if (!finite(uv, 2) || uv.some(v => v < 0 || v > 1)) throw new Error('Invalid architectural corner UV');
  return new THREE.Vector2((x + .5 + uv[0] * (w - 1)) / skin.image.width,
    1 - (y + .5 + uv[1] * (h - 1)) / skin.image.height);
}

export function createProjectionCamera(spec: TownCenterProjectionSpec): THREE.OrthographicCamera {
  const c = spec.referenceCamera;
  const camera = new THREE.OrthographicCamera(c.left, c.right, c.top, c.bottom, c.near, c.far);
  camera.position.fromArray(c.position); camera.up.fromArray(c.up); camera.lookAt(...c.target);
  camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
  return camera;
}

/** Always projects model-local positions through the immutable SOURCE camera. */
export function projectTownCenterUV(point: THREE.Vector3, spec: TownCenterProjectionSpec): THREE.Vector2 {
  const ndc = point.clone().project(createProjectionCamera(spec));
  return new THREE.Vector2((ndc.x + 1) / 2, (ndc.y + 1) / 2);
}

/** Fit a source pixel onto a real architectural plane; plane equation n·p = d. */
export function pointOnProjectionPlane(pixel: number[], plane: ProjectionPlane, spec: TownCenterProjectionSpec): THREE.Vector3 {
  const camera = createProjectionCamera(spec);
  const origin = new THREE.Vector3(pixel[0] / spec.image.width * 2 - 1,
    1 - pixel[1] / spec.image.height * 2, -1).unproject(camera);
  const direction = camera.getWorldDirection(new THREE.Vector3());
  const normal = new THREE.Vector3(plane[0], plane[1], plane[2]);
  const dot = normal.dot(direction);
  if (Math.abs(dot) < 1e-6) throw new Error('Projection plane parallel to source ray');
  return origin.addScaledVector(direction, (plane[3] - normal.dot(origin)) / dot);
}
