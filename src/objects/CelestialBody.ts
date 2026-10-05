import type * as THREE from 'three';

export interface InfoRow {
  label: string;
  value: string;
}

/** Anything the user can select: the Sun, planets and the Moon. */
export interface CelestialBody {
  readonly name: string;
  readonly description: string;
  /** Object whose world position is the body's centre. */
  readonly object: THREE.Object3D;
  /** Mesh used for ray picking. */
  readonly pickTarget: THREE.Object3D;
  /** Current radius in scene units (depends on the scale mode). */
  readonly radius: number;
  /** Comfortable camera distance when focusing on this body. */
  readonly viewDistance: number;
  /** Facts for the info panel; some depend on the simulated date. */
  info(days: number): InfoRow[];
}
