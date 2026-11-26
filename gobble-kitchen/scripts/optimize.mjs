// Compress the raw GLBs from Blender: dedup -> prune -> weld -> meshopt (explicit steps, see the plan).
// Before quantizing, every mesh node "name" is split into an untouched node "name" plus a child "name__geo"
// that carries the mesh, so the quantization transform never lands on a node the game animates.
// Join/simplify are skipped on purpose so named parts survive.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';

const [src, dst] = process.argv.slice(2);
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
fs.mkdirSync(dst, { recursive: true });
let total = 0;
for (const f of fs.readdirSync(src).filter((f) => f.endsWith('.glb')).sort()) {
  const doc = await io.read(path.join(src, f));
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
  // custom attributes (_ZONE, _NOLINE) are exported on every mesh; drop them where they are all zero
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const p of mesh.listPrimitives()) {
      for (const sem of p.listSemantics().filter((s) => s.startsWith('_'))) {
        const acc = p.getAttribute(sem);
        const arr = acc.getArray();
        if (arr.every((v) => v === 0)) p.setAttribute(sem, null);
      }
    }
  }
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh || node.getSkin()) continue;
    const geo = doc.createNode(node.getName() + '__geo').setMesh(mesh);
    node.setMesh(null);
    node.addChild(geo);
  }
  await doc.transform(
    dedup(),
    prune({ keepAttributes: true, keepLeaves: true, keepExtras: true }),   // also sweeps the accessors dropped above
    weld(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  const out = path.join(dst, f);
  await io.write(out, doc);
  const a = fs.statSync(path.join(src, f)).size, b = fs.statSync(out).size;
  total += b;
  console.log(`${f.padEnd(16)} ${String(Math.round(tris)).padStart(7)} tris  ${(a / 1024).toFixed(0).padStart(6)} KB -> ${(b / 1024).toFixed(0).padStart(5)} KB`);
}
console.log(`total ${(total / 1024).toFixed(0)} KB`);
