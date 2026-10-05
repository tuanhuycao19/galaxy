import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { QUALITY_SETTINGS, type QualityLevel } from './quality';

/** Only HDR pixels (> 1.0, i.e. the Sun) bloom; lit planets stay crisp. */
const BLOOM_THRESHOLD = 1.0;
const BLOOM_STRENGTH = 0.6;
const BLOOM_RADIUS = 0.35;

/**
 * Renders the scene either straight to the canvas (low quality) or through
 * an HDR composer with bloom. The composer renders into a half-float,
 * multisampled target so the Sun keeps its >1.0 values and edges stay
 * antialiased.
 */
export class RenderPipeline {
  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;
  private bloom = true;
  private width = 1;
  private height = 1;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
  ) {
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      BLOOM_STRENGTH,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD,
    );
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new OutputPass());
  }

  setQuality(level: QualityLevel): void {
    const settings = QUALITY_SETTINGS[level];
    this.bloom = settings.bloom;
    const pixelRatio = Math.min(window.devicePixelRatio, settings.maxPixelRatio);
    this.renderer.setPixelRatio(pixelRatio);
    this.composer.setPixelRatio(pixelRatio);
    this.setSize(this.width, this.height);
  }

  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  render(): void {
    if (this.bloom) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
