// Traffic AI (hand-off 2 recipe): a lane graph from graph.json, cars follow their lane and keep a gap to whatever is ahead (IDM),
// a gate at every junction (signal, box occupancy, yield to the bigger road, room on the exit), a random turn at each junction (no path search),
// spawning just outside the view and despawning well behind. All state is preallocated; nothing is created per frame.
// Coordinates here are three.js (x east, z south); graph.json is Blender (x east, y north) and is flipped on load.
export const TT = {                                  // tuning, all in one place
  count: 18, amax: 2.2, brake: 3.2, gap0: 2.4, headway: 1.15, lookAhead: 26,
  spawnMin: 50, spawnMax: 95, despawn: 115, offscreenFor: 2, cycle: 26, mainGreen: 14, amber: 2.5, allRed: 1.5,
};
const KINDS = ['sedan', 'sedan', 'taxi', 'hatchback', 'coupe', 'suv', 'suv', 'minivan', 'pickup', 'van', 'sedan', 'hatchback', 'boxtruck', 'bus'];
const COLS = ['#d64545', '#3d6fd6', '#f2f2f2', '#2b2b2b', '#e0b43a', '#4e9a5a', '#9aa3ad', '#7a4bd0', '#e07a2e', '#1f8fa8', '#c8c2b0', '#8b1e2b'];

export function createTraffic(G, deps) {
  const { THREE, makeCar, carPoly, colliders, placeOnGround, scene, camera } = deps;
  // ---------- graph ----------
  const N = G.nodes.map(n => ({ x: n.x, z: -n.y, r: n.r, sig: n.sig, dead: n.dead, roads: n.roads, riro: new Set(n.riro || []), occ: new Set(), inc: [], out: [] }));
  const E = G.edges.map((e, i) => {
    const P = e.pts.map(p => [p[0], -p[1]]), cum = [0];
    for (let k = 1; k < P.length; k++) cum.push(cum[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]));
    return { i, a: e.a, b: e.b, P, cum, L: cum[cum.length - 1], lane: e.lane, hw: e.hw, v: e.v, rank: e.rank, road: e.road, main: e.road === 'Lyons Rd' };
  });
  for (const e of E) { N[e.a].out.push({ e, dir: 1 }); N[e.b].out.push({ e, dir: -1 }); N[e.b].inc.push({ e, dir: 1 }); N[e.a].inc.push({ e, dir: -1 }); }
  const endNode = (e, dir) => dir > 0 ? N[e.b] : N[e.a], startNode = (e, dir) => dir > 0 ? N[e.a] : N[e.b];
  function trims(e, dir) {                          // usable stretch of a lane: from leaving the start box to the stop line of the end box
    let t0 = startNode(e, dir).r + .5, t1 = endNode(e, dir).r + 1.0; if (startNode(e, dir).dead) t0 = 0; if (endNode(e, dir).dead) t1 = 2;
    if (t0 + t1 > e.L - 2) { const k = (e.L - 2) / (t0 + t1); t0 *= k; t1 *= k; }
    return [t0, e.L - t1];
  }
  const tmp = { x: 0, z: 0, fx: 0, fz: 0 };
  function centre(e, u, o) {                        // centre-line point + unit tangent at distance u from node a
    const c = e.cum, P = e.P; u = Math.max(0, Math.min(e.L, u)); let k = 1; while (k < c.length - 1 && c[k] < u) k++;
    const a = P[k - 1], b = P[k], l = c[k] - c[k - 1] || 1, t = (u - c[k - 1]) / l;
    o.fx = (b[0] - a[0]) / l; o.fz = (b[1] - a[1]) / l; o.x = a[0] + (b[0] - a[0]) * t; o.z = a[1] + (b[1] - a[1]) * t; return o;
  }
  function lanePos(e, dir, s, o) {                  // s runs along the travel direction; drive on the right
    centre(e, dir > 0 ? s : e.L - s, o); if (dir < 0) { o.fx = -o.fx; o.fz = -o.fz; }
    o.x += -o.fz * e.lane; o.z += o.fx * e.lane; return o;
  }
  // ---------- signals: one global clock, phases offset per junction so Lyons gets a loose green wave ----------
  let clock = 0;
  function light(node, e) {                        // 'g' | 'y' | 'r' for an approach on edge e
    if (node.sig < 0) return 'g';
    const t = (clock + node.sig * 4.0) % TT.cycle, mg = TT.mainGreen, am = TT.amber, ar = TT.allRed, cg = TT.cycle - mg - 2 * am - 2 * ar;
    if (e.main) return t < mg ? 'g' : t < mg + am ? 'y' : 'r';
    const t2 = t - (mg + am + ar); return t2 >= 0 && t2 < cg ? 'g' : t2 >= cg && t2 < cg + am ? 'y' : 'r';
  }
  // stop bars: one InstancedMesh of flat quads at every signalled stop line, coloured by the light (readable from the top-down camera)
  const bars = []; for (const n of N) if (n.sig >= 0) for (const ic of n.inc) bars.push({ n, e: ic.e, dir: ic.dir });
  const barMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ toneMapped: false }), Math.max(1, bars.length));
  barMesh.frustumCulled = false; const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const C_G = new THREE.Color('#38e07b'), C_Y = new THREE.Color('#ffc233'), C_R = new THREE.Color('#ff3b3b');
  bars.forEach((b, i) => {
    const [, s1] = trims(b.e, b.dir); lanePos(b.e, b.dir, s1, tmp); const w = b.e.main ? 9.2 : Math.min(3.4, b.e.hw ? b.e.hw : 3.2);
    const cx = tmp.x + (b.e.main ? tmp.fz * 0 : 0), ang = Math.atan2(-tmp.fx, -tmp.fz);
    q4.setFromAxisAngle(up, ang); v3.set(tmp.x, .045, tmp.z); s3.set(b.e.main ? 9.6 : 3.2, 1, .55); m4.compose(v3, q4, s3); barMesh.setMatrixAt(i, m4); barMesh.setColorAt(i, C_G); b.last = '';
  });
  barMesh.instanceMatrix.needsUpdate = true; scene.add(barMesh);
  function updateBars() {
    let ch = false;
    for (let i = 0; i < bars.length; i++) { const L = light(bars[i].n, bars[i].e); if (L !== bars[i].last) { bars[i].last = L; barMesh.setColorAt(i, L === 'g' ? C_G : L === 'y' ? C_Y : C_R); ch = true; } }
    if (ch) barMesh.instanceColor.needsUpdate = true;
  }
  // ---------- cars (pool, made once) ----------
  const cars = [];
  const knock = c => (dx, dz, dw) => { c.kvx += dx; c.kvz += dz; c.kw += dw; c.v *= .3; c.shock = Math.max(c.shock, 1.6); };
  function addCar(i) {
    const kind = KINDS[i % KINDS.length], car = makeCar(kind, COLS[(i * 7) % COLS.length]); car.group.visible = false;
    const col = { poly: [[1e5, 1e5], [1e5 + 1, 1e5], [1e5, 1e5 + 1], [1e5, 1e5 + 2]], cx: 1e5, cz: 1e5, r: 3, vx: 0, vz: 0, mass: 320 * car.dims[0] * car.dims[1] }; colliders.push(col);
    cars.push({ id: i, car, g: car.group, dims: car.dims, col, on: false, e: null, dir: 1, s: 0, v: 0, v0: 10, next: null, nextDir: 1, granted: false, wait: 0, still: 0, off: 0,
      kx: 0, kz: 0, kvx: 0, kvz: 0, ky: 0, kw: 0, ghost: 0, lat: 0, latT: 0, passS: 0, turn: false, tp: [0, 0, 0, 0, 0, 0], tL: 0, tS: 0, x: 0, z: 0, fx: 0, fz: -1, yaw: 0, shock: 0, node: null, name: 'ai' + i });
    col.push = knock(cars[cars.length - 1]);
  }
  for (let i = 0; i < TT.count; i++) addCar(i);
  function pickNext(c) {                            // random exit at the end node, no U-turn unless it is a dead end; bigger roads a bit more likely
    const n = endNode(c.e, c.dir); let opts = n.out.filter(o => o.e !== c.e);
    if (n.riro.size) {                              // right-in/right-out: side streets may only turn right; the main road may not turn left into them
      const kind = o => { const [, s1] = trims(c.e, c.dir); lanePos(c.e, c.dir, s1, tmp); const ax = tmp.fx, az = tmp.fz; lanePos(o.e, o.dir, trims(o.e, o.dir)[0], tmp); const cr = ax * tmp.fz - az * tmp.fx, dt = ax * tmp.fx + az * tmp.fz; return dt > .8 ? 'S' : cr > 0 ? 'R' : 'L'; };
      const ok = opts.filter(o => n.riro.has(c.e.road) ? kind(o) === 'R' : !(n.riro.has(o.e.road) && kind(o) === 'L'));
      if (ok.length) opts = ok;
    }
    if (!opts.length) { c.next = c.e; c.nextDir = -c.dir; return; }
    let tot = 0; for (const o of opts) tot += 1 + o.e.rank / 6; let r = Math.random() * tot;
    for (const o of opts) { r -= 1 + o.e.rank / 6; if (r <= 0) { c.next = o.e; c.nextDir = o.dir; return; } }
    c.next = opts[0].e; c.nextDir = opts[0].dir;
  }
  function place(c) {
    if (c.turn) {                                    // quadratic Bezier through the junction box
      const t = Math.min(1, c.tS / c.tL), p = c.tp, a = 1 - t;
      c.x = a * a * p[0] + 2 * a * t * p[2] + t * t * p[4]; c.z = a * a * p[1] + 2 * a * t * p[3] + t * t * p[5];
      let dx = 2 * a * (p[2] - p[0]) + 2 * t * (p[4] - p[2]), dz = 2 * a * (p[3] - p[1]) + 2 * t * (p[5] - p[3]); const l = Math.hypot(dx, dz) || 1; c.fx = dx / l; c.fz = dz / l;
    } else { lanePos(c.e, c.dir, c.s, tmp); c.x = tmp.x; c.z = tmp.z; c.fx = tmp.fx; c.fz = tmp.fz; }
    c.x += -c.fz * c.lat + c.kx; c.z += c.fx * c.lat + c.kz; c.yaw = Math.atan2(-c.fx, -c.fz) + c.ky;
  }
  function startTurn(c) {
    const [, s1] = trims(c.e, c.dir); lanePos(c.e, c.dir, s1, tmp); const p = c.tp; p[0] = tmp.x; p[1] = tmp.z; const f0x = tmp.fx, f0z = tmp.fz;
    const [t0] = trims(c.next, c.nextDir); lanePos(c.next, c.nextDir, t0, tmp); p[4] = tmp.x; p[5] = tmp.z; const f1x = tmp.fx, f1z = tmp.fz;
    const den = f0x * f1z - f0z * f1x, dx = p[4] - p[0], dz = p[5] - p[1];
    if (Math.abs(den) > .2) { const k = (dx * f1z - dz * f1x) / den; p[2] = p[0] + f0x * k; p[3] = p[1] + f0z * k; }
    else if (f0x * f1x + f0z * f1z < -.5) { const d = Math.max(4, Math.hypot(dx, dz)); p[2] = (p[0] + p[4]) / 2 + f0x * d; p[3] = (p[1] + p[5]) / 2 + f0z * d; }   // U-turn at a dead end
    else { p[2] = (p[0] + p[4]) / 2; p[3] = (p[1] + p[5]) / 2; }
    let L = 0, px = p[0], pz = p[1]; for (let k = 1; k <= 8; k++) { const t = k / 8, a = 1 - t, x = a * a * p[0] + 2 * a * t * p[2] + t * t * p[4], z = a * a * p[1] + 2 * a * t * p[3] + t * t * p[5]; L += Math.hypot(x - px, z - pz); px = x; pz = z; }
    c.tL = Math.max(1, L); c.tS = 0; c.turn = true;
  }
  const turnKind = c => { const [, s1] = trims(c.e, c.dir); lanePos(c.e, c.dir, s1, tmp); const ax = tmp.fx, az = tmp.fz; lanePos(c.next, c.nextDir, trims(c.next, c.nextDir)[0], tmp); const cr = ax * tmp.fz - az * tmp.fx, dt = ax * tmp.fx + az * tmp.fz; return dt > .8 ? 'S' : cr > 0 ? 'R' : 'L'; };
  function gate(c, n) {                             // may this car enter junction n now?
    if (n.dead) return true;
    if (light(n, c.e) !== 'g' && !(light(n, c.e) === 'y' && c.v > 6)) return false;
    const mine = turnKind(c);
    for (const o of n.occ) {
      if (o === c) continue;
      if (o.e === c.e && o.dir === c.dir) continue;                          // following the car ahead through
      const opp = o.e !== c.e && (o.fx * c.fx + o.fz * c.fz) < -.7, theirs = o.tk || 'S';
      if (opp && mine !== 'L' && theirs !== 'L') continue;                  // oncoming, nobody turning across
      if (mine === 'R' && theirs === 'R') continue;
      return false;
    }
    if (n.sig < 0) for (const o of cars) {                                   // unsignalled: yield to a car about to enter from a bigger road
      if (!o.on || o === c || o.turn || o.granted || endNode(o.e, o.dir) !== n || o.e === c.e) continue;
      if (o.e.rank > c.e.rank && trims(o.e, o.dir)[1] - o.s < 9 && o.v > .5) return false;
    }
    const [t0] = trims(c.next, c.nextDir);                                   // room on the exit lane
    for (const o of cars) if (o.on && !o.turn && o !== c && o.e === c.next && o.dir === c.nextDir && o.s - t0 < (c.dims[0] + o.dims[0]) / 2 + 1.5) return false;
    return true;
  }
  // ---------- spawn / despawn ----------
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere(new THREE.Vector3(), 5);
  const onScreen = (x, z) => { sph.center.set(x, 1, z); return frustum.intersectsSphere(sph); };
  const totalL = E.reduce((a, e) => a + e.L, 0);
  function trySpawn(c, cx, cz, minD, maxD) {
    for (let k = 0; k < 14; k++) {
      let r = Math.random() * totalL, e = E[0]; for (const ee of E) { r -= ee.L; if (r <= 0) { e = ee; break; } }
      const dir = Math.random() < .5 ? 1 : -1, [t0, t1] = trims(e, dir); if (t1 - t0 < 6) continue;
      const s = t0 + Math.random() * (t1 - t0); lanePos(e, dir, s, tmp); const d = Math.hypot(tmp.x - cx, tmp.z - cz);
      if (d < minD || d > maxD || onScreen(tmp.x, tmp.z)) continue;
      let clash = false; for (const o of cars) if (o.on && Math.hypot(o.x - tmp.x, o.z - tmp.z) < 14) { clash = true; break; } if (clash) continue;
      c.on = true; c.e = e; c.dir = dir; c.s = s; c.v0 = e.v * (.85 + Math.random() * .25) * ({ bus: .78, boxtruck: .82, garbage: .75, van: .92, coupe: 1.1 }[c.car.kind] || 1); c.v = c.v0 * .7; c.turn = false; c.granted = false; c.wait = 0; c.still = 0; c.off = 0; c.shock = 0; c.node = null; c.lat = c.latT = 0; c.kx = c.kz = c.ky = c.kvx = c.kvz = c.kw = 0;
      pickNext(c); place(c); c.g.visible = true; return true;
    }
    return false;
  }
  function despawn(c) { c.on = false; c.g.visible = false; if (c.node) { c.node.occ.delete(c); c.node = null; } c.col.cx = c.col.cz = 1e5; for (const p of c.col.poly) { p[0] = 1e5; p[1] = 1e5; } c.col.vx = c.col.vz = 0; }
  // ---------- per step ----------
  let spawnT = 0, first = true;
  function step(dt, ctx) {                          // ctx: { cx, cz (camera target), player: {x, z, vx, vz, th, L, W} | null, foot: {x, z} | null }
    if (TT.paused) return; clock += dt; updateBars();
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = .4;
      for (const c of cars) {
        if (!c.on) { if (trySpawn(c, ctx.cx, ctx.cz, first ? 25 : TT.spawnMin, first ? 90 : TT.spawnMax) && !first) break; continue; }
        const d = Math.hypot(c.x - ctx.cx, c.z - ctx.cz), vis = onScreen(c.x, c.z); c.off = vis ? 0 : c.off + .4;
        if ((d > TT.despawn && c.off >= TT.offscreenFor) || (c.still > 25 && !vis)) despawn(c);
      }
      first = false;
    }
    for (const c of cars) {
      if (!c.on) continue;
      const len = c.dims[0], hw = c.dims[1] / 2;
      // gap to the nearest thing ahead: other traffic, the player's car, the hero on foot (a cone test covers queues, crossing cars and the player)
      let gap = 1e9, vl = 0; c.blk = null;
      for (const o of cars) {
        if (!o.on || o === c || (c.turn && c.still > 4) || c.ghost > 0) continue;                // wedged in a box / deadlocked: creep through
        const dx = o.x - c.x, dz = o.z - c.z, f = dx * c.fx + dz * c.fz; if (f <= 0 || f > TT.lookAhead) continue;
        const l = Math.abs(dx * c.fz - dz * c.fx), side = hw + o.dims[1] / 2 + .4; if (l > side) continue;
        const sameWay = o.fx * c.fx + o.fz * c.fz; if (sameWay < -.3 && l > .8) continue;          // oncoming in the other lane
        if (c.granted && o.wait > 0 && !o.turn && sameWay < .5) continue;                         // a car queued on a side road is not in my path once I'm through the gate
        const g = f - (len + o.dims[0]) / 2; if (g < gap) { gap = g; vl = Math.max(0, o.v * sameWay); c.blk = o; }
      }
      const PL = ctx.others && ctx.others.length ? [ctx.player, ctx.foot, ...ctx.others] : [ctx.player, ctx.foot];     // others: the heroes driving themselves around (round 28)
      for (let pi = 0; pi < PL.length; pi++) {
        const p = PL[pi]; if (!p) continue; const dx = p.x - c.x, dz = p.z - c.z, f = dx * c.fx + dz * c.fz; if (f <= 0 || f > TT.lookAhead) continue;
        const l = Math.abs(dx * c.fz - dz * c.fx); if (l > hw + (p.W || .6) / 2 + .6) continue;
        const g = f - (len + (p.L || .6)) / 2; if (g < gap) { c.blk = pi === 1 ? 'foot' : 'player'; gap = g; vl = Math.max(0, (p.vx || 0) * c.fx + (p.vz || 0) * c.fz); }
      }
      if (ctx.peds) for (const w of ctx.peds) {                                                 // people crossing (or lying) in the road
        if (!w.on || !(w.inRoad || w.state === 'down' || w.state === 'getup' || w.state === 'flee')) continue;
        const dx = w.x - c.x, dz = w.z - c.z, f = dx * c.fx + dz * c.fz; if (f <= 0 || f > 16) continue;
        if (Math.abs(dx * c.fz - dz * c.fx) > hw + .9) continue; const g = f - len / 2 - .4; if (g < gap) { gap = g; vl = 0; c.blk = 'ped'; }
      }
      // the stop line: a virtual stopped car until the gate opens
      if (!c.turn) {
        const [, s1] = trims(c.e, c.dir), toEnd = s1 - c.s, n = endNode(c.e, c.dir);
        if (!c.granted && toEnd < 30) {
          if (gate(c, n) || c.wait > 9) { c.granted = true; c.tk = turnKind(c); n.occ.add(c); c.node = n; c.wait = 0; }
          else { const g = toEnd - .5; if (g < gap) { gap = g; vl = 0; c.blk = 'stop'; } if (toEnd < 3 && c.v < .5) c.wait += dt; }
        }
      }
      if (c.shock > 0) { c.shock -= dt; gap = 0; vl = 0; }
      // IDM
      const v0 = c.turn ? Math.min(c.v0, 7.5) : c.v0, dv = c.v - vl;
      const sStar = TT.gap0 + Math.max(0, c.v * TT.headway + c.v * dv / (2 * Math.sqrt(TT.amax * TT.brake)));
      let a = TT.amax * (1 - Math.pow(c.v / v0, 4) - (gap < 1e8 ? (sStar / Math.max(.3, gap)) ** 2 : 0));
      a = Math.max(-9, a); c.v = Math.max(0, c.v + a * dt); if (gap < .2 && c.v > 0) c.v = 0;
      c.still = c.v < .2 ? c.still + dt : 0; if (c.ghost > 0) c.ghost -= dt;
      if (c.still > 10 && c.ghost <= 0 && c.blk && typeof c.blk === 'object') {                // deadlock breaker: the chain of blockers does not end at a red light
        let o = c.blk, k = 0; while (o && typeof o === 'object' && o !== c && k++ < 12) o = o.blk;
        if (o !== 'stop') { c.ghost = 3; c.still = 0; }
      }
      // blocked mid-lane (a parked player, a crash): pull out to the left lane, pass, then move back
      if (!c.turn && c.still > 3 && c.wait === 0 && c.blk !== 'stop') {                       // first try the left, then the kerb side
        const [, s1] = trims(c.e, c.dir);
        if (s1 - c.s > 6) { c.latT = c.latT === 0 ? -Math.min(3.4, c.e.lane + 1.4) : c.latT < 0 && c.e.hw - c.e.lane > 2.6 ? Math.min(3.4, c.e.hw - c.e.lane - 1.0) : -c.latT * 1.3; c.passS = c.s; c.still = 0; }
      }
      if (c.latT !== 0 && (c.turn || c.s - c.passS > 16)) c.latT = 0;
      if (c.lat !== c.latT) { const st = 2.2 * dt; c.lat = Math.abs(c.latT - c.lat) < st ? c.latT : c.lat + Math.sign(c.latT - c.lat) * st; }
      // knocked by the player: shoved sideways and spun, then eases back into its lane
      if (c.kvx || c.kvz || c.kw || c.kx || c.kz || c.ky) {
        c.kx += c.kvx * dt; c.kz += c.kvz * dt; c.ky += c.kw * dt; const d = Math.exp(-3.2 * dt); c.kvx *= d; c.kvz *= d; c.kw *= d;
        if (Math.abs(c.kvx) + Math.abs(c.kvz) < .4) { const r = Math.exp(-.9 * dt); c.kx *= r; c.kz *= r; c.ky *= r; if (Math.abs(c.kx) + Math.abs(c.kz) + Math.abs(c.ky) < .02) c.kx = c.kz = c.ky = c.kvx = c.kvz = c.kw = 0; }
      }
      // move
      const ds = c.v * dt;
      if (c.turn) {
        c.tS += ds;
        if (c.tS >= c.tL) { c.turn = false; c.e = c.next; c.dir = c.nextDir; c.s = trims(c.e, c.dir)[0] + (c.tS - c.tL); if (c.node) { c.node.occ.delete(c); c.node = null; } c.granted = false; pickNext(c); }
      } else {
        c.s += ds; const [, s1] = trims(c.e, c.dir);
        if (c.s >= s1) { if (c.granted) { c.s = s1; startTurn(c); c.tS = 0; } else c.s = s1; }
      }
      place(c);
      // player contact: a hard hit stops the car for a moment
      if (ctx.player && c.shock <= 0 && Math.hypot(ctx.player.vx, ctx.player.vz) > 3 && Math.hypot(ctx.player.x - c.x, ctx.player.z - c.z) < (len + ctx.player.L) / 2 + .3) c.shock = 1.2;
      // pose + collider
      placeOnGround(c.g, c.x, c.z, c.yaw);
      const sh = Math.hypot(c.x - ctx.cx, c.z - ctx.cz) < 32; if (sh !== c.sh) { c.sh = sh; c.g.traverse(o => { if (o.isMesh) o.castShadow = sh; }); }
      const P = carPoly(c.x, c.z, c.yaw, c.dims); for (let k = 0; k < 4; k++) { if (!c.col.poly[k]) c.col.poly[k] = [0, 0]; c.col.poly[k][0] = P[k][0]; c.col.poly[k][1] = P[k][1]; }
      c.col.cx = c.x; c.col.cz = c.z; c.col.r = Math.hypot(c.dims[0], c.dims[1]) / 2 + .2; c.col.vx = c.fx * c.v + c.kvx; c.col.vz = c.fz * c.v + c.kvz;     // a knocked car carries its shove (a car shoved into you hits you)
    }
  }
  function take(c) {                               // carjacked: the car leaves the AI pool for good (the page makes it a player vehicle); a fresh car refills the pool
    if (c.node) { c.node.occ.delete(c); c.node = null; } const i = colliders.indexOf(c.col); if (i >= 0) colliders.splice(i, 1);
    cars.splice(cars.indexOf(c), 1); addCar(100 + Math.floor(Math.random() * 1000)); return { car: c.car, x: c.x, z: c.z, yaw: c.yaw };
  }
  return { cars, step, take, E, N, light, TT };
}
