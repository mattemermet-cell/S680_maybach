import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS as KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, normals, prune, dedup, flatten, join, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import { EXTMeshoptCompression } from '@gltf-transform/extensions';
const [,, inp, out, ratio='0.25'] = process.argv;
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const doc = await io.read(inp);
await doc.transform(
  weld({ tolerance: 0.0001 }),
  simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: 0.001, lockBorder: false }),
  weld({ tolerance: 0.0001 }),
  normals({ overwrite: true }),
  prune(), dedup(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' })
);
await io.write(out, doc);
