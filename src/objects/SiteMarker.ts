import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { SITE } from '../data/site';
import { localSun, type LocalSun } from '../physics/rotation';
import { j2000DaysToDate } from '../physics/time';
import { el } from '../ui/dom';
import { formatNumber } from '../ui/format';
import type { InfoRow, InfoSource } from './CelestialBody';
import type { Planet } from './Planet';

/** Only show the tag when Earth is reasonably large on screen. */
const MAX_LABEL_DISTANCE_RADII = 14;
const COMPASS = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];

/**
 * The beach where the family stands, pinned to Earth's surface so it turns
 * with the planet. Shows a clickable tag on the visible hemisphere.
 */
export class SiteMarker implements InfoSource {
  readonly name = SITE.name;
  readonly description = SITE.description;
  readonly object = new THREE.Object3D();
  private readonly label: CSS2DObject;
  private readonly tmp = new THREE.Vector3();
  private readonly center = new THREE.Vector3();

  constructor(
    private readonly earth: Planet,
    onSelect: () => void,
  ) {
    this.object.name = SITE.name;
    earth.attachToSurface(this.object, SITE.latDeg, SITE.lonDeg);

    const chip = el('button', {
      className: 'label__chip label__chip--site',
      type: 'button',
      textContent: '🏖 Gia đình',
      title: 'Zoom xuống gia đình ở biển Mỹ Khê (G)',
    });
    chip.tabIndex = -1;
    chip.addEventListener('mousedown', (e) => e.preventDefault());
    chip.addEventListener('click', onSelect);
    this.label = new CSS2DObject(el('div', { className: 'label label--site' }, {}, [chip]));
    this.label.center.set(0.5, 1);
    this.object.add(this.label);
  }

  /** Unit vector from Earth's centre through the site, in world space. */
  normal(target: THREE.Vector3): THREE.Vector3 {
    this.earth.object.getWorldPosition(this.center);
    return this.object.getWorldPosition(target).sub(this.center).normalize();
  }

  /** Hide the tag when the site is on the far side of Earth or Earth is far away. */
  update(camera: THREE.Camera): void {
    const site = this.object.getWorldPosition(new THREE.Vector3());
    this.earth.object.getWorldPosition(this.center);
    const toCamera = this.tmp.copy(camera.position).sub(site);
    const distance = toCamera.length();
    const facing = toCamera.normalize().dot(site.sub(this.center).normalize());
    this.label.visible = facing > 0.2 && distance < this.earth.radius * MAX_LABEL_DISTANCE_RADII;
  }

  sun(days: number): LocalSun {
    const { orbit, rotation } = this.earth.data;
    return localSun(orbit, rotation, SITE.latDeg, SITE.lonDeg, days);
  }

  info(days: number): InfoRow[] {
    const sun = this.sun(days);
    const local = new Date(j2000DaysToDate(days).getTime() + SITE.utcOffsetHours * 3_600_000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const time = `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())} · ${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${local.getUTCFullYear()}`;
    const direction = COMPASS[Math.round(sun.azimuthDeg / 45) % 8];
    return [
      { label: 'Địa điểm', value: SITE.place },
      {
        label: 'Toạ độ',
        value: `${formatNumber(SITE.latDeg, 2)}°B · ${formatNumber(SITE.lonDeg, 2)}°Đ`,
      },
      { label: 'Giờ địa phương', value: `${time} (UTC+${SITE.utcOffsetHours})` },
      {
        label: 'Mặt Trời',
        value:
          sun.elevationDeg > 0
            ? `cao ${formatNumber(sun.elevationDeg, 0)}° · hướng ${direction}`
            : `dưới chân trời (${formatNumber(sun.elevationDeg, 0)}°)`,
      },
      { label: 'Lúc này', value: partOfDay(sun) },
    ];
  }
}

export function partOfDay(sun: LocalSun): string {
  if (sun.elevationDeg > 6) return 'Ban ngày';
  if (sun.elevationDeg > -6) return sun.azimuthDeg < 180 ? 'Bình minh' : 'Hoàng hôn';
  return 'Ban đêm';
}
