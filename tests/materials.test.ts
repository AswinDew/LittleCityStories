import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MaterialLibrary } from '../src/assets/MaterialLibrary';
import * as THREE from 'three';

describe('MaterialLibrary', () => {
  beforeEach(() => {
    MaterialLibrary.getInstance().dispose();
  });

  afterEach(() => {
    MaterialLibrary.getInstance().dispose();
  });

  it('provides singleton instance', () => {
    const inst1 = MaterialLibrary.getInstance();
    const inst2 = MaterialLibrary.getInstance();
    expect(inst1).toBe(inst2);
  });

  it('provides registered ground materials', () => {
    const mats = MaterialLibrary.getInstance();
    const slab = mats.get('ground_slab');
    const grass = mats.get('ground_grass');

    expect(slab).toBeInstanceOf(THREE.Material);
    expect(grass).toBeInstanceOf(THREE.Material);
    expect((slab as THREE.MeshLambertMaterial).color.getHex()).toBe(0x6e503b);
    expect((grass as THREE.MeshLambertMaterial).color.getHex()).toBe(0x98cf7e);
  });

  it('resets singleton instance on dispose() so new instance is cleanly created', () => {
    const inst1 = MaterialLibrary.getInstance();
    inst1.dispose();

    const inst2 = MaterialLibrary.getInstance();
    expect(inst2).not.toBe(inst1);

    // Verify materials work normally on new instance without returning purged fallback
    const wallMat = inst2.get('wall_cream');
    expect((wallMat as THREE.MeshLambertMaterial).color.getHex()).toBe(0xfff3e0);
  });

  it('returns fallback material for unregistered name with warning', () => {
    const mats = MaterialLibrary.getInstance();
    const fallback = mats.get('non_existent_mat');
    expect(fallback).toBeInstanceOf(THREE.Material);
    expect((fallback as THREE.MeshLambertMaterial).color.getHex()).toBe(0xff00ff);
  });
});
