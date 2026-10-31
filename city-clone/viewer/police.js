// Police + wanted level (hand-off 2 design, Chinatown Wars rule): crimes raise the stars, police cars drive the road graph to you and chase/ram,
// and WRECKING police cars is how you lose stars (K wrecks per star). Out of sight long enough also drops a star. Busted when a cop pins you.
// States per cop: CHASE (graph route, then direct pursuit), RAM (2+ stars, full speed into you), BLOCK (parked roadblock, 3+ stars), WRECKED, LEAVE.
export const POL = { maxCops: [0, 1, 2, 4, 5], speed: [0, 17, 20, 23, 25], wreckNeed: [0, 1, 2, 4, 6], heatFor: [0, 1, 4, 8, 13], loseAfter: 28, bustTime: 3.5, probation: 6, pool: 7 };

export function createPolice(G, deps) {
  const { THREE, makeCar, carPoly, colliders, placeOnGround, scene, camera, pushCircle, audio, onStars, onBusted, onWreck, ram, playerMass } = deps;
  // ---------- road graph for routing (node centres + edge polylines) ----------
  const N = G.nodes.map(n => ({ x: n.x, z: -n.y, adj: [] }));
  G.edges.forEach((e, ei) => { const P = e.pts.map(p => [p[0], -p[1]]); let L = 0; for (let k = 1; k < P.length; k++) L += Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]); N[e.a].adj.push({ n: e.b, P, L, ei }); N[e.b].adj.push({ n: e.a, P: P.slice().reverse(), L, ei }); });
  let SHUT = null, CLOSED = null;
  const E2 = G.edges.map((e, k) => ({ a: e.a, b: e.b, k, P: e.pts.map(p => [p[0], -p[1]]) }));
  function routeTo(x, z, px, pz) {                 // to the road point nearest (px, pz), entering its street from an open end (roadblocks)
    let be = null, bj = 0, bd = 1e18; for (const e of E2) for (let j = 0; j < e.P.length; j++) { const d = (e.P[j][0] - px) ** 2 + (e.P[j][1] - pz) ** 2; if (d < bd) { bd = d; be = e; bj = j; } }
    const s0 = nearestNode(x, z); if (!be) return route(s0, nearestNode(px, pz));
    const ra = route(s0, be.a), la = dist[be.a] + bj + (CLOSED && CLOSED.get(be.k) === be.a ? 1e4 : 0), rb = route(s0, be.b), lb = dist[be.b] + (be.P.length - bj) + (CLOSED && CLOSED.get(be.k) === be.b ? 1e4 : 0);
    return la <= lb ? ra.concat(be.P.slice(0, bj + 1)) : rb.concat(be.P.slice(bj).reverse());
  }                                  // edges closed by mission roadblocks (a live Set from dave.js): routes avoid them
  function nearestNode(x, z) { let b = 0, bd = 1e18; for (let i = 0; i < N.length; i++) { const d = (N[i].x - x) ** 2 + (N[i].z - z) ** 2; if (d < bd) { bd = d; b = i; } } return b; }
  const dist = new Float64Array(N.length), prev = new Int32Array(N.length), prevE = new Array(N.length), done = new Uint8Array(N.length);
  function route(a, b) {                            // Dijkstra on <100 nodes: polyline from node a to node b
    dist.fill(1e18); prev.fill(-1); done.fill(0); dist[a] = 0;
    for (;;) { let u = -1, ud = 1e18; for (let i = 0; i < N.length; i++) if (!done[i] && dist[i] < ud) { ud = dist[i]; u = i; } if (u < 0 || u === b) break; done[u] = 1;
      for (const ed of N[u].adj) { const nd = ud + ed.L + (SHUT && SHUT.has(ed.ei) ? 1e4 : 0); if (nd < dist[ed.n]) { dist[ed.n] = nd; prev[ed.n] = u; prevE[ed.n] = ed; } } }
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
  const W = { stars: 0, heat: 0, wrecked: 0, probation: 0, unseen: 0, bust: 0, flash: 0, lock: false, force: 0, goal: null };     // lock/force: a scripted chase (the Dave mission) sets the cop count and stars, nothing the player does changes them
  function setStars(s) { s = Math.max(0, Math.min(4, s)); if (s !== W.stars) { W.stars = s; W.wrecked = 0; if (onStars) onStars(W); } }
  function crime(kind, amt = 1) {                   // called by the game: 'assault', 'knockdown', 'runover', 'carcrash'
    if (W.lock) return; if (W.probation > 0) W.probation = 0;
    W.heat += amt; let s = 0; for (let k = 1; k <= 4; k++) if (W.heat >= POL.heatFor[k]) s = k; if (s > W.stars) setStars(s); W.unseen = 0; if (onStars) onStars(W);
  }
  function wreck(c) {
    c.state = 'WRECKED'; c.v = 0; c.car.setDamage(1); c.bar[0].visible = c.bar[1].visible = false; if (onWreck) onWreck(c);
    if (W.stars > 0 && !W.lock) { W.wrecked++; if (W.wrecked >= POL.wreckNeed[W.stars]) { setStars(W.stars - 1); W.heat = POL.heatFor[W.stars]; W.probation = POL.probation; } if (onStars) onStars(W); }
  }
  function clear() { setStars(0); W.heat = 0; W.probation = 0; W.unseen = 0; W.bust = 0; for (const c of cops) if (c.on) despawn(c); if (onStars) onStars(W); }
  // ---------- spawn ----------
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere(new THREE.Vector3(), 5);
  const onScreen = (x, z) => { sph.center.set(x, 1, z); return frustum.intersectsSphere(sph); };
  function spawn(c, P, block) {                    // on a road node 45-85 m away, off-screen, preferably ahead of the player's travel
    const sp = Math.hypot(P.vx, P.vz), ux = sp > 2 ? P.vx / sp : 0, uz = sp > 2 ? P.vz / sp : 0; let best = -1, bs = -1e9;
    for (let i = 0; i < N.length; i++) { const dx = N[i].x - P.x, dz = N[i].z - P.z, d = Math.hypot(dx, dz); if (d < 45 || d > 85 || onScreen(N[i].x, N[i].z)) continue;
      let sc = (dx * ux + dz * uz) / d * (block ? 3 : 1) + Math.random() * .6; if (W.force > 0 && W.goal) { const gx = W.goal[0] - P.x, gz = W.goal[1] - P.z, gl = Math.hypot(gx, gz) || 1; sc += (dx * gx + dz * gz) / (d * gl) * 1.2; } if (sc > bs) { bs = sc; best = i; } }
    if (best < 0) return false;
    const n = N[best]; c.x = n.x; c.z = n.z; c.th = Math.atan2(-(P.x - n.x), -(P.z - n.z)); c.v = block ? 0 : 6; c.dmg = 0; c.on = true; c.g.visible = true; c.car.setDamage(0); c.bar[0].visible = c.bar[1].visible = true;
    c.state = block ? 'BLOCK' : 'CHASE'; c.blocking = false; c.path = null; c.repath = 0; c.off = 0; c.stuck = 0;
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
  // ---------- following a road route: nearest point first, then a look-ahead point that grows with speed, and how sharp the road bends further on ----------
  function closestOn(path, x, z) { let b = 0, bd = 1e18; for (let i = 0; i < Math.min(path.length, 60); i++) { const d = (path[i][0] - x) ** 2 + (path[i][1] - z) ** 2; if (d < bd) { bd = d; b = i; } } return b; }
  function follow(c) {
    const P = c.path; if (!P || !P.length) return null; const d2 = i => (P[i][0] - c.x) ** 2 + (P[i][1] - c.z) ** 2;
    while (c.pi < P.length - 1 && d2(c.pi + 1) <= d2(c.pi) + 1) c.pi++;
    const at = (look) => { let acc = 0, px = c.x, pz = c.z; for (let j = c.pi; j < P.length; j++) { acc += Math.hypot(P[j][0] - px, P[j][1] - pz); px = P[j][0]; pz = P[j][1]; if (acc >= look) return P[j]; } return P[P.length - 1]; };
    const t = at(5 + c.v * .4), far = at(16 + c.v * 1.1), wa = Math.atan2(-(far[0] - c.x), -(far[1] - c.z)); let bend = wa - c.th; bend = Math.abs(Math.atan2(Math.sin(bend), Math.cos(bend)));
    return [t[0], t[1], bend];
  }
  // ---------- the scripted chase (Dave): odd cops cut you off, even cops pursue where you will be ----------
  function aimPoint(c, P, d) {                    // where to route: pursuers lead you by up to 2.5 s; cutters go 50-70 m ahead of you on your way to the goal
    const sp = Math.hypot(P.vx, P.vz);
    if (c.id % 2 === 0) { const t = Math.min(2.5, d / Math.max(c.v, 12)); return [P.x + P.vx * t, P.z + P.vz * t]; }
    if (W.goal) {                                  // the first junction on your way to the goal that this cop can reach before you (by any street): go and wait there
      const pn = nearestNode(P.x, P.z), gn = nearestNode(W.goal[0], W.goal[1]); route(pn, gn);
      const chain = []; let v = gn; while (v !== pn && prev[v] >= 0) { chain.push(v); v = prev[v]; } chain.reverse(); const pd = chain.map(n => dist[n]), p0 = Math.hypot(N[pn].x - P.x, N[pn].z - P.z);
      route(nearestNode(c.x, c.z), -1); const vc = POL.speed[Math.max(1, W.stars)] * 1.25 * .7, vp = Math.max(sp, 10);
      for (let k = 0; k < chain.length; k++) { const n = chain[k], along = pd[k] + p0; if (along < 30) continue; if (along > 260) break; if (dist[n] / vc < along / vp - .4) { c.inode = n; return [N[n].x, N[n].z]; } }
    }
    c.inode = null; const ahead = 55 + (c.id % 3) * 12;
    if (W.goal) {                                  // a point that far along your road route to the goal (that is where you will be)
      const R = route(nearestNode(P.x, P.z), nearestNode(W.goal[0], W.goal[1])); let acc = 0, px = P.x, pz = P.z;
      for (const q of R) { acc += Math.hypot(q[0] - px, q[1] - pz); px = q[0]; pz = q[1]; if (acc >= ahead) return q; }
      if (R.length) return R[R.length - 1];
    }
    const ux = sp > 3 ? P.vx / sp : 0, uz = sp > 3 ? P.vz / sp : 0; return [P.x + ux * ahead, P.z + uz * ahead];
  }
  function pack(c, P, d) {                        // close in (< 32 m), by role: 0 rams your rear, 2 rides beside your back corner then PITs you, 3 gets in front and brake-checks
    const role = c.id % 4, th = P.th || 0, fx = -Math.sin(th), fz = -Math.cos(th), rx = Math.cos(th), rz = -Math.sin(th), sp = Math.hypot(P.vx, P.vz);
    const ox = c.x - P.x, oz = c.z - P.z, lon = ox * fx + oz * fz, lat = ox * rx + oz * rz;
    if (role === 0) return [P.x - fx * 1.5 + P.vx * .25, P.z - fz * 1.5 + P.vz * .25, null];
    if (role === 2) {
      if (!c.side) c.side = lat >= 0 ? 1 : -1;
      if (c.pit > 0) return [P.x + P.vx * .12, P.z + P.vz * .12, sp + 6];                               // steer into you
      const gx = P.x + rx * c.side * 2.9 - fx * 1.4 + P.vx * .3, gz = P.z + rz * c.side * 2.9 - fz * 1.4 + P.vz * .3, gd = Math.hypot(gx - c.x, gz - c.z);
      if (Math.abs(lat) > 1.6 && Math.abs(lat) < 4.2 && lon > -3.8 && lon < .8 && sp > 6) c.pit = .7;        // alongside your back corner: go
      return [gx, gz, sp + Math.max(-6, Math.min(9, gd * 1.4))];
    }
    if (role === 3) {
      if (c.brakeT > 0) return [P.x + fx * 30, P.z + fz * 30, Math.max(0, sp - 12)];                     // in front of you: stand on the brakes
      if (lon > 5 && lon < 16 && Math.abs(lat) < 2.2) { c.brakeT = 1.6; }
      return [P.x + fx * 11 + P.vx * .4, P.z + fz * 11 + P.vz * .4, sp + 8];
    }
    return null;
  }
  function block(c, P, d, dt) {                   // a cutter that got in front of you: park across your path (the lane you are coming down) until you are past
    const sp = Math.hypot(P.vx, P.vz), ux = sp > 2 ? P.vx / sp : 0, uz = sp > 2 ? P.vz / sp : 0, ahead = (c.x - P.x) * ux + (c.z - P.z) * uz, side = Math.abs((c.x - P.x) * uz - (c.z - P.z) * ux);
    if (c.blocking) { c.holdT = (c.holdT || 0) + dt; if (ahead < -4 || d > 160 || c.holdT > 10) { c.blocking = false; c.inode = null; c.path = null; return false; } return true; }
    if (c.inode != null && Math.hypot(N[c.inode].x - c.x, N[c.inode].z - c.z) < 8) {     // made it to the junction first: park across the road you are coming down
      const ix = N[c.inode].x - P.x, iz = N[c.inode].z - P.z, il = Math.hypot(ix, iz) || 1; c.bx = N[c.inode].x; c.bz = N[c.inode].z; c.bth = Math.atan2(-iz / il, ix / il); c.blocking = true; c.holdT = 0; return true;
    }
    if (sp > 6 && ahead > 12 && ahead < 45 && side < 9) {
      c.bx = P.x + ux * ahead; c.bz = P.z + uz * ahead; c.blocking = true; c.holdT = 0; c.bth = Math.atan2(-uz, ux);   // stop on your line, turned across it
      return true;
    }
    return false;
  }
  function hitYou(c, P, d, fx, fz) {             // a cop running into your car: momentum into you (and spin from where it lands: a hit on your back corner spins you, a PIT)
    const now = performance.now(); if ((c.ramT || 0) > now || d > (c.dims[0] + P.L) / 2 + .5) return;
    const nx = (P.x - c.x) / (d || 1), nz = (P.z - c.z) / (d || 1), vc = (fx * c.v - P.vx) * nx + (fz * c.v - P.vz) * nz; if (vc < 2.5) return;
    const mc = c.col.mass || 2500, mp = playerMass ? playerMass() : 2500, J = vc * 1.25 * mc * mp / (mc + mp), dvp = J / mp;
    const rx = (c.x - P.x) * .5, rz = (c.z - P.z) * .5, I = mp * ((P.L || 4.5) ** 2 + (P.W || 1.9) ** 2) / 12;
    let dw = (rz * nx * J - rx * nz * J) / I * (c.pit > 0 ? 2.2 : 1);           // torque about your centre (the PIT turns it up)
    dw = Math.max(-4.5, Math.min(4.5, dw)); if (ram) ram(nx * dvp, nz * dvp, dw, Math.min(14, dvp * 1.6));
    c.v = Math.max(0, c.v - J / mc); c.ramT = now + 450; c.pit = 0;
  }
  function shove(c, nx, nz, fx, fz) {             // a cop at speed knocks traffic out of its way: sideways (away from its nose) and a little forward
    const rx = -fz, rz = fx, reach = c.dims[0] / 2 + 2.6, now = performance.now();
    for (const B of colliders) {
      if (!B.ai || !B.push || Math.abs(B.cx - nx) > 6 || Math.abs(B.cz - nz) > 6) continue; const ox = B.cx - nx, oz = B.cz - nz;
      if (Math.hypot(ox, oz) > reach || ox * fx + oz * fz < -1 || (B.shoveT || 0) > now) continue;
      const side = Math.sign(ox * rx + oz * rz) || 1, k = Math.min(30, Math.max(5, c.v)) * .35;
      B.push((fx * .4 + rx * side) * k, (fz * .4 + rz * side) * k, side * .8); B.shoveT = now + 350; c.v *= .9;
    }
  }
  // ---------- step ----------
  let spawnT = 0, blockT = 0, flashT = 0;
  function step(dt, P) {                            // P: player {x, z, vx, vz, th, L, W, foot}
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
    if (W.probation > 0) W.probation -= dt;
    flashT += dt; const ph = Math.floor(flashT * 6) % 2;
    // spawn / despawn
    spawnT -= dt; blockT -= dt;
    const want = W.force > 0 ? W.force : W.probation > 0 ? 0 : POL.maxCops[W.stars];
    let active = 0; for (const c of cops) if (c.on && c.state !== 'WRECKED' && c.state !== 'LEAVE') active++;
    if (spawnT <= 0) {
      spawnT = 1.2;
      if (active < want) { const c = cops.find(c => !c.on); if (c) spawn(c, P, false); }
      if (W.stars >= 3 && blockT <= 0 && W.probation <= 0) { blockT = 22; let k = 0; for (const c of cops) if (!c.on && k < 2 && spawn(c, P, true)) { k++; if (k === 2) { const a = cops.find(o => o.on && o.state === 'BLOCK' && o !== c); if (a) { c.x = a.x + Math.cos(a.th) * 4.6; c.z = a.z - Math.sin(a.th) * 4.6; c.th = a.th; } } } }
      for (const c of cops) {
        if (!c.on) continue; const d = Math.hypot(c.x - P.x, c.z - P.z), vis = onScreen(c.x, c.z); c.off = vis ? 0 : c.off + 1.2;
        if ((c.state === 'WRECKED' || c.state === 'LEAVE' || c.state === 'BLOCK' || W.stars === 0) && !vis && c.off > 2 && d > 40) despawn(c);
        else if (active > want && c.state === 'CHASE' && W.probation > 0) c.state = 'LEAVE';
        else if (W.force > 0 && c.state === 'CHASE' && !vis && d > 110) despawn(c);        // scripted chase: a cop left far behind comes back ahead of you (respawned next round)
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
        let pk = null, vto = null; c.pit = Math.max(0, (c.pit || 0) - dt); c.brakeT = Math.max(0, (c.brakeT || 0) - dt);
        let corner = 0, tx = P.x + P.vx * Math.min(1.2, d / 25), tz = P.z + P.vz * Math.min(1.2, d / 25);
        if (c.state === 'LEAVE') { tx = c.x - dx; tz = c.z - dz; }
        else if (W.force > 0 && c.id % 2 && c.state === 'CHASE' && block(c, P, d, dt)) { tx = c.bx; tz = c.bz; }
        else if (W.force > 0 && d < 32 && c.state === 'CHASE' && c.id % 4 !== 1 && P.th !== undefined && (pk = pack(c, P, d))) { tx = pk[0]; tz = pk[1]; vto = pk[2]; }
        else if (d > 22) {
          c.repath -= dt;
          if (!c.path || c.repath <= 0) { const A = W.force > 0 ? aimPoint(c, P, d) : [P.x, P.z]; c.path = W.force > 0 ? routeTo(c.x, c.z, A[0], A[1]) : route(nearestNode(c.x, c.z), nearestNode(A[0], A[1])); c.pi = closestOn(c.path, c.x, c.z); c.repath = 1.2; }
          const f = follow(c); if (f) { tx = f[0]; tz = f[1]; corner = f[2]; }
        }
        let want_ = Math.atan2(-(tx - c.x), -(tz - c.z)); if (c.blocking && Math.hypot(c.bx - c.x, c.bz - c.z) < 4) want_ = c.bth; let da = want_ - c.th; da = Math.atan2(Math.sin(da), Math.cos(da));
        if (c.rev > 0) {                          // backing off a wall like a driver: reverse, the nose swinging toward where it wants to go
          c.rev -= dt; c.v += Math.max(-14 * dt, Math.min(14 * dt, -7 - c.v)); c.th += Math.sign(da) * 1.3 * dt;
        } else {
        const turn = W.force > 0 ? Math.min(3.2, 20 / Math.max(c.v, 4)) * Math.min(1, .3 + c.v / 6) : 2.4 * Math.min(1, .35 + c.v / 12); c.th += Math.max(-turn * dt, Math.min(turn * dt, da));    // scripted chase: turns as hard as ~20 m/s2 of grip allows
        if (c.blocking) { c.v += Math.max(-14 * dt, Math.min(9 * dt, (Math.hypot(c.bx - c.x, c.bz - c.z) > 2 ? 8 : 0) - c.v)); }
        const ram = W.stars >= 2 && d < 30, vmax = POL.speed[Math.max(1, W.stars)] * (W.force ? 1.25 : 1);      // the scripted Dave chase: faster than your car (25 -> 31 m/s)
        let vt = vto != null ? Math.min(vto, POL.speed[4] * 1.25) : W.force > 0 ? vmax * (1 - .7 * Math.min(1, Math.max(corner, Math.abs(da) * .8) / 1.4)) : vmax * Math.max(.35, Math.cos(da)); if (c.blocking) vt = Math.hypot(c.bx - c.x, c.bz - c.z) > 2 ? 9 : 0; if (!ram && d < 9 && c.state !== 'LEAVE') vt = Math.min(vt, Math.hypot(P.vx, P.vz) + 1);     // 1 star: tail you; 2+: ram
        c.v += Math.max(-14 * dt, Math.min(9 * dt, vt - c.v));
        }
        const fx = -Math.sin(c.th), fz = -Math.cos(c.th); let nx = c.x + fx * c.v * dt, nz = c.z + fz * c.v * dt;
        if ((W.force > 0 || W.stars >= 2) && P.th !== undefined) hitYou(c, P, d, fx, fz);                // ramming: checked before the push-out below, which would stop the cop at your bumper
        const plough = W.force > 0; if (plough && c.v > 2) shove(c, nx, nz, fx, fz);
        const q = pushCircle(nx, nz, 1.5, plough ? (B => B === c.col || B.ai) : c.col);      // scripted chase: traffic does not stop a cop, it gets shoved aside if (Math.abs(q[0] - nx) + Math.abs(q[1] - nz) > .03) { c.v *= .85; c.stuck += dt; } else c.stuck = Math.max(0, c.stuck - dt);
        if (c.stuck > (plough ? .6 : 1.5)) { if (plough) c.rev = 1.1; else c.th += Math.PI * .6; c.stuck = 0; c.path = null; }     // wedged on a wall: back off (scripted chase: reverse out), else turn away
        c.x = q[0]; c.z = q[1];
        if (d < (c.dims[0] + P.L) / 2 + .6) { if (!W.force && W.stars < 2) c.v = Math.min(c.v, 2); if (Math.hypot(P.vx, P.vz) < 1 && d < (c.dims[0] + P.L) / 2 + .3) pinning = true; }
      }
      placeOnGround(c.g, c.x, c.z, c.th);
      const Q = carPoly(c.x, c.z, c.th, c.dims); for (let k = 0; k < 4; k++) { c.col.poly[k][0] = Q[k][0]; c.col.poly[k][1] = Q[k][1]; }
      c.col.cx = c.x; c.col.cz = c.z; c.col.r = Math.hypot(c.dims[0], c.dims[1]) / 2 + .2; c.col.vx = -Math.sin(c.th) * c.v; c.col.vz = -Math.cos(c.th) * c.v;
    }
    // losing them / getting busted
    if (W.stars > 0) {
      W.unseen = seen || W.lock ? 0 : W.unseen + dt; if (W.unseen > POL.loseAfter) { setStars(W.stars - 1); W.heat = POL.heatFor[W.stars]; W.unseen = 0; if (onStars) onStars(W); }
      W.bust = pinning ? W.bust + dt : Math.max(0, W.bust - dt * 2); if (W.bust > POL.bustTime) { W.bust = 0; if (onBusted) onBusted(); clear(); }
    }
    sirenOn(W.stars > 0 && nearest < 120, Math.max(.15, 1 - nearest / 120));
  }
  function force(n) { W.force = n; if (n > 0) setStars(Math.min(4, Math.max(2, n))); spawnT = Math.min(spawnT, .2); if (onStars) onStars(W); }
  function lock(on) { W.lock = on; }
  function goal(x, z) { W.goal = x == null ? null : [x, z]; }
  function shut(set, closed) { SHUT = set; CLOSED = closed || null; }
  return { cops, step, crime, clear, force, lock, goal, shut, W, POL };
}
