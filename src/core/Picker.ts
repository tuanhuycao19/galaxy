import * as THREE from 'three';
import type { CelestialBody } from '../objects/CelestialBody';

/** A press that moves less than this (px) and is quicker than CLICK_MS counts as a click, not a drag. */
const CLICK_SLOP_PX = 6;
const CLICK_MS = 500;
/** Bodies smaller than a few pixels can still be picked by clicking near their centre. */
const SCREEN_PICK_RADIUS_PX = 18;

/** Turns clicks/taps on the canvas into body selections. */
export class Picker {
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly tmp = new THREE.Vector3();
  private down: { x: number; y: number; time: number } | null = null;

  constructor(
    private readonly element: HTMLElement,
    private readonly camera: THREE.Camera,
    private readonly bodies: readonly CelestialBody[],
    private readonly onPick: (body: CelestialBody) => void,
  ) {
    element.addEventListener('pointerdown', (e) => {
      if (e.isPrimary) this.down = { x: e.clientX, y: e.clientY, time: performance.now() };
    });
    element.addEventListener('pointerup', (e) => {
      const down = this.down;
      this.down = null;
      if (!e.isPrimary || !down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (moved > CLICK_SLOP_PX || performance.now() - down.time > CLICK_MS) return;
      const body = this.pick(e.clientX, e.clientY);
      if (body) this.onPick(body);
    });
  }

  pick(clientX: number, clientY: number): CelestialBody | null {
    const rect = this.element.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    this.ndc.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);

    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(
      this.bodies.map((b) => b.pickTarget),
      false,
    );
    if (hits.length > 0) {
      return this.bodies.find((b) => b.pickTarget === hits[0].object) ?? null;
    }

    // Fall back to the body whose centre is closest on screen.
    let best: CelestialBody | null = null;
    let bestDistance = SCREEN_PICK_RADIUS_PX;
    for (const body of this.bodies) {
      const p = body.object.getWorldPosition(this.tmp).project(this.camera);
      if (p.z < -1 || p.z > 1) continue;
      const sx = ((p.x + 1) / 2) * rect.width;
      const sy = ((1 - p.y) / 2) * rect.height;
      const d = Math.hypot(sx - x, sy - y);
      if (d < bestDistance) {
        best = body;
        bestDistance = d;
      }
    }
    return best;
  }
}
