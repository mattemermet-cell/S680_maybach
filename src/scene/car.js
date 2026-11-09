import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { patchLeather } from './leather.js';

export const PAINTS = {
  obsidienne: { name: 'Noir obsidienne', hex: '#08080b', metal: 0.55, rough: 0.2 },
  diamant: { name: 'Blanc diamant', hex: '#e7e4dd', metal: 0.35, rough: 0.22 },
  selenite: { name: 'Gris sélénite', hex: '#6d7073', metal: 0.8, rough: 0.28 },
  nautique: { name: 'Bleu nautique', hex: '#0d2540', metal: 0.7, rough: 0.22 },
  rubellite: { name: 'Rouge rubellite', hex: '#5b0d1b', metal: 0.6, rough: 0.2 },
};
export const LEATHERS = {
  soie: { name: 'Beige soie', hex: '#d9c9ad', alt: '#b9a483' },
  creme: { name: 'Crème', hex: '#ece3d0', alt: '#cdbfa4' },
  macchiato: { name: 'Macchiato', hex: '#8b6747', alt: '#6a4a31' },
};
export const AMBIENTS = {
  ivoire: { name: 'Ivoire', hex: '#ffe0b0' },
  ambre: { name: 'Ambre', hex: '#ff9331' },
  glacier: { name: 'Glacier', hex: '#74b4ff' },
  rubis: { name: 'Rubis', hex: '#ff2f46' },
  off: { name: 'Éteint', hex: null },
};

const GLASS = { glass: 0.16, glass_bump: 0.22, d_glass: 0.3, vd_glass: 0.38 };

export function loadCar(onProgress, lite = false) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(
      import.meta.env.BASE_URL + (lite ? 'models/s680-lite.glb' : 'models/s680.glb'),
      (g) => resolve(setup(g.scene)), (e) => e.total && onProgress?.(e.loaded / e.total), reject);
  });
}

function setup(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const s = 5.4 / Math.max(size.x, size.z);
  const car = new THREE.Group(); car.add(root);
  root.scale.setScalar(s); root.position.y = -box.min.y * s;
  root.updateMatrixWorld(true);

  const mats = {}; const wheels = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    mats[o.material.name] = o.material;
    o.frustumCulled = true;
  });

  const body = mats.body; Object.assign(body, { metalness: 0.55, roughness: 0.2 });
  body.clearcoat = 1; body.clearcoatRoughness = 0.035; body.envMapIntensity = 1.15;

  const lea = patchLeather(mats.interior_b, { quilt: 1, grain: 1 });
  lea.roughness = 0.6; lea.metalness = 0; lea.sheen = 0.6; lea.sheenRoughness = 0.5; lea.sheenColor = new THREE.Color('#fff1d6');
  const lea2 = patchLeather(mats.interior, { quilt: 0.0, grain: 1 });
  lea2.roughness = 0.62; lea2.metalness = 0;
  mats.black_matt.metalness = 0.15; mats.black_matt.roughness = 0.55;
  mats.black_shiny.metalness = 0.5; mats.black_shiny.roughness = 0.3;
  mats.chrome.metalness = 1; mats.chrome.roughness = 0.07; mats.chrome.color.set('#e8e6e0');
  mats.silver.metalness = 1; mats.silver.roughness = 0.28; mats.silver.color.set('#b9b7b2');
  mats.silver_d.metalness = 1; mats.silver_d.roughness = 0.35;
  mats.tire_mat4.metalness = 0; mats.tire_mat4.roughness = 0.75; mats.tire_mat4.color.set('#0b0b0c');
  for (const [k, op] of Object.entries(GLASS)) { const m = mats[k]; if (!m) continue;
    m.transparent = true; m.opacity = op; m.depthWrite = false; m.metalness = 0; m.roughness = 0.04; m.color.set('#06080b'); m.envMapIntensity = 1.6; }
  if (mats.tex_01) Object.assign(mats.tex_01, { color: new THREE.Color('#050608'), emissive: new THREE.Color('#34465c'), emissiveIntensity: 0.5, roughness: 0.12, metalness: 0.2 });
  if (mats.lights) { mats.lights.emissive = new THREE.Color('#dfe9ff'); mats.lights.emissiveIntensity = 1.5; }
  if (mats.r_lights) { mats.r_lights.emissive = new THREE.Color('#ff1c1c'); mats.r_lights.emissiveIntensity = 1.8; }

  // Éclairage d'ambiance : quatre sources discrètes dans l'habitacle.
  const amb = new THREE.Group();
  [[-0.62, 0.68, -0.95], [0.62, 0.68, -0.95], [-0.62, 0.7, 0.3], [0.62, 0.7, 0.3], [0, 0.5, -0.4]].forEach(([x, y, z]) => {
    const l = new THREE.PointLight(0xffe0b0, 0, 1.9, 1.6); l.position.set(x, y, z); amb.add(l);
  });
  car.add(amb);

  return {
    object: car, mats,
    setPaint(key) { const p = PAINTS[key]; body.color.set(p.hex); body.metalness = p.metal; body.roughness = p.rough; },
    paintColor: () => body.color,
    setLeather(key) { const l = LEATHERS[key]; lea.color.set(l.hex); lea2.color.set(l.alt); },
    setAmbient(key, intensity = 0.32) { const a = AMBIENTS[key];
      amb.children.forEach((l) => { l.intensity = a.hex ? intensity : 0; if (a.hex) l.color.set(a.hex); }); return a.hex; },
    night(on) { if (mats.lights) mats.lights.emissiveIntensity = on ? 1.5 : 0.3; },
  };
}
