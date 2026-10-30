// Pedestrian AI: people walk the sidewalks of the traffic graph (both sides of every road), turn corners and cross at junctions,
// and react: dodge a car coming at them, get knocked down by the player's car, flee or freeze after a fight or a crash, and panic spreads.
// States: walk (calm) | flee | freeze | hit | down | getup (hit/down come from the punch code in index.html or from a car).
export const PT = { count: 24, walk: [1.1, 1.6], run: 4.3, spawnMin: 22, spawnMax: 50, despawn: 62, offscreenFor: 2, swk: 1.5, panicR: 14, spread: 1.6 };

export function createPeople(G, deps) {
  const { THREE, makePerson, play, scene, camera, pushCircle, onKnock } = deps;
  const N = G.nodes.map(n => ({ x: n.x, z: -n.y, r: n.r, dead: n.dead, out: [] }));
  const E = G.edges.map(e => { const P = e.pts.map(p => [p[0], -p[1]]), cum = [0]; for (let k = 1; k < P.length; k++) cum.push(cum[k - 1] + Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1])); return { a: e.a, b: e.b, P, cum, L: cum[cum.length - 1], off: e.hw + PT.swk }; });
  for (const e of E) { N[e.a].out.push(e); N[e.b].out.push(e); }
  const tmp = { x: 0, z: 0, fx: 0, fz: 0 };
  function side(e, u, sd, o) {                       // sidewalk point: centre-line at u (from node a) pushed sd * off to the right of a->b
    const c = e.cum, P = e.P; u = Math.max(0, Math.min(e.L, u)); let k = 1; while (k < c.length - 1 && c[k] < u) k++;
    const a = P[k - 1], b = P[k], l = c[k] - c[k - 1] || 1, t = (u - c[k - 1]) / l, fx = (b[0] - a[0]) / l, fz = (b[1] - a[1]) / l;
    o.fx = fx; o.fz = fz; o.x = a[0] + (b[0] - a[0]) * t - fz * e.off * sd; o.z = a[1] + (b[1] - a[1]) * t + fx * e.off * sd; return o;
  }
  const range = e => { let u0 = N[e.a].r + .8, u1 = e.L - N[e.b].r - .8; if (u1 - u0 < 1) { u0 = e.L * .4; u1 = e.L * .6; } return [u0, u1]; };
  // ---------- pool ----------
  const people = [];
  for (let i = 0; i < PT.count; i++) {
    const p = makePerson(); p.root.visible = false;
    people.push(Object.assign(p, { on: false, state: 'walk', st: 0, hp: 3, e: null, sd: 1, dir: 1, u: 0, cross: false, tx: 0, tz: 0, x: 0, z: 0, speed: 1.3, fleeT: 0, fx: 0, fz: 0, rejoin: false, off: { x: 0, z: 0 }, kb: { x: 0, z: 0 }, offT: 0, ph: i % 3, inRoad: false }));
  }
  function startCross(w, n, cameFrom) {             // pick the next sidewalk at junction n and walk straight to its start (crossing the road if it is on the other side)
    let opts = n.out.filter(e => e !== cameFrom); if (!opts.length) opts = n.out;
    const e = opts[Math.floor(Math.random() * opts.length)], atA = (n === N[e.a]), [u0, u1] = range(e), u = atA ? u0 : u1;
    let best = 1e9, bsd = 1;
    for (const sd of [1, -1]) { side(e, u, sd, tmp); const d = Math.hypot(tmp.x - w.x, tmp.z - w.z) + (Math.random() < .3 ? 6 : 0); if (d < best) { best = d; bsd = sd; } }   // usually the near corner, sometimes cross over
    side(e, u, bsd, tmp); w.e = e; w.sd = bsd; w.dir = atA ? 1 : -1; w.u = u; w.cross = true; w.tx = tmp.x; w.tz = tmp.z; w.nn = n;
  }
  function rejoin(w) {                              // after fleeing: walk to the nearest sidewalk
    let best = 1e9, be = null, bu = 0, bsd = 1;
    for (const e of E) { const [u0, u1] = range(e); for (let u = u0; u <= u1; u += 6) for (const sd of [1, -1]) { side(e, u, sd, tmp); const d = Math.hypot(tmp.x - w.x, tmp.z - w.z); if (d < best) { best = d; be = e; bu = u; bsd = sd; } } }
    if (!be) return; side(be, bu, bsd, tmp); w.e = be; w.sd = bsd; w.u = bu; w.dir = Math.random() < .5 ? 1 : -1; w.cross = true; w.tx = tmp.x; w.tz = tmp.z; w.nn = null;
  }
  // ---------- spawn ----------
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere(new THREE.Vector3(), 1.5);
  const onScreen = (x, z) => { sph.center.set(x, 1, z); return frustum.intersectsSphere(sph); };
  const totalL = E.reduce((a, e) => a + e.L, 0);
  function trySpawn(w, cx, cz, minD, maxD, allowVisible) {
    for (let k = 0; k < 10; k++) {
      let r = Math.random() * totalL, e = E[0]; for (const ee of E) { r -= ee.L; if (r <= 0) { e = ee; break; } }
      const [u0, u1] = range(e); if (u1 - u0 < 3) continue; const u = u0 + Math.random() * (u1 - u0), sd = Math.random() < .5 ? 1 : -1; side(e, u, sd, tmp);
      const d = Math.hypot(tmp.x - cx, tmp.z - cz); if (d < minD || d > maxD || (!allowVisible && onScreen(tmp.x, tmp.z))) continue;
      Object.assign(w, { y: 0, air: false, on: true, state: 'walk', st: 0, hp: 3, e, sd, dir: Math.random() < .5 ? 1 : -1, u, cross: false, x: tmp.x, z: tmp.z, speed: PT.walk[0] + Math.random() * (PT.walk[1] - PT.walk[0]), fleeT: 0, offT: 0, inRoad: false });
      w.kb.x = w.kb.z = 0; w.root.visible = true; play(w, 'walk', { timeScale: w.speed / 1.4 }); w.cur.time = Math.random(); return true;
    }
    return false;
  }
  function despawn(w) { w.on = false; w.root.visible = false; w.inRoad = false; }
  // ---------- reactions ----------
  function flee(w, fx, fz, t) {                     // run away from point (fx, fz)
    if (w.state === 'down' || w.state === 'getup' || w.state === 'hit') return;
    let dx = w.x - fx, dz = w.z - fz; const l = Math.hypot(dx, dz) || 1; w.fx = dx / l; w.fz = dz / l; w.fleeT = t; w.state = 'flee'; w.cross = false; play(w, 'run', { timeScale: 1.15 });
  }
  function panic(x, z, r = PT.panicR) {
    for (const w of people) {
      if (!w.on || w.state !== 'walk') continue; const d = Math.hypot(w.x - x, w.z - z); if (d > r) continue;
      if (Math.random() < .25) { w.state = 'freeze'; w.st = 0; w.fleeAt = [x, z]; w.freezeT = .8 + Math.random() * 1.6; play(w, 'idle', { fade: .1 }); }
      else flee(w, x, z, 5 + Math.random() * 4);
    }
  }
  function knock(w, vx, vz, sp) {                   // hit by a car
    w.state = 'down'; w.st = 0; w.hp = 0; const k = Math.min(9, sp * .55); const l = sp || 1; w.kb.x = vx / l * k + (Math.random() - .5) * 2; w.kb.z = vz / l * k + (Math.random() - .5) * 2;
    w.root.rotation.y = Math.atan2(-vx, -vz) + Math.PI; play(w, 'fall', { once: true, fade: .03 }); if (onKnock) onKnock(w, sp, vx, vz); panic(w.x, w.z, 12);
    if (sp > 10 && Math.random() < .45) {           // fake ragdoll: thrown up and tumbling, one bounce, then a slide
      w.air = true; w.vy = 2.6 + sp * .22; w.kb.x = vx / l * sp * .75; w.kb.z = vz / l * sp * .75; w.spx = (Math.random() < .5 ? -1 : 1) * (5 + Math.random() * 6); w.spz = (Math.random() - .5) * 8; w.bounced = false;
    }
  }
  // ---------- step ----------
  let spawnT = 0, first = true, frame = 0;
  function step(dt, ctx) {                          // ctx: { cx, cz, player: {x, z, vx, vz, L, W, th} | null }
    if (PT.paused) return; frame++;
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnT = .5;
      for (const w of people) {
        if (!w.on) { if (trySpawn(w, ctx.cx, ctx.cz, first ? 8 : PT.spawnMin, first ? 55 : PT.spawnMax, first) && !first) break; continue; }
        const vis = onScreen(w.x, w.z); w.offT = vis ? 0 : w.offT + .5;
        if (Math.hypot(w.x - ctx.cx, w.z - ctx.cz) > PT.despawn && w.offT >= PT.offscreenFor) despawn(w);
      }
      first = false;
    }
    const P = ctx.player, psp = P ? Math.hypot(P.vx, P.vz) : 0;
    for (const w of people) {
      if (!w.on) continue;
      w.st += dt;
      // the player's car: knocked down on contact, dodge when it is coming fast
      if (P && psp > 2.5 && w.state !== 'down' && w.state !== 'getup') {
        const dx = w.x - P.x, dz = w.z - P.z, fx = -Math.sin(P.th), fz = -Math.cos(P.th), f = dx * fx + dz * fz, l = dx * fz - dz * fx;
        if (Math.abs(f) < P.L / 2 + .35 && Math.abs(l) < P.W / 2 + .35) knock(w, P.vx, P.vz, psp);
        else if (w.state === 'walk' && psp > 6) { const ux = P.vx / psp, uz = P.vz / psp, ahead = dx * ux + dz * uz, lat = Math.abs(dx * uz - dz * ux); if (ahead > 0 && ahead < 9 && lat < 2.6) { const sgn = (dx * uz - dz * ux) > 0 ? 1 : -1; flee(w, w.x - uz * sgn * 3, w.z + ux * sgn * 3, 1.6); } }
      }
      if (w.state === 'hit') { if (w.st > .5) { flee(w, ctx.cx, ctx.cz, 6); } }
      else if (w.state === 'down') {
        if (w.air) {                                  // tumbling through the air
          w.y += w.vy * dt; w.vy -= 9.8 * dt; w.root.rotation.x += w.spx * dt; w.root.rotation.z += w.spz * dt; w.st = 0;
          if (w.y <= 0 && w.vy < 0) { w.y = 0; if (!w.bounced && w.vy < -3) { w.vy = -w.vy * .32; w.bounced = true; w.spx *= .4; w.spz *= .4; } else { w.air = false; w.vy = 0; w.root.rotation.x = 0; w.root.rotation.z = 0; w.kb.x *= .6; w.kb.z *= .6; } }
        }
        if (!w.air && w.st > 2.4) { w.state = 'getup'; w.st = 0; play(w, 'getup', { once: true, fade: .05 }); } }
      else if (w.state === 'getup') { if (w.st > 1.1) { w.hp = 3; w.state = 'walk'; flee(w, w.x - w.kb.x, w.z - w.kb.z, 6); } }
      else if (w.state === 'freeze') { if (w.st > w.freezeT) flee(w, w.fleeAt[0], w.fleeAt[1], 5); }
      else if (w.state === 'flee') {
        w.fleeT -= dt; let nx = w.x + w.fx * PT.run * dt, nz = w.z + w.fz * PT.run * dt;
        if ((frame + w.ph) % 3 === 0) { const q = pushCircle(nx, nz, .35); if (Math.abs(q[0] - nx) + Math.abs(q[1] - nz) > .02) { const a = Math.atan2(w.fz, w.fx) + (Math.random() < .5 ? 1 : -1) * 1.2; w.fx = Math.cos(a); w.fz = Math.sin(a); } nx = q[0]; nz = q[1]; }
        w.x = nx; w.z = nz; w.root.rotation.y = Math.atan2(-w.fx, -w.fz);
        for (const o of people) if (o.on && o.state === 'walk' && Math.abs(o.x - w.x) < 6 && Math.abs(o.z - w.z) < 6 && Math.random() < PT.spread * dt) flee(o, w.x - w.fx * 4, w.z - w.fz * 4, 4 + Math.random() * 3);   // panic spreads
        if (w.fleeT <= 0) { w.state = 'walk'; play(w, 'walk', { timeScale: w.speed / 1.4 }); rejoin(w); }
      } else {                                      // calm walk along the sidewalk graph
        if (w.cross) {
          const dx = w.tx - w.x, dz = w.tz - w.z, d = Math.hypot(dx, dz), st = w.speed * dt;
          if (d <= st) { w.x = w.tx; w.z = w.tz; w.cross = false; } else { w.x += dx / d * st; w.z += dz / d * st; w.root.rotation.y = Math.atan2(-dx, -dz); }
          w.inRoad = w.cross && (!w.nn || Math.hypot(w.x - w.nn.x, w.z - w.nn.z) < w.nn.r + .5);
        } else {
          w.inRoad = false; w.u += w.dir * w.speed * dt; const [u0, u1] = range(w.e);
          if (w.u > u1 || w.u < u0) { const n = w.dir > 0 ? N[w.e.b] : N[w.e.a]; if (n.dead) { w.dir = -w.dir; w.u = Math.max(u0, Math.min(u1, w.u)); } else startCross(w, n, w.e); }
          else { side(w.e, w.u, w.sd, tmp); w.x = tmp.x; w.z = tmp.z; w.root.rotation.y = Math.atan2(tmp.fx * w.dir, tmp.fz * w.dir) + Math.PI; }
        }
      }
      if (w.kb.x || w.kb.z) { w.x += w.kb.x * dt; w.z += w.kb.z * dt; const kd = Math.exp(-6 * dt); w.kb.x *= kd; w.kb.z *= kd; if (Math.abs(w.kb.x) + Math.abs(w.kb.z) < .02) w.kb.x = w.kb.z = 0; }
      w.root.position.set(w.x, w.y || 0, w.z);
    }
  }
  return { people, step, panic, knock, PT };
}
