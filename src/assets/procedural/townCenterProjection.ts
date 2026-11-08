import * as THREE from 'three';
import { createProjectionCamera, pointOnProjectionPlane, projectTownCenterUV,
  type TownCenterProjectionSpec } from '../TownCenterProjection';

/** Coarse real 3D volumes carrying original architecture, isolated from the game factory. */
export function createProjectedTownCenter(spec: TownCenterProjectionSpec,
  sourceMaterial: THREE.Material, fallbackMaterial: THREE.Material): THREE.Group {
  const group = new THREE.Group(); group.name = 'TownCenterDirectStitch';
  const view = createProjectionCamera(spec).getWorldDirection(new THREE.Vector3()).negate();
  const add = (id: string, points: THREE.Vector3[], indices: number[][], source: boolean, normal = view) => {
    const positions: number[] = [], uvs: number[] = [];
    for (const face of indices) {
      const [a, b, c] = face.map(i => points[i]);
      const n = b.clone().sub(a).cross(c.clone().sub(a));
      const order = n.dot(normal) < 0 ? [face[0], face[2], face[1]] : face;
      for (const i of order) {
        positions.push(...points[i].toArray());
        if (source) uvs.push(...projectTownCenterUV(points[i], spec).toArray());
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (source) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals(); geometry.computeBoundingBox();
    const mesh = new THREE.Mesh(geometry, source ? sourceMaterial : fallbackMaterial);
    mesh.name = 'direct/' + id; mesh.userData.coverage = source ? 'source' : 'fallback';
    group.add(mesh);
  };
  for (const part of spec.coverage.filter(p => p.status === 'source')) {
    const contour = part.sourcePolygon.map(p => new THREE.Vector2(...p));
    const holes = (part.holes ?? []).map(h => h.map(p => new THREE.Vector2(...p)));
    const pixels = [...part.sourcePolygon, ...(part.holes ?? []).flat()];
    const points = pixels.map((pixel, i) => pointOnProjectionPlane(pixel, part.vertexPlanes?.[i] ?? part.plane!, spec));
    add(part.partId, points, THREE.ShapeUtils.triangulateShape(contour, holes), true);
  }
  // Source occlusion contains no hidden pixels. Close the relief down to the main
  // roof with honest untextured reveals instead of leaving floating image pieces.
  const revealPoints: THREE.Vector3[] = [], revealFaces: number[][] = [];
  const mainRoof = spec.coverage.find(p => p.partId === 'front-roof')!;
  const dormerParts = spec.coverage.filter(p => p.partId.startsWith('dormer-'));
  const dormerOutline = mainRoof.holes![0];
  const dormerTop = dormerOutline.map(pixel => {
    const part = dormerParts.find(p => p.sourcePolygon.some(v => v[0] === pixel[0] && v[1] === pixel[1]))!;
    const i = part.sourcePolygon.findIndex(v => v[0] === pixel[0] && v[1] === pixel[1]);
    return pointOnProjectionPlane(pixel, part.vertexPlanes?.[i] ?? part.plane!, spec);
  });
  const ridge = spec.coverage.find(p => p.partId === 'ridge-timber')!;
  for (const [outline, top] of [[dormerOutline, dormerTop], [ridge.sourcePolygon,
    ridge.sourcePolygon.map(pixel => pointOnProjectionPlane(pixel, ridge.plane!, spec))]] as const) {
    const bottom = outline.map(pixel => pointOnProjectionPlane(pixel, mainRoof.plane!, spec));
    for (let i = 0; i < top.length; i++) {
      const j = (i + 1) % top.length, n = revealPoints.length;
      revealPoints.push(top[i], top[j], bottom[j], bottom[i]);
      // Both faces are explicit so the closed relief also renders from the back;
      // the material itself remains FrontSide with normal depth writes.
      revealFaces.push([n, n + 1, n + 2], [n, n + 2, n + 3]);
      revealFaces.push([n + 2, n + 1, n], [n + 3, n + 2, n]);
    }
  }
  // Keep both windings here; the general source-facing winding correction would
  // collapse them. The reveals project to zero width only at the reference view.
  const revealGeometry = new THREE.BufferGeometry();
  revealGeometry.setAttribute('position', new THREE.Float32BufferAttribute(
    revealFaces.flatMap(face => face.flatMap(i => revealPoints[i].toArray())), 3));
  revealGeometry.computeVertexNormals();
  const reveals = new THREE.Mesh(revealGeometry, fallbackMaterial);
  reveals.name = 'direct/projection-reveals'; reveals.userData.coverage = 'fallback'; group.add(reveals);
  const quad = (id: string, points: number[][], normal: number[]) => add(id,
    points.map(p => new THREE.Vector3(p[0], p[1], p[2])), points.length === 3 ? [[0, 1, 2]] : [[0, 1, 2], [0, 2, 3]],
    false, new THREE.Vector3(...normal));
  quad('back-wall', [[-2.5, 0, -2.15], [2.5, 0, -2.15], [2.5, 3.2, -2.15], [-2.5, 3.2, -2.15]], [0, 0, -1]);
  quad('right-wall', [[2.5, 0, -2.15], [2.5, 0, 1.5], [2.5, 3.2, 1.5], [2.5, 3.2, -2.15]], [1, 0, 0]);
  const ridgeLeft = pointOnProjectionPlane([94, 122], mainRoof.plane!, spec).toArray();
  const ridgeRight = pointOnProjectionPlane([281, 30], mainRoof.plane!, spec).toArray();
  const eaveRight = pointOnProjectionPlane([338, 141], mainRoof.plane!, spec).toArray();
  quad('back-roof', [[ridgeLeft[0], 3.2, -2.3], [ridgeRight[0], 3.2, -2.3], ridgeRight, ridgeLeft], [0, 1, -1]);
  quad('roof-end', [[ridgeRight[0], 3.2, -2.3], eaveRight, ridgeRight], [1, 0, 0]);
  quad('floor', [[-2.5, 0, -2.15], [2.5, 0, -2.15], [2.5, 0, 1.5], [-2.5, 0, 1.5]], [0, -1, 0]);
  // A wider inner back wall closes off-axis sightlines through the real portal.
  // Sample the original dark room pixel, without projecting the facade onto it.
  const recess = group.getObjectByName('direct/door-recess') as THREE.Mesh;
  const old = recess.geometry, position = Array.from(old.getAttribute('position').array);
  const uv = Array.from(old.getAttribute('uv').array);
  for (const p of [[-2, 0, .3], [2, 0, .3], [2, 2.6, .3], [-2, 0, .3], [2, 2.6, .3], [-2, 2.6, .3]]) {
    position.push(...p); uv.push(246 / 360, 1 - 255 / 366);
  }
  recess.geometry = new THREE.BufferGeometry();
  recess.geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  recess.geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  recess.geometry.computeVertexNormals(); old.dispose();
  return group;
}
