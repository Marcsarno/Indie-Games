// Compresses the Blender-built models (meshopt) into ../models.   node tools/pack.mjs <src dir> <out dir> [prefix]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, dedup, resample } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import fs from 'fs'; import path from 'path';
const [src, out, prefix = ''] = process.argv.slice(2);
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
fs.mkdirSync(out, { recursive: true }); let a = 0, b = 0, n = 0;
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.glb') && f.startsWith(prefix))) {
  const doc = await io.read(path.join(src, f)); doc.setLogger({ debug() {}, info() {}, warn() {}, error: console.error });
  await doc.transform(dedup(), resample(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(path.join(out, f), doc); a += fs.statSync(path.join(src, f)).size; b += fs.statSync(path.join(out, f)).size; n++;
}
console.log(`${n} models: ${(a / 1048576).toFixed(1)} MB -> ${(b / 1048576).toFixed(1)} MB`);
