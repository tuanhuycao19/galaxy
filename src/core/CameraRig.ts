import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CelestialBody } from '../objects/CelestialBody';

const FLIGHT_SECONDS = 1.6;
/** Keep the camera this many radii away from the surface of whatever it orbits. */
const MIN_DISTANCE_RADII = 1.3;

interface Flight {
  fromCamera: THREE.Vector3;
  fromTarget: THREE.Vector3;
  /** Body to land on, or null for a fixed destination (reset view). */
  body: CelestialBody | null;
  /** Destination target when `body` is null. */
  toTarget: THREE.Vector3;
  /** Final camera position relative to the destination target. */
  offset: THREE.Vector3;
  elapsed: number;
}

/**
 * Drives the camera on top of OrbitControls: eased flights to a body,
 * following it as it moves along its orbit, and flying back to the overview.
 */
export class CameraRig {
  /** Body the camera is locked onto, if any. */
  following: CelestialBody | null = null;
  private flight: Flight | null = null;
  private readonly lastFollowPosition = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly controls: OrbitControls,
    private readonly overview: { camera: THREE.Vector3; freeMinDistance: () => number },
  ) {}

  get isFlying(): boolean {
    return this.flight !== null;
  }

  /** Flies to `body`, approaching from its sunlit side, then follows it. */
  focus(body: CelestialBody): void {
    const center = body.object.getWorldPosition(new THREE.Vector3());
    const offset = this.approachDirection(center).multiplyScalar(body.viewDistance);
    this.startFlight(body, center, offset);
  }

  /** Flies back to the overview of the whole system and stops following. */
  reset(): void {
    const offset = this.overview.camera.clone();
    this.startFlight(null, new THREE.Vector3(), offset);
  }

  /** Starts following `body` from wherever the camera is, without a flight. */
  attach(body: CelestialBody): void {
    this.flight = null;
    this.following = body;
    body.object.getWorldPosition(this.lastFollowPosition);
    this.controls.target.copy(this.lastFollowPosition);
    this.controls.enabled = true;
    this.applyControlMode();
  }

  /** Stops following without moving the camera. */
  release(): void {
    this.flight = null;
    this.following = null;
    this.applyControlMode();
  }

  /**
   * Call after a scale-mode change has resized the followed body: keeps the
   * same framing by scaling the camera offset with the body's radius.
   */
  rescale(previousRadius: number): void {
    if (this.flight?.body) {
      this.focus(this.flight.body);
      return;
    }
    const body = this.following;
    if (!body) {
      this.applyControlMode();
      return;
    }
    const center = body.object.getWorldPosition(new THREE.Vector3());
    const offset = this.tmp.subVectors(this.camera.position, this.controls.target);
    offset.multiplyScalar(body.radius / previousRadius);
    this.controls.target.copy(center);
    this.camera.position.copy(center).add(offset);
    this.lastFollowPosition.copy(center);
    this.applyControlMode();
  }

  /** Call once per frame, after bodies have moved. */
  update(realSeconds: number): void {
    if (this.flight) {
      this.updateFlight(realSeconds);
    } else if (this.following) {
      // Move camera and target together so the user's chosen angle and zoom stick.
      const center = this.following.object.getWorldPosition(this.tmp);
      this.camera.position.add(center).sub(this.lastFollowPosition);
      this.controls.target.copy(center);
      this.lastFollowPosition.copy(center);
    }
    this.controls.update();
  }

  private startFlight(body: CelestialBody | null, toTarget: THREE.Vector3, offset: THREE.Vector3) {
    this.following = null;
    this.flight = {
      fromCamera: this.camera.position.clone(),
      fromTarget: this.controls.target.clone(),
      body,
      toTarget,
      offset,
      elapsed: 0,
    };
    this.controls.enabled = false;
    // Allow the flight to end closer than the current limit (e.g. a small planet).
    this.controls.minDistance = 0;
  }

  private updateFlight(realSeconds: number): void {
    const f = this.flight!;
    f.elapsed += realSeconds;
    const t = Math.min(f.elapsed / FLIGHT_SECONDS, 1);
    const e = easeInOutCubic(t);

    // The destination moves with the body, so re-aim every frame.
    const toTarget = f.body ? f.body.object.getWorldPosition(this.tmp) : f.toTarget;
    this.controls.target.lerpVectors(f.fromTarget, toTarget, e);
    const toCamera = toTarget.clone().add(f.offset);
    this.camera.position.lerpVectors(f.fromCamera, toCamera, e);

    if (t >= 1) {
      this.flight = null;
      this.following = f.body;
      this.lastFollowPosition.copy(toTarget);
      this.controls.enabled = true;
      this.applyControlMode();
    }
  }

  /** Panning and zoom-to-cursor would fight the follow lock, so only allow them when free. */
  private applyControlMode(): void {
    const free = this.following === null;
    this.controls.enablePan = free;
    this.controls.zoomToCursor = free;
    this.controls.minDistance = free
      ? this.overview.freeMinDistance()
      : this.following!.radius * MIN_DISTANCE_RADII;
  }

  /** Direction from the body towards the camera, favouring the side facing the Sun. */
  approachDirection(center: THREE.Vector3): THREE.Vector3 {
    if (center.lengthSq() === 0) {
      // The Sun itself: keep the current viewing direction.
      return this.tmp.subVectors(this.camera.position, this.controls.target).normalize().clone();
    }
    const toSun = center.clone().negate().normalize();
    const side = new THREE.Vector3(0, 1, 0).cross(toSun).normalize();
    return toSun
      .multiplyScalar(0.8)
      .addScaledVector(side, 0.55)
      .add(new THREE.Vector3(0, 0.35, 0))
      .normalize();
  }
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
