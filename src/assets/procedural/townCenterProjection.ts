import * as THREE from 'three';
import { atlasCornerUV, createProjectionCamera, pointOnProjectionPlane, projectTownCenterUV,
  type TownCenterProjectionSpec } from '../TownCenterProjection';

type V = THREE.Vector3;
interface Batch { positions: number[]; uvs: number[] }

/** Connected architecture; explicit Stitch components, never guessed triangle bindings. */
export function createProjectedTownCenter(spec: TownCenterProjectionSpec,
  sourceMaterial: THREE.Material, extraMaterial: THREE.Material): THREE.Group {
  const group = new THREE.Group(); group.name = 'TownCenterDirectStitch';
  const skin = spec.completion, view = createProjectionCamera(spec).getWorldDirection(new THREE.Vector3()).negate();
  const p = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const pointFor = (part: TownCenterProjectionSpec['coverage'][number], pixel: number[]) => {
    const i = part.sourcePolygon.findIndex(v => v[0] === pixel[0] && v[1] === pixel[1]);
    return pointOnProjectionPlane(pixel, part.vertexPlanes?.[i] ?? part.plane!, spec);
  };
  const corner = (region: string, uv: number[]) => skin ? atlasCornerUV(skin, region, uv) : new THREE.Vector2(.5, .5);
  const roofPixels = [[94, 122], [281, 30], [343, 138], [166, 224]];
  const roofCorners = [p(-2.6, 4.84, -.52), p(2.7, 4.84, -.52), p(2.7, 3.23, 1.62), p(-2.6, 3.23, 1.62)];
  const roofPoint = (pixel: number[]) => {
    const target = p(pixel[0], pixel[1], 0), weights = new THREE.Vector3();
    const side = (v: number[]) => (roofPixels[2][0] - roofPixels[0][0]) * (v[1] - roofPixels[0][1]) -
      (roofPixels[2][1] - roofPixels[0][1]) * (v[0] - roofPixels[0][0]);
    const triangle = side(pixel) * side(roofPixels[1]) >= 0 ? [0, 1, 2] : [0, 2, 3];
    THREE.Triangle.getBarycoord(target, ...triangle.map(i => p(...roofPixels[i] as [number, number], 0)) as [V, V, V], weights);
    return p(0, 0, 0).addScaledVector(roofCorners[triangle[0]], weights.x)
      .addScaledVector(roofCorners[triangle[1]], weights.y).addScaledVector(roofCorners[triangle[2]], weights.z);
  };
  const batch = (): Batch => ({ positions: [], uvs: [] });
  const emit = (out: Batch, points: V[], faces: number[][], uvs: THREE.Vector2[], normal: V) => {
    for (const face of faces) {
      const [a, b, c] = face.map(i => points[i]);
      const order = b.clone().sub(a).cross(c.clone().sub(a)).dot(normal) < 0 ? [...face].reverse() : face;
      for (const i of order) { out.positions.push(...points[i].toArray()); out.uvs.push(...uvs[i].toArray()); }
    }
  };
  const mesh = (id: string, out: Batch, source: boolean, component = id) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(out.positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(out.uvs, 2));
    geometry.computeVertexNormals(); geometry.computeBoundingBox();
    const node = new THREE.Mesh(geometry, source ? sourceMaterial : extraMaterial);
    node.name = 'direct/' + id; node.userData.artComponent = component;
    node.userData.coverage = source ? 'source' : skin ? 'completion' : 'fallback';
    if (!source && skin) node.userData.skinSource = skin.screenName;
    group.add(node); return node;
  };
  for (const part of spec.coverage.filter(v => v.status === 'source')) {
    if (part.partId === 'stair-left' || part.partId === 'stair-right-edge') continue;
    if (part.partId.startsWith('dormer-')) continue;
    const contour = part.sourcePolygon.map(v => new THREE.Vector2(...v));
    const holes = (part.holes ?? []).map(h => h.map(v => new THREE.Vector2(...v)));
    const pixels = [...part.sourcePolygon, ...(part.holes ?? []).flat()];
    const points = pixels.map(v => part.partId === 'front-roof' ? roofPoint(v) : pointFor(part, v));
    const out = batch();
    const uv = part.partId === 'front-roof' ? pixels.map(v => new THREE.Vector2(v[0] / 360, 1 - v[1] / 366)) :
      points.map(v => projectTownCenterUV(v, spec));
    emit(out, points, THREE.ShapeUtils.triangulateShape(contour, holes), uv, view);
    mesh(part.partId, out, true);
  }
  const quad = (out: Batch, points: V[], region: string, normal: V, uv = [[0, 0], [1, 0], [1, 1], [0, 1]]) =>
    emit(out, points, [[0, 1, 2], [0, 2, 3]], uv.map(v => corner(region, v)), normal);

  // Shared masonry and eave datums. Body and triangle live on the SAME x plane.
  const right = batch();
  const rightPoints = [p(2.5, 0, 1.5), p(2.5, 0, -2.15), p(2.5, 2.1, -2.15), p(2.5, 2.1, 1.5),
    p(2.5, 3.2, -2.15), p(2.5, 3.2, 1.5), p(2.5, 4.84, -.52)];
  const rightUV = skin?.cornerUVs?.['right-wall'] ?? [[0, 1], [1, 1], [1, .4], [0, .4], [1, .33], [0, .33], [.5, 0]];
  emit(right, rightPoints, [[0, 1, 2], [0, 2, 3], [3, 2, 4], [3, 4, 5], [5, 4, 6]],
    rightUV.map(v => corner('right-wall', v)), p(1, 0, 0));
  mesh('right-wall', right, false, 'right-gable');
  const rear = batch();
  const rearPoints = [p(2.5, 0, -2.15), p(-2.5, 0, -2.15), p(-2.5, 2.1, -2.15), p(2.5, 2.1, -2.15),
    p(-2.5, 3.2, -2.15), p(2.5, 3.2, -2.15)];
  const rearUV = skin?.cornerUVs?.['back-wall'] ?? [[0, 1], [1, 1], [1, .33], [0, .33], [1, 0], [0, 0]];
  emit(rear, rearPoints, [[0, 1, 2], [0, 2, 3], [3, 2, 4], [3, 4, 5]], rearUV.map(v => corner('back-wall', v)), p(0, 0, -1));
  mesh('back-wall', rear, false);

  const main = spec.coverage.find(v => v.partId === 'front-roof')!;
  const [leftRidge, rightRidge, rightEave, leftEave] = roofCorners;
  const backLeft = p(leftRidge.x, leftEave.y, -2.35), backRight = p(rightRidge.x, rightEave.y, -2.35);
  const rearRoof = batch();
  quad(rearRoof, [rightRidge, leftRidge, backLeft, backRight], 'back-roof', p(0, 1, -1));
  mesh('back-roof', rearRoof, false);
  const frontBase = batch();
  quad(frontBase, [leftRidge, rightRidge, rightEave, leftEave].map(v => v.clone().add(p(0, -.004, 0))),
    'back-roof', p(0, 1, 1), [[0, 0], [1, 0], [1, .5], [0, .5]]);
  mesh('front-roof-base', frontBase, false, 'solid-roof');

  const trim = batch();
  const cap = (a: V, b: V, c: V, d: V, normal: V) => quad(trim, [a, b, c, d], 'ridge-edge', normal);
  const drop = (v: V) => v.clone().add(p(0, -.1, 0));
  cap(rightEave, rightRidge, drop(rightRidge), drop(rightEave), p(1, 0, 0));
  cap(rightRidge, backRight, drop(backRight), drop(rightRidge), p(1, 0, 0));
  cap(backLeft, leftRidge, drop(leftRidge), drop(backLeft), p(-1, 0, 0));
  cap(backRight, backLeft, drop(backLeft), drop(backRight), p(0, 0, -1));
  const ridge = spec.coverage.find(v => v.partId === 'ridge-timber')!;
  const beam = ridge.sourcePolygon.map(v => pointFor(ridge, v));
  const beamBack = beam.map(v => v.clone().addScaledVector(view, -.12));
  for (let i = 0; i < beam.length; i++) {
    const j = (i + 1) % beam.length;
    const normal = beam[j].clone().sub(beam[i]).cross(beamBack[i].clone().sub(beam[i]));
    cap(beam[i], beam[j], beamBack[j], beamBack[i], normal);
  }
  emit(trim, beamBack, THREE.ShapeUtils.triangulateShape(ridge.sourcePolygon.map(v => new THREE.Vector2(...v)), []),
    ridge.sourcePolygon.map(v => corner('ridge-edge', [(v[0] - 87) / 194, (v[1] - 15) / 108])), view.clone().negate());

  const gable = spec.coverage.find(v => v.partId === 'dormer-gable')!;
  const dormerRoof = spec.coverage.find(v => v.partId === 'dormer-roof')!;
  const peak = pointFor(gable, [244, 105]), left = pointFor(gable, [219, 150]), rightE = pointFor(gable, [264, 127]);
  const rearPeak = pointFor(dormerRoof, [192, 74]), offset = rearPeak.clone().sub(peak);
  const rearLeft = left.clone().add(offset), rearRight = rightE.clone().add(offset);
  const sourceFace = (id: string, points: V[], pixels: number[][], faces: number[][], normal: V) => {
    const out = batch();
    emit(out, points, faces, pixels.map(v => new THREE.Vector2(v[0] / 360, 1 - v[1] / 366)), normal);
    mesh(id, out, true);
  };
  sourceFace('dormer-gable', gable.sourcePolygon.map(v => pointFor(gable, v)), gable.sourcePolygon,
    THREE.ShapeUtils.triangulateShape(gable.sourcePolygon.map(v => new THREE.Vector2(...v)), []), p(0, 0, 1));
  const leftDormerRoof = batch();
  quad(leftDormerRoof, [peak, rearPeak, rearLeft, left], 'roof-edge', p(-1, 1, 0), [[1, 0], [0, 0], [0, 1], [1, 1]]);
  mesh('dormer-roof', leftDormerRoof, false, 'dormer-left-roof');
  quad(trim, [rearPeak, peak, rightE, rearRight], 'roof-edge', p(1, 1, 0));
  const roofY = (v: V) => main.plane![3] - main.plane![2] * v.z;
  const originalCheeks: V[][] = [];
  for (const [front, back, sign] of [[left, rearLeft, -1], [rightE, rearRight, 1]] as const) {
    const a = front.y - roofY(front), b = back.y - roofY(back);
    const intersection = front.clone().lerp(back, a / (a - b));
    const points = [front, p(front.x, roofY(front), front.z), intersection];
    if (sign < 0) originalCheeks.push(points);
    else emit(trim, points, [[0, 1, 2]], [[0, 0], [0, 1], [1, 1]].map(v => corner('dormer-side', v)), p(sign, 0, 0));
  }
  emit(trim, [rearLeft, rearPeak, rearRight], [[0, 1, 2]],
    [[0, 1], [0, 0], [1, 1]].map(v => corner('dormer-side', v)), p(0, 0, -1));
  mesh('projection-reveals', trim, false, 'architectural-trim-and-dormer');
  const sourceCheek = batch();
  for (const points of originalCheeks) emit(sourceCheek, points, [[0, 1, 2]], points.map(v => projectTownCenterUV(v, spec)), p(-1, 0, 0));
  mesh('dormer-cheek', sourceCheek, true);
  const underside = batch();
  quad(underside, [p(-2.5, 0, -2.15), p(2.5, 0, -2.15), p(2.5, 0, 1.5), p(-2.5, 0, 1.5)], 'floor', p(0, -1, 0));
  quad(underside, [p(-2.5, 0, 1.49), p(2.5, 0, 1.49), p(2.5, .64, 1.49), p(-2.5, .64, 1.49)],
    'back-wall', p(0, 0, 1), [[0, 1], [1, 1], [1, .8], [0, .8]]);
  const stairRows: V[][] = [];
  for (let i = 0; i < 6; i++) {
    const part = spec.coverage.find(v => v.partId === 'stair-' + i)!;
    const points = part.sourcePolygon.map(v => pointFor(part, v));
    if (i === 0) stairRows.push([points[0], points[1]]);
    stairRows.push([points[3], points[2]]);
    if (i % 2 === 0) quad(underside, points.map(v => v.clone().add(p(0, -.004, 0))), 'floor', p(0, 1, 0));
  }
  for (const [column, name, sign] of [[0, 'stair-left', -1], [1, 'stair-right-edge', 1]] as const) {
    const points = stairRows.map(row => row[column]);
    points.push(points[0].clone().setY(.02));
    const contour = points.map(v => new THREE.Vector2(v.z, v.y));
    const side = batch(), minZ = Math.min(...points.map(v => v.z)), maxZ = Math.max(...points.map(v => v.z));
    const minY = Math.min(...points.map(v => v.y)), maxY = Math.max(...points.map(v => v.y));
    emit(side, points, THREE.ShapeUtils.triangulateShape(contour, []), points.map(v => column === 0 ?
      projectTownCenterUV(v, spec) : corner('floor', [(v.z - minZ) / (maxZ - minZ), (maxY - v.y) / (maxY - minY)])), p(sign, 0, 0));
    mesh(name, side, column === 0, 'stone-stair-side');
  }
  mesh('floor', underside, false);

  const appendSourceQuad = (name: string, points: V[], normal: V, pixel: number[] | null) => {
    const node = group.getObjectByName('direct/' + name) as THREE.Mesh, old = node.geometry;
    const out = { positions: Array.from(old.getAttribute('position').array), uvs: Array.from(old.getAttribute('uv').array) };
    emit(out, points, points.length === 3 ? [[0, 1, 2]] : [[0, 1, 2], [0, 2, 3]],
      points.map(v => pixel ? new THREE.Vector2(pixel[0] / 360, 1 - pixel[1] / 366) : projectTownCenterUV(v, spec)), normal);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(out.positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(out.uvs, 2));
    geometry.computeVertexNormals(); node.geometry = geometry; old.dispose();
  };
  appendSourceQuad('door-recess', [p(-2, 0, .3), p(2, 0, .3), p(2, 2.6, .3), p(-2, 2.6, .3)], p(0, 0, 1), [246, 255]);
  appendSourceQuad('portal-floor', [p(-1.2, .64, .3), p(1.2, .64, .3), p(1.2, .64, 1.6), p(-1.2, .64, 1.6)], p(0, 1, 0), [243, 286]);
  return group;
}
