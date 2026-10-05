import * as THREE from 'three';
import { poolTileTexture, woodTexture } from './textures';

/** Layout (metres; +X east towards the sea, +Z south). */
export const GROUND_Y = 0.1;
export const DECK = { minX: -16, maxX: -4, minZ: -16, maxZ: -2, top: GROUND_Y + 0.35 };
export const POOL = { minX: -13.5, maxX: -5.5, minZ: -12, maxZ: -8, depth: 1.6 };
const HOUSE = { minX: -28, maxX: -16, minZ: -26, maxZ: -8, height: 3.3 };
const UPPER = { minX: -28, maxX: -19, minZ: -26, maxZ: -12, height: 3.0 };

export interface Villa {
  group: THREE.Group;
  /** 0 = day, 1 = night: lights windows, the pool and the terrace lamp. */
  setNight(amount: number): void;
  update(elapsed: number): void;
}

export function createVilla(): Villa {
  const group = new THREE.Group();
  group.name = 'Villa';

  const wall = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.85 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6 });
  const slab = new THREE.MeshStandardMaterial({ color: 0xdcd8cf, roughness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x6a93ab,
    roughness: 0.08,
    metalness: 0.15,
    emissive: 0xffc27a,
    emissiveIntensity: 0,
  });
  const railing = new THREE.MeshStandardMaterial({
    color: 0xbfe3f0,
    transparent: true,
    opacity: 0.25,
    roughness: 0.05,
  });

  const box = (
    material: THREE.Material,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    minZ: number,
    maxZ: number,
    shadows = true,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ),
      material,
    );
    mesh.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    mesh.castShadow = shadows;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  // --- House body -----------------------------------------------------------
  const floor1Top = GROUND_Y + HOUSE.height;
  const floor2Top = floor1Top + UPPER.height;
  box(wall, HOUSE.minX, HOUSE.maxX, GROUND_Y, floor1Top, HOUSE.minZ, HOUSE.maxZ);
  box(wall, UPPER.minX, UPPER.maxX, floor1Top, floor2Top, UPPER.minZ, UPPER.maxZ);
  // Overhanging roof slabs.
  box(
    slab,
    HOUSE.minX - 0.3,
    HOUSE.maxX + 0.4,
    floor1Top,
    floor1Top + 0.22,
    HOUSE.minZ - 0.3,
    HOUSE.maxZ + 0.4,
  );
  box(
    slab,
    UPPER.minX - 0.4,
    UPPER.maxX + 0.6,
    floor2Top,
    floor2Top + 0.25,
    UPPER.minZ - 0.4,
    UPPER.maxZ + 0.6,
  );

  // --- Glazing: sea-facing (east) and south facades -------------------------
  const pane = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
    box(glass, x0, x1, y0, y1, z0, z1, false);
  };
  const eastX = HOUSE.maxX + 0.03;
  for (let z = HOUSE.minZ + 1; z < HOUSE.maxZ - 1; z += 4) {
    pane(
      eastX - 0.06,
      eastX,
      GROUND_Y + 0.15,
      floor1Top - 0.35,
      z,
      Math.min(z + 3.6, HOUSE.maxZ - 1),
    );
    box(
      trim,
      eastX - 0.08,
      eastX + 0.02,
      GROUND_Y + 0.15,
      floor1Top - 0.35,
      z + 3.6,
      z + 3.75,
      false,
    );
  }
  const southZ = HOUSE.maxZ + 0.03;
  pane(HOUSE.minX + 1.5, HOUSE.minX + 5.5, GROUND_Y + 0.9, floor1Top - 0.5, southZ - 0.06, southZ);
  pane(
    HOUSE.minX + 6.5,
    HOUSE.maxX - 1.2,
    GROUND_Y + 0.15,
    floor1Top - 0.35,
    southZ - 0.06,
    southZ,
  );
  const upperEast = UPPER.maxX + 0.03;
  pane(
    upperEast - 0.06,
    upperEast,
    floor1Top + 0.3,
    floor2Top - 0.4,
    UPPER.minZ + 1,
    UPPER.minZ + 6,
  );
  pane(
    upperEast - 0.06,
    upperEast,
    floor1Top + 0.3,
    floor2Top - 0.4,
    UPPER.minZ + 7,
    UPPER.maxZ - 1,
  );
  const upperSouth = UPPER.maxZ + 0.03;
  pane(
    UPPER.minX + 1.5,
    UPPER.maxX - 1.5,
    floor1Top + 0.8,
    floor2Top - 0.4,
    upperSouth - 0.06,
    upperSouth,
  );

  // Balcony on the lower roof, with a glass railing towards the sea.
  box(
    railing,
    HOUSE.maxX - 0.05,
    HOUSE.maxX + 0.05,
    floor1Top + 0.22,
    floor1Top + 1.2,
    UPPER.minZ,
    UPPER.maxZ,
    false,
  );
  box(
    trim,
    HOUSE.maxX - 0.06,
    HOUSE.maxX + 0.06,
    floor1Top + 1.17,
    floor1Top + 1.25,
    UPPER.minZ,
    UPPER.maxZ,
    false,
  );

  // --- Deck with the pool cut out ---------------------------------------------
  const wood = woodTexture();
  wood.repeat.set(0.25, 0.5);
  const deckShape = new THREE.Shape()
    .moveTo(DECK.minX, DECK.minZ)
    .lineTo(DECK.maxX, DECK.minZ)
    .lineTo(DECK.maxX, DECK.maxZ)
    .lineTo(DECK.minX, DECK.maxZ)
    .closePath();
  deckShape.holes.push(
    new THREE.Path()
      .moveTo(POOL.minX, POOL.minZ)
      .lineTo(POOL.minX, POOL.maxZ)
      .lineTo(POOL.maxX, POOL.maxZ)
      .lineTo(POOL.maxX, POOL.minZ)
      .closePath(),
  );
  const deckGeometry = new THREE.ExtrudeGeometry(deckShape, {
    depth: DECK.top - GROUND_Y,
    bevelEnabled: false,
  });
  // Shape lies in XY; turn it so shape Y → world Z and extrusion points down.
  deckGeometry.rotateX(Math.PI / 2);
  deckGeometry.translate(0, DECK.top, 0);
  const deck = new THREE.Mesh(
    deckGeometry,
    new THREE.MeshStandardMaterial({ map: wood, roughness: 0.75 }),
  );
  deck.receiveShadow = true;
  deck.castShadow = true;
  group.add(deck);

  // Stone coping around the pool.
  const stone = new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.8 });
  const c = 0.3;
  const top = DECK.top + 0.04;
  box(stone, POOL.minX - c, POOL.maxX + c, DECK.top - 0.01, top, POOL.minZ - c, POOL.minZ, false);
  box(stone, POOL.minX - c, POOL.maxX + c, DECK.top - 0.01, top, POOL.maxZ, POOL.maxZ + c, false);
  box(stone, POOL.minX - c, POOL.minX, DECK.top - 0.01, top, POOL.minZ, POOL.maxZ, false);
  box(stone, POOL.maxX, POOL.maxX + c, DECK.top - 0.01, top, POOL.minZ, POOL.maxZ, false);

  // --- Pool basin and water ---------------------------------------------------
  const poolW = POOL.maxX - POOL.minX;
  const poolL = POOL.maxZ - POOL.minZ;
  const tiles = poolTileTexture();
  tiles.repeat.set(4, 1);
  const basin = new THREE.Mesh(
    new THREE.BoxGeometry(poolW, POOL.depth, poolL),
    // Inside faces only: the box is seen from within.
    new THREE.MeshStandardMaterial({ map: tiles, side: THREE.BackSide, roughness: 0.4 }),
  );
  basin.position.set(
    (POOL.minX + POOL.maxX) / 2,
    DECK.top - POOL.depth / 2,
    (POOL.minZ + POOL.maxZ) / 2,
  );
  basin.receiveShadow = true;
  group.add(basin);

  const poolWater = new THREE.Mesh(
    new THREE.PlaneGeometry(poolW, poolL),
    createPoolWaterMaterial(),
  );
  poolWater.rotation.x = -Math.PI / 2;
  poolWater.position.set(basin.position.x, DECK.top - 0.12, basin.position.z);
  group.add(poolWater);

  // Ladder at the sea end of the pool.
  const steel = new THREE.MeshStandardMaterial({
    color: 0xd9dde2,
    metalness: 0.9,
    roughness: 0.25,
  });
  for (const dz of [-0.3, 0.3]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 8), steel);
    rail.position.set(POOL.maxX - 0.12, DECK.top + 0.1, (POOL.minZ + POOL.maxZ) / 2 + dz);
    group.add(rail);
  }
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.6), steel);
    step.position.set(POOL.maxX - 0.12, DECK.top - 0.3 - i * 0.3, (POOL.minZ + POOL.maxZ) / 2);
    group.add(step);
  }

  // Warm terrace lamp for the evening.
  const lamp = new THREE.PointLight(0xffc38a, 0, 22, 2);
  lamp.position.set(HOUSE.maxX + 0.6, floor1Top - 0.4, (DECK.minZ + DECK.maxZ) / 2);
  group.add(lamp);

  const waterUniforms = (poolWater.material as THREE.ShaderMaterial).uniforms;
  return {
    group,
    setNight(amount) {
      glass.emissiveIntensity = amount * 1.6;
      waterUniforms.uNight.value = amount;
      lamp.intensity = amount * 12;
    },
    update(elapsed) {
      waterUniforms.uTime.value = elapsed;
    },
  };
}

/** Turquoise pool water with shimmering caustics; glows from underwater lights at night. */
function createPoolWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uNight: { value: 0 } },
    transparent: true,
    vertexShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPos = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_fragment>
      uniform float uTime;
      uniform float uNight;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        #include <logdepthbuf_fragment>
        vec2 p = vWorldPos.xz * 1.6;
        float t = uTime * 0.8;
        // Cheap caustics: interfering sine ridges, sharpened.
        float c = sin(p.x * 1.7 + sin(p.y * 1.3 + t) * 1.5 + t)
                + sin(p.y * 2.1 + sin(p.x * 1.1 - t * 0.7) * 1.7 - t * 0.6);
        c = pow(1.0 - abs(c) * 0.5, 6.0);
        vec3 deep = vec3(0.03, 0.42, 0.55);
        vec3 shallow = vec3(0.25, 0.80, 0.85);
        vec3 color = mix(deep, shallow, 0.55 + 0.25 * sin(vUv.x * 3.14));
        color += c * 0.35 * (1.0 - uNight);
        // Underwater lights at night.
        color = mix(color * (1.0 - 0.85 * uNight), vec3(0.15, 0.75, 0.95) * (0.7 + 0.3 * c), uNight * 0.75);
        vec3 view = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - clamp(view.y, 0.0, 1.0), 3.0);
        gl_FragColor = vec4(color + fresnel * 0.25 * (1.0 - uNight), 0.82);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
