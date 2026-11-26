import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  const r = doc.getRoot();
  console.log('==', f, 'skins', r.listSkins().length, 'meshes', r.listMeshes().length, 'nodes', r.listNodes().length);
  for (const n of r.listNodes()) {
    const m = n.getMesh();
    const extra = JSON.stringify(n.getExtras());
    const attrs = m ? m.listPrimitives()[0].listSemantics().join(',') : '';
    const targets = m ? m.listPrimitives()[0].listTargets().length : 0;
    console.log(' ', n.getName().padEnd(26), n.getSkin() ? 'SKIN' : '    ', 'T', n.getTranslation().map((v) => v.toFixed(2)).join(','), 'R', n.getRotation().map((v) => v.toFixed(2)).join(','), extra !== '{}' ? extra : '', attrs, targets ? 'targets ' + targets : '');
  }
}
