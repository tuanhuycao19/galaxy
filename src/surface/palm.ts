import * as THREE from 'three';
import { barkTexture } from './textures';

const bark = barkTexture();
bark.repeat.set(1, 6);
const trunkMaterial = new THREE.MeshStandardMaterial({ map: bark, roughness: 0.95 });
const frondMaterial = new THREE.MeshStandardMaterial({
  color: 0x3f7d2c,
  roughness: 0.8,
  side: THREE.DoubleSide,
});
const coconutMaterial = new THREE.MeshStandardMaterial({ color: 0x5a4126, roughness: 0.7 });

/**
 * A leaning coconut palm: curved tapered trunk, drooping fronds, a few
 * coconuts. `sway(elapsed)` moves the crown gently in the sea breeze.
 */
export function createPalm(height: number, leanDeg: number, headingDeg: number, seed: number) {
  const group = new THREE.Group();
  group.name = 'Palm';

  const lean = THREE.MathUtils.degToRad(leanDeg);
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(Math.sin(lean) * height * 0.15, height * 0.35, 0),
    new THREE.Vector3(Math.sin(lean) * height * 0.4, height * 0.7, 0),
    new THREE.Vector3(Math.sin(lean) * height * 0.62, height, 0),
  ]);
  const trunkGeometry = new THREE.TubeGeometry(curve, 24, 0.17, 10, false);
  // Taper: shrink the radius towards the top.
  const pos = trunkGeometry.attributes.position;
  const point = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const ring = Math.floor(i / 11);
    const t = ring / 24;
    curve.getPointAt(Math.min(t, 1), point);
    const k = 1.25 - 0.55 * t;
    pos.setXYZ(
      i,
      point.x + (pos.getX(i) - point.x) * k,
      pos.getY(i),
      point.z + (pos.getZ(i) - point.z) * k,
    );
  }
  trunkGeometry.computeVertexNormals();
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.castShadow = true;
  group.add(trunk);

  const crown = new THREE.Group();
  crown.position.copy(curve.getPointAt(1));
  group.add(crown);
  const fronds = 10;
  for (let i = 0; i < fronds; i++) {
    const frond = new THREE.Mesh(
      createFrondGeometry(2.6 + ((seed * 7 + i * 3) % 5) * 0.15),
      frondMaterial,
    );
    frond.rotation.y = (i / fronds) * Math.PI * 2 + seed;
    frond.rotation.z = -0.15 - ((i * 13 + seed) % 7) * 0.05;
    frond.castShadow = true;
    crown.add(frond);
  }
  for (let i = 0; i < 4; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), coconutMaterial);
    const a = (i / 4) * Math.PI * 2 + seed;
    nut.position.set(Math.cos(a) * 0.18, -0.2, Math.sin(a) * 0.18);
    nut.castShadow = true;
    crown.add(nut);
  }

  group.rotation.y = THREE.MathUtils.degToRad(headingDeg);
  const phase = seed * 1.7;
  return {
    group,
    sway(elapsed: number) {
      crown.rotation.z = Math.sin(elapsed * 0.9 + phase) * 0.04;
      crown.rotation.x = Math.sin(elapsed * 0.7 + phase * 2) * 0.03;
    },
  };
}

/** A frond: a narrow leaf strip along +X that droops under its own weight. */
function createFrondGeometry(length: number): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(length, 0.7, 12, 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + length / 2; // 0 at the crown
    const t = x / length;
    const halfWidth = 0.35 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 0.02;
    const side = Math.sign(pos.getY(i));
    pos.setXYZ(
      i,
      x,
      0.5 * t - 1.4 * t * t + Math.abs(side) * 0.12, // arch up, then droop; V-fold
      side * halfWidth,
    );
  }
  geometry.computeVertexNormals();
  return geometry;
}
