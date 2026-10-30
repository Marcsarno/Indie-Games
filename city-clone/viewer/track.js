// Test track (round 24): an empty lot far off the map (700 m east of the city) with the driving drills from the research brief.
// Painted drills: 1 straight + brake box, 3 easy slalom, 4 hard slalom, 5 figure eight, 6 drift circle. Walled drills: 7 hairpin, 8 city corner, 9 narrow alley, 10 wall scrape.
// Each timed drill has a start and a finish line: crossing the start resets it, crossing the finish prints time, wall hits, top speed, max slide and cones hit.
// Coordinates: three.js metres (x east, z south), local to the lot centre O.
const O = { x: 700, z: 0 };
export const PAD = { x: O.x - 200, z: O.z + 15, th: -Math.PI / 2 };      // start pad, facing east

export function createTrack(deps) {
  const { THREE, scene, addStatic, sat, carPoly, banner } = deps;
  const T = { active: false, log: [], back: null, built: false };
  const root = new THREE.Group(); root.visible = false; scene.add(root);
  const paint = new THREE.MeshBasicMaterial({ color: 0xf2efe6, toneMapped: false });
  const paintY = new THREE.MeshBasicMaterial({ color: 0xffd23f, toneMapped: false });
  const wallM = new THREE.MeshLambertMaterial({ color: 0xc9c2b4 });
  const coneM = new THREE.MeshLambertMaterial({ color: 0xff6a1a });
  const W = (x, z) => [O.x + x, O.z + z];
  const drills = [], cones = [];

  function line(x1, z1, x2, z2, w = .25, mat = paint) {                 // painted stripe on the ground
    const L = Math.hypot(x2 - x1, z2 - z1), m = new THREE.Mesh(new THREE.PlaneGeometry(L, w), mat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = -Math.atan2(z2 - z1, x2 - x1); const [x, z] = W((x1 + x2) / 2, (z1 + z2) / 2); m.position.set(x, .03, z); root.add(m);
  }
  function ring(cx, cz, r, w = .3) { const m = new THREE.Mesh(new THREE.RingGeometry(r - w / 2, r + w / 2, 72), paint); m.rotation.x = -Math.PI / 2; const [x, z] = W(cx, cz); m.position.set(x, .03, z); root.add(m); }
  function wall(x1, z1, x2, z2, th = .6, h = 1.2) {                     // solid wall: a box mesh + the same box as a collider
    const L = Math.hypot(x2 - x1, z2 - z1), ux = (x2 - x1) / L, uz = (z2 - z1) / L, nx = -uz * th / 2, nz = ux * th / 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(L, h, th), wallM); const [x, z] = W((x1 + x2) / 2, (z1 + z2) / 2); m.position.set(x, h / 2, z); m.rotation.y = -Math.atan2(uz, ux); root.add(m);
    addStatic([W(x1 + nx, z1 + nz), W(x2 + nx, z2 + nz), W(x2 - nx, z2 - nz), W(x1 - nx, z1 - nz)]);
  }
  function arcWall(cx, cz, r, a0, a1, n) { for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n, b = a0 + (a1 - a0) * (i + 1) / n; wall(cx + r * Math.cos(a), cz + r * Math.sin(a), cx + r * Math.cos(b), cz + r * Math.sin(b)); } }
  function block(pts, h = 1.2) {                                        // solid convex block (local points, x/z)
    const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1]))), g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, wallM); m.position.set(O.x, 0, O.z); root.add(m); addStatic(pts.map(p => W(p[0], p[1])));
  }
  function label(text, x, z, w = 18) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d');
    g.fillStyle = '#f2efe6'; g.font = '600 60px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 50);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 512), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2; const [px, pz] = W(x, z); m.position.set(px, .04, pz); root.add(m);
  }
  function cone(x, z, drill) {
    const g = new THREE.Group(), m = new THREE.Mesh(new THREE.ConeGeometry(.32, .75, 10).translate(0, .375, 0), coneM); g.add(m);
    const [px, pz] = W(x, z); g.position.set(px, 0, pz); root.add(g);
    const c = { g, x: px, z: pz, down: 0, ax: 0, az: 0, drill, poly: [[px - .3, pz - .3], [px + .3, pz - .3], [px + .3, pz + .3], [px - .3, pz + .3]] }; cones.push(c); return c;
  }
  function drill(name, start, finish, kind = '') { const d = { name, start: start.map((p, i) => i % 2 ? p + O.z : p + O.x), finish: finish.map((p, i) => i % 2 ? p + O.z : p + O.x), kind }; drills.push(d); return d; }
  const across = (x, z0, z1) => [x, z0, x, z1], acrossZ = (z, x0, x1) => [x0, z, x1, z];

  function build() {
    T.built = true;
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshLambertMaterial({ color: 0x5d9a3a })); grass.rotation.x = -Math.PI / 2; grass.position.set(O.x, -.02, O.z); grass.receiveShadow = true; root.add(grass);
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(440, 200), new THREE.MeshLambertMaterial({ color: 0x55585c })); lot.rotation.x = -Math.PI / 2; lot.position.set(O.x - 5, 0, O.z + 5); lot.receiveShadow = true; root.add(lot);
    // start pad
    line(-206, 9, -194, 9, .3, paintY); line(-206, 21, -194, 21, .3, paintY); line(-206, 9, -206, 21, .3, paintY); label('START', -200, 26, 12);
    // 1 straight 250 m (x -190..60 along z -75), markers every 25 m, then 2 brake box (60..140)
    line(-190, -79, 60, -79); line(-190, -71, 60, -71); for (let x = -190; x <= 60; x += 25) line(x, -79, x, -71, x === -190 || x === 60 ? .6 : .25, x === -190 || x === 60 ? paintY : paint);
    for (let x = 70; x <= 140; x += 10) line(x, -79, x, -71, .25); line(60, -79, 140, -79); line(60, -71, 140, -71); label('1 STRAIGHT 250 m', -150, -84); label('2 BRAKE BOX', 100, -84);
    drill('1 Straight', across(-190, -79, -71), across(60, -79, -71), 'straight');
    // 3 easy slalom: 8 cones 18 m apart (z -40)
    { const d = drill('3 Easy slalom', across(-180, -47, -33), across(-15, -47, -33)); for (let i = 0; i < 8; i++) cone(-160 + 18 * i, -40, d); line(-180, -47, -180, -33, .6, paintY); line(-15, -47, -15, -33, .6, paintY); label('3 EASY SLALOM', -100, -52); }
    // 4 hard slalom: 8 cones 12 m apart (z -10)
    { const d = drill('4 Hard slalom', across(-180, -17, -3), across(-55, -17, -3)); for (let i = 0; i < 8; i++) cone(-160 + 12 * i, -10, d); line(-180, -17, -180, -3, .6, paintY); line(-55, -17, -55, -3, .6, paintY); label('4 HARD SLALOM', -118, -22); }
    // 5 figure eight: circles radius 12, centres 26 apart; 6 drift circle radius 20, 4 m lane
    ring(10, -10, 12); ring(36, -10, 12); label('5 FIGURE EIGHT', 23, -28);
    ring(120, -20, 18); ring(120, -20, 22); label('6 DRIFT CIRCLE', 120, -48);
    // 7 hairpin: 8 m lanes, inner radius 3 (divider), outer wall radius 11
    block([[-172, 57], [-120, 57], ...Array.from({ length: 7 }, (_, i) => { const a = -Math.PI / 2 + Math.PI * (i + 1) / 8; return [-120 + 3 * Math.cos(a), 60 + 3 * Math.sin(a)]; }), [-120, 63], [-172, 63]]);
    wall(-175, 48.7, -120, 48.7); wall(-175, 71.3, -120, 71.3); arcWall(-120, 60, 11.3, -Math.PI / 2, Math.PI / 2, 10);
    drill('7 Hairpin', across(-168, 49, 57), across(-168, 63, 71)); line(-168, 49, -168, 57, .6, paintY); line(-168, 63, -168, 71, .6, paintY); label('7 HAIRPIN', -150, 42, 14);
    // 8 city corner: 8 m streets, inner corner radius 4, outer corner chamfered
    wall(-85, 45.7, -34, 45.7); wall(-34, 45.7, -31.7, 48); wall(-31.7, 48, -31.7, 95);
    block([[-85, 54], [-44, 54], ...Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + Math.PI / 2 * (i + 1) / 6; return [-44 + 4 * Math.cos(a), 58 + 4 * Math.sin(a)]; }), [-40, 58], [-40, 95], [-85, 95]]);
    drill('8 City corner', across(-80, 46, 54), acrossZ(90, -40, -32)); line(-80, 46, -80, 54, .6, paintY); line(-40, 90, -32, 90, .6, paintY); label('8 CITY CORNER', -62, 40, 14);
    // 9 narrow alley: 4 m wide, 40 m long
    wall(0, 72.7, 40, 72.7); wall(0, 77.3, 40, 77.3); drill('9 Narrow alley', across(-4, 73, 77), across(44, 73, 77)); line(-4, 73, -4, 77, .6, paintY); line(44, 73, 44, 77, .6, paintY); label('9 NARROW ALLEY', 20, 67, 14);
    // 10 wall scrape: 30 m walls at 10 and 30 degrees across a lane along z 55
    wall(95, 59.5, 95 + 30 * Math.cos(.1745), 59.5 - 30 * Math.sin(.1745)); wall(145, 62, 145 + 30 * Math.cos(.5236), 62 - 30 * Math.sin(.5236));
    line(80, 51, 185, 51); line(80, 59, 185, 59); drill('10 Wall scrape', across(80, 45, 65), across(185, 40, 70)); line(80, 45, 80, 65, .6, paintY); line(185, 40, 185, 70, .6, paintY); label('10 WALL SCRAPE 10° / 30°', 135, 38, 20);
  }

  // ---- runs ----
  let run = null, brake = null, last = null;
  const segX = (ax, az, bx, bz, cx, cz, dx, dz) => { const d = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx); if (Math.abs(d) < 1e-9) return false; const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / d, u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / d; return t >= 0 && t <= 1 && u >= 0 && u <= 1; };
  const crossed = (g, p, q) => segX(p[0], p[1], q[0], q[1], g[0], g[1], g[2], g[3]);
  const mph = v => Math.round(v * 2.237);
  function report(line) { T.log.push(line); if (T.log.length > 40) T.log.shift(); banner(line.split(':')[0].toUpperCase()); if (T.onLog) T.onLog(T.log); }
  function step(dt, c) {                                            // c: the player's car state (x, z, th, vx, vz, touches, slip, topSpeed); t: game time s
    if (!T.active || !c) return; const t = (T.t = (T.t || 0) + dt);
    const p = last || [c.x, c.z], q = [c.x, c.z]; last = q;
    const sp = Math.hypot(c.vx, c.vz);
    for (const d of drills) {
      if (crossed(d.start, p, q) && (!run || run.d !== d || t - run.t0 > 1)) { run = { d, t0: t, hits: c.touches || 0, top: 0, slip: 0, cones: 0, t90: 0 }; brake = null; for (const k of cones) if (k.drill === d && k.down) { k.down = 0; k.g.rotation.set(0, 0, 0); k.g.position.set(k.x, 0, k.z); } }
      else if (run && run.d === d && crossed(d.finish, p, q)) {
        const tt = t - run.t0; let s = `${d.name}: ${tt.toFixed(2)} s, wall hits ${(c.touches || 0) - run.hits}, top ${mph(run.top)} mph, max slide ${Math.round(run.slip)}°`;
        if (d.kind === 'straight') { s += run.t90 ? `, 90% of top speed at ${run.t90.toFixed(1)} s` : ', never reached 90% of top speed'; brake = { x: c.x, v: sp }; }
        if (run.cones) s += `, cones ${run.cones}`; report(s); run = null;
      }
    }
    if (run) { run.top = Math.max(run.top, sp); run.slip = Math.max(run.slip, c.slip || 0); if (!run.t90 && run.d.kind === 'straight' && sp >= .9 * c.topSpeed) run.t90 = t - run.t0; }
    if (brake && sp < .3) { report(`2 Brake box: from ${mph(brake.v)} mph stopped in ${(c.x - brake.x).toFixed(1)} m`); brake = null; }
    const P = carPoly(c.x, c.z, c.th, c.car && c.car.dims);
    for (const k of cones) {
      if (k.down) { if (k.down < 1) { k.down = Math.min(1, k.down + dt / .4); k.g.rotation.set(k.ax * k.down * 1.5, 0, k.az * k.down * 1.5); } continue; }
      if (Math.abs(k.x - c.x) > 4 || Math.abs(k.z - c.z) > 4 || !sat(P, k.poly)) continue;
      k.down = .01; const u = sp > .1 ? 1 / sp : 0; k.ax = c.vz * u; k.az = -c.vx * u; k.g.position.x += c.vx * .08; k.g.position.z += c.vz * .08;
      c.vx *= .96; c.vz *= .96; if (run && run.d === k.drill) run.cones++;
    }
  }
  T.enter = () => { if (!T.built) build(); root.visible = true; T.active = true; run = brake = last = null; };
  T.leave = () => { root.visible = false; T.active = false; run = brake = last = null; };
  T.step = step;
  return T;
}
