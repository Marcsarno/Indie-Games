// "Groceries for Dave": the showcase mission (round 29). Three.js coordinates (x east, z south), metres.
// Dave texts the group -> you pick Marc, Aaron or Chris (sky switch) -> drive to Publix, park, walk in -> three guys pick a fight -> grab the groceries ->
// back in your ride: one cop, then one more every 5 s up to 5 -> near Dave's house police cars come at you like missiles -> stop in Dave's driveway.
// Wasted or busted = mission failed, Retry restarts from the last checkpoint (the Publix lot). Built to be near impossible.
export const DAVE = {
  lot: [62.9, -49.0, Math.PI], door: [73.7, -64.6], house: [-168.2, -20.5], houseYaw: Math.PI,          // Publix lot (park here, facing out = south), Publix entrance, Dave's driveway on Banks Rd (the house is built by dave_house() in coconut_scene.py)
  thugs: 3, thugSpeed: 3.4, thugHit: 7, thugEvery: 1.1,                               // fight: how many, run speed m/s, health lost per punch, seconds between punches
  copEvery: 8, copMax: 5,                                                             // getaway: one more ordinary cop every copEvery s up to copMax
  // "rocket" police cars. Heat goes 0 -> 1 with how close you are to Dave's (70 %) and how long the chase has run (rampTime s gives the other 40 %).
  rampTime: 60, rocketFrom: .12,                                                      // they start once heat passes rocketFrom
  rocketSpeed: [20, 54], rocketEvery: [4.0, .4], rocketMax: [1, 7],                   // top speed m/s, seconds between launches, how many at once: from low heat to full heat
  rocketGrip: [14, 12], cutIn: .55,                                                    // sideways grip m/s2 (less = wider turns and drifts); above cutIn heat they leave the road route and come straight at you when nothing is in the way
  rocketHurt: [12, 22], missileMass: 3.0,                                             // health per hit (low to full heat); weight against your car
  // roadblocks set up when the chase starts: Dave's street is shut at the east end and Coconut Creek Pkwy is shut, so the way in is the long loop round the north
  // and the only gap is one car wide at the west end of Banks Rd. road + the edge end nearest `end` (three x, z), `at` m in from that end, gap width m (0 = solid)
  blocks: [{ road: 'Banks Rd', end: [-125.0, -29.7], at: 14, gap: 0 }, { road: 'Coconut Creek Pkwy', end: [-125.9, -0.8], at: 14, gap: 0, other: [-193.5, 0.4] }, { road: 'Banks Rd', end: [-193.5, 0.4], at: 18, gap: 3.4 }],
  reward: 1000,
};

export function createDave(D) {
  const { THREE, scene, makePerson, makeCar, play, walkers, colliders, carPoly, placeOnGround, banner, cops, graph, env, pushCircle, burst } = D;
  // ---------- UI: phone chat, objective chip, retry card ----------
  const css = document.createElement('style'); css.textContent = `
#phone{position:fixed;left:10px;top:calc(96px + env(safe-area-inset-top,0px));z-index:30;pointer-events:none}
#phone[hidden]{display:none}
#phone .ph{pointer-events:auto;width:min(250px,62vw);background:rgba(242,242,247,.96);border-radius:24px;padding:10px 10px 12px;box-shadow:0 10px 30px rgba(0,0,0,.5);font:14px/1.28 system-ui,-apple-system,sans-serif;color:#111;transform:translateX(-30px);opacity:0;transition:.35s}
#phone.show .ph{transform:none;opacity:1}
#phone .hd{display:flex;align-items:center;gap:10px;padding:2px 6px 10px;border-bottom:1px solid #d8d8de;margin-bottom:10px}
#phone .hd img{width:38px;height:38px;border-radius:50%;object-fit:cover}
#phone .hd b{display:block;font-size:16px} #phone .hd small{color:#777}
#phone .msgs{display:grid;gap:6px;min-height:60px}
#phone .m{max-width:88%;padding:7px 11px;border-radius:18px;background:#e5e5ea;justify-self:start;animation:pop .3s}
#phone .m i{display:block;font-style:normal;font-size:11px;color:#666;margin-bottom:2px}
#phone .m.me{background:#0b84ff;color:#fff;justify-self:end} #phone .m.me i{color:#d6e9ff}
#phone .typing{justify-self:start;color:#888;font-size:13px;padding:2px 8px}
#phone .pick{margin-top:12px;text-align:center;font-size:13px;color:#555}
#phone .pick div{display:flex;justify-content:center;gap:10px;margin-top:8px}
#phone .pick button{all:unset;cursor:pointer;display:grid;justify-items:center;gap:4px;font-size:12px;color:#222}
#phone .pick img{width:50px;height:50px;border-radius:50%;object-fit:cover;border:3px solid #0b84ff}
@keyframes pop{from{transform:scale(.8);opacity:0}to{transform:none;opacity:1}}
#mfail{position:fixed;inset:0;z-index:30;display:grid;place-items:center;pointer-events:none}
#mfail[hidden]{display:none}
#mfail .c{pointer-events:auto;display:grid;gap:10px;justify-items:center;padding:18px 22px;border-radius:14px;background:rgba(12,16,22,.85);color:#fff;font:600 15px system-ui}
#mfail b{font:700 30px/1 var(--display,system-ui);letter-spacing:.08em;color:#ff5a4a;text-transform:uppercase}
#mfail button{all:unset;cursor:pointer;padding:12px 26px;border-radius:10px;background:#ffd23f;color:#111;font:700 16px system-ui}
#hurt{position:fixed;inset:0;z-index:2;pointer-events:none;box-shadow:inset 0 0 120px 40px rgba(220,0,0,.0);transition:box-shadow .15s}
#hurt.on{box-shadow:inset 0 0 120px 40px rgba(220,0,0,.55)}
#phone .skip{all:unset;cursor:pointer;margin-left:auto;padding:5px 10px;border-radius:12px;background:#dcdce2;color:#333;font:600 12px system-ui}
#phone .skip[hidden]{display:none}
#mfail small{color:#cfd3da;font:500 13px system-ui;letter-spacing:.04em}
.warn{position:fixed;left:0;top:0;z-index:4;width:0;height:0;pointer-events:none;display:none}
.warn i{position:absolute;left:-22px;top:-20px;width:0;height:0;border-left:22px solid transparent;border-right:22px solid transparent;border-bottom:40px solid #ff2b2b;filter:drop-shadow(0 0 8px #ff2b2b) drop-shadow(0 0 2px #fff);animation:wblink .18s steps(2) infinite}
@keyframes wblink{50%{opacity:.45}}`;
  document.head.appendChild(css);
  const phone = document.createElement('div'); phone.id = 'phone'; phone.hidden = true; phone.innerHTML = `<div class="ph"><div class="hd"><img src="img/dave.jpg" alt=""><div><b>Dave</b><small>Marc, Aaron, Chris</small></div><button class="skip" hidden>Skip ›</button></div><div class="msgs"></div><div class="pick" hidden>Who's going?<div></div></div></div>`;
  document.body.appendChild(phone);
  const fail = document.createElement('div'); fail.id = 'mfail'; fail.hidden = true; fail.innerHTML = `<div class="c"><b>Mission failed</b><span id="mf-why"></span><small id="mf-try"></small><button id="mf-retry">Retry</button></div>`; document.body.appendChild(fail);
  const hurt = document.createElement('div'); hurt.id = 'hurt'; document.body.appendChild(hurt);
  const chip = document.getElementById('mission'); const msgs = phone.querySelector('.msgs'), pick = phone.querySelector('.pick');
  const wait = s => new Promise(r => setTimeout(r, s * 1000));
  const say = (who, text, me) => { const m = document.createElement('div'); m.className = 'm' + (me ? ' me' : ''); m.innerHTML = `<i>${who}</i>${text}`; msgs.appendChild(m); };
  const typing = async (who, s) => { const tok = S.run; const t = document.createElement('div'); t.className = 'typing'; t.textContent = who + ' is typing…'; msgs.appendChild(t); await wait(s); t.remove(); if (tok !== S.run) for (const x of msgs.querySelectorAll('.typing')) x.remove(); };
  const REPLIES = { marc: 'On it Dave. Jeep\'s warmed up 👍', aaron: 'Say less. Tesla\'s already backing out.', chris: 'Bike\'s faster. Be there in 10 🏍️' };
  const hurtFlash = () => { hurt.classList.add('on'); setTimeout(() => hurt.classList.remove('on'), 160); };

  let tries = 0; try { tries = +localStorage.getItem('gtcc-dave-tries') || 0; } catch (e) { /* ok */ }          // failed attempts so far (kept until you deliver)
  const saveTries = () => { try { localStorage.setItem('gtcc-dave-tries', String(tries)); } catch (e) { /* ok */ } };
  // ---------- state ----------
  const S = { run: 0, cpNear: null, stopSaid: false, stage: 'off', t: 0, cops: 0, copT: 0, missT: 0, heat: 0, d0: 1, thugs: [], missiles: [], checkpoint: null, failed: false };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  function objective(text, sub = '') { chip.hidden = !text; if (text) chip.innerHTML = `<b>Groceries for Dave</b><span>${text}</span>${sub ? `<em>${sub}</em>` : ''}`; }
  const target = () => ({ toPublix: [DAVE.lot[0], -DAVE.lot[1]], park: [DAVE.lot[0], -DAVE.lot[1]], walkIn: [DAVE.door[0], -DAVE.door[1]], fight: null, grab: [DAVE.door[0], -DAVE.door[1]], back: null, chase: [DAVE.house[0], -DAVE.house[1]] })[S.stage] || null;   // minimap wants Blender x, y

  // ---------- intro: the group text ----------
  // the camera while Dave texts: over the city, a slow pan across the front of Publix, then his house and driveway (index.html's cine(): look point a -> b, yaw y0 -> y1)
  const SHOTS = {
    city: { a: [10, -30], b: [45, -52], y0: .3, y1: .1, pitch: 38, d0: 110, d1: 95, dur: 4 },
    publix: { a: [DAVE.door[0] - 16, DAVE.door[1] - 7], b: [DAVE.door[0] + 12, DAVE.door[1] - 8], y0: -.45, y1: .35, pitch: 24, d0: 42, d1: 34, dur: 7 },
    house: { a: [DAVE.house[0] + 5, DAVE.house[1] + 3], b: [DAVE.house[0] + 2, DAVE.house[1] + 3], y0: DAVE.houseYaw - .3, y1: DAVE.houseYaw + .1, pitch: 34, d0: 27, d1: 23, dur: 6 },
  };
  const INTRO = [['Dave', 'Hey guys.. still having some issues and can\'t make it to the store.'], ['Dave', 'Can you pick me up some groceries from Publix? 🙏'], ['Dave', 'I\'m home on Banks Rd. Pull right into the driveway 🏠']];
  const skipBtn = phone.querySelector('.skip');
  function showPick() {
    skipBtn.hidden = true; const row = pick.querySelector('div'); row.innerHTML = ''; pick.hidden = false;
    env.CHARS.forEach((C, i) => { const b = document.createElement('button'); b.innerHTML = `<img src="img/${C.id}.jpg" alt="">${C.name}`; b.onclick = () => choose(i); row.appendChild(b); });
  }
  function skipIntro() {                                   // tap the screen (or Skip) during the texts: all of them at once, straight to "Who's going?"
    if (S.stage !== 'intro' || !pick.hidden) return; S.run++; msgs.innerHTML = ''; for (const [w, t] of INTRO) say(w, t);
    phone.hidden = false; phone.classList.add('show'); env.cine([{ ...SHOTS.house, dur: .01 }]); showPick();
  }
  skipBtn.onclick = skipIntro; document.getElementById('view').addEventListener('pointerdown', () => { if (S.stage === 'intro') skipIntro(); });
  async function start() {
    if (S.stage !== 'off' && S.stage !== 'done') return; S.stage = 'intro'; msgs.innerHTML = ''; pick.hidden = true; const tok = ++S.run, gone = () => tok !== S.run;
    env.cine([SHOTS.city]); await wait(.8); if (gone()) return; phone.hidden = false; skipBtn.hidden = false; await wait(.05); phone.classList.add('show');
    await wait(.4); await typing('Dave', 1.0); if (gone()) return; say(...INTRO[0]); await wait(.6); if (gone()) return;
    env.cine([SHOTS.publix]); await typing('Dave', 1.2); if (gone()) return; say(...INTRO[1]); await wait(3.6); if (gone()) return;
    env.cine([SHOTS.house]); await typing('Dave', .8); if (gone()) return; say(...INTRO[2]); await wait(1.6); if (gone()) return;
    showPick();
  }
  async function choose(i) {
    const C = env.CHARS[i]; pick.hidden = true; phone.classList.remove('show'); env.cineStop(); await wait(.3); phone.hidden = true;
    if (env.cur !== i) { env.switchTo(i); await wait(2.7); }
    phone.hidden = false; await wait(.05); phone.classList.add('show'); await typing(C.name, .8); say(C.name, REPLIES[C.id] || 'On my way.', true); await wait(1.6);
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

  // ---------- rocket cops: police cars that drive the roads at you, faster and wilder as the heat rises ----------
  // Low heat: they follow the road route and slow for corners. High heat: top speed, little grip (they turn badly and drift), no braking for corners,
  // and they cut straight at you across lots when nothing solid is in the way. They never pass through buildings: walls stop them, hard hits spin them out.
  const GN = graph ? graph.nodes.map(n => ({ x: n.x, z: -n.y, adj: [] })) : [];
  if (graph) graph.edges.forEach((e, k) => { const P = e.pts.map(q => [q[0], -q[1]]), A = { n: e.b, P, L: e.L, k }, B = { n: e.a, P: P.slice().reverse(), L: e.L, k }; GN[e.a].adj.push(A); GN[e.b].adj.push(B); });
  const SHUT = new Set();                                // edges with a solid roadblock (while the chase runs): routes avoid them
  const nearestNode = (x, z) => { let b = 0, bd = 1e18; for (let i = 0; i < GN.length; i++) { const d = (GN[i].x - x) ** 2 + (GN[i].z - z) ** 2; if (d < bd) { bd = d; b = i; } } return b; };
  const gd = new Float64Array(GN.length), gprev = new Int32Array(GN.length), gpe = new Array(GN.length), gdone = new Uint8Array(GN.length);
  function route(a, b) {
    gd.fill(1e18); gprev.fill(-1); gdone.fill(0); gd[a] = 0;
    for (;;) { let u = -1, ud = 1e18; for (let i = 0; i < GN.length; i++) if (!gdone[i] && gd[i] < ud) { ud = gd[i]; u = i; } if (u < 0 || u === b) break; gdone[u] = 1;
      for (const ed of GN[u].adj) { const L = ed.L + (SHUT.has(ed.k) ? 1e4 : 0); if (ud + L < gd[ed.n]) { gd[ed.n] = ud + L; gprev[ed.n] = u; gpe[ed.n] = ed; } } }
    const ch = []; let v = b; while (v !== a && gprev[v] >= 0) { ch.push(gpe[v]); v = gprev[v]; } const pts = []; for (let k = ch.length - 1; k >= 0; k--) for (const q of ch[k].P) pts.push(q); return pts;
  }
  const GE = graph ? graph.edges.map((e, k) => ({ a: e.a, b: e.b, k, P: e.pts.map(q => [q[0], -q[1]]) })) : [], CLOSED = new Map();     // CLOSED: edge -> the end node a solid roadblock sits at
  function routeTo(x, z, px, pz) {                       // road route from (x, z) to the road point nearest (px, pz): node route + the last stretch of that street
    let be = null, bj = 0, bd = 1e18; for (const e of GE) for (let j = 0; j < e.P.length; j++) { const d = (e.P[j][0] - px) ** 2 + (e.P[j][1] - pz) ** 2; if (d < bd) { bd = d; be = e; bj = j; } }
    const s = nearestNode(x, z); if (!be) return route(s, nearestNode(px, pz));
    const ra = route(s, be.a), la = gd[be.a] + bj + (CLOSED.get(be.k) === be.a ? 1e4 : 0), rb = route(s, be.b), lb = gd[be.b] + (be.P.length - bj) + (CLOSED.get(be.k) === be.b ? 1e4 : 0);
    return la <= lb ? ra.concat(be.P.slice(0, bj + 1)) : rb.concat(be.P.slice(bj).reverse());
  }
  const lerp = (a, k) => a[0] + (a[1] - a[0]) * k, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const barGeo = new THREE.BoxGeometry(.5, .18, .3), RK = [];
  for (let i = 0; i < 8; i++) {
    const car = makeCar('police', '#f4f4f4'); car.group.visible = false;
    const bar = [0, 1].map(j => { const b = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: j ? 0x2b6bff : 0xff2b2b, toneMapped: false })); b.position.set(j ? .35 : -.35, car.dims[3] || 1.75, 0); car.group.add(b); return b; });
    const col = { poly: [[1e5, 1e5], [1e5 + 1, 1e5], [1e5, 1e5 + 1], [1e5, 1e5 + 2]], cx: 1e5, cz: 1e5, r: 3, vx: 0, vz: 0, mass: 1, missile: true }; colliders.push(col);
    const r = { car, bar, col, on: false }; col.push = (dx, dz, dw) => { r.vx += dx * .2; r.vz += dz * .2; r.spin += dw * 4 + (Math.random() - .5) * 6; }; RK.push(r);
  }
  function blocked(ax, az, bx, bz, skip) {               // anything solid on the straight line from a to b? (samples every 3.5 m)
    const L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / 3.5), stop = Math.max(0, (L - 5) / L);       // stops 5 m short of b (your own car is there)
    for (let i = 1; i < n; i++) { const f = i / n; if (f > stop) break; const x = ax + (bx - ax) * f, z = az + (bz - az) * f, q = pushCircle(x, z, .9, skip); if (Math.abs(q[0] - x) + Math.abs(q[1] - z) > .05) return true; }
    return false;
  }
  function launch(P, k, onScreen) {
    const r = RK.find(q => !q.on); if (!r || !GN.length) return;
    const sp = Math.hypot(P.vx, P.vz), ux = sp > 2 ? P.vx / sp : -Math.sin(P.th), uz = sp > 2 ? P.vz / sp : -Math.cos(P.th), late = k >= DAVE.cutIn;
    const way = late ? null : routeTo(P.x, P.z, DAVE.house[0], DAVE.house[1]), onWay = (x, z) => { if (!way) return 0; for (let j = 0; j < way.length; j += 2) if (Math.abs(way[j][0] - x) + Math.abs(way[j][1] - z) < 14) return 1; return 0; };
    const cand = [];
    for (let i = 0; i < GN.length; i++) {                // a road node off-screen: ahead of you early (they come down the road at you), from the sides late, where the line to you is clear
      const dx = GN[i].x - P.x, dz = GN[i].z - P.z, d = Math.hypot(dx, dz); if (d < (late ? 40 : 65) || d > (late ? 85 : 125) || onScreen(GN[i].x, GN[i].z)) continue;
      const fwd = (dx * ux + dz * uz) / d; cand.push([(late ? 1 - Math.abs(fwd) * .6 : fwd + onWay(GN[i].x, GN[i].z) * 1.5) + Math.random() * (late ? 1.2 : .5), i]);
    }
    cand.sort((a, b) => b[0] - a[0]); let best = cand.length ? cand[0][1] : -1;
    if (late) for (const [, i] of cand.slice(0, 8)) if (!blocked(GN[i].x, GN[i].z, P.x, P.z, null)) { best = i; break; }
    if (best < 0) return; const n = GN[best];
    const path = routeTo(n.x, n.z, P.x, P.z); let aim = [P.x, P.z];                  // start pointed along the road (or at you, when the line is clear)
    if (!(late && !blocked(n.x, n.z, P.x, P.z, null))) for (const q of path) if (Math.hypot(q[0] - n.x, q[1] - n.z) > 8) { aim = q; break; }
    const th = Math.atan2(-(aim[0] - n.x), -(aim[1] - n.z)), v0 = lerp(DAVE.rocketSpeed, k) * .5;
    Object.assign(r, { on: true, x: n.x, z: n.z, th, vx: -Math.sin(th) * v0, vz: -Math.cos(th) * v0, spin: 0, roll: 0, t: 0, hit: false, crash: 0, near: 1e9, path, pi: 0, repath: 1.2, los: false, losT: 0, k });
    r.col.mass = env.carMass * DAVE.missileMass; r.car.group.visible = true; r.car.setDamage && r.car.setDamage(0);
  }
  function park(r) { r.on = false; r.car.group.visible = false; r.col.cx = r.col.cz = 1e5; for (const q of r.col.poly) { q[0] = 1e5; q[1] = 1e5; } r.col.vx = r.col.vz = 0; }
  function rocketStep(dt, P, k) {
    const flash = Math.floor(performance.now() / 160) % 2;
    for (const r of RK) {
      if (!r.on) continue; r.t += dt; r.k = Math.max(r.k, k);
      const dx = P.x - r.x, dz = P.z - r.z, d = Math.hypot(dx, dz), v = Math.hypot(r.vx, r.vz);
      const vmax = lerp(DAVE.rocketSpeed, r.k), late = r.k >= DAVE.cutIn; let grip = lerp(DAVE.rocketGrip, r.k), care = 1 - .45 * r.k;
      // where to go: the player (with lead) when close or, late, when the line is clear; else the next point on the road route
      r.losT -= dt; if (late && r.losT <= 0) { r.losT = .3; r.los = d < 95 && !blocked(r.x, r.z, P.x, P.z, r.col); }
      const lead = clamp(d / Math.max(v, 8), 0, 1.4) * (.5 + .5 * r.k); let tx = P.x + P.vx * lead, tz = P.z + P.vz * lead, onRoute = false;
      if (!r.crash && !(d < 16 || r.los)) {
        r.repath -= dt; if (!r.path || r.repath <= 0) { r.path = routeTo(r.x, r.z, P.x, P.z); r.pi = 0; r.repath = 1.2; }
        while (r.pi < r.path.length && Math.hypot(r.path[r.pi][0] - r.x, r.path[r.pi][1] - r.z) < 7 + v * .25) r.pi++;
        if (r.pi < r.path.length) { tx = r.path[r.pi][0]; tz = r.path[r.pi][1]; onRoute = true; }
      }
      if (onRoute) { grip *= 2.2; care = Math.max(care, .6); }              // on the road they hold the road (they must reach you); off it, they drift
      else if (!r.crash) { care = .25 * (1 - r.k); grip *= 1.3; }           // coming straight at you: (almost) no braking, a bit more bite to line up
      r.near = Math.min(r.near, d);
      // steering: the nose turns at what the grip allows at this speed (fast = barely turns); velocity follows the nose only as fast as the grip allows (late = drifts)
      const want = Math.atan2(-(tx - r.x), -(tz - r.z)); let da = wrap(want - r.th);
      if (r.crash) { r.th += r.spin * dt; r.spin *= Math.exp(-1.2 * dt); r.crash += dt; }
      else { const rate = Math.min(3, grip * (1 + 1.6 * r.k) / Math.max(v, 4)); r.th += clamp(da, -rate * dt, rate * dt) + r.spin * dt; r.spin *= Math.exp(-2 * dt); }
      // speed: early they brake for corners on the route (rules of the road); late they never lift
      let corner = 0; if (onRoute && r.pi + 3 < r.path.length) { const a = r.path[r.pi], b = r.path[Math.min(r.path.length - 1, r.pi + 4 + Math.round(v / 8))]; corner = Math.abs(wrap(Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) - r.th)); }
      const vt = r.crash ? 0 : vmax * (1 - care * .75 * clamp(Math.max(corner, Math.abs(da)) / 1.3, 0, 1));
      const fx = -Math.sin(r.th), fz = -Math.cos(r.th); let vf = r.vx * fx + r.vz * fz, vl = r.vx * fz - r.vz * fx;
      vf += clamp(vt - vf, -22 * dt, (14 + 10 * r.k) * dt); const gl = (r.crash ? 6 : grip) * dt; vl = Math.abs(vl) <= gl ? 0 : vl - Math.sign(vl) * gl;
      r.vx = fx * vf + fz * vl; r.vz = fz * vf - fx * vl;
      // slamming into you (checked before the move: the car-vs-world push below would otherwise stop them at your bumper and count it as a wall)
      const reach = 1.7 + (P.L || 4.5) / 2 + .9;
      if (!r.hit && d < reach && env.hmode === 'driving') {
        r.hit = true; const rv = Math.hypot(r.vx - P.vx, r.vz - P.vz), f = clamp(rv / 30, .35, 1.2); env.hurt(lerp(DAVE.rocketHurt, r.k) * f, dx / (d || 1), dz / (d || 1)); hurtFlash(); env.sound('crash');
        if (env.kick) env.kick(r.vx * .45 * f, r.vz * .45 * f, (Math.random() < .5 ? -1 : 1) * (1.5 + 2.5 * f)); if (burst) burst(P.x - dx / 2, .8, P.z - dz / 2, -dx / (d || 1), -dz / (d || 1), rv);
        r.vx *= .3; r.vz *= .3; r.spin += (Math.random() - .5) * 8; r.crash = .01;
      }
      // move and hit the world: walls stop them; a hard hit spins them out
      const nx = r.x + r.vx * dt, nz = r.z + r.vz * dt, q = pushCircle(nx, nz, 1.7, r.col), ox = q[0] - nx, oz = q[1] - nz, od = Math.hypot(ox, oz);
      if (od > .02) { const ux = ox / od, uz = oz / od, vn = r.vx * ux + r.vz * uz;
        if (vn < 0) { if (-vn > (onRoute ? 22 : 15) && !r.crash) { r.crash = .01; r.spin = (Math.random() < .5 ? -1 : 1) * (3 + Math.min(6, -vn / 6)); if (burst) burst(q[0], .6, q[1], ux, uz, -vn); if (d < 60) env.sound('crash'); } r.vx -= vn * ux * (r.crash ? 1.3 : 1); r.vz -= vn * uz * (r.crash ? 1.3 : 1); } }
      r.x = q[0]; r.z = q[1]; r.roll += (clamp(-vl / 25, -.12, .12) - r.roll) * Math.min(1, dt * 6);
      const gone = r.t > 16 || d > 150 || (r.crash > 2 && d > 15) || r.crash > 4 || (r.hit && r.t > 6 && d > 30);
      if (gone) { park(r); continue; }
      placeOnGround(r.car.group, r.x, r.z, r.th); r.car.group.rotation.z = r.roll; r.bar[0].material.color.setHex(flash ? 0xff2b2b : 0x551010); r.bar[1].material.color.setHex(flash ? 0x10204f : 0x2b6bff);
      r.col.poly = carPoly(r.x, r.z, r.th, r.car.dims); r.col.cx = r.x; r.col.cz = r.z; r.col.r = 3; r.col.vx = r.vx; r.col.vz = r.vz;
    }
  }
  const WARN = RK.map(() => { const d = document.createElement('div'); d.className = 'warn'; d.innerHTML = '<i></i>'; document.body.appendChild(d); return d; }), pv = new THREE.Vector3();
  function warnStep(P) {                                   // a red arrow at the screen edge (and a whoosh) about a second before a rocket cop reaches you
    RK.forEach((r, i) => {
      const el = WARN[i]; let show = false;
      if (r.on && !r.hit && !r.crash && env.hmode === 'driving') {
        const dx = P.x - r.x, dz = P.z - r.z, d = Math.hypot(dx, dz), vc = ((r.vx - P.vx) * dx + (r.vz - P.vz) * dz) / (d || 1);
        if (d < 70 && vc > 4 && d / vc < 1.3) {
          show = true; pv.set(r.x, 1, r.z).project(D.camera); let sx = pv.x, sy = -pv.y; if (pv.z > 1) { sx = -sx; sy = -sy; }
          const W = env.W, H = env.H, a = Math.atan2(sy * H, sx * W), m = Math.min(1, .9 / Math.max(Math.abs(sx), Math.abs(sy), .001));
          const x = W / 2 + sx * m * (W / 2 - 34), y = H / 2 + sy * m * (H / 2 - 34);
          el.style.transform = `translate(${Math.max(30, Math.min(W - 30, x))}px, ${Math.max(90, Math.min(H - 30, y))}px) rotate(${a + Math.PI / 2}rad)`;
          if (!r.warned) { r.warned = true; env.sound('whoosh', sx); }
        }
      }
      if (!r.on) r.warned = false; const disp = show ? 'block' : 'none'; if (el.style.display !== disp) el.style.display = disp;
    });
  }
  function clearMissiles() { for (const r of RK) { park(r); r.warned = false; } for (const el of WARN) el.style.display = 'none'; }
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere(new THREE.Vector3(), 5);
  const onScreen = (x, z) => { sph.center.set(x, 1, z); return frustum.intersectsSphere(sph); };

  // ---------- roadblocks: real ones. Striped "ROAD CLOSED" barricades (Type III, flashing amber lamps) across the road and sidewalks, cones in front,
  // concrete jersey barriers over the verges, and two cruisers parked at angles behind with their lights going. The gap block keeps a car-wide gap lined with cones.
  // Everything but the cruisers is instanced (a handful of draw calls for all three blocks).
  const RB = { on: false, parts: [], blockers: [], shut: [], closed: [], lamps: [], bars: [] };
  const texOf = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const stripeTex = texOf(256, 32, (g, w, h) => { g.fillStyle = '#f6f6f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff6a10'; for (let x = -h; x < w + h; x += 40) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 20, h); g.lineTo(x + 20 + h, 0); g.lineTo(x + h, 0); g.fill(); } });
  const signTex = texOf(256, 96, (g, w, h) => { g.fillStyle = '#ff6a10'; g.fillRect(0, 0, w, h); g.fillStyle = '#fafafa'; g.fillRect(8, 8, w - 16, h - 16); g.fillStyle = '#111'; g.font = '700 46px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ROAD CLOSED', w / 2, h / 2 + 2); });
  const MAT = { board: new THREE.MeshLambertMaterial({ map: stripeTex }), leg: new THREE.MeshStandardMaterial({ color: 0x8d9298, metalness: .7, roughness: .4 }), foot: new THREE.MeshStandardMaterial({ color: 0x5a5e63, metalness: .6, roughness: .5 }),
    sign: new THREE.MeshLambertMaterial({ map: signTex }), lamp: new THREE.MeshBasicMaterial({ color: 0xffb020, toneMapped: false }), cone: new THREE.MeshLambertMaterial({ color: 0xff5a10 }),
    band: new THREE.MeshLambertMaterial({ color: 0xf4f4f4 }), conc: new THREE.MeshLambertMaterial({ color: 0xc8c4ba }), refl: new THREE.MeshBasicMaterial({ color: 0xffc23a, toneMapped: false }) };
  const jersey = (() => { const sh = new THREE.Shape(); sh.moveTo(-.3, 0); sh.lineTo(.3, 0); sh.lineTo(.3, .08); sh.lineTo(.14, .3); sh.lineTo(.09, .81); sh.lineTo(-.09, .81); sh.lineTo(-.14, .3); sh.lineTo(-.3, .08); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 2.9, bevelEnabled: false }); g.translate(0, 0, -1.45); g.rotateY(Math.PI / 2); return g; })();       // length along local x
  const GEO = { board: new THREE.BoxGeometry(2.45, .26, .07), leg: new THREE.BoxGeometry(.09, 1.4, .09), foot: new THREE.BoxGeometry(.14, .12, .9), sign: new THREE.BoxGeometry(1.3, .48, .03),
    lamp: new THREE.SphereGeometry(.09, 8, 6), cone: new THREE.ConeGeometry(.2, .72, 10).translate(0, .36, 0), band: new THREE.CylinderGeometry(.115, .145, .12, 10).translate(0, .42, 0),
    base: new THREE.BoxGeometry(.44, .04, .44).translate(0, .02, 0), conc: jersey, refl: new THREE.BoxGeometry(.18, .07, .02) };
  function roadblocks() {
    if (RB.on || !graph) return; RB.on = true;
    if (RB.parts.length) { for (const p of RB.parts) { if (p.obj) p.obj.visible = true; if (p.col) colliders.push(p.col); } for (const k of RB.shut) SHUT.add(k); for (const [k, n] of RB.closed) CLOSED.set(k, n); if (env.setBlocks) env.setBlocks(RB.blockers, [...SHUT]); return; }   // built once, shown again on a retry
    const I = {}; for (const k in GEO) I[k] = [];                                   // instance matrices per part
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v3 = new THREE.Vector3();
    const put = (k, x, y, z, th) => { q4.setFromAxisAngle(up, th); I[k].push(m4.compose(v3.set(x, y, z), q4, one).clone()); };
    const solid = (x, z, th, dims) => { const c = { poly: carPoly(x, z, th, dims), cx: x, cz: z, r: Math.hypot(dims[0], dims[1]) / 2 + .2, vx: 0, vz: 0 }; colliders.push(c); RB.parts.push({ col: c }); };
    const free = (x, z) => { const q = pushCircle(x, z, 1.2, null); return Math.abs(q[0] - x) + Math.abs(q[1] - z) < .05; };
    for (const B of DAVE.blocks) {
      let best = null, bd = 1e18;
      graph.edges.forEach((e, k) => { if (e.road !== B.road) return; for (const end of ['a', 'b']) { const n = GN[e[end]], d = Math.hypot(n.x - B.end[0], n.z - B.end[1]); const o = GN[e[end === 'a' ? 'b' : 'a']], od = B.other ? Math.hypot(o.x - B.other[0], o.z - B.other[1]) : 0; if (d + od < bd) { bd = d + od; best = { e, k, from: end }; } } });
      if (!best) continue; const e = best.e; let P = e.pts.map(q => [q[0], -q[1]]); if (best.from === 'b') P = P.reverse();
      let acc = 0, at = P[P.length - 1], dir = [1, 0];
      for (let j = 1; j < P.length; j++) { const L = Math.hypot(P[j][0] - P[j - 1][0], P[j][1] - P[j - 1][1]); if (acc + L >= B.at) { const f = (B.at - acc) / L; at = [P[j - 1][0] + (P[j][0] - P[j - 1][0]) * f, P[j - 1][1] + (P[j][1] - P[j - 1][1]) * f]; dir = [(P[j][0] - P[j - 1][0]) / L, (P[j][1] - P[j - 1][1]) / L]; break; } acc += L; }
      if (!B.gap) { SHUT.add(best.k); RB.shut.push(best.k); CLOSED.set(best.k, e[best.from]); RB.closed.push([best.k, e[best.from]]); }
      const nx = -dir[1], nz = dir[0], span = e.hw + 3.0, wing = e.hw + 22, g0 = B.gap ? e.hw * .45 : 1e9, thN = Math.atan2(-nz, nx);    // local x of each part runs across the road (along n)
      const W = (u, f) => [at[0] + nx * u + dir[0] * f, at[1] + nz * u + dir[1] * f];         // u across the road, f along it (+ = away from the end the block sits at)
      const inGap = (a, b) => B.gap && b > g0 - B.gap / 2 && a < g0 + B.gap / 2;
      const bars = []; for (let u = -span; u < span - .5; u += 2.55) if (!inGap(u, u + 2.4)) bars.push(u + 1.2);
      for (const c of bars) {                                                        // Type III barricade: metal legs with feet, three striped wooden boards, an amber lamp on top
        const [x, z] = W(c, 0);
        for (const s_ of [-1.05, 1.05]) { const [lx, lz] = W(c + s_, 0); put('leg', lx, .68, lz, thN); put('foot', lx, .05, lz, thN); }
        for (const h of [.5, .85, 1.2]) put('board', x, h, z, thN);
        const [lx, lz] = W(c + (bars.indexOf(c) % 2 ? -1.05 : 1.05), 0); put('lamp', lx, 1.44, lz, thN); RB.lamps.push(I.lamp.length - 1);
        solid(x, z, thN + Math.PI / 2, [2.45, .7]);
      }
      const mid = bars.length ? bars[Math.floor(bars.length / 2)] : 0, signs = B.gap ? [bars.find(c => c < g0) ?? mid, bars.find(c => c > g0) ?? mid] : [mid];
      for (const c of signs) for (const f of [-.04, .04]) { const [x, z] = W(c, f); put('sign', x, 1.62, z, thN); }   // ROAD CLOSED, readable from both sides
      for (let u = -e.hw + .6; u < e.hw; u += 1.5) for (const f of [-2.2, 2.2]) { if (inGap(u - .3, u + .3)) continue; const [x, z] = W(u, f); put('cone', x, 0, z, 0); put('band', x, 0, z, 0); put('base', x, 0, z, 0); }
      if (B.gap) for (let f = -9; f <= 9; f += 1.8) for (const sd of [-1, 1]) { const [x, z] = W(g0 + sd * (B.gap / 2 + .25 + Math.max(0, Math.abs(f) - 2) * .25), f); put('cone', x, 0, z, 0); put('band', x, 0, z, 0); put('base', x, 0, z, 0); }   // a funnel of cones into the gap
      const lo = Math.min(-span, ...bars.map(c => c - 1.2)), hi = Math.max(span, ...bars.map(c => c + 1.2));
      for (const [from, sgn] of [[hi, 1], [lo, -1]]) for (let u = from; Math.abs(u) < wing; u += sgn * 3) {    // jersey barriers over the verges (skipping any inside a building or tree)
        const c = u + sgn * 1.5, [x, z] = W(c, 0); if (!free(x, z)) continue; put('conc', x, 0, z, thN); for (const f of [-.12, .12]) { const [rx, rz] = W(c, f); put('refl', rx, .62, rz, thN); } solid(x, z, thN + Math.PI / 2, [3, .62]);
      }
      for (const [u, f, turn] of (B.gap ? [[-e.hw * .6, 7.5, -.6], [e.hw * .2 + 3, 11, .5]] : [[-e.hw * .35, 7, -.7], [e.hw * .45, 9.5, .8]])) {    // two cruisers behind, angled across their lanes
        const [x, z] = W(u, f), car = makeCar('police', '#f4f4f4'), th = Math.atan2(-dir[0], -dir[1]) + turn;
        placeOnGround(car.group, x, z, th); solid(x, z, th, car.dims);
        const bar = [0, 1].map(j => { const b_ = new THREE.Mesh(new THREE.BoxGeometry(.5, .18, .3), new THREE.MeshBasicMaterial({ color: j ? 0x2b6bff : 0xff2b2b, toneMapped: false })); b_.position.set(j ? .35 : -.35, car.dims[3] || 1.75, 0); car.group.add(b_); return b_; });
        RB.bars.push(bar); RB.parts.push({ obj: car.group, cx: x, cz: z });
      }
      RB.blockers.push({ x: at[0], z: at[1], vx: 0, vz: 0, L: 1.5, W: 2 * span, nx, nz, gap: !!B.gap });
    }
    for (const k in I) { if (!I[k].length) continue; const im = new THREE.InstancedMesh(GEO[k], k === 'lamp' ? MAT.lamp.clone() : MAT[k], I[k].length); I[k].forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
      im.castShadow = k !== 'lamp' && k !== 'refl' && k !== 'base'; im.receiveShadow = true; scene.add(im); RB.parts.push({ obj: im, cx: DAVE.house[0], cz: DAVE.house[1], r: 200 }); if (k === 'lamp') RB.lampMesh = im; }
    if (env.setBlocks) env.setBlocks(RB.blockers, [...SHUT]);
  }
  function clearRoadblocks() {
    for (const p of RB.parts) { if (p.obj) p.obj.visible = false; if (p.col) { const i = colliders.indexOf(p.col); if (i >= 0) colliders.splice(i, 1); } }
    RB.on = false; SHUT.clear(); CLOSED.clear(); if (env.setBlocks) env.setBlocks([], []);
  }

  // ---------- goal marker: a soft green column at the current goal, and a DAVE sign at the house ----------
  const geo = new THREE.CylinderGeometry(2.6, 2.6, 7, 24, 1, true).translate(0, 3.5, 0);
  const beacon = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x3fe07b, transparent: true, opacity: .38, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); beacon.visible = false; beacon.renderOrder = 5; scene.add(beacon);
  { const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d'); g.fillStyle = '#1f6b3a'; g.fillRect(0, 0, 256, 96); g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(6, 6, 244, 84); g.fillStyle = '#fff'; g.font = '700 54px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText("DAVE'S", 128, 50);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const sign = new THREE.Group(), post = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.6, .12), new THREE.MeshLambertMaterial({ color: 0x3a3a3a }));
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .6), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false })); post.position.y = .8; board.position.y = 1.75; sign.add(post, board);
    sign.position.set(DAVE.house[0] + 3.1, 0, DAVE.house[1] - 1.2); sign.rotation.y = DAVE.houseYaw; scene.add(sign); }
  // ---------- step ----------
  function step(dt, P) {                                   // P: { x, z (three), vx, vz, th, speed, driving }
    if (S.stage === 'off' || S.stage === 'intro' || S.stage === 'done' || S.failed) return;
    if (env.respawning && performance.now() > (S.grace || 0)) { failMission(env.lastDeath === 'busted' ? 'Busted.' : 'Wasted.'); return; }
    const me = [P.x, P.z];
    if (S.stage === 'toPublix' && P.driving && dist(me, DAVE.lot) < 14) { S.stage = 'park'; objective('Park in the lot and get out', 'tap Exit'); }
    else if (S.stage === 'park' && env.hmode === 'foot') { S.stage = 'walkIn'; objective('Walk into Publix'); S.checkpoint = 'publix'; }
    else if (S.stage === 'walkIn' && env.hmode === 'foot' && dist(me, DAVE.door) < 12) { S.stage = 'fight'; spawnThugs(); }
    else if (S.stage === 'fight') { const left = thugStep(dt); objective('Some guys want a fight', `${left} left`); if (!left) { S.stage = 'grab'; objective('Grab the groceries', 'go in the door'); banner('GO IN'); } }
    else if (S.stage === 'grab' && env.hmode === 'foot' && dist(me, DAVE.door) < 2.6) { S.stage = 'back'; objective('Get back in your ride'); banner('GOT THE GROCERIES'); env.addMoney(0); thugStep(dt); }
    else if (S.stage === 'back' && P.driving) { S.cpNear = null; startChase(); }
    else if (S.stage === 'chase') {
      S.copT += dt; if (S.cops < DAVE.copMax && S.copT >= DAVE.copEvery) { S.copT = 0; S.cops++; cops.force(S.cops); banner(`${S.cops} COPS`); }
      const dh = dist(me, DAVE.house);
      if (dh < 35) { objective('STOP IN THE DRIVEWAY', `${Math.round(dh)} m`); if (!S.stopSaid) { S.stopSaid = true; banner('STOP IN THE DRIVEWAY!'); } }
      else objective('Get the groceries to Dave', `${Math.round(dh)} m${S.t < 12 ? ' · roads closed' : ''}`);
      if (!S.cpNear && dh < 70 && P.driving) { S.cpNear = { x: P.x, z: P.z, th: P.th, cops: S.cops, t: S.t }; banner('CHECKPOINT'); }
      S.t += dt; const pk = clamp(1 - (dh - 20) / Math.max(1, S.d0 - 20), 0, 1); S.heat = Math.min(1, pk * .7 + S.t / DAVE.rampTime * .4);
      if (S.heat > DAVE.rocketFrom && P.driving) {
        const k = (S.heat - DAVE.rocketFrom) / (1 - DAVE.rocketFrom); let on = 0; for (const r of RK) if (r.on) on++;
        S.missT -= dt; if (S.missT <= 0 && on < Math.round(lerp(DAVE.rocketMax, k))) { pm.multiplyMatrices(D.camera.projectionMatrix, D.camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm); launch(P, k, onScreen); S.missT = lerp(DAVE.rocketEvery, k) * (.8 + Math.random() * .4); }
      }
      if (dh < 6 && P.speed < 3) win();
      beacon.material.opacity = dh < 35 ? .5 + Math.sin(performance.now() / 120) * .15 : .38;
    }
    if (RB.on) {
      for (const p of RB.parts) if (p.obj) { const v = Math.hypot((p.cx ?? p.obj.position.x) - P.x, (p.cz ?? p.obj.position.z) - P.z) < (p.r || 120); if (p.obj.visible !== v) p.obj.visible = v; }
      const ph = Math.floor(performance.now() / 160) % 2, amber = Math.floor(performance.now() / 420) % 2;
      for (const bar of RB.bars) { bar[0].material.color.setHex(ph ? 0xff2b2b : 0x551010); bar[1].material.color.setHex(ph ? 0x10204f : 0x2b6bff); }
      if (RB.lampMesh) RB.lampMesh.material.color.setHex(amber ? 0xffb020 : 0x4a3008);
    }
    if (S.stage === 'grab' || S.stage === 'back') thugStep(dt);
    rocketStep(dt, P, S.heat > DAVE.rocketFrom ? (S.heat - DAVE.rocketFrom) / (1 - DAVE.rocketFrom) : 0); warnStep(P);
    const tg = target(); beacon.visible = !!tg && S.stage !== 'fight'; if (tg) { const k = 1 + Math.sin(performance.now() / 300) * .06; beacon.position.set(tg[0], 0, -tg[1]); beacon.scale.set(S.stage === 'grab' || S.stage === 'walkIn' ? .5 : k, 1, S.stage === 'grab' || S.stage === 'walkIn' ? .5 : k); }
  }
  function restart() { S.cpNear = null; clearRoadblocks(); clearThugs(); clearMissiles(); cops.force(0); cops.lock(false); cops.clear(); fail.hidden = true; phone.hidden = true; S.failed = false; S.stage = 'off'; S.checkpoint = null; objective(''); env.heal(); env.resetCar(); start(); }
  function startChase() { roadblocks(); S.stage = 'chase'; S.cops = 1; S.copT = 0; S.missT = 2; S.t = 0; S.heat = 0; S.d0 = Math.max(60, dist([DAVE.lot[0], DAVE.lot[1]], DAVE.house)); S.checkpoint = 'chase'; cops.lock(true); cops.force(1); S.stopSaid = false; objective('Get the groceries to Dave', 'roads closed'); banner('COPS!'); setTimeout(() => { if (S.stage === 'chase' && S.t < 6) banner('ROADS CLOSED'); }, 2000); }
  function win() { clearRoadblocks(); S.stage = 'done'; cops.force(0); cops.lock(false); cops.clear(); clearMissiles(); clearThugs(); objective(''); env.addMoney(DAVE.reward); const n = tries + 1; tries = 0; saveTries(); banner(`MISSION PASSED  +$${DAVE.reward}`); setTimeout(() => banner(`DELIVERED ON ATTEMPT ${n}`), 2000);
    (async () => { await wait(1.5); msgs.innerHTML = ''; pick.hidden = true; phone.hidden = false; await wait(.05); phone.classList.add('show'); await typing('Dave', 1.0); say('Dave', 'YOU MADE IT?!? 😭 THANK YOU'); await wait(1.0); if (n > 3) { say('Dave', `${n} tries tho 😂`); await wait(1.0); } say(env.CHARS[env.cur].name, 'never again.', true); await wait(2.6); phone.classList.remove('show'); await wait(.3); phone.hidden = true; })(); }
  function failMission(why) {
    S.failed = true; tries++; saveTries(); cops.force(0); cops.lock(false); clearMissiles(); objective(''); fail.querySelector('#mf-why').textContent = why; fail.querySelector('#mf-try').textContent = `Attempt ${tries}`;
    fail.querySelector('#mf-retry').textContent = S.checkpoint === 'chase' && S.cpNear ? 'Retry from checkpoint' : 'Retry'; setTimeout(() => { fail.hidden = false; }, 1600);
  }
  fail.querySelector('#mf-retry').onclick = () => {                 // retry from the last checkpoint
    fail.hidden = true; S.failed = false; S.grace = performance.now() + 3000; clearMissiles(); cops.clear(); env.heal();
    if (S.checkpoint === 'chase' && S.cpNear) { const c = S.cpNear; clearThugs(); env.resetCar(c.x, c.z, c.th); startChase(); S.cops = c.cops; S.t = c.t; cops.force(S.cops); banner('CHECKPOINT'); }
    else if (S.checkpoint === 'chase') { clearThugs(); env.resetCar(DAVE.lot[0], DAVE.lot[1], DAVE.lot[2]); startChase(); }
    else if (S.checkpoint === 'publix') { clearThugs(); env.resetCar(DAVE.lot[0], DAVE.lot[1], DAVE.lot[2]); S.stage = 'park'; objective('Park in the lot and get out', 'tap Exit'); }
    else { env.resetCar(); S.stage = 'toPublix'; objective('Drive to Publix'); }
  };
  return { list: [], step, start, restart, refresh() {}, target, get active() { return S.stage !== 'off' && S.stage !== 'done' && !S.failed; }, get stage() { return S.stage; }, S, RK, RB };
}
