import * as THREE from 'three';
import { sandTexture } from './textures';

/**
 * Scene axes: +X east (towards the sea), +Y up, +Z south. Units: metres.
 * Flat land around the house, then a beach sloping gently into the sea.
 */
export const WATER_LEVEL = -0.6;
const LAND_HEIGHT = 0.1;
const BEACH_START_X = -2;
const BEACH_SLOPE = 0.08;
/** Where grass gives way to sand, west of the house. */
const GRASS_EDGE_X = -42;

export function groundHeight(x: number, z: number): number {
  let h = LAND_HEIGHT;
  if (x > BEACH_START_X) {
    const d = x - BEACH_START_X;
    // Soft wind ripples on the dry beach, fading out under water.
    const ripple = 0.05 * Math.sin(x * 0.45 + z * 0.08) * Math.sin(z * 0.17 + x * 0.05);
    h += -d * BEACH_SLOPE + ripple * Math.min(1, d / 4);
  }
  return h;
}

/** Shoreline x for a given z (approximate; ignores ripples). */
export const SHORELINE_X = BEACH_START_X + (LAND_HEIGHT - WATER_LEVEL) / BEACH_SLOPE;

const DRY_SAND = new THREE.Color(0xf4eee0);
const WET_SAND = new THREE.Color(0xc9bb9a);
const GRASS = new THREE.Color(0x7d9a52);

/**
 * Beach strip along the coast plus a coarse inland plane, so the land
 * reaches the horizon without millions of vertices.
 */
export function createTerrain(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Terrain';
  const sand = sandTexture();
  // ~4 m per tile in both directions (the strip is 700 × 4000 m).
  sand.repeat.set(175, 1000);

  const beach = new THREE.PlaneGeometry(700, 4000, 280, 200);
  beach.rotateX(-Math.PI / 2);
  beach.translate(-50, 0, 0);
  const pos = beach.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = groundHeight(x, z);
    pos.setY(i, y);
    // Dry → wet sand near the waterline; grass far inland.
    const wet = 1 - THREE.MathUtils.smoothstep(y, WATER_LEVEL + 0.05, WATER_LEVEL + 0.35);
    c.copy(DRY_SAND).lerp(WET_SAND, wet);
    c.lerp(GRASS, 1 - THREE.MathUtils.smoothstep(x, GRASS_EDGE_X - 6, GRASS_EDGE_X + 6));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  beach.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  beach.computeVertexNormals();
  const beachMesh = new THREE.Mesh(
    beach,
    new THREE.MeshStandardMaterial({ map: sand, vertexColors: true, roughness: 0.95 }),
  );
  beachMesh.receiveShadow = true;
  group.add(beachMesh);

  const inland = new THREE.PlaneGeometry(9000, 9000, 1, 1);
  inland.rotateX(-Math.PI / 2);
  inland.translate(-400 - 4500, LAND_HEIGHT - 0.02, 0);
  group.add(
    new THREE.Mesh(inland, new THREE.MeshStandardMaterial({ color: 0x6b8a48, roughness: 1 })),
  );

  return group;
}

/**
 * Low hills of the Sơn Trà peninsula to the north-east, so the horizon
 * isn't empty. Simple jittered cones; fog softens them.
 */
export function createHills(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Hills';
  const material = new THREE.MeshStandardMaterial({
    color: 0x3f5f3a,
    roughness: 1,
    flatShading: true,
  });
  const hills: [number, number, number, number][] = [
    // x, z, radius, height
    [900, -3200, 900, 520],
    [1700, -3600, 1100, 640],
    [2600, -3300, 800, 380],
    [300, -3800, 700, 300],
  ];
  hills.forEach(([x, z, r, h], i) => {
    const geometry = new THREE.ConeGeometry(r, h, 18, 4, true);
    const p = geometry.attributes.position;
    for (let j = 0; j < p.count; j++) {
      const y = p.getY(j);
      if (y < h / 2 - 1) {
        const k = 1 + 0.12 * Math.sin(j * 12.9898 + i) * Math.sin(j * 78.233);
        p.setX(j, p.getX(j) * k);
        p.setZ(j, p.getZ(j) * k);
        p.setY(j, y + 25 * Math.sin(j * 3.1 + i));
      }
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, h / 2 + WATER_LEVEL - 20, z);
    group.add(mesh);
  });
  return group;
}
