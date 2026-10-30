// "Groceries for Dave": the showcase mission (round 29). Three.js coordinates (x east, z south), metres.
// Dave texts the group -> you pick Marc, Aaron or Chris (sky switch) -> drive to Publix, park, walk in -> three guys pick a fight -> grab the groceries ->
// back in your ride: one cop, then one more every 5 s up to 5 -> near Dave's house police cars come at you like missiles -> stop in Dave's driveway.
// Wasted or busted = mission failed, Retry restarts from the last checkpoint (the Publix lot). Built to be near impossible.
export const DAVE = {
  lot: [62.9, -49.0, Math.PI], door: [73.7, -64.6], house: [-171.7, -25.0],          // Publix lot (park here, facing out = south), Publix entrance, Dave's driveway on Banks Rd
  thugs: 3, thugSpeed: 3.4, thugHit: 7, thugEvery: 1.1,                               // fight: how many, run speed m/s, health lost per punch, seconds between punches
  copEvery: 5, copMax: 5,                                                             // getaway: one more cop every copEvery s up to copMax
  missileFrom: 160, missileSpeed: [34, 50], missileEvery: [1.7, .45], missileHurt: 18, missileMass: 3.0,   // final stretch: starts this far from the house; speed and gap from far to near; health per hit; mass vs your car
  reward: 1000,
};

export function createDave(D) {
  const { THREE, scene, makePerson, makeCar, play, walkers, colliders, carPoly, placeOnGround, banner, cops, graph, env } = D;
  // ---------- UI: phone chat, objective chip, retry card ----------
  const css = document.createElement('style'); css.textContent = `
#phone{position:fixed;inset:0;z-index:30;display:grid;place-items:center;background:rgba(5,8,12,.45);pointer-events:auto}
#phone[hidden]{display:none}
#phone .ph{width:min(330px,calc(100% - 32px));background:#f2f2f7;border-radius:28px;padding:14px 12px 16px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:15px/1.3 system-ui,-apple-system,sans-serif;color:#111;transform:translateY(20px);opacity:0;transition:.35s}
#phone.show .ph{transform:none;opacity:1}
#phone .hd{display:flex;align-items:center;gap:10px;padding:2px 6px 10px;border-bottom:1px solid #d8d8de;margin-bottom:10px}
#phone .hd img{width:44px;height:44px;border-radius:50%;object-fit:cover}
#phone .hd b{display:block;font-size:16px} #phone .hd small{color:#777}
#phone .msgs{display:grid;gap:8px;min-height:120px}
#phone .m{max-width:82%;padding:8px 12px;border-radius:18px;background:#e5e5ea;justify-self:start;animation:pop .3s}
#phone .m i{display:block;font-style:normal;font-size:11px;color:#666;margin-bottom:2px}
#phone .m.me{background:#0b84ff;color:#fff;justify-self:end} #phone .m.me i{color:#d6e9ff}
#phone .typing{justify-self:start;color:#888;font-size:13px;padding:2px 8px}
#phone .pick{margin-top:12px;text-align:center;font-size:13px;color:#555}
#phone .pick div{display:flex;justify-content:center;gap:14px;margin-top:8px}
#phone .pick button{all:unset;cursor:pointer;display:grid;justify-items:center;gap:4px;font-size:12px;color:#222}
#phone .pick img{width:56px;height:56px;border-radius:50%;object-fit:cover;border:3px solid #0b84ff}
@keyframes pop{from{transform:scale(.8);opacity:0}to{transform:none;opacity:1}}
#mfail{position:fixed;inset:0;z-index:30;display:grid;place-items:center;pointer-events:none}
#mfail[hidden]{display:none}
#mfail .c{pointer-events:auto;display:grid;gap:10px;justify-items:center;padding:18px 22px;border-radius:14px;background:rgba(12,16,22,.85);color:#fff;font:600 15px system-ui}
#mfail b{font:700 30px/1 var(--display,system-ui);letter-spacing:.08em;color:#ff5a4a;text-transform:uppercase}
#mfail button{all:unset;cursor:pointer;padding:12px 26px;border-radius:10px;background:#ffd23f;color:#111;font:700 16px system-ui}
#hurt{position:fixed;inset:0;z-index:2;pointer-events:none;box-shadow:inset 0 0 120px 40px rgba(220,0,0,.0);transition:box-shadow .15s}
#hurt.on{box-shadow:inset 0 0 120px 40px rgba(220,0,0,.55)}`;
  document.head.appendChild(css);
  const phone = document.createElement('div'); phone.id = 'phone'; phone.hidden = true; phone.innerHTML = `<div class="ph"><div class="hd"><img src="img/dave.jpg" alt=""><div><b>Dave</b><small>Group: Dave, Marc, Aaron, Chris</small></div></div><div class="msgs"></div><div class="pick" hidden>Who's going?<div></div></div></div>`;
  document.body.appendChild(phone);
  const fail = document.createElement('div'); fail.id = 'mfail'; fail.hidden = true; fail.innerHTML = `<div class="c"><b>Mission failed</b><span id="mf-why"></span><button id="mf-retry">Retry</button></div>`; document.body.appendChild(fail);
  const hurt = document.createElement('div'); hurt.id = 'hurt'; document.body.appendChild(hurt);
  const chip = document.getElementById('mission'); const msgs = phone.querySelector('.msgs'), pick = phone.querySelector('.pick');
  const wait = s => new Promise(r => setTimeout(r, s * 1000));
  const say = (who, text, me) => { const m = document.createElement('div'); m.className = 'm' + (me ? ' me' : ''); m.innerHTML = `<i>${who}</i>${text}`; msgs.appendChild(m); };
  const typing = async (who, s) => { const t = document.createElement('div'); t.className = 'typing'; t.textContent = who + ' is typing…'; msgs.appendChild(t); await wait(s); t.remove(); };
  const REPLIES = { marc: 'On it Dave. Jeep\'s warmed up 👍', aaron: 'Say less. Tesla\'s already backing out.', chris: 'Bike\'s faster. Be there in 10 🏍️' };
  const hurtFlash = () => { hurt.classList.add('on'); setTimeout(() => hurt.classList.remove('on'), 160); };

  // ---------- state ----------
  const S = { stage: 'off', t: 0, cops: 0, copT: 0, missT: 0, thugs: [], missiles: [], checkpoint: null, failed: false };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  function objective(text, sub = '') { chip.hidden = !text; if (text) chip.innerHTML = `<b>Groceries for Dave</b><span>${text}</span>${sub ? `<em>${sub}</em>` : ''}`; }
  const target = () => ({ toPublix: [DAVE.lot[0], -DAVE.lot[1]], park: [DAVE.lot[0], -DAVE.lot[1]], walkIn: [DAVE.door[0], -DAVE.door[1]], fight: null, grab: [DAVE.door[0], -DAVE.door[1]], back: null, chase: [DAVE.house[0], -DAVE.house[1]] })[S.stage] || null;   // minimap wants Blender x, y

  // ---------- intro: the group text ----------
  async function start() {
    if (S.stage !== 'off' && S.stage !== 'done') return; S.stage = 'intro'; msgs.innerHTML = ''; pick.hidden = true; phone.hidden = false; await wait(.05); phone.classList.add('show');
    await wait(.6); await typing('Dave', 1.2); say('Dave', 'Hey guys.. still having some issues and can\'t make it to the store.'); await wait(1.1);
    await typing('Dave', 1.0); say('Dave', 'Can you pick me up some groceries from Publix? 🙏'); await wait(.7);
    const row = pick.querySelector('div'); row.innerHTML = ''; pick.hidden = false;
    env.CHARS.forEach((C, i) => { const b = document.createElement('button'); b.innerHTML = `<img src="img/${C.id}.jpg" alt="">${C.name}`; b.onclick = () => choose(i); row.appendChild(b); });
  }
  async function choose(i) {
    const C = env.CHARS[i]; pick.hidden = true; phone.classList.remove('show'); await wait(.3); phone.hidden = true;
    if (env.cur !== i) { env.switchTo(i); await wait(2.7); }
    phone.hidden = false; await wait(.05); phone.classList.add('show'); await typing(C.name, 1.0); say(C.name, REPLIES[C.id] || 'On my way.', true); await wait(1.6);
    phone.classList.remove('show'); await wait(.3); phone.hidden = true; S.stage = 'toPublix'; objective('Drive to Publix'); banner('GROCERIES FOR DAVE');
  }

  // ---------- the fight ----------
  function spawnThugs() {
    const JK = ['#7a2f2a', '#2b2b30', '#5a5a62', '#8a4a7a'];
    for (let k = 0; k < DAVE.thugs; k++) {
      const w = makePerson({ jacket: JK[k % JK.length] }); const a = (k - (DAVE.thugs - 1) / 2) * .9;
      w.root.position.set(DAVE.door[0] + Math.sin(a) * 4, 0, DAVE.door[1] + 1.5 + Math.cos(a) * 2); w.root.visible = true;
      Object.assign(w, { thug: true, on: true, hp: 3, state: 'walk', st: 0, kb: { x: 0, z: 0 }, cool: .6 + k * .4, punchT: -1, speed: DAVE.thugSpeed });
      play(w, 'walk'); walkers.push(w); S.thugs.push(w);
    }
    banner('FIGHT!'); cops.lock(true);     // the fight must not call the police early: the chase is scripted
  }
  function thugStep(dt) {
    const F = env.foot, onFoot = env.hmode === 'foot'; let left = 0;
    for (const w of S.thugs) {
      const p = w.root.position; p.x += w.kb.x * dt; p.z += w.kb.z * dt; const kd = Math.exp(-6 * dt); w.kb.x *= kd; w.kb.z *= kd;
      if (w.state === 'down') continue; left++; w.st += dt;
      if (w.state === 'hit') { if (w.st > .5) { w.state = 'walk'; w.st = 0; } continue; }
      const dx = F.x - p.x, dz = F.z - p.z, d = Math.hypot(dx, dz); w.root.rotation.y = Math.atan2(-dx, -dz); w.cool -= dt;
      if (w.punchT >= 0) {                                     // mid-punch: lands at .3 s if you are still in reach
        w.punchT += dt; if (w.punchT > .3 && !w.landed) { w.landed = true; if (onFoot && d < 1.5) { env.hurt(DAVE.thugHit, dx / (d || 1), dz / (d || 1)); hurtFlash(); } }
        if (w.punchT > .7) { w.punchT = -1; w.cool = DAVE.thugEvery; play(w, 'idle'); } continue;
      }
      if (d > 1.15) { const s = Math.min(d - 1.0, w.speed * dt); p.x += dx / d * s; p.z += dz / d * s; if (w.cur !== w.act.run) play(w, 'run', { timeScale: .9 }); }
      else { if (w.cur === w.act.run) play(w, 'idle'); if (w.cool <= 0 && onFoot) { w.punchT = 0; w.landed = false; play(w, 'punch', { once: true, fade: .05 }); } }
    }
    return left;
  }
  function clearThugs() { for (const w of S.thugs) { scene.remove(w.root); w.on = false; const i = walkers.indexOf(w); if (i >= 0) walkers.splice(i, 1); } S.thugs = []; }

  // ---------- missiles: police cars fired at you ----------
  const MP = []; for (let i = 0; i < 6; i++) { const car = makeCar('police', '#f4f4f4'); car.group.visible = false; const col = { poly: [[1e5, 1e5], [1e5 + 1, 1e5], [1e5, 1e5 + 1]], cx: 1e5, cz: 1e5, r: 3, vx: 0, vz: 0, mass: 1, missile: true }; colliders.push(col); MP.push({ car, col, on: false }); }
  for (const m of MP) m.col.push = (dx, dz, dw) => { m.vx += dx * .2; m.vz += dz * .2; m.spin += dw * 4 + (Math.random() - .5) * 6; };
  function routeAhead(px, pz, tx, tz, ahead) {             // a point about `ahead` m along the road route from you toward the house
    if (!graph) return null; const N = graph.nodes; let a = 0, b = 0, ad = 1e18, bd = 1e18;
    N.forEach((n, i) => { const d1 = (n.x - px) ** 2 + (-n.y - pz) ** 2, d2 = (n.x - tx) ** 2 + (-n.y - tz) ** 2; if (d1 < ad) { ad = d1; a = i; } if (d2 < bd) { bd = d2; b = i; } });
    const dist_ = new Float64Array(N.length).fill(1e18), prev = new Int32Array(N.length).fill(-1), done = new Uint8Array(N.length); dist_[a] = 0;
    for (;;) { let u = -1, ud = 1e18; for (let i = 0; i < N.length; i++) if (!done[i] && dist_[i] < ud) { ud = dist_[i]; u = i; } if (u < 0 || u === b) break; done[u] = 1;
      graph.edges.forEach((e, k) => { const v = e.a === u ? e.b : e.b === u ? e.a : -1; if (v >= 0 && ud + e.L < dist_[v]) { dist_[v] = ud + e.L; prev[v] = k; } }); }
    const pts = []; let v = b; while (v !== a && prev[v] >= 0) { const e = graph.edges[prev[v]], P = (e.b === v ? e.pts.slice().reverse() : e.pts.slice()).map(q => [q[0], -q[1]]); pts.unshift(...P); v = e.a === v ? e.b : e.a; }
    let acc = 0, last = [px, pz]; for (const q of pts) { acc += Math.hypot(q[0] - last[0], q[1] - last[1]); last = q; if (acc >= ahead) return q; } return pts.length ? pts[pts.length - 1] : null;
  }
  function fire(P, k) {                                     // k: 0 far .. 1 at the house
    const m = MP.find(q => !q.on); if (!m) return; const sp = DAVE.missileSpeed[0] + (DAVE.missileSpeed[1] - DAVE.missileSpeed[0]) * k;
    let s = routeAhead(P.x, P.z, DAVE.house[0], DAVE.house[1], 55 + Math.random() * 20);
    if (!s || Math.hypot(s[0] - P.x, s[1] - P.z) < 30) { const a = P.th + (Math.random() - .5) * 2.2; s = [P.x - Math.sin(a) * 55, P.z - Math.cos(a) * 55]; }
    const d0 = Math.hypot(P.x - s[0], P.z - s[1]), lead = d0 / sp * .8, tx = P.x + P.vx * lead, tz = P.z + P.vz * lead, l = Math.hypot(tx - s[0], tz - s[1]) || 1;
    Object.assign(m, { on: true, x: s[0], z: s[1], vx: (tx - s[0]) / l * sp, vz: (tz - s[1]) / l * sp, t: 0, spin: 0, hit: false, th: Math.atan2(-(tx - s[0]), -(tz - s[1])), roll: 0 });
    m.col.mass = env.carMass * DAVE.missileMass; m.car.group.visible = true; env.sound('siren');
  }
  function missileStep(dt, P) {
    for (const m of MP) {
      if (!m.on) continue; m.t += dt; m.x += m.vx * dt; m.z += m.vz * dt; m.th += m.spin * dt; m.roll += m.spin * .3 * dt; m.spin *= Math.exp(-1.5 * dt);
      if (m.hit) { const k = Math.exp(-2.2 * dt); m.vx *= k; m.vz *= k; }
      const d = Math.hypot(m.x - P.x, m.z - P.z);
      if (!m.hit && d < 3.6 && env.hmode === 'driving') { m.hit = true; env.hurt(DAVE.missileHurt, (P.x - m.x) / (d || 1), (P.z - m.z) / (d || 1)); hurtFlash(); env.sound('crash'); }
      if (m.t > 4.5 || (m.hit && m.t > 2.5)) { m.on = false; m.car.group.visible = false; m.col.cx = m.col.cz = 1e5; for (const q of m.col.poly) { q[0] = 1e5; q[1] = 1e5; } m.col.vx = m.col.vz = 0; continue; }
      placeOnGround(m.car.group, m.x, m.z, m.th); m.car.group.rotation.z = m.roll;
      m.col.poly = carPoly(m.x, m.z, m.th, m.car.dims); m.col.cx = m.x; m.col.cz = m.z; m.col.r = 3; m.col.vx = m.vx; m.col.vz = m.vz;
    }
  }
  function clearMissiles() { for (const m of MP) { m.on = false; m.car.group.visible = false; m.col.cx = m.col.cz = 1e5; for (const q of m.col.poly) { q[0] = 1e5; q[1] = 1e5; } m.col.vx = m.col.vz = 0; } }

  // ---------- goal marker: a soft green column at the current goal, and a DAVE sign at the house ----------
  const geo = new THREE.CylinderGeometry(2.6, 2.6, 7, 24, 1, true).translate(0, 3.5, 0);
  const beacon = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x3fe07b, transparent: true, opacity: .38, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); beacon.visible = false; beacon.renderOrder = 5; scene.add(beacon);
  { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d'); g.fillStyle = '#1f6b3a'; g.fillRect(0, 0, 256, 96); g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 84); g.fillStyle = '#fff'; g.font = '700 54px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText("DAVE'S", 128, 50);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const sign = new THREE.Group(), post = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.6, .12), new THREE.MeshLambertMaterial({ color: 0x3a3a3a }));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .6), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false })); post.position.y = .8; board.position.y = 1.75; sign.add(post, board);
    sign.position.set(DAVE.house[0] + 3.2, 0, DAVE.house[1] + 1.5); scene.add(sign); }
  // ---------- step ----------
  function step(dt, P) {                                   // P: { x, z (three), vx, vz, th, speed, driving }
    if (S.stage === 'off' || S.stage === 'intro' || S.stage === 'done' || S.failed) return;
    if (env.respawning) { failMission(env.lastDeath === 'busted' ? 'Busted.' : 'Wasted.'); return; }
    const me = [P.x, P.z];
    if (S.stage === 'toPublix' && P.driving && dist(me, DAVE.lot) < 14) { S.stage = 'park'; objective('Park in the lot and get out', 'tap Exit'); }
    else if (S.stage === 'park' && env.hmode === 'foot') { S.stage = 'walkIn'; objective('Walk into Publix'); S.checkpoint = 'publix'; }
    else if (S.stage === 'walkIn' && env.hmode === 'foot' && dist(me, DAVE.door) < 12) { S.stage = 'fight'; spawnThugs(); }
    else if (S.stage === 'fight') { const left = thugStep(dt); objective('Some guys want a fight', `${left} left`); if (!left) { S.stage = 'grab'; objective('Grab the groceries', 'go in the door'); banner('GO IN'); } }
    else if (S.stage === 'grab' && env.hmode === 'foot' && dist(me, DAVE.door) < 2.6) { S.stage = 'back'; objective('Get back in your ride'); banner('GOT THE GROCERIES'); env.addMoney(0); thugStep(dt); }
    else if (S.stage === 'back' && P.driving) startChase();
    else if (S.stage === 'chase') {
      S.copT += dt; if (S.cops < DAVE.copMax && S.copT >= DAVE.copEvery) { S.copT = 0; S.cops++; cops.force(S.cops); banner(`${S.cops} COPS`); }
      const dh = dist(me, DAVE.house); objective('Get the groceries to Dave', `${Math.round(dh)} m`);
      if (dh < DAVE.missileFrom && P.driving) { const k = 1 - Math.max(0, dh - 25) / (DAVE.missileFrom - 25); S.missT -= dt; if (S.missT <= 0) { fire(P, k); S.missT = DAVE.missileEvery[0] + (DAVE.missileEvery[1] - DAVE.missileEvery[0]) * k; } }
      if (dh < 6 && P.speed < 3) win();
    }
    if (S.stage === 'grab' || S.stage === 'back') thugStep(dt);
    missileStep(dt, P);
    const tg = target(); beacon.visible = !!tg && S.stage !== 'fight'; if (tg) { const k = 1 + Math.sin(performance.now() / 300) * .06; beacon.position.set(tg[0], 0, -tg[1]); beacon.scale.set(S.stage === 'grab' || S.stage === 'walkIn' ? .5 : k, 1, S.stage === 'grab' || S.stage === 'walkIn' ? .5 : k); }
  }
  function restart() { clearThugs(); clearMissiles(); cops.force(0); cops.lock(false); cops.clear(); fail.hidden = true; phone.hidden = true; S.failed = false; S.stage = 'off'; S.checkpoint = null; objective(''); env.heal(); env.resetCar(); start(); }
  function startChase() { S.stage = 'chase'; S.cops = 1; S.copT = 0; S.missT = 0; S.checkpoint = 'chase'; cops.lock(true); cops.force(1); objective('Get the groceries to Dave'); banner('COPS!'); }
  function win() { S.stage = 'done'; cops.force(0); cops.lock(false); cops.clear(); clearMissiles(); clearThugs(); objective(''); env.addMoney(DAVE.reward); banner(`MISSION PASSED  +$${DAVE.reward}`);
    (async () => { await wait(1.5); msgs.innerHTML = ''; pick.hidden = true; phone.hidden = false; await wait(.05); phone.classList.add('show'); await typing('Dave', 1.0); say('Dave', 'YOU MADE IT?!? 😭 THANK YOU'); await wait(1.0); say(env.CHARS[env.cur].name, 'never again.', true); await wait(2.6); phone.classList.remove('show'); await wait(.3); phone.hidden = true; })(); }
  function failMission(why) {
    S.failed = true; cops.force(0); cops.lock(false); clearMissiles(); objective(''); fail.querySelector('#mf-why').textContent = why; setTimeout(() => { fail.hidden = false; }, 1600);
  }
  fail.querySelector('#mf-retry').onclick = () => {                 // retry from the last checkpoint
    fail.hidden = true; S.failed = false; clearMissiles(); cops.clear(); env.heal();
    if (S.checkpoint === 'chase') { clearThugs(); env.resetCar(DAVE.lot[0], DAVE.lot[1], DAVE.lot[2]); startChase(); }
    else if (S.checkpoint === 'publix') { clearThugs(); env.resetCar(DAVE.lot[0], DAVE.lot[1], DAVE.lot[2]); S.stage = 'park'; objective('Park in the lot and get out', 'tap Exit'); }
    else { env.resetCar(); S.stage = 'toPublix'; objective('Drive to Publix'); }
  };
  return { list: [], step, start, restart, refresh() {}, target, get active() { return S.stage !== 'off' && S.stage !== 'done' && !S.failed; }, get stage() { return S.stage; }, S };
}
