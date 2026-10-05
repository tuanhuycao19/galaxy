import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import type { QualityLevel } from '../core/quality';
import type { LocalSun } from '../physics/rotation';
import { createVilla, type Villa } from './house';
import { createFamily, type Family } from './people';
import { createPalm } from './palm';
import { createBeachBall, createLounger, createUmbrella } from './props';
import { createHills, createTerrain, groundHeight, WATER_LEVEL } from './terrain';

/** Where the family stands, and where the camera ends up looking at them. */
const FAMILY_X = 1.2;
const FAMILY_Z = 1.0;
const FINAL_CAMERA = new THREE.Vector3(4.6, 1.7, 8.8);
const FINAL_TARGET = new THREE.Vector3(-0.2, 1.1, -2.2);
const ARRIVAL_START = new THREE.Vector3(70, 480, 190);
const DEPARTURE_HEIGHT = 900;
/** Zooming out past this distance takes you back to space. */
export const LEAVE_DISTANCE = 520;

const DEG = Math.PI / 180;

/**
 * The beach at human scale (metres), rendered instead of the solar system
 * once the camera "lands". Lighting follows the real Sun position for the
 * simulated time, so it can be noon, sunset or a starry night.
 */
export class SurfaceView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 20000);
  readonly controls: OrbitControls;

  private readonly sky = new Sky();
  private readonly ocean: Water;
  private readonly simpleOcean: THREE.Mesh;
  private readonly sunLight = new THREE.DirectionalLight(0xffffff, 3);
  private readonly moonLight = new THREE.DirectionalLight(0x9fb7ff, 0);
  private readonly hemi = new THREE.HemisphereLight(0xcfe6ff, 0xe8dcc0, 1);
  private readonly stars: THREE.Points;
  private readonly fog = new THREE.FogExp2(0xbfd6e6, 0.00012);
  private readonly villa: Villa;
  private readonly family: Family;
  private readonly palms: ReturnType<typeof createPalm>[] = [];
  private readonly sunDir = new THREE.Vector3(0, 1, 0);

  private readonly from = { camera: new THREE.Vector3(), target: new THREE.Vector3() };
  private readonly to = { camera: new THREE.Vector3(), target: new THREE.Vector3() };

  constructor(domElement: HTMLElement) {
    this.scene.fog = this.fog;

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = LEAVE_DISTANCE + 80;
    this.controls.maxPolarAngle = 88 * DEG;
    this.controls.screenSpacePanning = false;

    // Sky dome (no depth: drawn first as the background).
    this.sky.scale.setScalar(15000);
    const skyMaterial = this.sky.material as THREE.ShaderMaterial;
    skyMaterial.depthTest = false;
    this.sky.renderOrder = -1;
    skyMaterial.uniforms.turbidity.value = 2.2;
    skyMaterial.uniforms.rayleigh.value = 1.2;
    skyMaterial.uniforms.mieCoefficient.value = 0.005;
    skyMaterial.uniforms.mieDirectionalG.value = 0.8;
    this.scene.add(this.sky);

    this.stars = createNightStars();
    this.scene.add(this.stars);

    // Ocean: reflective water (high/medium quality) or a plain glossy plane (low).
    const oceanGeometry = new THREE.PlaneGeometry(20000, 20000);
    const normals = new THREE.TextureLoader().load(
      `${import.meta.env.BASE_URL}textures/waternormals.webp`,
      (t) => (t.wrapS = t.wrapT = THREE.RepeatWrapping),
    );
    this.ocean = new Water(oceanGeometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: normals,
      sunDirection: this.sunDir.clone(),
      sunColor: 0xffffff,
      waterColor: 0x0a5a73,
      distortionScale: 2.2,
      fog: true,
    });
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = WATER_LEVEL;
    (this.ocean.material as THREE.ShaderMaterial).uniforms.size.value = 1.6;
    this.scene.add(this.ocean);
    this.simpleOcean = new THREE.Mesh(
      oceanGeometry,
      new THREE.MeshStandardMaterial({ color: 0x1b6f8a, roughness: 0.12, metalness: 0.25 }),
    );
    this.simpleOcean.rotation.x = -Math.PI / 2;
    this.simpleOcean.position.y = WATER_LEVEL;
    this.simpleOcean.visible = false;
    this.scene.add(this.simpleOcean);

    this.scene.add(createTerrain(), createHills());

    this.villa = createVilla();
    this.scene.add(this.villa.group);

    // Palms around the house and along the beach: x, z, height, lean, heading.
    const palmSpots: [number, number, number, number, number][] = [
      [-3, -18, 8.5, 12, 30],
      [3.5, -16, 9.5, 18, -20],
      [-18.5, -4, 7.5, 8, 160],
      [-5.5, 5, 8, 14, 200],
      [5, 12, 10, 22, -60],
      [-2, 15, 9, 10, 100],
      [-34, 4, 11, 6, 70],
      [7, -28, 8.5, 16, 10],
    ];
    palmSpots.forEach(([x, z, height, lean, heading], i) => {
      const palm = createPalm(height, lean, heading, i + 1);
      palm.group.position.set(x, groundHeight(x, z) - 0.1, z);
      this.palms.push(palm);
      this.scene.add(palm.group);
    });

    const umbrella = createUmbrella();
    umbrella.position.set(3.8, groundHeight(3.8, -7.6) - 0.15, -7.6);
    this.scene.add(umbrella);
    [
      [2.8, -6.6, 0xf2c14e],
      [2.8, -8.6, 0x4fb3bf],
    ].forEach(([x, z, color]) => {
      const lounger = createLounger(color);
      lounger.position.set(x, groundHeight(x, z), z);
      lounger.rotation.z = -Math.atan(0.08); // follow the beach slope
      this.scene.add(lounger);
    });
    const ball = createBeachBall();
    ball.position.set(
      FAMILY_X + 1.9,
      groundHeight(FAMILY_X + 1.9, FAMILY_Z + 1.2) + 0.15,
      FAMILY_Z + 1.2,
    );
    this.scene.add(ball);

    this.family = createFamily();
    this.family.group.position.set(FAMILY_X, groundHeight(FAMILY_X, FAMILY_Z), FAMILY_Z);
    // Face the camera's final viewpoint.
    this.family.group.rotation.y = Math.atan2(FINAL_CAMERA.x - FAMILY_X, FINAL_CAMERA.z - FAMILY_Z);
    this.scene.add(this.family.group);

    // Lights.
    this.sunLight.castShadow = true;
    const shadowCam = this.sunLight.shadow.camera;
    shadowCam.left = -36;
    shadowCam.right = 36;
    shadowCam.top = 36;
    shadowCam.bottom = -36;
    shadowCam.near = 1;
    shadowCam.far = 300;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.03;
    this.sunLight.target.position.set(-8, 0, -6);
    this.scene.add(this.sunLight, this.sunLight.target, this.moonLight, this.hemi);
    this.moonLight.position.set(-60, 90, 40);

    this.setQuality('high');
  }

  /** Where the family stands; the orbit target once landed. */
  get focus(): THREE.Vector3 {
    return FINAL_TARGET;
  }

  setSize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setQuality(level: QualityLevel): void {
    const reflective = level !== 'low';
    this.ocean.visible = reflective;
    this.simpleOcean.visible = !reflective;
    this.sunLight.castShadow = level !== 'low';
    const size = level === 'high' ? 2048 : 1024;
    if (this.sunLight.shadow.mapSize.x !== size) {
      this.sunLight.shadow.mapSize.set(size, size);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }
  }

  /** Light the scene for the Sun's position at the site. */
  setSun(sun: LocalSun): void {
    // Scene axes: x = east, y = up, z = south.
    this.sunDir.set(sun.east, sun.up, -sun.north).normalize();
    const elevation = sun.elevationDeg;
    const day = THREE.MathUtils.smoothstep(elevation, -4, 6);
    const night = 1 - THREE.MathUtils.smoothstep(elevation, -8, 0);
    // Warm, dim light near the horizon; white at height.
    const warmth = 1 - THREE.MathUtils.smoothstep(elevation, 2, 25);

    (this.sky.material as THREE.ShaderMaterial).uniforms.sunPosition.value.copy(this.sunDir);
    this.sunLight.position.copy(this.sunLight.target.position).addScaledVector(this.sunDir, 150);
    this.sunLight.intensity = 2.4 * day;
    this.sunLight.color.setRGB(1, 1 - 0.35 * warmth, 1 - 0.6 * warmth);
    this.hemi.intensity = 0.15 + 0.85 * day;
    this.hemi.color.setRGB(0.55 + 0.25 * day, 0.62 + 0.28 * day, 0.85 + 0.15 * day);
    this.moonLight.intensity = 0.35 * night;

    const oceanUniforms = (this.ocean.material as THREE.ShaderMaterial).uniforms;
    oceanUniforms.sunDirection.value.copy(this.sunDir);
    oceanUniforms.sunColor.value.setRGB(
      day + 0.05,
      day * (1 - 0.3 * warmth) + 0.05,
      day * (1 - 0.5 * warmth) + 0.08,
    );

    (this.stars.material as THREE.PointsMaterial).opacity = night;
    this.stars.visible = night > 0.01;
    this.villa.setNight(night);
    this.fog.color.setRGB(0.05 + 0.7 * day, 0.07 + 0.77 * day, 0.12 + 0.78 * day);
  }

  update(realSeconds: number, elapsed: number): void {
    (this.ocean.material as THREE.ShaderMaterial).uniforms.time.value += realSeconds * 0.6;
    this.villa.update(elapsed);
    this.family.update(elapsed);
    for (const palm of this.palms) palm.sway(elapsed);
    if (this.controls.enabled) {
      // Keep the orbit target near the scene so panning can't wander off.
      const t = this.controls.target;
      t.x = THREE.MathUtils.clamp(t.x, -120, 120);
      t.z = THREE.MathUtils.clamp(t.z, -120, 120);
      t.y = THREE.MathUtils.clamp(t.y, 0.3, 30);
      this.controls.update();
    }
  }

  get distanceFromTarget(): number {
    return this.camera.position.distanceTo(this.controls.target);
  }

  /** Start high above the beach; call `arrive(t)` with t from 0 to 1. */
  beginArrival(): void {
    this.controls.enabled = false;
    this.from.camera.copy(ARRIVAL_START);
    this.from.target.set(FAMILY_X, 0, FAMILY_Z);
    this.to.camera.copy(FINAL_CAMERA);
    this.to.target.copy(FINAL_TARGET);
    this.pose(0);
  }

  arrive(t: number): void {
    this.pose(easeInOutCubic(t));
    if (t >= 1) {
      this.controls.target.copy(FINAL_TARGET);
      this.controls.enabled = true;
      this.controls.update();
    }
  }

  /** Rise from wherever the camera is; call `depart(t)` with t from 0 to 1. */
  beginDeparture(): void {
    this.controls.enabled = false;
    this.from.camera.copy(this.camera.position);
    this.from.target.copy(this.controls.target);
    const away = this.camera.position.clone().sub(this.controls.target).setY(0);
    if (away.lengthSq() < 1) away.set(0.3, 0, 1);
    away.normalize().multiplyScalar(220);
    this.to.camera.copy(this.controls.target).add(away).setY(DEPARTURE_HEIGHT);
    this.to.target.copy(this.controls.target);
  }

  depart(t: number): void {
    this.pose(t * t);
  }

  /** Interpolate camera between `from` and `to`, altitude on a log scale. */
  private pose(e: number): void {
    const a = this.from.camera;
    const b = this.to.camera;
    const y = Math.exp(
      THREE.MathUtils.lerp(Math.log(Math.max(a.y, 0.5)), Math.log(Math.max(b.y, 0.5)), e),
    );
    this.camera.position.set(
      THREE.MathUtils.lerp(a.x, b.x, e),
      y,
      THREE.MathUtils.lerp(a.z, b.z, e),
    );
    this.controls.target.lerpVectors(this.from.target, this.to.target, e);
    this.camera.lookAt(this.controls.target);
  }
}

function createNightStars(): THREE.Points {
  const count = 2500;
  const positions = new Float32Array(count * 3);
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < count; i++) {
    // Upper hemisphere only.
    const u = rand() * 0.98 + 0.02;
    const theta = rand() * Math.PI * 2;
    const r = 9000;
    const s = Math.sqrt(1 - u * u);
    positions.set([s * Math.cos(theta) * r, u * r, s * Math.sin(theta) * r], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.6,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    }),
  );
  stars.renderOrder = 0;
  return stars;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
