import * as THREE from 'three';

// Environnement « studio » : trois softboxes sur fond noir, converti en carte d'environnement.
export function buildEnvironment(renderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x020203);
  const box = (w, h, x, y, z, i, color = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  box(14, 4, 0, 9, 0, 4.2);            // plafond
  box(2.2, 10, -9, 3, 3, 6);          // bande gauche
  box(2.2, 10, 9, 3, -2, 5);          // bande droite
  box(10, 1.6, 0, 2, -10, 6, 0xffe6c4); // contre-jour chaud
  box(8, 1.2, 0, 1.2, 10, 2.5);       // face
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.015).texture;
  pm.dispose();
  return tex;
}

function radial(size, stops) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => r.addColorStop(o, col));
  g.fillStyle = r; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// Sol : halo de lumière chaude + ombre de contact allongée sous la voiture.
export function buildFloor() {
  const g = new THREE.Group();
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({
    map: radial(256, [[0, 'rgba(90,80,66,0.55)'], [0.35, 'rgba(40,36,30,0.35)'], [1, 'rgba(10,10,11,0)']]), transparent: true, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.001; g.add(pool);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 7.4), new THREE.MeshBasicMaterial({
    map: radial(256, [[0, 'rgba(0,0,0,0.95)'], [0.55, 'rgba(0,0,0,0.7)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.004; g.add(shadow);
  return g;
}
