import * as THREE from 'three';

const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.6 });
const teak = new THREE.MeshStandardMaterial({ color: 0x9a6a43, roughness: 0.7 });

/** Beach umbrella with alternating coloured panels. */
export function createUmbrella(): THREE.Group {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 8), white);
  pole.position.y = 1.2;
  pole.castShadow = true;
  group.add(pole);

  const segments = 8;
  const canopy = new THREE.ConeGeometry(1.4, 0.45, segments, 1, true);
  const colors: number[] = [];
  const red = new THREE.Color(0xe4573d);
  const cream = new THREE.Color(0xf6efe0);
  const pos = canopy.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const angle = Math.atan2(pos.getZ(i), pos.getX(i)) + Math.PI;
    const panel = Math.floor((angle / (Math.PI * 2)) * segments + 0.5) % 2;
    const c = panel ? red : cream;
    colors.push(c.r, c.g, c.b);
  }
  canopy.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const canopyMesh = new THREE.Mesh(
    canopy.toNonIndexed(),
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.8,
      flatShading: true,
    }),
  );
  canopyMesh.position.y = 2.35;
  canopyMesh.castShadow = true;
  group.add(canopyMesh);
  return group;
}

/** Sun lounger, backrest towards local −X so it faces +X. */
export function createLounger(towelColor: number): THREE.Group {
  const group = new THREE.Group();
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.65), teak);
  bed.position.set(0.15, 0.32, 0);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.65), teak);
  back.position.set(-0.75, 0.55, 0);
  back.rotation.z = -0.75;
  const towel = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.02, 0.5),
    new THREE.MeshStandardMaterial({ color: towelColor, roughness: 1 }),
  );
  towel.position.set(0.15, 0.37, 0);
  for (const [x, z] of [
    [-0.45, -0.27],
    [-0.45, 0.27],
    [0.75, -0.27],
    [0.75, 0.27],
  ]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), teak);
    leg.position.set(x, 0.15, z);
    group.add(leg);
  }
  for (const m of [bed, back, towel]) {
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  return group;
}

/** Striped beach ball. */
export function createBeachBall(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(0.17, 24, 16).toNonIndexed();
  const pos = geometry.attributes.position;
  const palette = [0xe63946, 0xffffff, 0x1d6fd8, 0xffffff, 0xf4c430, 0xffffff].map(
    (c) => new THREE.Color(c),
  );
  const colors: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    // Colour whole triangles by the longitude of their centroid.
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const k =
      Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * palette.length) % palette.length;
    for (let j = 0; j < 3; j++) colors.push(palette[k].r, palette[k].g, palette[k].b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const ball = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }),
  );
  ball.castShadow = true;
  return ball;
}
