// Pipeline : node tools/optimize.mjs <source.glb> <sortie.glb>
// weld → décimation par primitive (bords verrouillés) → weld → normales recalculées → compression meshopt.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, prune, dedup, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';

const [,, inp, out, mode] = process.argv;   // mode « lite » : version mobile
const LITE = mode === 'lite';
await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp);

const budget = (tris, mat) => {
  if (LITE && !/^(interior|interior_b|tex_01|black_matt|material|d_glass|vd_glass)$/.test(mat)) { if (/body/.test(mat)) return Math.floor(tris * 0.4); if (tris > 80000) return 5000; return Math.floor(tris * 0.25); }
  if (/^(interior|interior_b|tex_01|material|black_matt|d_glass|vd_glass)$/.test(mat) && tris < 60000) return Math.floor(tris * 0.85);
  if (/body/.test(mat)) return Math.floor(tris * 0.7);
  if (tris > 80000) return 12000;           // jantes, pneus : le plus gros du poids
  if (tris > 20000) return Math.floor(tris * 0.35);
  return Math.floor(tris * 0.6);
};
// Normales lisses avec angle de pli (45°) : les arêtes vives restent nettes, les surfaces courbes sont douces.
const smoothNormals = (crease = 45) => async (d) => {
  for (const mesh of d.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const cosT = Math.cos(((/^body$/.test(prim.getMaterial()?.getName() ?? '') ? 85 : crease) * Math.PI) / 180);
    const idx = prim.getIndices(); const posA = prim.getAttribute('POSITION'); if (!idx || !posA) continue;
    const p = posA.getArray(), I = idx.getArray(); const T = I.length / 3, V = p.length / 3;
    const fn = new Float32Array(T * 3), sn = new Float32Array(V * 3);
    for (let t = 0; t < T; t++) {
      const a = I[t * 3] * 3, b = I[t * 3 + 1] * 3, c = I[t * 3 + 2] * 3;
      const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1;
      fn[t * 3] = nx / l; fn[t * 3 + 1] = ny / l; fn[t * 3 + 2] = nz / l;
      for (const k of [a, b, c]) { sn[k] += nx; sn[k + 1] += ny; sn[k + 2] += nz; }   // pondéré par l'aire
    }
    for (let i = 0; i < sn.length; i += 3) { const l = Math.hypot(sn[i], sn[i + 1], sn[i + 2]) || 1; sn[i] /= l; sn[i + 1] /= l; sn[i + 2] /= l; }
    const P = [...p], N = [...sn], out = new Uint32Array(I.length); let nv = V;
    const flatCache = new Map();
    for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) {
      const v = I[t * 3 + k]; const d0 = fn[t * 3] * sn[v * 3] + fn[t * 3 + 1] * sn[v * 3 + 1] + fn[t * 3 + 2] * sn[v * 3 + 2];
      if (d0 >= cosT) { out[t * 3 + k] = v; continue; }
      const key = v + ':' + Math.round(fn[t * 3] * 8) + Math.round(fn[t * 3 + 1] * 8) + Math.round(fn[t * 3 + 2] * 8);
      let nvv = flatCache.get(key);
      if (nvv === undefined) { nvv = nv++; flatCache.set(key, nvv); P.push(p[v * 3], p[v * 3 + 1], p[v * 3 + 2]); N.push(fn[t * 3], fn[t * 3 + 1], fn[t * 3 + 2]); }
      out[t * 3 + k] = nvv;
    }
    posA.setArray(new Float32Array(P)); idx.setArray(out);
    prim.setAttribute('NORMAL', d.createAccessor().setType('VEC3').setArray(new Float32Array(N)));
  }
};
const simplifyPrims = () => async (d) => {
  for (const mesh of d.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const idx = prim.getIndices(); const pos = prim.getAttribute('POSITION');
    if (!idx || !pos) continue;
    const tris = idx.getCount() / 3; const target = Math.max(60, budget(tris, prim.getMaterial()?.getName() ?? '')) * 3;
    if (target >= idx.getCount()) continue;
    const [res] = MeshoptSimplifier.simplify(new Uint32Array(idx.getArray()), new Float32Array(pos.getArray()), 3, target, 0.004, ['LockBorder']);
    idx.setArray(res);
  }
};
// Les normales d'origine sont « à plat » (une par face) : elles empêchent tout soudage. On les retire d'abord.
for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) { prim.setAttribute('NORMAL', null); prim.setAttribute('TANGENT', null); }
await doc.transform(weld({ tolerance: 0.0001 }), simplifyPrims(), weld({ tolerance: 0.0001 }), smoothNormals(62), prune(), dedup(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(out, doc);
