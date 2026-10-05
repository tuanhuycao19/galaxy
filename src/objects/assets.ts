import * as THREE from 'three';

const loader = new THREE.TextureLoader();

/** Loads an image from `public/` (path relative to it), honouring the deploy base URL. */
export function loadTexture(path: string, color = true): THREE.Texture {
  const texture = loader.load(`${import.meta.env.BASE_URL}${path}`);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
