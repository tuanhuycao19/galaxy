import * as THREE from 'three';

/** Random stars on a distant shell, in two brightness layers. */
export function createStarfield(radius = 2000): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Starfield';
  group.add(createLayer(7000, radius, 1.2, 0.55, 1));
  group.add(createLayer(600, radius, 2.2, 0.95, 2));
  return group;
}

function createLayer(
  count: number,
  radius: number,
  size: number,
  brightness: number,
  seed: number,
): THREE.Points {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // Uniform direction on the sphere.
    const u = random() * 2 - 1;
    const theta = random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = radius * (0.9 + 0.1 * random());
    positions.set([s * Math.cos(theta) * r, u * r, s * Math.sin(theta) * r], i * 3);

    // Mostly white, some blue-ish and yellow-ish stars.
    const hue = random() < 0.5 ? 0.6 : 0.12;
    color.setHSL(hue, random() * 0.35, brightness * (0.5 + 0.5 * random()));
    colors.set([color.r, color.g, color.b], i * 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size,
      sizeAttenuation: false,
      vertexColors: true,
      depthWrite: false,
    }),
  );
}

/** Small seeded PRNG so the sky looks the same on every load. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
