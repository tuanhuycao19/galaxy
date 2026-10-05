import * as THREE from 'three';
import type { PlanetData } from '../data/planets';
import { bodyRadius, toScenePosition, type ScaleMode } from '../data/scale';
import { heliocentricPosition, type Vec3 } from '../physics/orbit';
import { bodyFrame, primeMeridianAngle } from '../physics/rotation';
import { formatAu, formatDegrees, formatDuration, formatKm } from '../ui/format';
import { loadTexture } from './assets';
import type { CelestialBody, InfoRow } from './CelestialBody';
import { createOrbitLine, updateOrbitLine } from './OrbitLine';
import { createRings } from './Rings';
import { createAtmosphereMaterial } from './shaders/AtmosphereMaterial';
import { applySurfaceTexture } from './textures/factory';

const DEG = Math.PI / 180;
/** Clouds drift slightly faster than the ground so they visibly move. */
const CLOUD_DRIFT = 1.08;
const TWO_PI = Math.PI * 2;
// One shared, fairly dense sphere: ~9k triangles per body is cheap even on
// phones and keeps silhouettes smooth when zoomed in, so no LOD levels needed.
const UNIT_SPHERE = new THREE.SphereGeometry(1, 96, 48);

/**
 * Scene graph:
 *   object (follows the orbit, axes fixed in space)
 *   └─ tilt (IAU body frame: +Y = north pole, +X = node W is measured
 *      │       from; scaled to the planet's radius; rings live here)
 *      └─ body (unit sphere spinning about its local Y axis by W, so the
 *               texture's prime meridian, at local +X, faces the right way)
 */
export class Planet implements CelestialBody {
  readonly object = new THREE.Group();
  readonly orbitLine: THREE.LineLoop;
  readonly pickTarget: THREE.Mesh;
  radius = 0;
  private mode: ScaleMode;
  private readonly tilt = new THREE.Group();
  private readonly clouds?: THREE.Mesh;
  private spin = 0;
  private cloudSpin = 0;
  private lastDays: number | null = null;

  constructor(
    readonly data: PlanetData,
    seed: number,
    mode: ScaleMode,
  ) {
    this.object.name = data.name;
    const frame = bodyFrame(data.rotation);
    this.tilt.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(toScene(frame.x), toScene(frame.y), toScene(frame.z)),
    );
    this.object.add(this.tilt);

    this.pickTarget = new THREE.Mesh(UNIT_SPHERE, createMaterial(data, seed));
    this.pickTarget.name = data.name;
    this.tilt.add(this.pickTarget);

    if (data.surface.kind === 'image' && data.surface.cloudsMap) {
      this.clouds = new THREE.Mesh(
        UNIT_SPHERE,
        new THREE.MeshStandardMaterial({
          map: loadTexture(data.surface.cloudsMap),
          transparent: true,
          depthWrite: false,
          roughness: 1,
          metalness: 0,
        }),
      );
      this.clouds.scale.setScalar(1.012);
      this.tilt.add(this.clouds);
    }

    if (data.atmosphere) {
      const shell = new THREE.Mesh(
        UNIT_SPHERE,
        createAtmosphereMaterial(data.atmosphere.color, data.atmosphere.intensity),
      );
      shell.scale.setScalar(1.035);
      this.tilt.add(shell);
    }

    if (data.rings) {
      this.tilt.add(createRings(data.rings.innerRadiusKm, data.rings.outerRadiusKm, data.radiusKm));
    }

    this.mode = mode;
    this.orbitLine = createOrbitLine(data.orbit, mode);
    this.setScaleMode(mode);
  }

  get name(): string {
    return this.data.name;
  }

  get description(): string {
    return this.data.description;
  }

  get viewDistance(): number {
    return this.radius * (this.data.rings ? 7 : 4.5);
  }

  setScaleMode(mode: ScaleMode): void {
    if (mode !== this.mode) updateOrbitLine(this.orbitLine, this.data.orbit, mode);
    this.mode = mode;
    this.radius = bodyRadius(this.data.radiusKm, mode);
    this.tilt.scale.setScalar(this.radius);
  }

  update(days: number): void {
    toScenePosition(heliocentricPosition(this.data.orbit, days), this.mode, this.object.position);

    const target = primeMeridianAngle(this.data.rotation, days);
    const applied =
      this.lastDays === null
        ? target - this.spin
        : spinStep(
            this.spin,
            target,
            this.data.rotation.wRateDegPerDay * DEG * (days - this.lastDays),
          );
    this.lastDays = days;
    this.spin = (this.spin + applied) % TWO_PI;
    this.pickTarget.rotation.y = this.spin;
    if (this.clouds) {
      this.cloudSpin = (this.cloudSpin + applied * CLOUD_DRIFT) % TWO_PI;
      this.clouds.rotation.y = this.cloudSpin;
    }
  }

  /**
   * Pins `object` to the surface at a planetocentric latitude/longitude so
   * it turns with the planet. It sits on the unit sphere in body space.
   */
  attachToSurface(object: THREE.Object3D, latDeg: number, lonDeg: number): void {
    // SphereGeometry puts u = 0 (longitude −180°) at local −X, so longitude 0 is at +X.
    const lat = latDeg * DEG;
    const phi = (lonDeg + 180) * DEG;
    object.position.set(
      -Math.cos(phi) * Math.cos(lat),
      Math.sin(lat),
      Math.sin(phi) * Math.cos(lat),
    );
    this.pickTarget.add(object);
  }

  /** North pole direction in world space. */
  getPoleDirection(target: THREE.Vector3): THREE.Vector3 {
    return target
      .set(0, 1, 0)
      .applyQuaternion(this.tilt.getWorldQuaternion(new THREE.Quaternion()));
  }

  info(days: number): InfoRow[] {
    const d = this.data;
    const p = heliocentricPosition(d.orbit, days);
    const retrograde = d.axialTiltDeg > 90 ? ' (ngược chiều)' : '';
    return [
      { label: 'Bán kính', value: formatKm(d.radiusKm) },
      { label: 'Cách Mặt Trời', value: formatAu(Math.hypot(p.x, p.y, p.z)) },
      { label: 'Một năm (quỹ đạo)', value: formatDuration(d.orbit.periodDays) },
      { label: 'Tự quay', value: formatDuration(d.rotationPeriodHours / 24) + retrograde },
      { label: 'Độ nghiêng trục', value: formatDegrees(d.axialTiltDeg) },
      { label: 'Số vệ tinh', value: d.moons },
    ];
  }
}

function createMaterial(data: PlanetData, seed: number): THREE.Material {
  const surface = data.surface;
  if (surface.kind !== 'image') {
    const material = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
    applySurfaceTexture(material, surface, seed);
    return material;
  }
  // Phong supports a specular map, which makes oceans glint and land stay matte.
  const material = new THREE.MeshPhongMaterial({
    map: loadTexture(surface.map),
    normalMap: surface.normalMap ? loadTexture(surface.normalMap, false) : null,
    specularMap: surface.specularMap ? loadTexture(surface.specularMap, false) : null,
    specular: 0x333333,
    shininess: 18,
  });
  if (surface.nightMap) addNightLights(material, loadTexture(surface.nightMap));
  return material;
}

/**
 * City lights as an emissive map, faded out on the day side. The Sun sits
 * at the world origin, so its view-space position is `viewMatrix * origin`.
 */
function addNightLights(material: THREE.MeshPhongMaterial, lights: THREE.Texture): void {
  material.emissiveMap = lights;
  material.emissive.setRGB(1, 0.86, 0.62);
  material.emissiveIntensity = 1.4;
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      /* glsl */ `#include <emissivemap_fragment>
      {
        vec3 toSun = normalize((viewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz + vViewPosition);
        float night = smoothstep(0.12, -0.18, dot(normal, toSun));
        totalEmissiveRadiance *= night;
      }`,
    );
  };
}

/** Heliocentric ecliptic → scene axes (see `toScenePosition`). */
function toScene(v: Vec3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.z, -v.y);
}

/**
 * At high time scales real spin rates turn into strobing (Earth would spin
 * 365 times a second at "1 year/s"), so the visible spin per frame is
 * capped. Below the cap the planet eases back to its true rotation phase,
 * smoothly but within about a second, so the day/night line matches the
 * clock again soon after slowing down.
 */
export const MAX_SPIN_PER_FRAME = 0.12;
const PHASE_CATCH_UP = 0.06;
const MAX_CATCH_UP_PER_FRAME = 0.15;

/** How far to turn this frame, given the true step and the true phase `target`. */
export function spinStep(spin: number, target: number, step: number): number {
  if (Math.abs(step) > MAX_SPIN_PER_FRAME) return Math.sign(step) * MAX_SPIN_PER_FRAME;
  const drift = wrapPi(target - (spin + step));
  return (
    step +
    THREE.MathUtils.clamp(drift * PHASE_CATCH_UP, -MAX_CATCH_UP_PER_FRAME, MAX_CATCH_UP_PER_FRAME)
  );
}

function wrapPi(a: number): number {
  return a - TWO_PI * Math.round(a / TWO_PI);
}
