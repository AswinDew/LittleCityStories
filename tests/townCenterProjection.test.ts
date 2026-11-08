import { expect, it } from 'vitest';
import * as THREE from 'three';
import manifest from '../public/building-skins/town-center-direct/manifest.json';
import { createProjectionCamera, pointOnProjectionPlane, projectTownCenterUV, validateProjectionSpec } from '../src/assets/TownCenterProjection';
import { createProjectedTownCenter } from '../src/assets/procedural/townCenterProjection';

it('projects native raster corners and anchors with exactly one V flip, independent of model rotation', () => {
  const spec = validateProjectionSpec(manifest);
  for (const pixel of [[0, 0], [360, 0], [0, 366], [180, 183]]) {
    const p = pointOnProjectionPlane(pixel, [0, 0, 1, 1.5], spec);
    const uv = projectTownCenterUV(p, spec);
    expect(uv.x).toBeCloseTo(pixel[0] / 360, 6);
    expect(uv.y).toBeCloseTo(1 - pixel[1] / 366, 6);
  }
  for (const landmark of spec.landmarks) {
    const uv = projectTownCenterUV(new THREE.Vector3(...landmark.modelPoint), spec);
    expect(Math.hypot(uv.x * 360 - landmark.imagePixel[0], (1 - uv.y) * 366 - landmark.imagePixel[1])).toBeLessThan(.001);
  }
  const camera = createProjectionCamera(spec);
  expect(camera.position.y).toBeCloseTo(9.797958971);
  expect(() => validateProjectionSpec({ ...manifest, geometryVersion: 2 })).toThrow();
  expect(() => validateProjectionSpec({ ...manifest, coverage: [] })).toThrow();
});

it('rejects incomplete geometry contracts before the loader can report readiness', () => {
  expect(() => validateProjectionSpec({ ...manifest,
    coverage: manifest.coverage.filter(p => p.partId !== 'front-roof') })).toThrow();
  const noHole = structuredClone(manifest);
  delete noHole.coverage.find(p => p.partId === 'front-roof')!.holes;
  expect(() => validateProjectionSpec(noHole)).toThrow();
  const missingBoundary = structuredClone(manifest);
  missingBoundary.coverage.find(p => p.partId === 'front-roof')!.holes![0][0] = [0, 0];
  expect(() => validateProjectionSpec(missingBoundary)).toThrow();
  const wrongCorner = structuredClone(manifest); wrongCorner.completion.cornerUVs['right-wall'][0] = [-.1, 1];
  expect(() => validateProjectionSpec(wrongCorner)).toThrow();
});

it('builds real volume with a clear portal, a separate recess, explicit fallback faces and stable source UVs', () => {
  const spec = validateProjectionSpec(manifest);
  const source = new THREE.MeshBasicMaterial(), fallback = new THREE.MeshBasicMaterial();
  const group = createProjectedTownCenter(spec, source, fallback);
  group.updateMatrixWorld(true);
  const meshes = group.children as THREE.Mesh[];
  expect(meshes.length).toBeLessThanOrEqual(24);
  const box = new THREE.Box3().setFromObject(group), size = box.getSize(new THREE.Vector3());
  expect(size.x).toBeGreaterThan(4); expect(size.y).toBeGreaterThan(4); expect(size.z).toBeGreaterThan(3);
  expect(size.x).toBeLessThan(6.5); expect(size.z).toBeLessThan(6.5);
  expect(meshes.filter(m => m.userData.coverage === 'completion').length).toBeGreaterThan(3);
  expect(meshes.filter(m => m.userData.coverage === 'fallback')).toHaveLength(0);
  for (const mesh of meshes) expect(mesh.geometry.getAttribute('uv')).toBeDefined();
  const front = meshes.find(m => m.name === 'direct/front-wall')!;
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 1.15, 4), new THREE.Vector3(0, 0, -1));
  expect(ray.intersectObject(front)).toHaveLength(0);
  expect(ray.intersectObject(meshes.find(m => m.name === 'direct/door-recess')!).length).toBeGreaterThan(0);
  const before = meshes.map(m => Array.from(m.geometry.getAttribute('uv')?.array ?? []));
  group.rotation.y = Math.PI / 2; group.updateMatrixWorld(true);
  expect(meshes.map(m => Array.from(m.geometry.getAttribute('uv')?.array ?? []))).toEqual(before);
  for (const mesh of meshes) {
    expect(Array.from(mesh.geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true);
    mesh.geometry.dispose();
  }
  source.dispose(); fallback.dispose();
});

it('joins the dormer roof to its front gable in 3D and closes the portal floor', () => {
  const spec = validateProjectionSpec(manifest), material = new THREE.MeshBasicMaterial();
  const group = createProjectedTownCenter(spec, material, material); group.updateMatrixWorld(true);
  const vertexAt = (name: string, pixel: number[]) => {
    const mesh = group.getObjectByName('direct/' + name) as THREE.Mesh;
    const uv = mesh.geometry.getAttribute('uv'), positions = mesh.geometry.getAttribute('position');
    for (let i = 0; i < uv.count; i++) {
      if (Math.abs(uv.getX(i) * 360 - pixel[0]) < .001 && Math.abs((1 - uv.getY(i)) * 366 - pixel[1]) < .001)
        return new THREE.Vector3().fromBufferAttribute(positions, i);
    }
    throw new Error('Missing shared vertex');
  };
  for (const pixel of [[219, 150], [244, 105]]) {
    const edge = vertexAt('dormer-gable', pixel);
    const roof = (group.getObjectByName('direct/dormer-roof') as THREE.Mesh).geometry.getAttribute('position');
    expect(Math.min(...Array.from({ length: roof.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(roof, i).distanceTo(edge)))).toBeLessThan(.00001);
  }
  expect(group.getObjectByName('direct/projection-reveals')).toBeDefined();
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(238 / 180 - 1, 1 - 297 / 183), createProjectionCamera(spec));
  expect(ray.intersectObject(group, true).length).toBeGreaterThan(0);
  for (const mesh of group.children as THREE.Mesh[]) mesh.geometry.dispose(); material.dispose();
});

it('keeps jagged roof-edge pixels on their correct interpolation triangle', () => {
  const spec = validateProjectionSpec(manifest), material = new THREE.MeshBasicMaterial();
  const group = createProjectedTownCenter(spec, material, material);
  const position = (group.getObjectByName('direct/front-roof') as THREE.Mesh).geometry.getAttribute('position');
  expect(Math.max(...Array.from({ length: position.count }, (_, i) => position.getX(i)))).toBeLessThan(2.8);
  for (const mesh of group.children as THREE.Mesh[]) mesh.geometry.dispose(); material.dispose();
});

it('keeps both ridge ends level and includes the complete front-right thatch silhouette', () => {
  const spec = validateProjectionSpec(manifest), material = new THREE.MeshBasicMaterial();
  const group = createProjectedTownCenter(spec, material, material);
  const ridge = group.getObjectByName('direct/ridge-timber') as THREE.Mesh;
  const p = ridge.geometry.getAttribute('position'), uv = ridge.geometry.getAttribute('uv');
  const heightAt = (pixel: number[]) => {
    for (let i = 0; i < p.count; i++) if (Math.abs(uv.getX(i) * 360 - pixel[0]) < .001 &&
      Math.abs((1 - uv.getY(i)) * 366 - pixel[1]) < .001) return p.getY(i);
    throw new Error('Missing roof endpoint');
  };
  expect(heightAt([87, 106])).toBeCloseTo(heightAt([274, 15]), 5);
  expect(heightAt([281, 30])).toBeCloseTo(heightAt([94, 123]), 5);
  const roof = spec.coverage.find(part => part.partId === 'front-roof')!;
  expect(roof.sourcePolygon).toContainEqual([343, 138]);
  for (const mesh of group.children as THREE.Mesh[]) mesh.geometry.dispose(); material.dispose();
});

it('keeps the source-fitted single dormer inside the main ridge timber height envelope', () => {
  const spec = validateProjectionSpec(manifest), material = new THREE.MeshBasicMaterial();
  const group = createProjectedTownCenter(spec, material, material);
  const dormer = group.children.filter(m => m.name.startsWith('direct/dormer-'));
  const bounds = new THREE.Box3(); dormer.forEach(m => bounds.expandByObject(m));
  const ridge = new THREE.Box3().setFromObject(group.getObjectByName('direct/ridge-timber')!);
  expect(bounds.max.y).toBeLessThan(ridge.max.y);
  for (const mesh of group.children as THREE.Mesh[]) mesh.geometry.dispose(); material.dispose();
});

it('has an upward-facing recessed floor behind the doorway threshold', () => {
  const spec = validateProjectionSpec(manifest), material = new THREE.MeshBasicMaterial();
  const group = createProjectedTownCenter(spec, material, material); group.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 1.3, 1), new THREE.Vector3(0, -1, -.2).normalize());
  const floor = group.getObjectByName('direct/portal-floor')!;
  expect(ray.intersectObject(floor).length).toBeGreaterThan(0);
  for (const mesh of group.children as THREE.Mesh[]) mesh.geometry.dispose(); material.dispose();
});

it('uses one planar right gable with the complete Stitch elevation, not a leaning wall and clamped triangle', () => {
  const spec = validateProjectionSpec(manifest), material = new THREE.MeshBasicMaterial();
  const group = createProjectedTownCenter(spec, material, material);
  const right = group.getObjectByName('direct/right-wall') as THREE.Mesh;
  const positions = right.geometry.getAttribute('position');
  expect(right.userData.artComponent).toBe('right-gable');
  for (let i = 0; i < positions.count; i++) expect(positions.getX(i)).toBeCloseTo(2.5, 6);
  expect(Math.max(...Array.from({ length: positions.count }, (_, i) => positions.getY(i)))).toBeCloseTo(4.84, 4);
  for (const mesh of group.children as THREE.Mesh[]) mesh.geometry.dispose(); material.dispose();
});

it('backs the painted stair treads with an opaque solid stair volume', () => {
  const spec = validateProjectionSpec(manifest), material = new THREE.MeshBasicMaterial();
  const group = createProjectedTownCenter(spec, material, material);
  const support = new THREE.Box3().setFromObject(group.getObjectByName('direct/floor')!);
  expect(support.max.y).toBeGreaterThan(.6);
  expect(support.max.z).toBeGreaterThan(2.5);
  for (const mesh of group.children as THREE.Mesh[]) mesh.geometry.dispose(); material.dispose();
});
