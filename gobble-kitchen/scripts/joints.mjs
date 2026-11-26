// Histogram of which bone each vertex of a skinned mesh follows (to catch broken skinning).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  for (const node of doc.getRoot().listNodes()) {
    const skin = node.getSkin(), mesh = node.getMesh();
    if (!skin || !mesh) continue;
    const names = skin.listJoints().map((j) => j.getName());
    const prim = mesh.listPrimitives()[0];
    const j = prim.getAttribute('JOINTS_0'), p = prim.getAttribute('POSITION');
    const count = {}, box = {};
    const a = [], q = [];
    for (let i = 0; i < j.getCount(); i++) {
      j.getElement(i, a); p.getElement(i, q);
      const n = names[a[0]];
      count[n] = (count[n] || 0) + 1;
      const b = (box[n] ||= [1e9, -1e9]);
      b[0] = Math.min(b[0], q[1]); b[1] = Math.max(b[1], q[1]);
    }
    console.log(f, node.getName());
    for (const n of names) console.log('  ', n.padEnd(10), String(count[n] || 0).padStart(6), 'verts  y', box[n] ? box[n].map((v) => v.toFixed(2)).join(' .. ') : '-');
  }
}
