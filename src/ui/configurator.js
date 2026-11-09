import gsap from 'gsap';
import * as THREE from 'three';
import { PAINTS, LEATHERS, AMBIENTS } from '../scene/car.js';

function swatches(el, map, current, onPick, color) {
  Object.entries(map).forEach(([k, v]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.setAttribute('aria-pressed', k === current);
    b.innerHTML = `<i style="background:${color(v)}"></i><span>${v.name}</span>`;
    b.addEventListener('click', () => { el.querySelectorAll('.sw').forEach((x) => x.setAttribute('aria-pressed', x === b)); onPick(k); });
    el.appendChild(b);
  });
}

export function initConfigurator({ car, stars, rig, veil }) {
  const state = { paint: 'obsidienne', leather: 'soie', amb: 'ivoire' };
  const tint = new THREE.Color();
  const applyAmb = (k) => { const h = car.setAmbient(k); stars.material.uniforms.uTint.value.copy(h ? tint.set(h).lerp(new THREE.Color(1, 1, 1), 0.72) : tint.set(0xffffff)); };
  car.setPaint(state.paint); car.setLeather(state.leather); applyAmb(state.amb);
  swatches(document.getElementById('sw-paint'), PAINTS, state.paint, (k) => {
    const c = new THREE.Color(PAINTS[k].hex); const t = car.paintColor();
    gsap.to(t, { r: c.r, g: c.g, b: c.b, duration: 0.7, ease: 'power2.out', onComplete: () => car.setPaint(k) });
    const p = PAINTS[k]; gsap.to(car.mats.body, { metalness: p.metal, roughness: p.rough, duration: 0.7 });
  }, (v) => v.hex);
  swatches(document.getElementById('sw-leather'), LEATHERS, state.leather, (k) => car.setLeather(k), (v) => v.hex);
  swatches(document.getElementById('sw-amb'), AMBIENTS, state.amb, (k) => { state.amb = k; applyAmb(k); }, (v) => v.hex || 'transparent');
  document.querySelectorAll('#sw-amb .sw i')[4].style.background = 'repeating-linear-gradient(45deg,#222 0 3px,#0a0a0b 3px 6px)';

  document.querySelectorAll('#seg-view button').forEach((b) => b.addEventListener('click', () => {
    if (rig.view === b.dataset.v) return;
    document.querySelectorAll('#seg-view button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    const to = b.dataset.v; const o = { v: rig.fadeHold || 0 };
    gsap.timeline().to(o, { v: 1, duration: 0.35, onUpdate: () => (rig.fadeHold = o.v) })
      .add(() => { rig.view = to; rig.az = 0; rig.yaw = 0; rig.init = false; })
      .to(o, { v: 0, duration: 0.45, onUpdate: () => (rig.fadeHold = o.v) });
  }));

  // glisser pour tourner (horizontal) dans le dernier chapitre
  const cv = document.getElementById('stage'); let drag = null;
  cv.addEventListener('pointerdown', (e) => { if (rig.chapter !== 7) return; drag = { x: e.clientX, az: rig.az, yaw: rig.yaw }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => { if (!drag) return; const d = (e.clientX - drag.x) / innerWidth;
    if (rig.view === 'ext') rig.az = drag.az - d * 5; else rig.yaw = Math.max(-1.2, Math.min(1.2, drag.yaw + d * 2.4)); });
  const end = () => { drag = null; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  return { applyAmb };
}
