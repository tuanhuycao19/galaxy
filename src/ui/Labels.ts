import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { CelestialBody } from '../objects/CelestialBody';
import { el } from './dom';

interface Entry {
  body: CelestialBody;
  object: CSS2DObject;
  element: HTMLElement;
  width: number;
  height: number;
}

const GAP_PX = 4;
/** Once a body is this big on screen it's obvious what it is, and its tag would cover it. */
const MAX_BODY_RADIUS_PX = 28;

/**
 * Name tags anchored above each body. Clicking one selects the body, which
 * also makes tiny (true-scale) planets easy to reach. When tags overlap,
 * the lower-priority one is hidden.
 */
export class Labels {
  private readonly renderer = new CSS2DRenderer();
  private readonly entries: Entry[];
  private readonly projected = new THREE.Vector3();
  private enabled = true;
  private suppressed = false;
  private selected: CelestialBody | null = null;

  constructor(
    container: HTMLElement,
    bodies: readonly CelestialBody[],
    onSelect: (body: CelestialBody) => void,
  ) {
    this.renderer.domElement.className = 'labels';
    container.appendChild(this.renderer.domElement);

    this.entries = bodies.map((body) => {
      const chip = el('button', {
        className: 'label__chip',
        type: 'button',
        textContent: body.name,
      });
      // Labels move every frame, so keep them out of the tab order (the body
      // list covers keyboard users) and don't let a click steal focus from
      // the global shortcuts.
      chip.tabIndex = -1;
      chip.addEventListener('mousedown', (e) => e.preventDefault());
      chip.addEventListener('click', () => onSelect(body));
      const element = el('div', { className: 'label' }, {}, [chip]);
      const object = new CSS2DObject(element);
      object.center.set(0.5, 1);
      body.object.add(object);
      return { body, object, element, width: 0, height: 0 };
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.renderer.domElement.hidden = !this.enabled || this.suppressed;
  }

  /** Hide all tags temporarily (e.g. while the beach scene is shown), keeping the user's setting. */
  setSuppressed(suppressed: boolean): void {
    if (suppressed === this.suppressed) return;
    this.suppressed = suppressed;
    this.renderer.domElement.hidden = !this.enabled || this.suppressed;
  }

  setSelected(body: CelestialBody | null): void {
    this.selected = body;
    for (const e of this.entries) e.element.classList.toggle('is-selected', e.body === body);
  }

  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height);
  }

  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, width: number, height: number): void {
    if (!this.enabled || this.suppressed) return;
    this.resolveOverlaps(camera, width, height);
    this.renderer.render(scene, camera);
  }

  private resolveOverlaps(camera: THREE.PerspectiveCamera, width: number, height: number): void {
    const pxPerUnitAtDistance1 = height / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // The selected body wins, then bigger bodies (Sun, giants, Earth before Venus…).
    const order = [...this.entries].sort(
      (a, b) => this.rank(a) - this.rank(b) || b.body.radius - a.body.radius,
    );
    const placed: [number, number, number, number][] = [];

    for (const e of order) {
      if (e.object.visible && e.element.offsetWidth > 0) {
        e.width = e.element.offsetWidth;
        e.height = e.element.offsetHeight;
      }
      const world = e.object.getWorldPosition(this.projected);
      const radiusPx = (e.body.radius * pxPerUnitAtDistance1) / world.distanceTo(camera.position);
      if (radiusPx > MAX_BODY_RADIUS_PX) {
        e.object.visible = false;
        continue;
      }
      const p = world.project(camera);
      if (p.z < -1 || p.z > 1) continue;
      const x = ((p.x + 1) / 2) * width;
      const y = ((1 - p.y) / 2) * height;
      const w = e.width || e.body.name.length * 8 + 16;
      const h = e.height || 24;
      const rect: [number, number, number, number] = [x - w / 2, y - h, x + w / 2, y];
      const overlaps = placed.some(
        (r) =>
          rect[0] < r[2] + GAP_PX &&
          rect[2] + GAP_PX > r[0] &&
          rect[1] < r[3] + GAP_PX &&
          rect[3] + GAP_PX > r[1],
      );
      e.object.visible = !overlaps;
      if (!overlaps) placed.push(rect);
    }
  }

  private rank(e: Entry): number {
    return e.body === this.selected ? 0 : 1;
  }
}
