// Roof rocket launcher (round 32, the Dave mission's first upgrade). launcher.glb rises out of a roof hatch, the turret tracks the nearest threat it can see,
// FIRE launches a homing rocket from the next tube, then a cooldown. The page supplies the car, the targets, the blast handler and the effects.
export const ROCKET = { cool: 6, range: 70, speed: 58, turn: 4.2, life: 2.2, radius: 6.5, deployT: .9 };

export function createLauncher(D) {
  const { THREE, scene, glb, camera, pushCircle, getCar, carHeight, targets, onBlast, fx } = D;
  const L = { root: null, car: null, k: 0, want: 0, yaw: 0, pitch: 0, cool: 0, target: null, scanT: 0, tube: 0, recoil: 0, parts: null };
  // ---------- the model, mounted on a car's roof ----------
  function attach(veh) {
    if (!glb) return false; const car = veh.car;
    if (!L.root) {
      L.root = glb.scene.clone(true); const P = {}; L.root.traverse(o => { P[o.name] = o; if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      L.parts = { hatchL: P.hatch_L, hatchR: P.hatch_R, lift: P.lift, yaw: P.yaw, pitch: P.pitch, muzzles: [0, 1, 2, 3].map(i => P['muzzle_' + i]) };
    }
    if (L.car !== car) { car.group.add(L.root); L.car = car; L.root.position.set(0, carHeight(car) - .12, .35); L.root.scale.setScalar(1.3); }
    return true;
  }
  function pose() {                                        // k 0..1: hatch flips open first, then the launcher rises
    const P = L.parts, h = Math.min(1, L.k / .45), r = Math.max(0, (L.k - .3) / .7), e = t => t * t * (3 - 2 * t);
    P.hatchL.rotation.z = e(h) * 2.2; P.hatchR.rotation.z = -e(h) * 2.2; P.lift.position.y = -.82 + .82 * e(r);
    P.yaw.rotation.y = L.yaw; P.pitch.rotation.x = L.pitch; P.pitch.position.z = L.recoil * .12;
    L.root.visible = L.k > .001;
  }
  // ---------- targets: the nearest threat in range with nothing solid in between ----------
  const v3 = new THREE.Vector3(), solidOnly = skip => B => !!B.mass || !!B.missile || !!B.water || B === skip;
  function clear(ax, az, bx, bz, skip) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.floor(d / 4); const f = solidOnly(skip);
    for (let i = 1; i < n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n, q = pushCircle(x, z, .6, f); if (Math.abs(q[0] - x) + Math.abs(q[1] - z) > .05) return false; }
    return true;
  }
  function scan(c) {
    let best = null, bd = ROCKET.range;
    for (const t of targets()) { const d = Math.hypot(t.x - c.x, t.z - c.z); if (d < bd && clear(c.x, c.z, t.x, t.z, t.col)) { bd = d; best = t; } }
    return best;
  }
  // ---------- rockets in flight (pool of 3) ----------
  const bodyGeo = new THREE.CylinderGeometry(.07, .07, .7, 8).rotateX(Math.PI / 2), tipGeo = new THREE.ConeGeometry(.07, .18, 8).rotateX(-Math.PI / 2).translate(0, 0, -.44), flameGeo = new THREE.ConeGeometry(.09, .5, 8).rotateX(Math.PI / 2).translate(0, 0, .6);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e2 }), tipMat = new THREE.MeshLambertMaterial({ color: 0xc8312a }), flameMat = new THREE.MeshBasicMaterial({ color: 0xffb040, toneMapped: false, transparent: true, opacity: .9 });
  const RK = [0, 1, 2].map(() => { const g = new THREE.Group(); g.add(new THREE.Mesh(bodyGeo, bodyMat), new THREE.Mesh(tipGeo, tipMat), new THREE.Mesh(flameGeo, flameMat)); g.visible = false; scene.add(g); return { g, on: false }; });
  function fire() {
    const c = getCar(); if (!c || L.k < .98 || L.cool > 0) return false;
    const r = RK.find(q => !q.on); if (!r) return false;
    const m = L.parts.muzzles[L.tube]; L.tube = (L.tube + 1) % 4; m.getWorldPosition(v3);
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(L.parts.pitch.getWorldQuaternion(new THREE.Quaternion())); dir.y = Math.max(-.05, Math.min(.12, dir.y)); dir.normalize();
    Object.assign(r, { on: true, t: 0, trail: 0, target: L.target, p: v3.clone(), v: dir.multiplyScalar(ROCKET.speed).add(new THREE.Vector3(c.vx, 0, c.vz)) });
    r.g.position.copy(r.p); r.g.visible = true; L.cool = ROCKET.cool; L.recoil = 1;
    fx.puff(v3.x, v3.y, v3.z, 1.1, 0xffe0a0, .12, 0, 8, true); fx.puff(v3.x, v3.y, v3.z, .9, 0xbdbdbd, .7, .4, 1.4); fx.sound('launch');
    return true;
  }
  function explode(x, y, z) {
    fx.puff(x, y + .8, z, 6, 0xfff0c0, .22, 0, 6, true); fx.puff(x, y + 1.2, z, 4, 0xff8a30, .35, 1.2, 3, true);
    for (let i = 0; i < 4; i++) fx.puff(x + (Math.random() - .5) * 3, y + .6 + Math.random(), z + (Math.random() - .5) * 3, 2 + Math.random() * 1.5, i % 2 ? 0x3a3532 : 0x6a625c, 1.6 + Math.random(), 1.6, .8);
    fx.debris(x, y + .8, z, 0, 0, 22, '#ff9a3a', 7, 6, 1.1); fx.debris(x, y + .6, z, 0, 0, 12, '#222222', 6, 5, 1.6);
    fx.sound('boom'); fx.shake(.9); onBlast(x, z, ROCKET.radius);
  }
  function rocketStep(dt) {
    const c = getCar();
    for (const r of RK) {
      if (!r.on) continue; r.t += dt;
      const t = r.target && r.target.alive() ? r.target : null;
      if (t) {                                             // homing: turn the velocity toward the target at ROCKET.turn rad/s
        const want = Math.atan2(t.x - r.p.x, t.z - r.p.z), sp = Math.hypot(r.v.x, r.v.z); let cur = Math.atan2(r.v.x, r.v.z), da = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
        cur += Math.max(-ROCKET.turn * dt, Math.min(ROCKET.turn * dt, da)); r.v.x = Math.sin(cur) * sp; r.v.z = Math.cos(cur) * sp; r.v.y += ((1.0 - r.p.y) * 3 - r.v.y) * Math.min(1, dt * 4);
      }
      r.p.addScaledVector(r.v, dt); r.g.position.copy(r.p); r.g.lookAt(r.p.x - r.v.x, r.p.y - r.v.y, r.p.z - r.v.z);
      r.trail -= dt; if (r.trail <= 0) { r.trail = .035; fx.puff(r.p.x, r.p.y, r.p.z, .45, 0xd8d4cc, .6, .3, 1.2); }
      let hit = r.t > ROCKET.life || r.p.y < .1;
      if (!hit) for (const q of targets()) if (Math.hypot(q.x - r.p.x, q.z - r.p.z) < 2.4) { hit = true; break; }
      if (!hit && r.t > .12) { const s = pushCircle(r.p.x, r.p.z, .3, B => B.missile || B.water || (c && B === c.col)); if (Math.abs(s[0] - r.p.x) + Math.abs(s[1] - r.p.z) > .05) hit = true; }
      if (hit) { r.on = false; r.g.visible = false; explode(r.p.x, Math.max(0, r.p.y - .8), r.p.z); }
    }
  }
  // ---------- per frame ----------
  function step(dt) {
    const c = getCar(); L.cool = Math.max(0, L.cool - dt); L.recoil = Math.max(0, L.recoil - dt * 5);
    if (L.want && c && c.car !== L.car) attach(c);
    if (L.root) {
      L.k += Math.sign(L.want - L.k) * Math.min(Math.abs(L.want - L.k), dt / ROCKET.deployT);
      if (c && L.car === c.car && L.k > .5) {
        L.scanT -= dt; if (L.scanT <= 0) { L.scanT = .25; L.target = scan(c); }
        let wy = 0, wp = .05;
        if (L.target && L.target.alive()) { v3.set(L.target.x, 1, L.target.z); L.car.group.worldToLocal(v3); wy = Math.atan2(-v3.x, -v3.z); wp = .06; } else L.target = null;
        const dy = Math.atan2(Math.sin(wy - L.yaw), Math.cos(wy - L.yaw)); L.yaw += Math.max(-5 * dt, Math.min(5 * dt, dy)); L.pitch += (wp - L.pitch) * Math.min(1, dt * 6);
      }
      pose();
    }
    rocketStep(dt);
  }
  function deploy(on) { L.want = on ? 1 : 0; if (on) { const c = getCar(); if (c) attach(c); fx.sound('servo'); } else L.target = null; }
  function reset() { L.want = 0; L.k = 0; L.target = null; L.cool = 0; for (const r of RK) { r.on = false; r.g.visible = false; } if (L.root) pose(); }
  return { step, fire, deploy, reset, get ready() { return L.k > .98 && L.cool <= 0; }, get cool() { return L.cool / ROCKET.cool; }, get target() { return L.target; }, get up() { return L.k > .98; }, get want() { return L.want; } };
}
