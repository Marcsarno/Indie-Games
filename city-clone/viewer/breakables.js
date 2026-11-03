// Round 51 (M3, user: breakables): mailboxes, curbside trash carts, back-yard fence panels, cart corrals and gate arms you can knock over with any vehicle.
// world.breakables = [[kind, x, y, headingDeg, len?], ...] in Blender metres (cc_fill5.py). One InstancedMesh per kind (vertex colours); a hit pops the piece loose:
// it flies off with some of the car's speed, tips over as it goes and lies flat where it lands (stays down). No colliders: you drive through, a little slower.
export function initBreakables(THREE, scene, list, b2t, opts = {}) {
  const api = { step() {}, count: list.length, broken: 0 };
  if (!list.length) return api;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler(), Y = new THREE.Vector3(0, 1, 0);
  // ---- geometry per kind: boxes with a colour each, merged (local x = along the piece, y up)
  function geo(parts) {
    const pos = [], nor = [], col = [], c = new THREE.Color();
    for (const [x0, x1, y0, y1, z0, z1, hex] of parts) {
      const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2).toNonIndexed(); c.set(hex);
      pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); for (let i = 0; i < g.attributes.position.count; i++) col.push(c.r, c.g, c.b);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
  }
  function crackParts() {                                     // drawn at its real length (6.6 m, x -3.3..3.3): weathered stucco + cap, thin jagged cracks, chipped holes, both faces
    const H = 3.3, P = [[-H, H, 0, 2.3, -.17, .17, '#d9caa8'], [-H - .02, H + .02, 2.3, 2.45, -.25, .25, '#c4b594'], [-H, H, 0, .3, -.19, .19, '#a8987a']];
    const D = '#3a3128', crack = (x, y, steps, seed) => {                 // a crack from (x, y) down the wall: little offset steps, 2.2 cm wide
      let r = seed; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < steps; i++) { const nx = x + (rnd() - .5) * .34, ny = y - .13 - rnd() * .12;
        for (const f of [-1, 1]) { P.push([Math.min(x, nx) - .022, Math.max(x, nx) + .022, ny, y, f * .17 - .012, f * .17 + .012, D]); }
        if (rnd() < .25) for (const f of [-1, 1]) { const bx = nx + (rnd() < .5 ? -1 : 1) * (.15 + rnd() * .25); P.push([Math.min(nx, bx), Math.max(nx, bx), ny - .02, ny + .02, f * .17 - .012, f * .17 + .012, D]); }
        x = nx; y = ny; }
    };
    crack(-1.9, 2.3, 16, 7); crack(-.2, 2.3, 14, 19); crack(1.6, 2.3, 17, 31); crack(2.7, 1.6, 9, 43); crack(-2.8, 1.3, 7, 57);
    for (const [x, y, w, h] of [[-1.1, .9, .5, .35], [.9, 1.7, .4, .3], [2.2, .6, .35, .45], [-2.5, 1.9, .3, .25]]) for (const f of [-1, 1]) {
      P.push([x - w / 2, x + w / 2, y - h / 2, y + h / 2, f * .17 - .03, f * .17 + .03, '#8a7c62']); P.push([x - w / 3, x + w / 3, y - h / 3, y + h / 3, f * .17 - .045, f * .17 + .045, '#4a4036']); }
    for (const x of [-1.9, -.2, 1.6]) P.push([x - .07, x + .07, 2.3, 2.47, -.26, .26, D]);     // splits in the cap
    return P;
  }
  const arm = []; for (let i = 0; i < 6; i++) arm.push([-2.4 + i * .8, -2.4 + (i + 1) * .8, .92, 1.08, -.06, .06, i % 2 ? '#f4f2ea' : '#d6332a']);
  const KIND = {
    mailbox: { g: geo([[-.05, .05, 0, 1.05, -.05, .05, '#4a4c50'], [-.18, .18, 1.0, 1.32, -.26, .26, '#2a2c30'], [.18, .2, 1.18, 1.3, -.02, .1, '#d6332a']]), r: .8, slow: .97, h: .25 },
    mailbox_w: { g: geo([[-.05, .05, 0, 1.05, -.05, .05, '#4a4c50'], [-.18, .18, 1.0, 1.32, -.26, .26, '#ecebe6'], [.18, .2, 1.18, 1.3, -.02, .1, '#d6332a']]), r: .8, slow: .97, h: .25 },
    bin: { g: geo([[-.3, .3, .05, 1.0, -.35, .35, '#2f5a3a'], [-.32, .32, 1.0, 1.08, -.37, .37, '#24452c'], [-.32, -.26, 0, .2, -.37, -.2, '#1d1f22'], [.26, .32, 0, .2, -.37, -.2, '#1d1f22']]), r: .9, slow: .96, h: .35 },
    fence: { g: geo([[-.5, .5, .1, 1.8, -.04, .04, '#9c7a55'], [-.5, .5, 1.45, 1.55, -.08, .08, '#7d6145']]), seg: true, r: 1.25, slow: .92, h: .05 },
    corral: { g: geo([[-3, 3, 0, 1.0, -.95, -.85, '#9aa0a6'], [-3, 3, 0, 1.0, .85, .95, '#9aa0a6'], [2.95, 3.05, .7, 1.0, -.95, .95, '#c8362a'], [-3, -2.9, 0, 1.0, -.95, .95, '#9aa0a6']]), r: 2.2, slow: .9, h: .5 },
    arm: { g: geo(arm), seg: true, r: 1.4, slow: .88, h: .1 },
    // round 52 (user: "big walls ... visible cracks where you can drive through and break it ... a cinematic moment"): a cracked stretch of subdivision wall.
    // Solid (a collider) until something hits it fast enough; then it bursts into chunks and the way through is open. Drawn 1 m long, scaled to its length.
    crackwall: { g: geo(crackParts()), seg: true, solid: true, r: 5.5, need: 8, slow: .8, h: .2 },      // r: caught a frame before the car touches it (at top speed ~1 m a frame)
  };
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const by = {}, T = 120; for (const b of list) { const p = b2t(b[1], b[2], 0), key = b[0] + '|' + Math.floor(p.x / T) + ',' + Math.floor(p.z / T); (by[key] = by[key] || []).push(b); }   // one mesh per kind per 120 m tile (culls with the rest of the city)
  const items = [], grid = new Map(), C = 14;
  for (const key in by) {
    const k = key.split('|')[0], K = KIND[k]; if (!K) continue; const L = by[key], im = new THREE.InstancedMesh(K.g, mat, L.length); im.castShadow = k !== 'fence'; im.receiveShadow = true;
    let cx = 0, cz = 0;
    L.forEach((b, i) => {
      const p = b2t(b[1], b[2], 0), th = (b[3] || 0) * Math.PI / 180, len = b[4] || 1; cx += p.x / L.length; cz += p.z / L.length;
      const it = { k, K, im, i, x: p.x, z: p.z, th, len, up: true, ux: Math.cos(th), uz: -Math.sin(th) };   // ux, uz: the piece's local x in three coords
      Q.setFromAxisAngle(Y, th); M.compose(P.set(it.x, 0, it.z), Q, S.set(k === 'fence' ? len : k === 'crackwall' ? len / 6.6 : 1, 1, 1)); im.setMatrixAt(i, M);
      if (K.solid && opts.addCollider) it.col = opts.addCollider(it.x, it.z, th, len, .5);
      items.push(it); const g = Math.floor(it.x / C) + ',' + Math.floor(it.z / C); if (!grid.has(g)) grid.set(g, []); grid.get(g).push(it);
    });
    im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); scene.add(im); if (opts.cull) opts.cull(im, cx, cz, T * .75);
  }
  const loose = []; const L_last = () => loose[loose.length - 1];
  function knock(it, v, sp) {
    it.up = false; api.broken++; const dx = it.x - v.x, dz = it.z - v.z, d = Math.hypot(dx, dz) || 1, push = Math.min(1, sp / 25);
    const ax = Math.random() < .5 ? 1 : -1;                                                     // which way it tips over (about its own x, or z for panels)
    loose.push({ it, t: 0, y: 0, vy: 2 + push * 4 + Math.random() * 1.5, vx: v.vx * .7 + dx / d * 2, vz: v.vz * .7 + dz / d * 2, spin: (Math.random() - .5) * 3 * push, yaw: it.th, tip: 0, tipTo: Math.PI / 2 * ax });
    v.vx *= it.K.slow; v.vz *= it.K.slow; if (opts.onHit) opts.onHit(it.k, sp, v, it);
    if (it.col && opts.removeCollider) { opts.removeCollider(it.col); it.col = null; }
    if (it.k === 'crackwall') { L_last().gone = true; if (opts.burst) opts.burst(it.x, it.z, v.vx, v.vz, it.len); }
  }
  function hits(it, v) {
    if (!it.K.seg) return Math.hypot(it.x - v.x, it.z - v.z) < it.K.r;
    const h = (it.k === 'fence' || it.k === 'crackwall' ? it.len : 4.8) / 2, ox = v.x - it.x, oz = v.z - it.z, u = Math.max(-h, Math.min(h, ox * it.ux + oz * it.uz));
    const dx = ox - it.ux * u, dz = oz - it.uz * u, d = Math.hypot(dx, dz); if (d >= it.K.r) return false;
    if (!it.K.need) return true;
    return d > .01 && -(v.vx * dx + v.vz * dz) / d > it.K.need;          // solid ones: only coming at it fast enough (else the collider stops you)
  }
  api.step = (dt, vehicles) => {
    for (const v of vehicles) {
      if (!v || v.mode === 'parked') continue; const sp = Math.hypot(v.vx || 0, v.vz || 0); if (sp < 2.5) continue;
      const gx = Math.floor(v.x / C), gz = Math.floor(v.z / C);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const it of grid.get((gx + a) + ',' + (gz + b)) || []) if (it.up && hits(it, v)) knock(it, v, sp);
    }
    for (let n = loose.length - 1; n >= 0; n--) {
      const L = loose[n], it = L.it; L.t += dt; L.vy -= 9.8 * dt; L.y += L.vy * dt;
      if (L.y <= 0) { L.y = 0; L.vy = 0; L.vx *= Math.pow(.02, dt); L.vz *= Math.pow(.02, dt); L.spin *= Math.pow(.05, dt); }
      it.x += L.vx * dt; it.z += L.vz * dt; L.yaw += L.spin * dt; L.tip += (L.tipTo - L.tip) * Math.min(1, dt * 5);
      const done = L.t > 2.5 && Math.abs(L.tipTo - L.tip) < .02;
      if (L.gone) { M.compose(P.set(it.x, -50, it.z), Q.identity(), S.set(0, 0, 0)); it.im.setMatrixAt(it.i, M); it.im.instanceMatrix.needsUpdate = true; loose.splice(n, 1); continue; }   // a wall stretch is replaced by its chunks
      const tx = it.k === 'fence' || it.k === 'corral' || it.k === 'arm'; E.set(tx ? L.tip : 0, L.yaw, tx ? 0 : L.tip, 'YXZ'); Q.setFromEuler(E);
      M.compose(P.set(it.x, L.y + it.K.h * Math.abs(Math.sin(L.tip)), it.z), Q, S.set(it.k === 'fence' ? it.len : 1, 1, 1)); it.im.setMatrixAt(it.i, M); it.im.instanceMatrix.needsUpdate = true;
      if (done) { loose.splice(n, 1); it.im.computeBoundingSphere(); }
    }
  };
  return api;
}
