import './styles/tokens.css';
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/300-italic.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource-variable/inter-tight';
import './styles/base.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildEnvironment, buildFloor } from './scene/stage.js';
import { loadCar } from './scene/car.js';
import { buildHeadliner } from './scene/stars.js';
import { Rig } from './scene/rails.js';
import { initOptions } from './ui/options.js';
import { initConfigurator } from './ui/configurator.js';

const canvas = document.getElementById('stage');
const loader = document.getElementById('loader');
const bar = loader.querySelector('.bar i');
const veilEl = document.getElementById('veil');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = innerWidth < 760 || matchMedia('(pointer: coarse)').matches;

function fail(msg) { loader.querySelector('small').textContent = msg; bar.style.transform = 'scaleX(0)'; }
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: 'high-performance' }); }
catch { fail('WebGL indisponible sur cet appareil'); throw new Error('webgl'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.6 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0a0a0b);
scene.fog = new THREE.Fog(0x0a0a0b, 14, 34);
scene.environment = buildEnvironment(renderer); scene.environmentIntensity = 0.8;
scene.add(buildFloor());
const camera = new THREE.PerspectiveCamera(30, 1, 0.04, 80);

let composer, bloom;
if (!small) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.14, 0.45, 1.15);
  composer.addPass(bloom); composer.addPass(new OutputPass());
}

const sections = [...document.querySelectorAll('[data-rail]')];
const rig = new Rig(camera, sections);
let car, stars, opts;

function size() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer?.setSize(w, h);
  camera.aspect = w / h;
  if (stars) stars.material.uniforms.uPx.value = renderer.getPixelRatio();
}
addEventListener('resize', size);
addEventListener('pointermove', (e) => { rig.pointer.set((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2); }, { passive: true });

(async () => {
  car = await loadCar((p) => (bar.style.transform = `scaleX(${p})`), small);
  scene.add(car.object);
  stars = buildHeadliner({ x0: -0.64, x1: 0.64, z0: -1.66, z1: 0.75, y: 1.29 });
  scene.add(stars.group);
  initConfigurator({ car, stars, rig, veil: veilEl });
  opts = initOptions({ camera, canvasEl: canvas });
  size();
  document.body.dataset.ready = '1'; window.__ready = true;
  bar.style.transform = 'scaleX(1)';
  setTimeout(() => loader.classList.add('done'), 250);
})().catch((e) => { console.error(e); fail('Chargement impossible'); });

// navigation : lien actif
const links = [...document.querySelectorAll('header nav a')];
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -45% 0px' });
sections.forEach((s) => io.observe(s));

const clock = new THREE.Timer(); let last = 0;
renderer.setAnimationLoop(() => {
  clock.update(); const dt = Math.min(clock.getDelta(), 0.05), t = clock.getElapsed();
  if (!car) return;
  const veil = rig.update(scrollY, dt, t, reduced);
  veilEl.style.opacity = veil.toFixed(3);
  const w = innerWidth, h = innerHeight;
  camera.setViewOffset(w, h, rig.shift * w, rig.shiftY * h, w, h);
  stars.material.uniforms.uTime.value = t;
  car.night(true);
  scene.environmentIntensity += ((rig.cur.y < 1.25 && Math.abs(rig.cur.x) < 1.1 && Math.abs(rig.cur.z) < 2.3 ? 0.42 : 0.8) - scene.environmentIntensity) * Math.min(1, dt * 8);
  opts.update(rig.chapter === 6 && veil < 0.4);
  (composer || renderer).render(scene, camera);
});
