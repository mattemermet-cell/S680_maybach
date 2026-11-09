import * as THREE from 'three';

// `real: true` = présent au catalogue (source : Mercedes-Benz USA) ; sinon, configuration imaginée.
export const OPTIONS = [
  { id: 'seats', t: 'Sièges arrière Executive', d: 'Inclinaison électrique jusqu\'à 43°, repose-mollets, repose-pieds et mémoires de position.', at: [0.0, 0.55, -0.75], real: true },
  { id: 'screen', t: 'MBUX Superscreen', d: 'Surface vitrée continue devant le passager, écrans pour l\'information et le divertissement.', at: [0.42, 0.93, 0.62], real: true },
  { id: 'roof', t: 'Toit panoramique', d: 'Une verrière au-dessus de la banquette : la lumière entre, le bruit reste dehors.', at: [0, 1.38, -0.5], real: true },
  { id: 'stars', t: 'Ciel étoilé', d: 'Fibres optiques sur panneau noir mat, scintillement individuel.', at: [0, 1.3, -1.1], real: false },
  { id: 'amb', t: 'Éclairage d\'ambiance', d: 'Lumière indirecte dans les contre-portes et sous la console. Teinte réglable à l\'étape suivante.', at: [-0.72, 0.8, -0.7], real: true },
];

export function initOptions({ camera, canvasEl, onOpen }) {
  const list = document.getElementById('optlist'); const spots = document.getElementById('spots');
  const items = OPTIONS.map((o, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" aria-expanded="false"><span class="n">0${i + 1}</span><span class="t">${o.t}</span><span class="d">${o.d}${o.real ? '' : ' <em class="imag" style="margin:0 0 0 6px;padding:2px 7px">Imaginée</em>'}</span></button>`;
    list.appendChild(li);
    const sp = document.createElement('button'); sp.type = 'button'; sp.className = 'spot'; sp.textContent = `0${i + 1}`; sp.setAttribute('aria-label', o.t); sp.setAttribute('aria-pressed', 'false');
    spots.appendChild(sp);
    const open = () => { items.forEach((x) => x.set(x.li === li)); onOpen?.(o); };
    li.querySelector('button').addEventListener('click', () => (li.classList.contains('open') ? items.forEach((x) => x.set(false)) : open()));
    sp.addEventListener('click', open);
    const it = { li, sp, o, v: new THREE.Vector3(...o.at), set(on) { li.classList.toggle('open', on); li.querySelector('button').setAttribute('aria-expanded', on); sp.setAttribute('aria-pressed', on); } };
    return it;
  });
  items[0].set(true);
  const v = new THREE.Vector3();
  return {
    update(active) {
      spots.classList.toggle('on', active);
      if (!active) return;
      const w = innerWidth, h = innerHeight;
      items.forEach((it) => {
        v.copy(it.v).project(camera);
        const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
        it.sp.classList.toggle('hide', !vis);
        it.sp.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px)`;
      });
    },
  };
}
