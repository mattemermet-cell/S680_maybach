import * as THREE from 'three';

const D = Math.PI / 180;
const ext = (az, r, h, tgt, fov, shift = 0, shiftY = 0) => ({ mode: 'ext', az: az * D, r, h, tgt: new THREE.Vector3(...tgt), fov, shift, shiftY });
const int = (pos, tgt, fov, shift = 0, shiftY = 0) => ({ mode: 'int', pos: new THREE.Vector3(...pos), tgt: new THREE.Vector3(...tgt), fov, shift, shiftY });

// Un cadrage par chapitre (index = data-rail). Voiture : avant = +Z, largeur ±1,04, longueur 5,4.
export const KEYS = [
  ext(34, 8.6, 1.0, [0, 0.62, 0.2], 30, -0.14, 0),
  ext(96, 9.6, 1.25, [0, 0.7, 0], 30, -0.24, 0),
  ext(50, 7.6, 0.9, [0, 0.55, 1.0], 30, 0.32, 0),
  int([0.15, 1.12, -1.25], [0.0, 0.72, 0.8], 62, 0, 0),
  int([0.25, 1.05, -0.35], [-0.4, 0.6, -1.3], 56, -0.12, 0),
  int([0.3, 0.86, -1.15], [0.05, 1.3, -0.35], 78, 0, 0),
  int([0.0, 1.0, -1.3], [0.1, 0.85, 0.0], 72, 0.12, 0),
  ext(30, 9.0, 1.5, [0, 0.6, 0], 30, -0.26, 0),
];
export const INT_VIEW = int([0.0, 1.12, -1.2], [0.1, 0.85, 0.0], 72);

const ss = (x) => x * x * (3 - 2 * x);
const plateau = (t) => ss(Math.min(1, Math.max(0, (t - 0.22) / 0.56)));
const lerp = (a, b, t) => a + (b - a) * t;

export class Rig {
  constructor(camera, sections) {
    this.cam = camera; this.sections = sections; this.keys = KEYS;
    this.az = 0; this.yaw = 0; this.view = 'ext';
    this.veil = 0; this.pointer = new THREE.Vector2(); this.cur = new THREE.Vector3(); this.tgt = new THREE.Vector3();
    this.shift = 0; this.shiftY = 0; this.chapter = 0; this._tmp = new THREE.Vector3();
  }

  frame(key, orbitAz = 0, yaw = 0) {
    if (key.mode === 'ext') {
      const a = key.az + orbitAz;
      return { pos: new THREE.Vector3(Math.sin(a) * key.r, key.h, Math.cos(a) * key.r), tgt: key.tgt, fov: key.fov, shift: key.shift, shiftY: key.shiftY, mode: 'ext' };
    }
    const dir = key.tgt.clone().sub(key.pos); dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    return { pos: key.pos, tgt: key.pos.clone().add(dir), fov: key.fov, shift: key.shift, shiftY: key.shiftY, mode: 'int' };
  }

  keyFor(i) {
    if (i === 7 && this.view === 'int') return INT_VIEW;
    return this.keys[i];
  }

  // y : position de défilement. Renvoie l'opacité du voile noir (fondu lors d'un passage ext ↔ int).
  update(y, dt, t, reduced) {
    const vh = innerHeight; const mid = y + vh * 0.5;
    const c = this.sections.map((s) => s.offsetTop + s.offsetHeight * 0.5);
    let i = 0; while (i < c.length - 2 && mid > c[i + 1]) i++;
    const span = c[i + 1] - c[i];
    const tt = Math.min(1, Math.max(0, (mid - c[i]) / span));
    const k0 = this.keyFor(i), k1 = this.keyFor(i + 1);
    const f0 = this.frame(k0, i === 7 ? this.az : 0, i === 7 ? this.yaw : 0);
    const f1 = this.frame(k1, i + 1 === 7 ? this.az : 0, i + 1 === 7 ? this.yaw : 0);
    this.chapter = Math.round(i + tt);
    let pos, tgt, fov, shift, shiftY, veil = 0;
    const p = plateau(tt);
    if (f0.mode !== f1.mode) {
      const cut = tt < 0.5 ? f0 : f1;
      pos = cut.pos.clone(); tgt = cut.tgt.clone(); fov = cut.fov; shift = cut.shift; shiftY = cut.shiftY;
      const q = Math.abs(p - 0.5) * 2; veil = 1 - ss(Math.min(1, q * 1.6));
    } else if (f0.mode === 'ext') {
      // interpolation en coordonnées polaires autour de la voiture : on contourne la carrosserie.
      const a0 = Math.atan2(f0.pos.x, f0.pos.z), a1 = Math.atan2(f1.pos.x, f1.pos.z);
      let da = a1 - a0; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
      const a = a0 + da * p;
      const r = lerp(Math.hypot(f0.pos.x, f0.pos.z), Math.hypot(f1.pos.x, f1.pos.z), p);
      pos = new THREE.Vector3(Math.sin(a) * r, lerp(f0.pos.y, f1.pos.y, p), Math.cos(a) * r);
      tgt = f0.tgt.clone().lerp(f1.tgt, p); fov = lerp(f0.fov, f1.fov, p); shift = lerp(f0.shift, f1.shift, p); shiftY = lerp(f0.shiftY, f1.shiftY, p);
    } else {
      pos = f0.pos.clone().lerp(f1.pos, p); tgt = f0.tgt.clone().lerp(f1.tgt, p); fov = lerp(f0.fov, f1.fov, p);
      shift = lerp(f0.shift, f1.shift, p); shiftY = lerp(f0.shiftY, f1.shiftY, p);
    }
    if (this.fadeHold > 0) { veil = Math.max(veil, this.fadeHold); }
    // lissage + respiration discrète
    // portrait : champ plus large, voiture plus loin et remontée au-dessus du texte
    const aspect = this.cam.aspect; const port = aspect < 1;
    if (port) { fov = Math.min(72, fov * lerp(1.0, 2.3, Math.min(1, (1.1 - aspect) / 0.6)));  shift = 0; shiftY = 0.17;
      if (f0.mode === 'int' && f1.mode === 'int') pos.addScaledVector(tgt.clone().sub(pos).normalize(), -0.3); }
    const k = reduced ? 1 : 1 - Math.exp(-dt * 6);
    if (!this.init) { this.cur.copy(pos); this.tgt.copy(tgt); this.fovC = fov; this.init = true; this.shift = shift; this.shiftY = shiftY; }
    const jump = this.cur.distanceTo(pos) > 3 && f0.mode !== f1.mode;
    const kk = jump ? 1 : k;
    this.cur.lerp(pos, kk); this.tgt.lerp(tgt, kk);
    this.fovC = lerp(this.fovC, fov, kk); this.shift = lerp(this.shift, shift, k); this.shiftY = lerp(this.shiftY, shiftY, k);
    const b = reduced ? 0 : 1;
    this.cam.position.copy(this.cur).add(this._tmp.set(Math.sin(t * 0.31) * 0.02 * b + this.pointer.x * 0.05 * b, Math.sin(t * 0.43) * 0.012 * b - this.pointer.y * 0.03 * b, 0));
    this.cam.lookAt(this.tgt);
    this.cam.fov = this.fovC; this.cam.updateProjectionMatrix();
    return veil;
  }
}
