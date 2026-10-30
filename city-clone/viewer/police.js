// Police + wanted level (hand-off 2 design, Chinatown Wars rule): crimes raise the stars, police cars drive the road graph to you and chase/ram,
// and WRECKING police cars is how you lose stars (K wrecks per star). Out of sight long enough also drops a star. Busted when a cop pins you.
// States per cop: CHASE (graph route, then direct pursuit), RAM (2+ stars, full speed into you), BLOCK (parked roadblock, 3+ stars), WRECKED, LEAVE.
export const POL = { maxCops: [0, 1, 2, 4, 5], speed: [0, 17, 20, 23, 25], wreckNeed: [0, 1, 2, 4, 6], heatFor: [0, 1, 4, 8, 13], loseAfter: 28, bustTime: 3.5, probation: 6, pool: 7 };

export function createPolice(G, deps) {
  const { THREE, makeCar, carPoly, colliders, placeOnGround, scene, camera, pushCircle, audio, onStars, onBusted, onWreck } = deps;
  // ---------- road graph for routing (node centres + edge polylines) ----------
  const N = G.nodes.map(n => ({ x: n.x, z: -n.y, adj: [] }));
  G.edges.forEach(e => { const P = e.pts.map(p => [p[0], -p[1]]); let L = 0; for (let k = 1; k < P.length; k++) L += Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); N[e.a].adj.push({ n: e.b, P, L }); N[e.b].adj.push({ n: e.a, P: P.slice().reverse(), L }); });
  function nearestNode(x, z) { let b = 0, bd = 1e18; for (let i = 0; i < N.length; i++) { const d = (N[i].x - x) ** 2 + (N[i].z - z) ** 2; if (d < bd) { bd = d; b = i; } } return b; }
  const dist = new Float64Array(N.length), prev = new Int32Array(N.length), prevE = new Array(N.length), done = new Uint8Array(N.length);
  function route(a, b) {                            // Dijkstra on <100 nodes: polyline from node a to node b
    dist.fill(1e18); prev.fill(-1); done.fill(0); dist[a] = 0;
    for (;;) { let u = -1, ud = 1e18; for (let i = 0; i < N.length; i++) if (!done[i] && dist[i] < ud) { ud = dist[i]; u = i; } if (u < 0 || u === b) break; done[u] = 1;
      for (const ed of N[u].adj) { const nd = ud + ed.L; if (nd < dist[ed.n]) { dist[ed.n] = nd; prev[ed.n] = u; prevE[ed.n] = ed; } } }
    const pts = []; let v = b; const chain = []; while (v !== a && prev[v] >= 0) { chain.push(prevE[v]); v = prev[v]; }
    for (let k = chain.length - 1; k >= 0; k--) for (const p of chain[k].P) pts.push(p);
    return pts;
  }
  // ---------- pool ----------
  const cops = [];
  const lightMat = [new THREE.MeshBasicMaterial({ color: 0xff2b2b, toneMapped: false }), new THREE.MeshBasicMaterial({ color: 0x2b6bff, toneMapped: false })];
  const lightGeo = new THREE.BoxGeometry(.5, .18, .3);
  for (let i = 0; i < POL.pool; i++) {
    const car = makeCar('police', '#f4f4f4'); car.group.visible = false;
    const bar = [new THREE.Mesh(lightGeo, lightMat[0].clone()), new THREE.Mesh(lightGeo, lightMat[1].clone())]; bar[0].position.set(-.35, (car.dims[3] || 1.75), 0); bar[1].position.set(.35, (car.dims[3] || 1.75), 0); car.group.add(bar[0], bar[1]);
    const col = { poly: [[1e5, 1e5], [1e5 + 1, 1e5], [1e5, 1e5 + 1], [1e5, 1e5 + 2]], cx: 1e5, cz: 1e5, r: 3, vx: 0, vz: 0 }; colliders.push(col);
    const c = { id: i, car, g: car.group, dims: car.dims, col, bar, on: false, state: 'CHASE', x: 0, z: 0, th: 0, v: 0, dmg: 0, path: null, pi: 0, repath: 0, off: 0, stuck: 0 };
    col.mass = 320 * car.dims[0] * car.dims[1] * 1.1; col.push = (dx, dz, dw) => { c.x += dx * .12; c.z += dz * .12; c.th += dw * .25; c.v *= .5; };
    col.onHit = v => { if (!c.on || c.state === 'WRECKED') return; c.dmg += v * .075; c.v *= .4; if (c.dmg >= 1) wreck(c); };
    cops.push(c);
  }
  // ---------- wanted state ----------
  const W = { stars: 0, heat: 0, wrecked: 0, probation: 0, unseen: 0, bust: 0, flash: 0 };
  function setStars(s) { s = Math.max(0, Math.min(4, s)); if (s !== W.stars) { W.stars = s; W.wrecked = 0; if (onStars) onStars(W); } }
  function crime(kind, amt = 1) {                   // called by the game: 'assault', 'knockdown', 'runover', 'carcrash'
    if (W.probation > 0) W.probation = 0;
    W.heat += amt; let s = 0; for (let k = 1; k <= 4; k++) if (W.heat >= POL.heatFor[k]) s = k; if (s > W.stars) setStars(s); W.unseen = 0; if (onStars) onStars(W);
  }
  function wreck(c) {
    c.state = 'WRECKED'; c.v = 0; c.car.setDamage(1); c.bar[0].visible = c.bar[1].visible = false; if (onWreck) onWreck(c);
    if (W.stars > 0) { W.wrecked++; if (W.wrecked >= POL.wreckNeed[W.stars]) { setStars(W.stars - 1); W.heat = POL.heatFor[W.stars]; W.probation = POL.probation; } if (onStars) onStars(W); }
  }
  function clear() { setStars(0); W.heat = 0; W.probation = 0; W.unseen = 0; W.bust = 0; for (const c of cops) if (c.on) despawn(c); if (onStars) onStars(W); }
  // ---------- spawn ----------
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere(new THREE.Vector3(), 5);
  const onScreen = (x, z) => { sph.center.set(x, 1, z); return frustum.intersectsSphere(sph); };
  function spawn(c, P, block) {                    // on a road node 45-85 m away, off-screen, preferably ahead of the player's travel
    const sp = Math.hypot(P.vx, P.vz), ux = sp > 2 ? P.vx / sp : 0, uz = sp > 2 ? P.vz / sp : 0; let best = -1, bs = -1e9;
    for (let i = 0; i < N.length; i++) { const dx = N[i].x - P.x, dz = N[i].z - P.z, d = Math.hypot(dx, dz); if (d < 45 || d > 85 || onScreen(N[i].x, N[i].z)) continue;
      const sc = (dx * ux + dz * uz) / d * (block ? 3 : 1) + Math.random() * .6; if (sc > bs) { bs = sc; best = i; } }
    if (best < 0) return false;
    const n = N[best]; c.x = n.x; c.z = n.z; c.th = Math.atan2(-(P.x - n.x), -(P.z - n.z)); c.v = block ? 0 : 6; c.dmg = 0; c.on = true; c.g.visible = true; c.car.setDamage(0); c.bar[0].visible = c.bar[1].visible = true;
    c.state = block ? 'BLOCK' : 'CHASE'; c.path = null; c.repath = 0; c.off = 0; c.stuck = 0;
    if (block && n.adj.length) { const ed = n.adj[0], p = ed.P[Math.min(2, ed.P.length - 1)]; c.th = Math.atan2(-(p[0] - n.x), -(p[1] - n.z)) + Math.PI / 2; }    // parked across the road
    return true;
  }
  function despawn(c) { c.on = false; c.g.visible = false; c.col.cx = c.col.cz = 1e5; for (const p of c.col.poly) { p[0] = 1e5; p[1] = 1e5; } c.col.vx = c.col.vz = 0; }
  // ---------- siren ----------
  let siren = null;
  function sirenOn(on, near) {
    const A = audio(); if (!A) return;
    if (!siren) { const o = A.ctx.createOscillator(); o.type = 'square'; const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400; const g = A.ctx.createGain(); g.gain.value = 0; o.connect(f); f.connect(g); g.connect(A.master); o.start(); siren = { o, g }; }
    const t = A.ctx.currentTime; siren.g.gain.setTargetAtTime(on ? .035 * near : 0, t, .2); siren.o.frequency.setTargetAtTime(on ? (Math.sin(t * 5.5) > 0 ? 960 : 720) : 600, t, .03);
  }
  // ---------- step ----------
  let spawnT = 0, blockT = 0, flashT = 0;
  function step(dt, P) {                            // P: player {x, z, vx, vz, th, L, W, foot}
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
    if (W.probation > 0) W.probation -= dt;
    flashT += dt; const ph = Math.floor(flashT * 6) % 2;
    // spawn / despawn
    spawnT -= dt; blockT -= dt;
    const want = W.probation > 0 ? 0 : POL.maxCops[W.stars];
    let active = 0; for (const c of cops) if (c.on && c.state !== 'WRECKED' && c.state !== 'LEAVE') active++;
    if (spawnT <= 0) {
      spawnT = 1.2;
      if (active < want) { const c = cops.find(c => !c.on); if (c) spawn(c, P, false); }
      if (W.stars >= 3 && blockT <= 0 && W.probation <= 0) { blockT = 22; let k = 0; for (const c of cops) if (!c.on && k < 2 && spawn(c, P, true)) { k++; if (k === 2) { const a = cops.find(o => o.on && o.state === 'BLOCK' && o !== c); if (a) { c.x = a.x + Math.cos(a.th) * 4.6; c.z = a.z - Math.sin(a.th) * 4.6; c.th = a.th; } } } }
      for (const c of cops) {
        if (!c.on) continue; const d = Math.hypot(c.x - P.x, c.z - P.z), vis = onScreen(c.x, c.z); c.off = vis ? 0 : c.off + 1.2;
        if ((c.state === 'WRECKED' || c.state === 'LEAVE' || c.state === 'BLOCK' || W.stars === 0) && !vis && c.off > 2 && d > 40) despawn(c);
        else if (active > want && c.state === 'CHASE' && W.probation > 0) c.state = 'LEAVE';
      }
    }
    let nearest = 1e9, seen = false, pinning = false;
    for (const c of cops) {
      if (!c.on) continue;
      c.bar[0].material.color.setHex(ph ? 0xff2b2b : 0x551010); c.bar[1].material.color.setHex(ph ? 0x10204f : 0x2b6bff);
      const dx = P.x - c.x, dz = P.z - c.z, d = Math.hypot(dx, dz); if (c.state !== 'WRECKED') { nearest = Math.min(nearest, d); if (d < 50) seen = true; }
      if (c.state === 'WRECKED' || c.state === 'BLOCK') { c.v = 0; }
      else {
        // target: the player directly when close, else the next point on a road route
        let tx = P.x + P.vx * Math.min(1.2, d / 25), tz = P.z + P.vz * Math.min(1.2, d / 25);
        if (c.state === 'LEAVE') { tx = c.x - dx; tz = c.z - dz; }
        else if (d > 22) {
          c.repath -= dt;
          if (!c.path || c.repath <= 0) { c.path = route(nearestNode(c.x, c.z), nearestNode(P.x, P.z)); c.pi = 0; c.repath = 1.5; }
          while (c.path && c.pi < c.path.length && Math.hypot(c.path[c.pi][0] - c.x, c.path[c.pi][1] - c.z) < 9) c.pi++;
          if (c.path && c.pi < c.path.length) { tx = c.path[c.pi][0]; tz = c.path[c.pi][1]; }
        }
        const want_ = Math.atan2(-(tx - c.x), -(tz - c.z)); let da = want_ - c.th; da = Math.atan2(Math.sin(da), Math.cos(da));
        const turn = 2.4 * Math.min(1, .35 + c.v / 12); c.th += Math.max(-turn * dt, Math.min(turn * dt, da));
        const ram = W.stars >= 2 && d < 30, vmax = POL.speed[Math.max(1, W.stars)];
        let vt = vmax * Math.max(.35, Math.cos(da)); if (!ram && d < 9 && c.state !== 'LEAVE') vt = Math.min(vt, Math.hypot(P.vx, P.vz) + 1);     // 1 star: tail you; 2+: ram
        c.v += Math.max(-14 * dt, Math.min(9 * dt, vt - c.v));
        const fx = -Math.sin(c.th), fz = -Math.cos(c.th); let nx = c.x + fx * c.v * dt, nz = c.z + fz * c.v * dt;
        const q = pushCircle(nx, nz, 1.5, c.col); if (Math.abs(q[0] - nx) + Math.abs(q[1] - nz) > .03) { c.v *= .85; c.stuck += dt; } else c.stuck = Math.max(0, c.stuck - dt);
        if (c.stuck > 1.5) { c.th += Math.PI * .6; c.stuck = 0; c.path = null; }                     // wedged on a wall: back off at an angle
        c.x = q[0]; c.z = q[1];
        if (d < (c.dims[0] + P.L) / 2 + .6) { c.v = Math.min(c.v, 2); if (Math.hypot(P.vx, P.vz) < 1 && d < (c.dims[0] + P.L) / 2 + .3) pinning = true; }
      }
      placeOnGround(c.g, c.x, c.z, c.th);
      const Q = carPoly(c.x, c.z, c.th, c.dims); for (let k = 0; k < 4; k++) { c.col.poly[k][0] = Q[k][0]; c.col.poly[k][1] = Q[k][1]; }
      c.col.cx = c.x; c.col.cz = c.z; c.col.r = Math.hypot(c.dims[0], c.dims[1]) / 2 + .2; c.col.vx = -Math.sin(c.th) * c.v; c.col.vz = -Math.cos(c.th) * c.v;
    }
    // losing them / getting busted
    if (W.stars > 0) {
      W.unseen = seen ? 0 : W.unseen + dt; if (W.unseen > POL.loseAfter) { setStars(W.stars - 1); W.heat = POL.heatFor[W.stars]; W.unseen = 0; if (onStars) onStars(W); }
      W.bust = pinning ? W.bust + dt : Math.max(0, W.bust - dt * 2); if (W.bust > POL.bustTime) { W.bust = 0; if (onBusted) onBusted(); clear(); }
    }
    sirenOn(W.stars > 0 && nearest < 120, Math.max(.15, 1 - nearest / 120));
  }
  return { cops, step, crime, clear, W, POL };
}
