// Round 42: fire hydrants you can knock over (user: "Fire hydrants that if you run over them the water squirts up").
// Hydrant positions come from world.hydrants (plan metres, from cc_fill2.py). Instanced red hydrants; a hit by any moving vehicle pops the hydrant
// off (it tumbles away) and a water jet + falling spray + spreading puddle runs for ~12 s.
export function initHydrants(THREE, scene, list, b2t) {
  const N = list.length, api = { step() {}, count: N, broken: 0 };
  if (!N) return api;
  const red = new THREE.MeshLambertMaterial({ color: 0xc8362a }), body = new THREE.CylinderGeometry(.17, .21, .72, 8).translate(0, .36, 0), cap = new THREE.SphereGeometry(.2, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, .72, 0);
  const g = mergeTwo(THREE, body, cap), im = new THREE.InstancedMesh(g, red, N), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S1 = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  const H = list.map(([x, y]) => { const p = b2t(x, y, 0); return { x: p.x, z: p.z, up: true }; });
  H.forEach((h, i) => { M.compose(P.set(h.x, 0, h.z), Q.identity(), S1); im.setMatrixAt(i, M); });
  im.instanceMatrix.needsUpdate = true; im.castShadow = true; scene.add(im);
  const grid = new Map(), C = 12; H.forEach((h, i) => { const k = Math.floor(h.x / C) + ',' + Math.floor(h.z / C); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); });
  const waterM = new THREE.MeshBasicMaterial({ color: 0xe4f4ff, transparent: true, opacity: .78, depthWrite: false });
  const dropM = new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: .8 }), puddleM = new THREE.MeshBasicMaterial({ color: 0x5b7f9a, transparent: true, opacity: .45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const ND = 360, drops = new THREE.InstancedMesh(new THREE.SphereGeometry(.13, 5, 3), dropM, ND), D = []; drops.frustumCulled = false; scene.add(drops);
  for (let i = 0; i < ND; i++) { D.push({ x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0 }); M.compose(P.set(0, -99, 0), Q.identity(), S1); drops.setMatrixAt(i, M); }
  let di = 0; const jets = [];
  function burst(i, vx, vz) {
    const h = H[i]; h.up = false; api.broken++;
    const loose = { x: h.x, z: h.z, y: .3, vx: vx * .6 + (Math.random() - .5) * 2, vz: vz * .6 + (Math.random() - .5) * 2, vy: 4 + Math.random() * 2, rx: 0, rz: 0, t: 0 };
    const col = new THREE.Mesh(new THREE.CylinderGeometry(.22, .85, 1, 10, 1, true).translate(0, .5, 0), waterM); col.position.set(h.x, 0, h.z); scene.add(col);
    const pud = new THREE.Mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), puddleM); pud.position.set(h.x, .04, h.z); pud.scale.setScalar(.1); scene.add(pud);
    jets.push({ i, t: 0, col, pud, loose });
  }
  api.step = (dt, vehicles) => {
    for (const v of vehicles) {                                          // hits: any moving vehicle within ~1.3 m of a standing hydrant
      if (!v || v.mode === 'parked') continue; const sp = Math.hypot(v.vx || 0, v.vz || 0); if (sp < 2) continue;
      const gx = Math.floor(v.x / C), gz = Math.floor(v.z / C);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const i of grid.get((gx + a) + ',' + (gz + b)) || []) {
        const h = H[i]; if (h.up && Math.hypot(h.x - v.x, h.z - v.z) < 1.5) { burst(i, v.vx, v.vz); v.vx *= .93; v.vz *= .93; }
      }
    }
    for (let k = jets.length - 1; k >= 0; k--) {
      const j = jets[k], h = H[j.i]; j.t += dt; const life = 12, f = j.t < life ? 1 : Math.max(0, 1 - (j.t - life) / 2);
      const pulse = 1 + .12 * Math.sin(j.t * 23) + .06 * Math.sin(j.t * 7.3), ht = 7.5 * f * pulse; j.col.scale.set(f, Math.max(.01, ht), f); j.col.visible = f > 0;
      j.pud.scale.setScalar(Math.min(6, .4 + j.t * .8));
      const L = j.loose; if (L.t < 3) { L.t += dt; L.vy -= 9.8 * dt; L.x += L.vx * dt; L.z += L.vz * dt; L.y = Math.max(.2, L.y + L.vy * dt); if (L.y <= .2) { L.vy = 0; L.vx *= .9; L.vz *= .9; } L.rx += dt * 6; L.rz += dt * 4; }
      Q.setFromEuler(new THREE.Euler(Math.min(L.rx, Math.PI / 2), 0, Math.min(L.rz, .4))); M.compose(P.set(L.x, L.y - .2, L.z), Q, S1); im.setMatrixAt(j.i, M); im.instanceMatrix.needsUpdate = true;
      for (let n = 0; n < Math.round(22 * f); n++) {                    // spray: drops leave the top of the column and fall back around it
        const d = D[di]; di = (di + 1) % ND; const a = Math.random() * 6.283, r = 1.2 + Math.random() * 2.2;
        d.x = h.x; d.z = h.z; d.y = ht; d.vx = Math.cos(a) * r; d.vz = Math.sin(a) * r; d.vy = 1 + Math.random() * 2.5;
      }
      if (j.t > life + 2) { scene.remove(j.col); j.col.geometry.dispose(); jets.splice(k, 1); }
    }
    if (jets.length || api._live) {
      let live = 0;
      for (let i = 0; i < ND; i++) { const d = D[i]; if (d.y < -50) continue; d.vy -= 9.8 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; if (d.y < 0) d.y = -99; else live++; M.compose(P.set(d.x, d.y, d.z), Q.identity(), S1); drops.setMatrixAt(i, M); }
      drops.instanceMatrix.needsUpdate = true; api._live = live > 0;
    }
  };
  return api;
}
function mergeTwo(THREE, a, b) {                                         // tiny non-indexed merge (keeps this module free of the BufferGeometryUtils import)
  const A = a.toNonIndexed(), B = b.toNonIndexed(), g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal']) { const x = A.attributes[k].array, y = B.attributes[k].array, o = new Float32Array(x.length + y.length); o.set(x); o.set(y, x.length); g.setAttribute(k, new THREE.BufferAttribute(o, 3)); }
  return g;
}
