import { makeLightbar } from './lightbar.js';
// "Groceries for Dave": the showcase mission (round 29). Three.js coordinates (x east, z south), metres.
// (optional cold open) -> Dave texts the group -> you pick Marc, Aaron or Chris (sky switch) -> drive to Publix, stop in the Curbside box, a clerk brings the bags out ->
// it is the police station's lunch order: one cop, then one more every 8 s up to 5, rocket cops and SWAT vans as you get close -> stop in Dave's driveway.
// Wasted or busted = mission failed, Retry from the last checkpoint (Publix curbside, the chase start, or near Dave's). Built to be near impossible.
export const DAVE = {
  lot: [62.9, -49.0, Math.PI], door: [73.7, -64.6], curb: [73.7, -56.0], curbHold: 3.5,       // curbside pickup box in front of the door (round 31: replaces park / walk in / fight), seconds to load
  house: [-168.2, -20.5], houseYaw: Math.PI,          // Publix lot (park here, facing out = south), Publix entrance, Dave's driveway on Banks Rd (the house is built by dave_house() in coconut_scene.py)
  copEvery: 8, copMax: 5,                                                             // getaway: one more ordinary cop every copEvery s up to copMax
  // "rocket" police cars. Heat goes 0 -> 1 with how close you are to Dave's (70 %) and how long the chase has run (rampTime s gives the other 40 %).
  rampTime: 60, rocketFrom: .12,                                                      // they start once heat passes rocketFrom
  rocketSpeed: [20, 54], rocketEvery: [4.0, .4], rocketMax: [1, 7],                   // top speed m/s, seconds between launches, how many at once: from low heat to full heat
  rocketGrip: [14, 12], cutIn: .55,                                                    // sideways grip m/s2 (less = wider turns and drifts); above cutIn heat they leave the road route and come straight at you when nothing is in the way
  rocketHurt: [12, 22], missileMass: 3.0,
  swatFrom: .72, swatEvery: [14, 8], swatMax: 1, swatSpeed: 34, swatHurt: 14, swatMass: 3.0,    // SWAT vans (late heat): first at heat .72, then every 14 -> 8 s, one at a time; top speed m/s; health per hit; weight vs your car (round 31: were .5, 9->4 s, 2, 38, 24, 4.5: user "too hard")                                             // health per hit (low to full heat); weight against your car
  // roadblocks set up when the chase starts: Dave's street is shut at the east end and Coconut Creek Pkwy is shut, so the way in is the long loop round the north
  // (the car-wide gap block at the west end was removed in round 31). road + the edge end nearest `end` (three x, z), `at` m in from that end, gap width m (0 = solid)
  blocks: [{ road: 'Banks Rd', end: [-125.0, -29.7], at: 14, gap: 0 }, { road: 'Coconut Creek Pkwy', end: [-125.9, -0.8], at: 14, gap: 0, other: [-193.5, 0.4] }],                                     // round 31: the car-wide gap block at the west end of Banks Rd is gone (user: annoying, not fun)
  blocksFar: [{ road: 'Wiles Rd', end: [-126.0, 119.0], at: 14, gap: 0, other: [-231.0, 109.0] }],   // round 33: added after Aaron gets the EMP (the way round gets longer, room for the next hand-off)
  aaronHurt: 2.0, aaronHurtEmp: 1.6, relayAhead: 45,                                  // Aaron's Tesla is weak (damage x), how far up the road he waits for the hand-off (m)
  emp: { cool: 12, radius: 24 },
  rocketsCopsExtra: 2, rocketsCopEvery: 6,                                            // with the launcher on board: up to 2 more ordinary cops, one every 6 s (was 8) (round 33: the launcher made it too easy)                                                      // EMP: seconds between pulses, reach (m)
  chrisHurt: 1.5, chrisFrom: [103.0, 32.3],                                         // round 34: Chris's bike takes this much more damage; he sets off from the road nearest City Hall (three x, z)
  reward: 1000,
};
// Round 34: the mission is three chapters. Each driver fails, gets an upgrade (OK only), probably wins, and Dave finds a new problem:
// Marc (Jeep) -> rockets -> "where's the ketchup?" -> Aaron (Tesla, from Publix) -> EMP -> "my AC broke again. Hey Chris?" -> Chris (bike, from City Hall) -> jump -> mission passed.
export const CHAPTERS = [{ ci: 0, up: 'rockets', label: 'MARC — GROCERIES' }, { ci: 1, up: 'emp', label: 'AARON — KETCHUP RUN' }, { ci: 2, up: 'jump', label: 'CHRIS — AC PART' }];

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
#phone .pick button.busy{opacity:.4;cursor:default} #phone .pick button.busy img{border-color:#999;filter:grayscale(1)} #phone .pick small{font-size:10px;color:#888}
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
#cold{position:fixed;inset:0;z-index:24;display:grid;align-content:end;justify-items:start;padding:0 22px calc(28vh + env(safe-area-inset-bottom,0px));pointer-events:none;font:400 clamp(30px,9vw,44px)/1.05 "Anton",Impact,sans-serif;color:#fff;text-transform:uppercase;text-shadow:3px 4px 0 #111}
#cold[hidden]{display:none} #cold span{display:block;opacity:0;transform:translateY(10px);transition:.35s} #cold span.on{opacity:1;transform:none} #cold small{font:500 clamp(16px,4.6vw,22px)/1.2 system-ui;text-transform:none;text-shadow:0 2px 6px #000;max-width:300px}
#mres{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:31;width:min(320px,calc(100% - 32px));padding:16px 18px;border-radius:16px;background:rgba(12,16,22,.9);color:#fff;font:500 15px system-ui;box-shadow:0 10px 30px rgba(0,0,0,.5)}
#mres[hidden]{display:none} #mres h2{margin:0 0 10px;font:400 34px/1 "Anton",Impact,sans-serif;letter-spacing:.06em;color:#3fe07b;text-transform:uppercase;text-align:center}
#mres dl{display:grid;grid-template-columns:1fr auto;gap:6px 12px;margin:0 0 14px} #mres dt{color:#aab2bf} #mres dd{margin:0;font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
#mres .b{display:flex;gap:10px} #mres button{all:unset;flex:1;cursor:pointer;text-align:center;padding:11px 0;border-radius:10px;font:700 15px system-ui;background:#ffd23f;color:#111} #mres button.k{background:#2a3140;color:#fff}
#mup{position:fixed;inset:0;z-index:32;display:grid;place-items:center;background:rgba(5,8,12,.55)} #mup[hidden]{display:none}
#mup .c{width:min(300px,calc(100% - 40px));padding:20px 18px 18px;border-radius:16px;background:#141a24;color:#fff;text-align:center;font:500 15px system-ui;box-shadow:0 12px 40px rgba(0,0,0,.6);border:2px solid #ffd23f}
#mup b{display:block;font:400 30px/1.05 "Anton",Impact,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#ffd23f;margin:6px 0 8px} #mup p{margin:0 0 16px;color:#cfd3da}
#mup button{all:unset;cursor:pointer;display:block;width:100%;box-sizing:border-box;padding:13px 0;border-radius:10px;background:#ffd23f;color:#111;font:700 17px system-ui}
#mfail .dist{color:#ffd23f;font:600 14px system-ui}
#mfail small{color:#cfd3da;font:500 13px system-ui;letter-spacing:.04em}
.warn{position:fixed;left:0;top:0;z-index:4;width:0;height:0;pointer-events:none;display:none}
.warn i{position:absolute;left:-22px;top:-20px;width:0;height:0;border-left:22px solid transparent;border-right:22px solid transparent;border-bottom:40px solid #ff2b2b;filter:drop-shadow(0 0 8px #ff2b2b) drop-shadow(0 0 2px #fff);animation:wblink .18s steps(2) infinite}
@keyframes wblink{50%{opacity:.45}}`;
  document.head.appendChild(css);
  const phone = document.createElement('div'); phone.id = 'phone'; phone.hidden = true; phone.innerHTML = `<div class="ph"><div class="hd"><img src="img/dave.jpg" alt=""><div><b>Dave</b><small>Marc, Aaron, Chris</small></div><button class="skip" hidden>Skip ›</button></div><div class="msgs"></div><div class="pick" hidden>Who's going?<div></div></div></div>`;
  document.body.appendChild(phone);
  const fail = document.createElement('div'); fail.id = 'mfail'; fail.hidden = true; fail.innerHTML = `<div class="c"><b>Mission failed</b><span id="mf-why"></span><span class="dist" id="mf-dist"></span><small id="mf-try"></small><button id="mf-retry">Retry</button></div>`; document.body.appendChild(fail);
  const hurt = document.createElement('div'); hurt.id = 'hurt'; document.body.appendChild(hurt);
  const up = document.createElement('div'); up.id = 'mup'; up.hidden = true; up.innerHTML = '<div class="c"><small>UPGRADE</small><b id="mu-t">Add rocket launcher?</b><p id="mu-p">Marc\'s Jeep gets a roof launcher. It aims itself. Tap FIRE.</p><button id="mu-ok">OK</button></div>'; document.body.appendChild(up);
  const UP = { rockets: false, emp: false, jump: false };          // upgrades for this run (round 32/34): each chapter's is offered after its first failure, there is no "no"
  const res = document.createElement('div'); res.id = 'mres'; res.hidden = true; res.innerHTML = '<h2>Delivered</h2><dl></dl><div class="b"><button id="mr-again">Play again</button><button class="k" id="mr-free">Keep driving</button></div>'; document.body.appendChild(res);
  let best = 1e9; try { best = +localStorage.getItem('gtcc-dave-best') || 1e9; } catch (e) { /* ok */ }       // closest you got to Dave's in a failed run (m, by road)
  const coldEl = document.createElement('div'); coldEl.id = 'cold'; coldEl.hidden = true; coldEl.innerHTML = '<span>Yep. That\'s me.</span><span><small>You\'re probably wondering how I got here.</small></span>'; document.body.appendChild(coldEl);
  const chip = document.getElementById('mission'); const msgs = phone.querySelector('.msgs'), pick = phone.querySelector('.pick');
  const wait = s => new Promise(r => setTimeout(r, s * 1000));
  const say = (who, text, me) => { const m = document.createElement('div'); m.className = 'm' + (me ? ' me' : ''); m.innerHTML = `<i>${who}</i>${text}`; msgs.appendChild(m); };
  const typing = async (who, s) => { const tok = S.run; const t = document.createElement('div'); t.className = 'typing'; t.textContent = who + ' is typing…'; msgs.appendChild(t); await wait(s); t.remove(); if (tok !== S.run) for (const x of msgs.querySelectorAll('.typing')) x.remove(); };
  const REPLIES = { marc: 'On it Dave. Jeep\'s warmed up 👍', aaron: 'Say less. Tesla\'s already backing out.', chris: 'Bike\'s faster. Be there in 10 🏍️' };
  const hurtFlash = () => { hurt.classList.add('on'); setTimeout(() => hurt.classList.remove('on'), 160); };

  let tries = 0; try { tries = +localStorage.getItem('gtcc-dave-tries') || 0; } catch (e) { /* ok */ }          // failed attempts so far (kept until you deliver)
  const saveTries = () => { try { localStorage.setItem('gtcc-dave-tries', String(tries)); } catch (e) { /* ok */ } };
  // ---------- state ----------
  const S = { ch: 0, cpStart: null, run: 0, cpNear: null, stopSaid: false, stage: 'off', t: 0, cops: 0, copT: 0, missT: 0, heat: 0, d0: 1, missiles: [], checkpoint: null, failed: false };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  function objective(text, sub = '') { chip.hidden = !text; if (text) chip.innerHTML = `<b>Groceries for Dave</b><span>${text}</span>${sub ? `<em>${sub}</em>` : ''}`; }
  const target = () => ({ toPublix: [STALL.x, -STALL.z], curbside: [STALL.x, -STALL.z], chase: [DAVE.house[0], -DAVE.house[1]] })[S.stage] || null;   // minimap wants Blender x, y

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
    skipBtn.hidden = true; const row = pick.querySelector('div'); row.innerHTML = ''; pick.hidden = false; const shownAt = performance.now();
    env.CHARS.forEach((C, i) => { const b = document.createElement('button'); const busy = i !== 0; if (busy) b.className = 'busy'; b.innerHTML = `<img src="img/${C.id}.jpg" alt="">${C.name}${busy ? '<small>busy</small>' : ''}`; b.onclick = () => { if (!busy && performance.now() - shownAt > 900) choose(i); }; row.appendChild(b); });      // round 34: chapter 1 is Marc's (Aaron and Chris get theirs later)      // taps in the first 0.9 s are ignored (fast taps to skip the texts used to land on a face and start the game)
  }
  function skipIntro() {                                   // tap the screen (or Skip) during the texts: all of them at once, straight to "Who's going?"
    if (S.stage !== 'intro' || !pick.hidden) return; S.run++; msgs.innerHTML = ''; for (const [w, t] of INTRO) say(w, t);
    phone.hidden = false; phone.classList.add('show'); env.cine([{ ...SHOTS.house, dur: .01 }]); showPick();
  }
  skipBtn.onclick = skipIntro; document.getElementById('view').addEventListener('pointerdown', () => { if (S.stage === 'intro') skipIntro(); else if (S.stage === 'cold') endCold(); });
  // ---------- cold open (showcase option): a few seconds of the chase, freeze-frame, then the story starts ----------
  async function coldOpen() {
    S.stage = 'cold'; S.coldDone = true; S.ct = 0; S.cs = 0; const tok = ++S.run, gone = () => tok !== S.run;
    S.cpath = routeTo(DAVE.lot[0], DAVE.lot[1] + 12, DAVE.house[0], DAVE.house[1]); env.resetCar(S.cpath[0][0], S.cpath[0][1], 0);
    document.body.classList.add('cine'); if (env.music) env.music.level(3); cops.lock(true); cops.force(3); if (cops.goal) cops.goal(DAVE.house[0], DAVE.house[1]); env.sound('crash');
    await wait(5.6); if (gone()) return;
    env.freeze(true); if (env.music) env.music.level(0); document.getElementById('view').style.filter = 'grayscale(1) contrast(1.2) brightness(.95)'; env.sound('scratch');
    coldEl.hidden = false; const sp = coldEl.querySelectorAll('span'); await wait(.05); sp[0].classList.add('on'); await wait(1.4); if (gone()) return; sp[1].classList.add('on'); await wait(2.4); if (gone()) return;
    endCold();
  }
  async function endCold() {
    if (S.stage !== 'cold') return; S.run++; const fd = document.getElementById('fade'); fd.classList.add('on'); await wait(.6);
    env.freeze(false); document.getElementById('view').style.filter = ''; coldEl.hidden = true; coldEl.querySelectorAll('span').forEach(x => x.classList.remove('on'));
    clearMissiles(); cops.force(0); cops.lock(false); cops.clear(); if (cops.goal) cops.goal(null); if (env.music) env.music.level(0); env.heal(); env.resetCar(); S.stage = 'off'; start(); await wait(.3); fd.classList.remove('on');
  }
  function coldStep(dt, P) {                               // your car on a rail along the road at chase speed; cops (3 stars), a rocket and a SWAT van join in
    S.ct += dt; S.cs += 24 * dt; const R = S.cpath; let acc = 0, x = R[0][0], z = R[0][1], th = 0;
    for (let i = 1; i < R.length; i++) { const L = Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]); if (acc + L >= S.cs) { const f = (S.cs - acc) / L; x = R[i - 1][0] + (R[i][0] - R[i - 1][0]) * f; z = R[i - 1][1] + (R[i][1] - R[i - 1][1]) * f; th = Math.atan2(-(R[i][0] - R[i - 1][0]), -(R[i][1] - R[i - 1][1])); break; } acc += L; }
    S.cth = S.cth == null ? th : S.cth + wrap(th - S.cth) * Math.min(1, dt * 6); env.pose(x, z, S.cth, -Math.sin(S.cth) * 24, -Math.cos(S.cth) * 24); env.heal();
    pm.multiplyMatrices(D.camera.projectionMatrix, D.camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm);
    const Pv = { x, z, vx: -Math.sin(S.cth) * 24, vz: -Math.cos(S.cth) * 24, th: S.cth, L: P.L };
    if (S.ct > 1.0 && !S.cswat) { S.cswat = launchSwat(Pv, onScreen); }
    if (S.ct > 2.2 && !S.crock) { S.crock = true; launch(Pv, .85, onScreen); }
    rocketStep(dt, Pv, .85);
  }
  async function start() {
    if (S.stage !== 'off' && S.stage !== 'done') return;
    if (env.coldOpen && !S.coldDone) { S.cswat = false; S.crock = false; S.cth = null; coldOpen(); return; } S.stage = 'intro'; msgs.innerHTML = ''; pick.hidden = true; const tok = ++S.run, gone = () => tok !== S.run;
    if (DAVE.starts) for (let ci = 0; ci < 3; ci++) { const f = DAVE.starts[ci], sp = stopSpot(f[0], f[1], DAVE.curb[0], DAVE.curb[1]); if (ci === env.cur) env.resetCar(sp.x, sp.z, sp.th); else env.placeRide(ci, sp.x, sp.z, sp.th); }   // round 49: all three wait at a junction, pointed toward Publix
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
    phone.classList.remove('show'); await wait(.3); phone.hidden = true; S.stage = 'toPublix'; objective('Drive to Publix'); banner('GROCERIES FOR DAVE'); S.mt = 0; S.w0 = env.wrecks;
  }

  // ---------- curbside pickup: pull into the box, a clerk brings the bags out to your car ----------
  // round 50 (user: "make the Publix pick up spot one of the drive up spots on the right... When you drive on it the car should slow, stop, wait for delivery"):
  // DAVE.stall = [x, z, heading] of a parking stall (three coords); without one, the old box in front of the door
  const STALL = DAVE.stall ? { x: DAVE.stall[0], z: DAVE.stall[1], th: DAVE.stall[2], w: 2.8, l: 5.4 } : { x: DAVE.curb[0], z: DAVE.curb[1], th: 0, w: 3.4, l: 6.4 };
  const inRect = (P, cx, cz, th, hw, hl) => { const dx = P.x - cx, dz = P.z - cz, fx = -Math.sin(th), fz = -Math.cos(th); return Math.abs(dx * fx + dz * fz) < hl && Math.abs(dx * fz - dz * fx) < hw; };
  // the car is taken over: it eases into the spot (whichever way round is closer to how you came in), stops, and stays put; a slow camera swing goes round it
  const angTo = (a, b) => { const d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return d; };
  function autoPark(P, x, z, th, camDur, flip = true) {
    let th1 = th; if (flip && Math.abs(angTo(P.th, th + Math.PI)) < Math.abs(angTo(P.th, th))) th1 = th + Math.PI;
    const v = Math.hypot(P.vx || 0, P.vz || 0), dur = Math.max(.7, Math.min(1.6, .5 + v / 16)), vk = Math.min(1, 2.2 / Math.max(1e-3, v * dur * .148));    // carry in at most ~2 m of overshoot
    S.park = { t: 0, dur, x0: P.x, z0: P.z, th0: P.th, x, z, th: P.th + angTo(P.th, th1), v0x: (P.vx || 0) * vk, v0z: (P.vz || 0) * vk };
    const side = angTo(0, th1);
    env.cine([{ a: [P.x, P.z], b: [x, z], y0: side + 1.1, y1: side + .35, pitch: 26, d0: 24, d1: 14, dur: camDur }]);
  }
  function parkStep(dt) {                                  // Hermite ease from the car's current speed to a dead stop on the spot
    const K = S.park; K.t = Math.min(K.dur, K.t + dt); const u = K.t / K.dur, h1 = 1 - u * u * (3 - 2 * u), h2 = u * u * (3 - 2 * u), h3 = u * (1 - u) ** 2;
    const x = K.x0 * h1 + K.x * h2 + K.v0x * K.dur * h3, z = K.z0 * h1 + K.z * h2 + K.v0z * K.dur * h3, th = K.th0 + (K.th - K.th0) * h2;
    const d1 = 6 * u * (1 - u) / K.dur, d3 = (1 - u) * (1 - 3 * u);
    env.pose(x, z, th, (K.x - K.x0) * d1 + K.v0x * d3, (K.z - K.z0) * d1 + K.v0z * d3); return u >= 1;
  }
  { const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d'); g.fillStyle = 'rgba(46,160,70,.55)'; g.fillRect(0, 0, 128, 256); g.strokeStyle = '#eafff0'; g.lineWidth = 8; g.strokeRect(6, 6, 116, 244);
    g.save(); g.translate(64, 128); g.rotate(-Math.PI / 2); g.fillStyle = '#fff'; g.font = '800 30px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CURBSIDE', 0, 0); g.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const pad = new THREE.Mesh(new THREE.PlaneGeometry(STALL.w, STALL.l), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
    pad.rotation.x = -Math.PI / 2; pad.rotation.z = STALL.th; pad.position.set(STALL.x, .06, STALL.z); pad.renderOrder = 2; scene.add(pad);
    if (DAVE.stall) {                                     // round 50: a real drive-up spot with a green CURBSIDE PICKUP sign at its head
      const sc = document.createElement('canvas'); sc.width = 128; sc.height = 96; const sg = sc.getContext('2d'); sg.fillStyle = '#1f7a3a'; sg.fillRect(0, 0, 128, 96); sg.strokeStyle = '#fff'; sg.lineWidth = 5; sg.strokeRect(4, 4, 120, 88);
      sg.fillStyle = '#fff'; sg.font = '800 25px system-ui'; sg.textAlign = 'center'; sg.fillText('CURBSIDE', 64, 40); sg.font = '700 21px system-ui'; sg.fillText('PICKUP', 64, 70);
      const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace; const sign = new THREE.Group();
      const post = new THREE.Mesh(new THREE.BoxGeometry(.08, 1.7, .08), new THREE.MeshLambertMaterial({ color: 0x4a4a4a })); post.position.y = .85;
      const board = new THREE.Mesh(new THREE.PlaneGeometry(.95, .7), new THREE.MeshBasicMaterial({ map: st, side: THREE.DoubleSide, toneMapped: false })); board.position.y = 1.95; sign.add(post, board);
      const fx = -Math.sin(STALL.th), fz = -Math.cos(STALL.th); sign.position.set(STALL.x + fx * (STALL.l / 2 + .35), 0, STALL.z + fz * (STALL.l / 2 + .35)); sign.rotation.y = STALL.th; scene.add(sign);
    } }
  const CB = { clerk: null, t: 0, walk: 0, bags: null };
  function clerk() {
    if (!CB.clerk) { CB.clerk = makePerson({ jacket: '#2e7d32' }); Object.assign(CB.clerk, { on: true, state: 'scripted', clerk: true });
      CB.bags = new THREE.Mesh(new THREE.BoxGeometry(.5, .45, .3), new THREE.MeshLambertMaterial({ color: 0xd9c49a })); CB.bags.position.set(.32, .8, -.1); CB.clerk.root.add(CB.bags); }
    return CB.clerk;
  }
  function curbStep(dt, P) {                               // drive onto the spot: the car parks itself, the clerk walks out with the bags, loads them, walks back, the chase starts
    const w = clerk(), r = w.root;
    if (!S.park) {
      if (!P.driving || !inRect(P, STALL.x, STALL.z, STALL.th, STALL.w / 2 + .6, STALL.l / 2 + .4)) { if (r.visible) r.visible = false; CB.t = 0; return; }
      autoPark(P, STALL.x, STALL.z, STALL.th, DAVE.curbHold + 2.2, !DAVE.stall); CB.t = 0; objective('Curbside pickup', 'loading the groceries'); if (env.sound) env.sound('scratch');
    }
    if (!parkStep(dt)) return;
    if (CB.t === 0) { r.position.set(DAVE.door[0], 0, DAVE.door[1] + .5); r.visible = true; CB.bags.visible = true; play(w, 'walk'); }
    CB.t += dt; const k = Math.min(1, CB.t / DAVE.curbHold), K = S.park, sd = [Math.cos(K.th), -Math.sin(K.th)];      // the car's side nearer the store door
    const sgn = (DAVE.door[0] - K.x) * sd[0] + (DAVE.door[1] - K.z) * sd[1] > 0 ? 1 : -1, car = [K.x + sd[0] * 1.6 * sgn, K.z + sd[1] * 1.6 * sgn];
    const out = Math.min(1, CB.t / (DAVE.curbHold * .45)), back = Math.max(0, (CB.t - DAVE.curbHold * .6) / (DAVE.curbHold * .4)), f = back > 0 ? 1 - back : out;
    const tx = DAVE.door[0] + (car[0] - DAVE.door[0]) * f, tz = DAVE.door[1] + .5 + (car[1] - DAVE.door[1] - .5) * f, ox = r.position.x, oz = r.position.z; r.position.set(tx, 0, tz);
    if (Math.hypot(tx - ox, tz - oz) > 1e-3) r.rotation.y = Math.atan2(-(tx - ox), -(tz - oz));
    if (out >= 1 && back === 0) { CB.bags.visible = false; if (w.cur !== w.act.idle) play(w, 'idle'); } else if (w.cur !== w.act.walk) play(w, 'walk');
    objective('Curbside pickup', `loading the groceries ${Math.round(k * 100)}%`);
    if (k >= 1) { r.visible = false; CB.t = 0; S.park = null; S.cpNear = null; env.cineStop(); startChase(); twist(); }
  }
  async function twist() {                                 // Dave reads the receipt
    msgs.innerHTML = ''; pick.hidden = true; skipBtn.hidden = true; phone.hidden = false; await wait(.05); phone.classList.add('show');
    const live = () => S.stage === 'chase' && !S.failed;     // a win or a fail in the meantime owns the phone
    await typing('Dave', .6); if (!live()) return; say('Dave', 'wait… why does the receipt say "COCONUT CREEK PD"'); await wait(.9); if (!live()) return;
    await typing('Dave', .6); if (!live()) return; say('Dave', 'bro you got the POLICE STATION\'S lunch order 😳'); await wait(2.4); if (!live()) return;
    phone.classList.remove('show'); await wait(.3); if (live()) phone.hidden = true;
  }
  function clearThugs() { if (CB.clerk) CB.clerk.root.visible = false; CB.t = 0; S.park = null; }

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
    const st = startOn(x, z) || [{ n: nearestNode(x, z), pre: [], L: 0 }]; if (!be) return route(st[0].n, nearestNode(px, pz));
    let best = null;
    for (const o of st) { route(o.n, -1); const la = o.L + gd[be.a] + bj * 10 + (CLOSED.get(be.k) === be.a ? 1e4 : 0), lb = o.L + gd[be.b] + (be.P.length - bj) * 10 + (CLOSED.get(be.k) === be.b ? 1e4 : 0);
      if (!best || la < best.c) best = { c: la, o, end: 'a' }; if (lb < best.c) best = { c: lb, o, end: 'b' }; }
    const R = route(best.o.n, be[best.end]), tail = best.end === 'a' ? be.P.slice(0, bj + 1) : be.P.slice(bj).reverse();
    return best.o.pre.concat(R, tail);
  }
  function startOn(x, z) {                               // round 50: start on the street you are on (both ways to its end nodes), not at the nearest junction (the new map's junctions are far apart)
    let be = null, bj = 0, bd = 1e18; for (const e of GE) for (let j = 0; j < e.P.length; j++) { const d = (e.P[j][0] - x) ** 2 + (e.P[j][1] - z) ** 2; if (d < bd) { bd = d; be = e; bj = j; } }
    if (!be || bd > 400) return null; const len = A => { let L = 0; for (let k = 1; k < A.length; k++) L += Math.hypot(A[k][0] - A[k - 1][0], A[k][1] - A[k - 1][1]); return L; };
    const toA = be.P.slice(0, bj + 1).reverse(), toB = be.P.slice(bj); return [{ n: be.a, pre: toA, L: len(toA) }, { n: be.b, pre: toB, L: len(toB) }];
  }
  // round 50: places a rocket cop / SWAT van can come from: every ~10 m along every street (junctions alone left long stretches with nowhere to spawn)
  const SPD = []; for (const e of GE) for (let j = 0; j < e.P.length - 1; j++) { const a = e.P[j], b = e.P[j + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 10)); for (let i = 0; i < n; i++) SPD.push({ x: a[0] + (b[0] - a[0]) * i / n, z: a[1] + (b[1] - a[1]) * i / n }); }
  const lerp = (a, k) => a[0] + (a[1] - a[0]) * k, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const RK = [];
  for (let i = 0; i < 8; i++) {
    const car = makeCar('police', '#f4f4f4'); car.group.visible = false;
    const bar = makeLightbar(THREE, car);
    const col = { poly: [[1e5, 1e5], [1e5 + 1, 1e5], [1e5, 1e5 + 1], [1e5, 1e5 + 2]], cx: 1e5, cz: 1e5, r: 3, vx: 0, vz: 0, mass: 1, missile: true }; colliders.push(col);
    const r = { car, bar, col, on: false }; col.push = (dx, dz, dw) => { r.vx += dx * .2; r.vz += dz * .2; r.spin += dw * 4 + (Math.random() - .5) * 6; }; RK.push(r);
  }
  { const decal = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#141a24'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#f2f2f2'; g.font = '900 46px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SWAT', 128, 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshLambertMaterial({ map: t }); })();
    for (let i = 0; i < 3; i++) {                        // SWAT vans: same driver as the rockets, heavier, they hold the road and can skid to a stop across it
      const car = makeCar('van', '#1b2230'); car.group.visible = false; const L = car.dims[0], Wd = car.dims[1], H = car.dims[3] || 2.2;
      for (const s_ of [-1, 1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(L * .55, L * .14), decal); pl.position.set(s_ * (Wd / 2 + .02), H * .55, 0); pl.rotation.y = s_ * Math.PI / 2; car.group.add(pl); }
      const bar = makeLightbar(THREE, car, { y: H + .02, z: -L * .3, w: 1.4, pool: 6.5 });
      const col = { poly: [[1e5, 1e5], [1e5 + 1, 1e5], [1e5, 1e5 + 1], [1e5, 1e5 + 2]], cx: 1e5, cz: 1e5, r: 3.5, vx: 0, vz: 0, mass: 1, missile: true }; colliders.push(col);
      const r = { car, bar, col, on: false, swat: true }; col.push = (dx, dz, dw) => { r.vx += dx * .08; r.vz += dz * .08; r.spin += dw * 1.5; }; RK.push(r);
    } }
  function blocked(ax, az, bx, bz, skip) {               // anything solid on the straight line from a to b? (samples every 3.5 m)
    const L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / 3.5), stop = Math.max(0, (L - 5) / L);       // stops 5 m short of b (your own car is there)
    for (let i = 1; i < n; i++) { const f = i / n; if (f > stop) break; const x = ax + (bx - ax) * f, z = az + (bz - az) * f, q = pushCircle(x, z, .9, skip); if (Math.abs(q[0] - x) + Math.abs(q[1] - z) > .05) return true; }
    return false;
  }
  function launch(P, k, onScreen) {
    const r = RK.find(q => !q.on && !q.swat); if (!r || !SPD.length) return;
    const sp = Math.hypot(P.vx, P.vz), ux = sp > 2 ? P.vx / sp : -Math.sin(P.th), uz = sp > 2 ? P.vz / sp : -Math.cos(P.th), late = k >= DAVE.cutIn;
    const way = late ? null : routeTo(P.x, P.z, DAVE.house[0], DAVE.house[1]), onWay = (x, z) => { if (!way) return 0; for (let j = 0; j < way.length; j += 2) if (Math.abs(way[j][0] - x) + Math.abs(way[j][1] - z) < 14) return 1; return 0; };
    const cand = [];
    for (let i = 0; i < SPD.length; i++) {                // a road node off-screen: ahead of you early (they come down the road at you), from the sides late, where the line to you is clear
      const dx = SPD[i].x - P.x, dz = SPD[i].z - P.z, d = Math.hypot(dx, dz); if (d < (late ? 40 : 65) || d > (late ? 85 : 125) || onScreen(SPD[i].x, SPD[i].z)) continue;
      const fwd = (dx * ux + dz * uz) / d; cand.push([(late ? 1 - Math.abs(fwd) * .6 : fwd + onWay(SPD[i].x, SPD[i].z) * 1.5) + Math.random() * (late ? 1.2 : .5), i]);
    }
    cand.sort((a, b) => b[0] - a[0]); let best = cand.length ? cand[0][1] : -1;
    if (late) for (const [, i] of cand.slice(0, 8)) if (!blocked(SPD[i].x, SPD[i].z, P.x, P.z, null)) { best = i; break; }
    if (best < 0) return; const n = SPD[best];
    const path = routeTo(n.x, n.z, P.x, P.z); let aim = [P.x, P.z];                  // start pointed along the road (or at you, when the line is clear)
    if (!(late && !blocked(n.x, n.z, P.x, P.z, null))) for (const q of path) if (Math.hypot(q[0] - n.x, q[1] - n.z) > 8) { aim = q; break; }
    const th = Math.atan2(-(aim[0] - n.x), -(aim[1] - n.z)), v0 = lerp(DAVE.rocketSpeed, k) * .5;
    Object.assign(r, { on: true, x: n.x, z: n.z, th, vx: -Math.sin(th) * v0, vz: -Math.cos(th) * v0, spin: 0, roll: 0, t: 0, hit: false, crash: 0, near: 1e9, path, pi: 0, repath: 1.2, los: false, losT: 0, k });
    r.col.mass = env.carMass * DAVE.missileMass; r.car.group.visible = true; r.car.setDamage && r.car.setDamage(0);
  }
  function launchSwat(P, onScreen) {                     // from a road node ahead of you, 55-100 m out, off-screen: they come out of side streets on your way to Dave's
    const r = RK.find(q => !q.on && q.swat); if (!r || !SPD.length) return false;
    const way = routeTo(P.x, P.z, DAVE.house[0], DAVE.house[1]); let best = -1, bs = -1e9;
    for (let i = 0; i < SPD.length; i++) { const n = SPD[i], d = Math.hypot(n.x - P.x, n.z - P.z); if (d < 55 || d > 100 || onScreen(n.x, n.z)) continue; let w = 0; for (let j = 0; j < way.length; j += 2) if (Math.abs(way[j][0] - n.x) + Math.abs(way[j][1] - n.z) < 30) { w = 1; break; } const sc = w * 2 + Math.random(); if (sc > bs) { bs = sc; best = i; } }
    if (best < 0) return false; const n = SPD[best], path = routeTo(n.x, n.z, P.x, P.z); let aim = [P.x, P.z]; for (const q of path) if (Math.hypot(q[0] - n.x, q[1] - n.z) > 8) { aim = q; break; }
    const th = Math.atan2(-(aim[0] - n.x), -(aim[1] - n.z));
    Object.assign(r, { on: true, x: n.x, z: n.z, th, vx: -Math.sin(th) * 15, vz: -Math.cos(th) * 15, spin: 0, roll: 0, t: 0, hit: false, hitCD: 0, crash: 0, near: 1e9, path, pi: 0, repath: 1.2, los: false, losT: 0, k: 1, blockT: 0, blocked: false, hp: 2 });
    r.col.mass = env.carMass * DAVE.swatMass; r.car.group.visible = true; return true;
  }
  function park(r) { r.on = false; r.car.group.visible = false; r.col.cx = r.col.cz = 1e5; for (const q of r.col.poly) { q[0] = 1e5; q[1] = 1e5; } r.col.vx = r.col.vz = 0; }
  function rocketStep(dt, P, k) {
    for (const r of RK) {
      if (!r.on) continue; r.t += dt; r.k = Math.max(r.k, k);
      const dx = P.x - r.x, dz = P.z - r.z, d = Math.hypot(dx, dz), v = Math.hypot(r.vx, r.vz);
      let vmax = lerp(DAVE.rocketSpeed, r.k), late = r.k >= DAVE.cutIn, grip = lerp(DAVE.rocketGrip, r.k), care = 1 - .45 * r.k;
      if (r.swat) { vmax = DAVE.swatSpeed; grip = 15; care = .5; late = true; r.hitCD = Math.max(0, r.hitCD - dt); if (r.hitCD <= 0) r.hit = false; }
      // where to go: the player (with lead) when close or, late, when the line is clear; else the next point on the road route
      r.losT -= dt; if (late && r.losT <= 0) { r.losT = .3; r.los = d < 95 && !blocked(r.x, r.z, P.x, P.z, r.col); }
      const lead = clamp(d / Math.max(v, 8), 0, 1.4) * (.5 + .5 * r.k); let tx = P.x + P.vx * lead, tz = P.z + P.vz * lead, onRoute = false;
      if (!r.crash && !(d < 16 || r.los)) {
        r.repath -= dt; if (!r.path || r.repath <= 0) { r.path = routeTo(r.x, r.z, P.x, P.z); r.pi = 0; r.repath = 1.2; }
        while (r.pi < r.path.length && Math.hypot(r.path[r.pi][0] - r.x, r.path[r.pi][1] - r.z) < 7 + v * .25) r.pi++;
        if (r.pi < r.path.length) { tx = r.path[r.pi][0]; tz = r.path[r.pi][1]; onRoute = true; }
      }
      if (onRoute) { grip *= r.swat ? 1.6 : 2.2; care = Math.max(care, .6); }              // on the road they hold the road (they must reach you); off it, they drift
      else if (!r.crash) { care = .25 * (1 - r.k); grip *= 1.3; }           // coming straight at you: (almost) no braking, a bit more bite to line up
      r.near = Math.min(r.near, d);
      // steering: the nose turns at what the grip allows at this speed (fast = barely turns); velocity follows the nose only as fast as the grip allows (late = drifts)
      if (r.swat && !r.blocked && !r.crash) {           // a SWAT van that got in front of you on your line: skids to a stop across the road (3 s), then comes for you
        const ps = Math.hypot(P.vx, P.vz), ux = ps > 3 ? P.vx / ps : 0, uz = ps > 3 ? P.vz / ps : 0, ah = -dx * ux - dz * uz, sd = Math.abs(-dx * uz + dz * ux);
        if (ps > 6 && ah > 10 && ah < 38 && sd < 6) { r.blocked = true; r.blockT = 3; r.bth = Math.atan2(-uz, ux); }
      }
      if (r.blockT > 0) { r.blockT -= dt; tx = r.x - Math.sin(r.bth) * 10; tz = r.z - Math.cos(r.bth) * 10; }
      const want = r.blockT > 0 ? r.bth : Math.atan2(-(tx - r.x), -(tz - r.z)); let da = wrap(want - r.th);
      if (r.crash) { r.th += r.spin * dt; r.spin *= Math.exp(-1.2 * dt); r.crash += dt; }
      else { const rate = r.blockT > 0 ? 2.4 : Math.min(3, grip * (1 + 1.6 * r.k) / Math.max(v, 4)); r.th += clamp(da, -rate * dt, rate * dt) + r.spin * dt; r.spin *= Math.exp(-2 * dt); }
      // speed: early they brake for corners on the route (rules of the road); late they never lift
      let corner = 0; if (onRoute && r.pi + 3 < r.path.length) { const a = r.path[r.pi], b = r.path[Math.min(r.path.length - 1, r.pi + 4 + Math.round(v / 8))]; corner = Math.abs(wrap(Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) - r.th)); }
      const vt = r.crash || r.blockT > 0 ? 0 : vmax * (1 - care * .75 * clamp(Math.max(corner, Math.abs(da)) / 1.3, 0, 1));
      const fx = -Math.sin(r.th), fz = -Math.cos(r.th); let vf = r.vx * fx + r.vz * fz, vl = r.vx * fz - r.vz * fx;
      vf += clamp(vt - vf, -22 * dt, (14 + 10 * r.k) * dt); const gl = (r.crash ? 6 : grip) * dt; vl = Math.abs(vl) <= gl ? 0 : vl - Math.sign(vl) * gl;
      r.vx = fx * vf + fz * vl; r.vz = fz * vf - fx * vl;
      // slamming into you (checked before the move: the car-vs-world push below would otherwise stop them at your bumper and count it as a wall)
      const reach = 1.7 + (P.L || 4.5) / 2 + .9;
      if (!r.hit && d < reach && env.hmode === 'driving' && !env.air) {
        r.hit = true; const rv = Math.hypot(r.vx - P.vx, r.vz - P.vz), f = clamp(rv / 30, .35, 1.2); env.hurt((r.swat ? DAVE.swatHurt : lerp(DAVE.rocketHurt, r.k)) * f, dx / (d || 1), dz / (d || 1)); hurtFlash(); env.sound('crash');
        if (env.kick) env.kick(r.vx * .45 * f, r.vz * .45 * f, (Math.random() < .5 ? -1 : 1) * (1.5 + 2.5 * f)); if (burst) burst(P.x - dx / 2, .8, P.z - dz / 2, -dx / (d || 1), -dz / (d || 1), rv);
        if (r.swat) { r.hitCD = 1.5; r.vx *= .5; r.vz *= .5; } else { r.vx *= .3; r.vz *= .3; r.spin += (Math.random() - .5) * 8; r.crash = .01; }
      }
      // move and hit the world: walls stop them; a hard hit spins them out
      if (env.inWater(r.x, r.z)) { const sp_ = Math.hypot(r.vx, r.vz); if (sp_ > 6.5) { r.vx *= 6.5 / sp_; r.vz *= 6.5 / sp_; } }      // water: a crawl, like you
      const nx = r.x + r.vx * dt, nz = r.z + r.vz * dt, q = pushCircle(nx, nz, 1.7, B => B === r.col || B.water), ox = q[0] - nx, oz = q[1] - nz, od = Math.hypot(ox, oz);
      if (od > .02) { const ux = ox / od, uz = oz / od, vn = r.vx * ux + r.vz * uz;
        if (vn < 0) { if (-vn > (r.swat ? 34 : onRoute ? 22 : 15) && !r.crash) { r.crash = .01; r.spin = (Math.random() < .5 ? -1 : 1) * (3 + Math.min(6, -vn / 6)); if (burst) burst(q[0], .6, q[1], ux, uz, -vn); if (d < 60) env.sound('crash'); } r.vx -= vn * ux * (r.crash ? 1.3 : 1); r.vz -= vn * uz * (r.crash ? 1.3 : 1); } }
      r.x = q[0]; r.z = q[1]; r.roll += (clamp(-vl / 25, -.12, .12) - r.roll) * Math.min(1, dt * 6);
      const gone = r.swat ? (r.t > 30 || d > 160 || r.crash > 3) : r.t > 16 || d > 150 || (r.crash > 2 && d > 15) || r.crash > 4 || (r.hit && r.t > 6 && d > 30);
      if (gone) { park(r); continue; }
      placeOnGround(r.car.group, r.x, r.z, r.th); r.car.group.rotation.z = r.roll;
      r.col.poly = carPoly(r.x, r.z, r.th, r.car.dims); r.col.cx = r.x; r.col.cz = r.z; r.col.r = 3; r.col.vx = r.vx; r.col.vz = r.vz;
    }
  }
  const pv = new THREE.Vector3();
  function warnStep(P) {                                   // a whoosh, panned toward it, about a second before a rocket cop reaches you (round 36: the red screen-edge arrow is gone, user: hideous, blocks play)
    for (const r of RK) {
      if (!r.on) { r.warned = false; continue; }
      if (r.warned || r.hit || r.crash || env.hmode !== 'driving') continue;
      const dx = P.x - r.x, dz = P.z - r.z, d = Math.hypot(dx, dz), vc = ((r.vx - P.vx) * dx + (r.vz - P.vz) * dz) / (d || 1);
      if (d < 70 && vc > 4 && d / vc < 1.3) { r.warned = true; pv.set(r.x, 1, r.z).project(D.camera); env.sound('whoosh', pv.z > 1 ? -pv.x : pv.x); }
    }
  }
  function blast(x, z, rad, emp = false) {                              // a rocket blast: rocket cops inside it spin out and wreck, a SWAT van takes two
    let n = 0;
    for (const r of RK) { if (!r.on || r.crash) continue; const d = Math.hypot(r.x - x, r.z - z); if (d > rad) continue; const k = (rad - d) / rad;
      r.vx += (r.x - x) / (d || 1) * 14 * k; r.vz += (r.z - z) / (d || 1) * 14 * k; r.spin = (Math.random() < .5 ? -1 : 1) * (4 + 4 * k);
      if (r.swat && !emp) { r.hp = (r.hp ?? 2) - 1; if (r.hp > 0) { r.vx *= .4; r.vz *= .4; r.blockT = 0; continue; } }
      r.crash = .01; r.car.setDamage && r.car.setDamage(1); n++; }
    return n;
  }
  // ---------- the relay: Marc goes down -> the groceries fly to Aaron (slow motion, invulnerable), then Aaron drives ----------
  const BAG = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 160; const g = c.getContext('2d');
    g.fillStyle = '#c8a77a'; g.fillRect(0, 0, 128, 160); g.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < 9; i++) g.fillRect(i * 15, 0, 2, 160);
    g.fillStyle = '#2e8b3e'; g.font = '800 26px system-ui'; g.textAlign = 'center'; g.fillText('Publix', 64, 40);
    g.save(); g.translate(64, 100); g.rotate(-.12); g.fillStyle = '#fff'; g.fillRect(-52, -26, 104, 52); g.strokeStyle = '#d33'; g.lineWidth = 4; g.strokeRect(-50, -24, 100, 48);
    g.fillStyle = '#111'; g.font = '800 15px system-ui'; g.fillText('FOR', 0, -6); g.fillStyle = '#1d3f8a'; g.font = '900 19px system-ui'; g.fillText('CREEK PD', 0, 15); g.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const side = new THREE.MeshLambertMaterial({ color: 0xc8a77a }), face = new THREE.MeshLambertMaterial({ map: t });
    const grp = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(.5, .62, .32), [side, side, side, side, face, face]); body.position.y = .31; grp.add(body);
    const fold = new THREE.Mesh(new THREE.BoxGeometry(.5, .08, .36), new THREE.MeshLambertMaterial({ color: 0xb8956a })); fold.position.y = .64; grp.add(fold);
    const celery = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, .5, 6), new THREE.MeshLambertMaterial({ color: 0x7fbf4a })); celery.position.set(-.12, .78, .02); celery.rotation.z = .25; grp.add(celery);
    const loaf = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .55, 8), new THREE.MeshLambertMaterial({ color: 0xd9a24e })); loaf.position.set(.1, .8, -.04); loaf.rotation.z = -.3; grp.add(loaf);
    grp.visible = false; scene.add(grp); return grp;
  })();
  function intercept(kind) {                               // the game asks before Wasted / Busted: Marc (with the launcher) going down hands the groceries to Aaron
    return false;                                        // round 34: off (each driver now runs a whole chapter); the hand-off is kept for the planned final relay mission
    if (S.stage !== 'chase' || S.failed || !UP.rockets || S.relay || env.cur !== 0) return false;
    startRelay(); return true;
  }
  function startRelay() {
    S.stage = 'relay'; S.relay = 1; env.invuln = true; env.slowmo(.04); if (env.launcher) env.launcher.reset(); if (env.music) env.music.level(1);
    const P = S.lastP, path = routeTo(P[0], P[1], DAVE.house[0], DAVE.house[1]); let acc = 0, px = P[0], pz = P[1], at = null, th = 0;
    for (let i = 0; i < path.length; i++) { const q = path[i], L = Math.hypot(q[0] - px, q[1] - pz); if (acc + L >= DAVE.relayAhead && L > .01) { at = q; th = Math.atan2(-(q[0] - px), -(q[1] - pz)); break; } acc += L; px = q[0]; pz = q[1]; }
    if (!at) { at = [P[0] - Math.sin(S.cth || 0) * 30, P[1]]; }
    env.placeRide(1, at[0], at[1], th); S.rl = { t0: performance.now(), a: [P[0], P[1]], b: [at[0], at[1]], th };
    BAG.visible = true; BAG.scale.setScalar(1); banner('HAND-OFF!');
  }
  function relayStep() {                                   // real time (the world runs at 4 %): up toward the screen, hang at the top, down into the Tesla
    const R = S.rl, T = (performance.now() - R.t0) / 1000, UPT = 1.1, HOLD = .9, DOWN = .8, mx = (R.a[0] + R.b[0]) / 2, mz = (R.a[1] + R.b[1]) / 2;
    env.camHold({ x: mx, z: mz, yaw: R.th, pitch: 52, dist: 34 });
    const cam = D.camera.position, peak = new THREE.Vector3(mx + (cam.x - mx) * .7, cam.y * .7, mz + (cam.z - mz) * .7);       // close to the lens, so it fills a good part of the screen
    const e = t => t * t * (3 - 2 * t); let p, spin;
    let sc = 1;
    if (T < UPT) { const k = e(T / UPT); p = new THREE.Vector3(R.a[0], 1.6, R.a[1]).lerp(peak, k); p.y += Math.sin(k * Math.PI) * 2; spin = 12 * (1 - k); sc = 1 + 2.6 * k; }
    else if (T < UPT + HOLD) { p = peak.clone(); p.y += Math.sin((T - UPT) * 4) * .08; spin = 0; sc = 3.6; }
    else { const k = Math.min(1, (T - UPT - HOLD) / DOWN), k2 = k * k; p = peak.clone().lerp(new THREE.Vector3(R.b[0], 1.2, R.b[1]), k2); spin = 14 * k; sc = 3.6 - 2.6 * k2; }
    BAG.position.copy(p); BAG.scale.setScalar(sc);
    if (spin > 0) BAG.rotation.y += spin * .016; else { BAG.lookAt(cam.x, BAG.position.y, cam.z); }      // at the top it turns its sticker to you
    if (T >= UPT + HOLD + DOWN) endRelay();
  }
  function endRelay() {
    BAG.visible = false; env.camHold(null); env.slowmo(1); env.relayTo(1, true); env.hurtK = UP.emp ? DAVE.aaronHurtEmp : DAVE.aaronHurt; env.heal();
    S.stage = 'chase'; S.checkpoint = 'relay'; S.cpRelay = { x: S.rl.b[0], z: S.rl.b[1], th: S.rl.th, cops: S.cops, t: S.t }; banner(UP.emp ? 'AARON + EMP' : 'AARON\'S GOT IT');
    setTimeout(() => { env.invuln = false; }, 1200);
  }
  // ---------- EMP (Aaron, after his first failure): a pulse that wrecks every police car within reach ----------
  const empBtn = document.createElement('button'); empBtn.id = 'b-emp'; empBtn.hidden = true; empBtn.innerHTML = '<span>EMP</span>'; document.body.appendChild(empBtn);
  { const st = document.createElement('style'); st.textContent = '#b-emp{position:fixed;z-index:3;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(222px + env(safe-area-inset-bottom,0px));width:76px;height:76px;border-radius:50%;border:0;padding:0;font:700 15px/1 var(--display,system-ui);letter-spacing:.1em;color:#04131a;background:conic-gradient(#3fd8ff var(--p,100%),rgba(10,24,32,.85) 0);box-shadow:0 0 0 3px rgba(0,0,0,.5),0 0 16px rgba(63,216,255,.7);touch-action:none}#b-emp span{display:grid;place-items:center;position:absolute;inset:6px;border-radius:50%;background:#bff3ff}#b-emp.wait span{background:#2a3c44;color:#9ab}#b-emp[hidden]{display:none}body.cine #b-emp{visibility:hidden}'; document.head.appendChild(st); }
  const ring = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5fe3ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  ring.visible = false; scene.add(ring); const EMPS = { cool: 0, t: -1, x: 0, z: 0 };
  function empFire() {
    if (!UP.emp || env.cur !== 1 || EMPS.cool > 0 || S.stage !== 'chase' || !S.lastP) return;
    const [x, z] = S.lastP; EMPS.cool = DAVE.emp.cool; EMPS.t = 0; EMPS.x = x; EMPS.z = z; ring.position.set(x, .3, z); ring.visible = true;
    cops.blowUp(x, z, DAVE.emp.radius); env.wrecks += blast(x, z, DAVE.emp.radius, true); env.sound('zap');
    if (env.fx) { env.fx.puff(x, 1, z, 7, 0x8fefff, .25, 0, 5, true); for (let i = 0; i < 4; i++) env.fx.debris(x, 1, z, 0, 0, 14, '#9ff4ff', 10, 4, .7); }
  }
  empBtn.addEventListener('pointerdown', e => { e.preventDefault(); empFire(); }); addEventListener('keydown', e => { if (e.code === 'KeyE') empFire(); });
  function empStep(dt) {
    EMPS.cool = Math.max(0, EMPS.cool - dt); const show = UP.emp && env.cur === 1 && S.stage === 'chase' && env.hmode === 'driving'; if (empBtn.hidden === show) empBtn.hidden = !show;
    if (show) { empBtn.style.setProperty('--p', Math.round((1 - EMPS.cool / DAVE.emp.cool) * 100) + '%'); empBtn.classList.toggle('wait', EMPS.cool > 0); }
    if (EMPS.t >= 0) { EMPS.t += dt; const k = Math.min(1, EMPS.t / .5); ring.scale.setScalar(1 + k * DAVE.emp.radius); ring.material.opacity = (1 - k) * .9; if (k >= 1) { EMPS.t = -1; ring.visible = false; } }
  }
  function clearMissiles() { for (const r of RK) { park(r); r.warned = false; } }
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4(), sph = new THREE.Sphere(new THREE.Vector3(), 5);
  const onScreen = (x, z) => { sph.center.set(x, 1, z); return frustum.intersectsSphere(sph); };

  // ---------- roadblocks: real ones. Striped "ROAD CLOSED" barricades (Type III, flashing amber lamps) across the road and sidewalks, cones in front,
  // concrete jersey barriers over the verges, and two cruisers parked at angles behind with their lights going. The gap block keeps a car-wide gap lined with cones.
  // Everything but the cruisers is instanced (a handful of draw calls for all three blocks).
  const RB = { on: false, blockers: [] };
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
  // round 50: each block is its own record (built on a graph edge, `at` m in from its end node), so the police can also throw new ones up ahead of you during the chase
  // (user: "I didn't see the road blocks"; the fixed ones sat where the route arrow already steered you round them)
  RB.fixed = []; RB.dyn = []; RB.lampMat = MAT.lamp.clone();
  function buildBlock(k, from, at_, gapW) {
    const e = graph.edges[k], B = { at: at_, gap: gapW }; let P = e.pts.map(q => [q[0], -q[1]]); if (from === 'b') P = P.reverse();
    const rec = { k, node: e[from], gap: !!gapW, parts: [], cols: [], shown: false, x: 0, z: 0, blocker: null };
    const I = {}; for (const kk in GEO) I[kk] = [];
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v3 = new THREE.Vector3();
    const put = (kk, x, y, z, th) => { q4.setFromAxisAngle(up, th); I[kk].push(m4.compose(v3.set(x, y, z), q4, one).clone()); };
    const solid = (x, z, th, dims) => rec.cols.push({ poly: carPoly(x, z, th, dims), cx: x, cz: z, r: Math.hypot(dims[0], dims[1]) / 2 + .2, vx: 0, vz: 0, low: true });
    const free = (x, z) => { const q = pushCircle(x, z, 1.2, null); return Math.abs(q[0] - x) + Math.abs(q[1] - z) < .05; };
    let acc = 0, at = P[P.length - 1], dir = [1, 0];
    for (let j = 1; j < P.length; j++) { const L = Math.hypot(P[j][0] - P[j - 1][0], P[j][1] - P[j - 1][1]); if (acc + L >= B.at) { const f = (B.at - acc) / L; at = [P[j - 1][0] + (P[j][0] - P[j - 1][0]) * f, P[j - 1][1] + (P[j][1] - P[j - 1][1]) * f]; dir = [(P[j][0] - P[j - 1][0]) / L, (P[j][1] - P[j - 1][1]) / L]; break; } acc += L; }
    rec.x = at[0]; rec.z = at[1];
    const nx = -dir[1], nz = dir[0], span = e.hw + 3.0, wing = e.hw + 22, g0 = B.gap ? e.hw * .45 : 1e9, thN = Math.atan2(-nz, nx);    // local x of each part runs across the road (along n)
    const W = (u, f) => [at[0] + nx * u + dir[0] * f, at[1] + nz * u + dir[1] * f];         // u across the road, f along it (+ = away from the end the block sits at)
    const inGap = (a, b) => B.gap && b > g0 - B.gap / 2 && a < g0 + B.gap / 2;
    const bars = []; for (let u = -span; u < span - .5; u += 2.55) if (!inGap(u, u + 2.4)) bars.push(u + 1.2);
    for (const c of bars) {                                                        // Type III barricade: metal legs with feet, three striped wooden boards, an amber lamp on top
      const [x, z] = W(c, 0);
      for (const s_ of [-1.05, 1.05]) { const [lx, lz] = W(c + s_, 0); put('leg', lx, .68, lz, thN); put('foot', lx, .05, lz, thN); }
      for (const h of [.5, .85, 1.2]) put('board', x, h, z, thN);
      const [lx, lz] = W(c + (bars.indexOf(c) % 2 ? -1.05 : 1.05), 0); put('lamp', lx, 1.44, lz, thN);
      solid(x, z, thN + Math.PI / 2, [2.45, .7]);
    }
    const mid = bars.length ? bars[Math.floor(bars.length / 2)] : 0, signs = B.gap ? [bars.find(c => c < g0) ?? mid, bars.find(c => c > g0) ?? mid] : [mid];
    for (const c of signs) for (const f of [-.04, .04]) { const [x, z] = W(c, f); put('sign', x, 1.62, z, thN); }   // ROAD CLOSED, readable from both sides
    for (let u = -e.hw + .6; u < e.hw; u += 1.5) for (const f of [-2.2, 2.2]) { if (inGap(u - .3, u + .3)) continue; const [x, z] = W(u, f); put('cone', x, 0, z, 0); put('band', x, 0, z, 0); put('base', x, 0, z, 0); }
    if (B.gap) for (let f = -9; f <= 9; f += 1.8) for (const sd of [-1, 1]) { const [x, z] = W(g0 + sd * (B.gap / 2 + .25 + Math.max(0, Math.abs(f) - 2) * .25), f); put('cone', x, 0, z, 0); put('band', x, 0, z, 0); put('base', x, 0, z, 0); }   // a funnel of cones into the gap
    const lo = Math.min(-span, ...bars.map(c => c - 1.2)), hi = Math.max(span, ...bars.map(c => c + 1.2));
    for (const [from_, sgn] of [[hi, 1], [lo, -1]]) for (let u = from_; Math.abs(u) < wing; u += sgn * 3) {    // jersey barriers over the verges (skipping any inside a building or tree)
      const c = u + sgn * 1.5, [x, z] = W(c, 0); if (!free(x, z)) continue; put('conc', x, 0, z, thN); for (const f of [-.12, .12]) { const [rx, rz] = W(c, f); put('refl', rx, .62, rz, thN); } solid(x, z, thN + Math.PI / 2, [3, .62]);
    }
    for (const [u, f, turn] of (B.gap ? [[-e.hw * .6, 7.5, -.6], [e.hw * .2 + 3, 11, .5]] : [[-e.hw * .35, 7, -.7], [e.hw * .45, 9.5, .8]])) {    // two cruisers behind, angled across their lanes
      const [x, z] = W(u, f), car = makeCar('police', '#f4f4f4'), th = Math.atan2(-dir[0], -dir[1]) + turn;
      placeOnGround(car.group, x, z, th); solid(x, z, th, car.dims); makeLightbar(THREE, car); car.group.visible = false; scene.add(car.group);
      rec.parts.push({ obj: car.group, cx: x, cz: z });
    }
    rec.blocker = { x: at[0], z: at[1], vx: 0, vz: 0, L: 1.5, W: 2 * span, nx, nz, gap: !!B.gap };
    for (const kk in I) { if (!I[kk].length) continue; const im = new THREE.InstancedMesh(GEO[kk], kk === 'lamp' ? RB.lampMat : MAT[kk], I[kk].length); I[kk].forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
      im.castShadow = kk !== 'lamp' && kk !== 'refl' && kk !== 'base'; im.receiveShadow = true; im.visible = false; scene.add(im); rec.parts.push({ obj: im, cx: at[0], cz: at[1], r: 160 }); }
    return rec;
  }
  function showBlock(rec, on) {
    if (rec.shown === on) return; rec.shown = on;
    for (const c of rec.cols) { const i = colliders.indexOf(c); if (on && i < 0) colliders.push(c); else if (!on && i >= 0) colliders.splice(i, 1); }
    if (!on) for (const p of rec.parts) p.obj.visible = false;
    if (!rec.gap) { if (on) { SHUT.add(rec.k); CLOSED.set(rec.k, rec.node); } else { SHUT.delete(rec.k); CLOSED.delete(rec.k); } }
  }
  function killBlock(rec) { showBlock(rec, false); for (const p of rec.parts) { scene.remove(p.obj); if (p.obj.isInstancedMesh) p.obj.dispose(); } }
  const liveBlocks = () => RB.fixed.concat(RB.dyn).filter(r => r.shown);
  function syncBlocks() { const L = liveBlocks(); RB.blockers = L.map(r => r.blocker); if (env.setBlocks) env.setBlocks(RB.blockers, [...SHUT]); }
  function roadblocks() {
    if (!graph) return; const set = S.ch === 2 ? 'far' : 'near';
    if (RB.set !== set) {
      for (const r of RB.fixed) killBlock(r); RB.fixed = []; RB.set = set;
      for (const B of set === 'far' ? DAVE.blocks.concat(DAVE.blocksFar) : DAVE.blocks) {
        let best = null, bd = 1e18;
        graph.edges.forEach((e, k) => { if (e.road !== B.road) return; for (const end of ['a', 'b']) { const n = GN[e[end]], d = Math.hypot(n.x - B.end[0], n.z - B.end[1]); const o = GN[e[end === 'a' ? 'b' : 'a']], od = B.other ? Math.hypot(o.x - B.other[0], o.z - B.other[1]) : 0; if (d + od < bd) { bd = d + od; best = { k, from: end }; } } });
        if (best) RB.fixed.push(buildBlock(best.k, best.from, B.at, B.gap));
      }
    }
    for (const r of RB.dyn) killBlock(r); RB.dyn = [];
    for (const r of RB.fixed) showBlock(r, true);
    RB.on = true; RB.dynT = DAVE.dynFirst ?? 7; syncBlocks();
  }
  function clearRoadblocks() {
    for (const r of RB.fixed) showBlock(r, false); for (const r of RB.dyn) killBlock(r); RB.dyn = [];
    RB.on = false; SHUT.clear(); CLOSED.clear(); RB.blockers = []; if (env.setBlocks) env.setBlocks([], []);
  }
  // round 50: the police close a street ahead of you: the first real junction 70-230 m up your route, the street you would take out of it, shut 16 m in.
  // Only where there is still a way round, never on the last 150 m, never where you can see it appear (on screen and closer than the fog); up to DAVE.dynBlocks at once, old ones behind you are taken down
  function dynBlocks(dt, P) {
    if (!DAVE.dynBlocks || !RB.on || !graph) return;
    for (const r of RB.dyn.slice()) if (Math.hypot(r.x - P.x, r.z - P.z) > 230 && !onScreen(r.x, r.z)) { killBlock(r); RB.dyn.splice(RB.dyn.indexOf(r), 1); syncBlocks(); }
    RB.dynT -= dt; if (RB.dynT > 0 || RB.dyn.length >= DAVE.dynBlocks) return; RB.dynT = 2.5;
    const R = routeTo(P.x, P.z, DAVE.house[0], DAVE.house[1]); RB.why = []; if (R.length < 4) return;
    let total = 0; for (let i = 1; i < R.length; i++) total += Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]);
    let acc = Math.hypot(R[0][0] - P.x, R[0][1] - P.z);
    for (let i = 1; i < R.length - 2; i++) {
      acc += Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]); if (acc < 70) continue; if (acc > 230 || total - acc < 150) { RB.why.push('end ' + Math.round(acc)); return; }
      const n = GN.findIndex(q => q.adj.length >= 3 && Math.abs(q.x - R[i][0]) + Math.abs(q.z - R[i][1]) < 1.5); if (n < 0) continue; RB.why.push('J' + n + '@' + Math.round(acc));
      let j = i + 1; while (j < R.length - 1 && Math.hypot(R[j][0] - GN[n].x, R[j][1] - GN[n].z) < 2) j++;     // the next route point past the junction (edges share their end point)
      const ed = GN[n].adj.find(a => a.P.some((q, m) => m > 0 && Math.abs(q[0] - R[j][0]) + Math.abs(q[1] - R[j][1]) < 1.5)); if (!ed || ed.L < 34 || SHUT.has(ed.k)) { RB.why.push(ed ? 'short/shut' : 'noedge'); continue; }
      const from = graph.edges[ed.k].a === n ? 'a' : 'b', at = 16, q = ed.P[Math.min(ed.P.length - 1, 2)];
      if (onScreen(q[0], q[1]) && Math.hypot(q[0] - P.x, q[1] - P.z) < 125) { RB.why.push('onscreen'); continue; }      // far ones are in the fog (165 m)
      const hn = nearestNode(DAVE.house[0], DAVE.house[1]), pn = nearestNode(P.x, P.z); route(pn, hn); const base = gd[hn];      // (the fixed blocks may already put a penalty on every way in)
      SHUT.add(ed.k); CLOSED.set(ed.k, n); route(pn, hn); const ok = gd[hn] < base + 5e3; SHUT.delete(ed.k); CLOSED.delete(ed.k);
      if (!ok) { RB.why.push('nodetour'); continue; }
      const rec = buildBlock(ed.k, from, at, 0); showBlock(rec, true); RB.dyn.push(rec); syncBlocks(); RB.dynT = DAVE.dynEvery ?? 14; banner('ROADBLOCK AHEAD'); return;
    }
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
    if (S.dave) daveStep(dt);
    if (S.stage === 'relay') { relayStep(); return; }
    empStep(dt);
    if (S.stage === 'cold') { coldStep(dt, P); return; }
    if (S.stage === 'off' || S.stage === 'intro' || S.stage === 'done' || S.failed) return;
    if (S.stage === 'arrive') { if (S.park && parkStep(dt)) { S.park = null; win(); } return; }
    if (env.respawning && performance.now() > (S.grace || 0)) { failMission(env.lastDeath === 'busted' ? 'Busted.' : 'Wasted.'); return; }
    const me = [P.x, P.z]; S.mt = (S.mt || 0) + dt; S.lastP = [P.x, P.z];
    if (S.stage === 'toPublix' && P.driving && dist(me, [STALL.x, STALL.z]) < 40) { S.stage = 'curbside'; S.checkpoint = 'publix'; objective('Pull into Curbside Pickup', 'drive onto the green spot'); }
    else if (S.stage === 'curbside') curbStep(dt, P);
    else if (S.stage === 'chase') {
      const armed = UP.rockets && S.ch === 0, cmax = DAVE.copMax + (armed ? DAVE.rocketsCopsExtra : 0), cevery = armed ? DAVE.rocketsCopEvery : DAVE.copEvery;
      S.copT += dt; if (S.cops < cmax && S.copT >= cevery) { S.copT = 0; S.cops++; cops.force(S.cops); banner(`${S.cops} COPS`); }
      pm.multiplyMatrices(D.camera.projectionMatrix, D.camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm); dynBlocks(dt, P);
      const dh = dist(me, DAVE.house);
      if (dh < 35) { objective('STOP IN THE DRIVEWAY', `${Math.round(dh)} m`); if (!S.stopSaid) { S.stopSaid = true; banner('STOP IN THE DRIVEWAY!'); } }
      else objective(GOAL[S.ch], `${Math.round(dh)} m${S.t < 12 ? ' · roads closed' : ''}`);
      if (!S.cpNear && dh < 70 && P.driving) { S.cpNear = { x: P.x, z: P.z, th: P.th, cops: S.cops, t: S.t }; banner('CHECKPOINT'); }
      S.t += dt; const pk = clamp(1 - (dh - 20) / Math.max(1, S.d0 - 20), 0, 1); S.heat = Math.min(1, pk * .7 + S.t / DAVE.rampTime * .4);
      if (S.heat > DAVE.rocketFrom && P.driving) {
        const k = (S.heat - DAVE.rocketFrom) / (1 - DAVE.rocketFrom); let on = 0; for (const r of RK) if (r.on) on++;
        S.missT -= dt; if (S.missT <= 0 && on < Math.round(lerp(DAVE.rocketMax, k))) { pm.multiplyMatrices(D.camera.projectionMatrix, D.camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm); launch(P, k, onScreen); S.missT = lerp(DAVE.rocketEvery, k) * (.8 + Math.random() * .4); }
      }
      if (S.heat > DAVE.swatFrom && P.driving) {
        const k2 = (S.heat - DAVE.swatFrom) / (1 - DAVE.swatFrom); let sw = 0; for (const r of RK) if (r.on && r.swat) sw++;
        S.swatT = (S.swatT ?? 1) - dt; if (S.swatT <= 0 && sw < DAVE.swatMax) { pm.multiplyMatrices(D.camera.projectionMatrix, D.camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pm); if (launchSwat(P, onScreen)) { if (!S.swatSaid) { S.swatSaid = true; banner('SWAT!'); } } S.swatT = lerp(DAVE.swatEvery, k2); }
      }
      if (env.music) { let sw = false; for (const r of RK) if (r.on && r.swat) sw = true; env.music.level(sw || S.heat > .6 ? 3 : S.cops >= 3 ? 2 : 1); }
      if (P.driving && (dh < 4 || inRect(P, DAVE.house[0], DAVE.house[1], DAVE.houseYaw, 2.6, 4.6))) {       // round 50: rolling onto the driveway is enough: the car parks itself, the camera swings in, Dave comes out
        S.stage = 'arrive'; env.invuln = true; clearMissiles(); objective(''); autoPark(P, DAVE.house[0], DAVE.house[1], DAVE.houseYaw, 3, true); return;
      }
      beacon.material.opacity = dh < 35 ? .5 + Math.sin(performance.now() / 120) * .15 : .38;
    }
    if (RB.on) {
      for (const r of RB.fixed.concat(RB.dyn)) if (r.shown) for (const p of r.parts) { const v = Math.hypot(p.cx - P.x, p.cz - P.z) < (p.r || 120); if (p.obj.visible !== v) p.obj.visible = v; }
      const amber = Math.floor(performance.now() / 420) % 2; RB.lampMat.color.setHex(amber ? 0xffb020 : 0x4a3008);
    }
    rocketStep(dt, P, S.heat > DAVE.rocketFrom ? (S.heat - DAVE.rocketFrom) / (1 - DAVE.rocketFrom) : 0); warnStep(P);
    const tg = target(); beacon.visible = !!tg; if (tg) { const k = 1 + Math.sin(performance.now() / 300) * .06; beacon.position.set(tg[0], 0, -tg[1]); beacon.scale.set(S.stage === 'curbside' ? .75 : k, 1, S.stage === 'curbside' ? .75 : k); }
  }
  function restart() { if (env.launcher) env.launcher.reset(); S.ch = 0; S.cpStart = null; UP.rockets = UP.emp = UP.jump = false; env.jump = false; S.relay = 0; S.cpRelay = null; env.hurtK = 1; env.invuln = false; BAG.visible = false; env.camHold(null); if (env.cur !== 0) { env.relayTo(0, false); for (const ci of [1, 2]) env.placeRide(ci, 5000 + ci * 10, 40, 0); } if (env.music) env.music.level(0); endFinish(false); S.cpNear = null; clearRoadblocks(); if (cops.goal) cops.goal(null); clearThugs(); clearMissiles(); cops.force(0); cops.lock(false); cops.clear(); fail.hidden = true; phone.hidden = true; S.failed = false; S.stage = 'off'; S.checkpoint = null; objective(''); env.heal(); env.resetCar(); start(); }
  function startChase() { if (env.launcher) { if (UP.rockets && env.cur === 0) env.launcher.deploy(true); else env.launcher.reset(); } roadblocks(); S.stage = 'chase'; S.cops = DAVE.copStart || 1; S.copT = 0; env.invuln = false; S.missT = 2; S.t = 0; S.heat = 0; S.d0 = Math.max(60, dist(S.cpStart ? [S.cpStart.x, S.cpStart.z] : [DAVE.lot[0], DAVE.lot[1]], DAVE.house)); S.checkpoint = 'chase'; env.hurtK = [1, UP.emp ? DAVE.aaronHurtEmp : DAVE.aaronHurt, DAVE.chrisHurt][S.ch]; env.jump = S.ch === 2 && UP.jump; cops.lock(true); cops.force(S.cops); if (cops.goal) { cops.goal(DAVE.house[0], DAVE.house[1]); cops.shut(SHUT, CLOSED); } S.stopSaid = false; S.swatSaid = false; S.swatT = 1; objective(GOAL[S.ch], 'roads closed'); banner('COPS!'); setTimeout(() => { if (S.stage === 'chase' && S.t < 6) banner('ROADS CLOSED'); }, 2000); }
  const GOAL = ['Get the groceries to Dave', 'Get the ketchup to Dave', 'Get the AC part to Dave'];
  function win() {
    if (S.ch < 2) { nextChapter(); return; }           // round 34: Marc and Aaron make it, and Dave finds a new problem
    if (env.launcher) env.launcher.deploy(false); env.hurtK = 1; env.jump = false; clearRoadblocks(); if (cops.goal) cops.goal(null); S.stage = 'done'; cops.force(0); cops.lock(false); cops.clear(); clearMissiles(); clearThugs(); objective(''); env.addMoney(DAVE.reward);
    const n = tries + 1; tries = 0; saveTries(); try { localStorage.removeItem('gtcc-dave-best'); } catch (e) { /* ok */ } best = 1e9;
    const stats = { time: S.mt || 0, n, wrecks: Math.max(0, env.wrecks - (S.w0 || 0)), hp: Math.round(env.hp) };
    if (env.music) env.music.sting('win'); env.slowmo(.3); banner(`MISSION PASSED  +$${DAVE.reward}`);
    (async () => {
      await wait(1.3); env.slowmo(1);
      // Dave comes out of his front door to the car (the hero model, tinted), the camera swings round from the street
      const dv = S.daveP || (S.daveP = makePerson({ jacket: '#8a3b3b' })); const door = [DAVE.house[0] - 3.8, DAVE.house[1] + 2.3];
      dv.root.position.set(door[0], 0, door[1]); dv.root.visible = true; dv.on = true; play(dv, 'walk'); S.dave = { t: 0, from: door, to: [DAVE.house[0] - 1.6, DAVE.house[1] - .4] };
      env.cine([{ a: [DAVE.house[0] - 1, DAVE.house[1] + .5], b: [DAVE.house[0] - 2, DAVE.house[1] + .5], y0: DAVE.houseYaw - .55, y1: DAVE.houseYaw + .25, pitch: 24, d0: 17, d1: 12, dur: 6 }]);
      msgs.innerHTML = ''; pick.hidden = true; skipBtn.hidden = true; phone.hidden = false; await wait(.05); phone.classList.add('show'); await typing('Dave', .8); say('Dave', 'CHRIS 😭 the AC is BACK 🥶'); await wait(.9); say('Dave', 'you guys are the best. for real'); await wait(.8);
      if (n > 3) { say('Dave', `${n} tries tho 😂`); await wait(.8); }
      say(env.CHARS[env.cur].name, 'never again.', true); await wait(1.2);
      const mm = Math.floor(stats.time / 60), ss = String(Math.floor(stats.time % 60)).padStart(2, '0');
      res.querySelector('dl').innerHTML = `<dt>Time</dt><dd>${mm}:${ss}</dd><dt>Attempt</dt><dd>${stats.n}</dd><dt>Cops wrecked</dt><dd>${stats.wrecks}</dd><dt>Health left</dt><dd>${stats.hp}</dd><dt>Reward</dt><dd>$${DAVE.reward}</dd>`;
      res.hidden = false;
    })();
  }
  // a road spot for a chapter start: on the road nearest (x, z), pointing along the way to Dave's
  function roadSpot(x, z) { if (DAVE.starts) return stopSpot(x, z, DAVE.house[0], DAVE.house[1]); const R = routeTo(x, z, DAVE.house[0], DAVE.house[1]); if (R.length < 6) return { x, z, th: 0 }; const a = R[2], b = R[5]; return { x: a[0], z: a[1], th: Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) }; }
  // round 49 (user: drivers "facing on a road, in the general direction they would go... stopped at an intersection, so when it goes live you can just start driving"):
  // follow the road route from (x, z) toward (tx, tz) to the first real junction at least `min` m along, and stop in the right-hand lane `back` m short of it
  function stopSpot(x, z, tx, tz, min = 35, back = 13) {
    const R = routeTo(x, z, tx, tz); if (R.length < 3) return { x, z, th: 0 };
    const J = GN.filter(n => n.adj.length >= 3); let acc = 0, pick = -1;
    for (let i = 1; i < R.length; i++) { acc += Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]); if (acc >= min && J.some(n => Math.abs(n.x - R[i][0]) + Math.abs(n.z - R[i][1]) < 1.5)) { pick = i; break; } }
    if (pick < 0) pick = Math.min(R.length - 1, 6);
    let i = pick, left = back; while (i > 0) { const L = Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]); if (L >= left) break; left -= L; i--; }
    const a = R[Math.max(0, i - 1)], b = R[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, f = Math.min(1, left / L);
    const px = b[0] - ux * L * f, pz = b[1] - uz * L * f;       // right-hand lane: right of the travel direction (ux, uz) is (-uz, ux); the lane offset comes from the street's own graph edge
    let lane = 2.4, ld = 1e18; GE.forEach((e, k) => { for (const q of e.P) { const d = (q[0] - px) ** 2 + (q[1] - pz) ** 2; if (d < ld) { ld = d; lane = graph.edges[k].lane || 2.4; } } });
    return { x: px - uz * lane, z: pz + ux * lane, th: Math.atan2(-ux, -uz) };
  }
  const NEXT = [                                            // what Dave says when a chapter is delivered (round 34; the AC is true)
    async () => { await typing('Dave', .8); say('Dave', 'YOU MADE IT 😭 thank you thank you'); await wait(1.0);
      if (UP.rockets) { await typing('Dave', .6); say('Dave', 'why does the bag smell like rocket fuel'); await wait(1.0); }
      await typing('Dave', .5); say('Dave', 'wait.'); await wait(.9);
      await typing('Dave', .8); say('Dave', 'where\'s the KETCHUP?? 😩'); await wait(.9);
      await typing('Dave', .7); say('Dave', 'I literally can\'t eat this without ketchup'); await wait(.9);
      await typing('Dave', .6); say('Dave', 'Aaron can you grab some from Publix? 🙏'); await wait(1.0);
      await typing('Aaron', .7); say('Aaron', 'on it 🫡'); await wait(.7); say('Marc', 'good luck bro. the cops are still out there 💀', true); await wait(1.6); },
    async () => { await typing('Dave', .8); say('Dave', 'KETCHUP 🙌🙌'); await wait(1.0);
      await typing('Dave', .6); say('Dave', 'ok eating now'); await wait(1.6);
      await typing('Dave', 1.4); say('Dave', 'shoot.. my AC broke again 🥵'); await wait(1.1);
      await typing('Dave', .6); say('Dave', 'Hey Chris?'); await wait(1.0);
      await typing('Chris', .8); say('Chris', 'say less. grabbing a part 🏍️'); await wait(.7); say('Aaron', 'take the bike. trust me', true); await wait(1.6); },
  ];
  function nextChapter() {                                 // a chapter delivered: Dave comes out, texts the next problem, then the next driver sets off with the cops still out
    if (env.launcher) env.launcher.deploy(false); env.jump = false; clearRoadblocks(); S.stage = 'reject'; cops.force(0); cops.lock(false); cops.clear(); clearMissiles(); objective(''); env.slowmo(.3); if (env.music) env.music.sting('win'); banner('DELIVERED!');
    const ch = S.ch;
    (async () => {
      await wait(1.2); env.slowmo(1);
      const dv = S.daveP || (S.daveP = makePerson({ jacket: '#8a3b3b' })); const door = [DAVE.house[0] - 3.8, DAVE.house[1] + 2.3];
      dv.root.position.set(door[0], 0, door[1]); dv.root.visible = true; dv.on = true; play(dv, 'walk'); S.dave = { t: 0, from: door, to: [DAVE.house[0] - 1.6, DAVE.house[1] - .4] };
      env.cine([{ a: [DAVE.house[0] - 1, DAVE.house[1] + .5], b: [DAVE.house[0] - 2, DAVE.house[1] + .5], y0: DAVE.houseYaw - .55, y1: DAVE.houseYaw + .25, pitch: 24, d0: 17, d1: 12, dur: 14 }]);
      msgs.innerHTML = ''; pick.hidden = true; skipBtn.hidden = true; phone.hidden = false; await wait(.05); phone.classList.add('show');
      await NEXT[ch]();
      const fd = document.getElementById('fade'); fd.classList.add('on'); await wait(.7);
      phone.classList.remove('show'); phone.hidden = true; if (S.daveP) S.daveP.root.visible = false; S.dave = null; env.cineStop();
      startChapter(ch + 1);
      await wait(.3); fd.classList.remove('on'); banner(CHAPTERS[S.ch].label);
    })();
  }
  function startChapter(n) {                               // the next driver takes over at their start (Aaron: Publix lot, Chris: by City Hall); the last ride is put away
    const old = env.cur, C = CHAPTERS[n], sp = n === 1 ? (DAVE.starts ? stopSpot(DAVE.curb[0], DAVE.curb[1] + 12, DAVE.house[0], DAVE.house[1], 15) : { x: DAVE.lot[0], z: DAVE.lot[1], th: DAVE.lot[2] }) : roadSpot(DAVE.chrisFrom[0], DAVE.chrisFrom[1]);
    S.ch = n; S.cpStart = sp; env.placeRide(C.ci, sp.x, sp.z, sp.th); env.relayTo(C.ci, false); env.resetCar(sp.x, sp.z, sp.th); env.heal();
    if (old !== C.ci) env.placeRide(old, 5000 + old * 10, 40, 0);       // out of Dave's driveway
    S.cpNear = null; S.failed = false; startChase();
  }
  function daveStep(dt) {                                  // Dave walks from his door to your car and waits there
    const D_ = S.dave, w = S.daveP; if (!w) return; D_.t += dt; const k = Math.min(1, D_.t / 2.2), x = D_.from[0] + (D_.to[0] - D_.from[0]) * k, z = D_.from[1] + (D_.to[1] - D_.from[1]) * k;
    w.root.position.set(x, 0, z); w.root.rotation.y = Math.atan2(-(D_.to[0] - D_.from[0]), -(D_.to[1] - D_.from[1])); if (k >= 1 && w.cur !== w.act.idle) play(w, 'idle');
  }
  function endFinish(keepCam) { res.hidden = true; if (S.daveP) S.daveP.root.visible = false; S.dave = null; if (!keepCam) env.cineStop(); env.slowmo(1); phone.classList.remove('show'); phone.hidden = true; }
  res.querySelector('#mr-again').onclick = () => { endFinish(true); restart(); };
  res.querySelector('#mr-free').onclick = () => endFinish(false);
  function failMission(why) {
    S.failed = true; if (env.launcher) env.launcher.deploy(false); if (cops.goal) cops.goal(null); tries++; saveTries(); cops.force(0); cops.lock(false); clearMissiles(); objective(''); fail.querySelector('#mf-why').textContent = why; fail.querySelector('#mf-try').textContent = `Attempt ${tries}`;
    fail.querySelector('#mf-retry').textContent = S.checkpoint === 'chase' && S.cpNear ? 'Retry from checkpoint' : 'Retry'; setTimeout(() => { fail.hidden = false; }, 1600);
    if (env.music) env.music.sting('fail'); const dEl = fail.querySelector('#mf-dist'); dEl.textContent = '';
    if (S.stage === 'chase' && S.lastP) {                  // how far you still had to go, by road, and your closest so far
      const R = routeTo(S.lastP[0], S.lastP[1], DAVE.house[0], DAVE.house[1]); let L = 0, px = S.lastP[0], pz = S.lastP[1]; for (const q of R) { L += Math.hypot(q[0] - px, q[1] - pz); px = q[0]; pz = q[1]; } L += Math.hypot(DAVE.house[0] - px, DAVE.house[1] - pz);
      L = Math.max(1, Math.round(L)); const nb = L < best; if (nb) { best = L; try { localStorage.setItem('gtcc-dave-best', String(L)); } catch (e) { /* ok */ } }
      dEl.textContent = `You were ${L} m from Dave's` + (nb ? ' · closest yet!' : ` · best ${best} m`);
    }
  }
  fail.querySelector('#mf-retry').onclick = () => {
    const k = CHAPTERS[S.ch].up; if (!UP[k] && (k !== 'rockets' || env.launcher)) { offer(k); return; }      // each chapter's first failure: its upgrade comes before the retry
    retry();
  };
  let offering = '';
  function offer(k) {
    offering = k; fail.hidden = true; up.hidden = false;
    const T = { rockets: ['Add rocket launcher?', 'Marc\'s Jeep gets a roof launcher. It aims itself. Tap FIRE.'], emp: ['Give Aaron\'s Tesla EMP?', 'An electric pulse that wipes out every police car around him. Tap EMP.'],
      jump: ['Give Chris ability to jump?', 'Tap JUMP: the bike flies over cars, cops and roadblocks in slow motion. You can steer in the air.'] }[k];
    up.querySelector('#mu-t').textContent = T[0]; up.querySelector('#mu-p').textContent = T[1];
  }
  up.querySelector('#mu-ok').onclick = async () => {
    up.hidden = true;
    UP[offering] = true; banner({ rockets: 'ROCKET LAUNCHER', emp: 'EMP', jump: 'JUMP' }[offering]); retry();
  };
  function retry() {                 // retry from the last checkpoint
    fail.hidden = true; S.failed = false; S.grace = performance.now() + 3000; clearMissiles(); cops.clear(); env.heal();
    if (S.checkpoint === 'relay' && S.cpRelay) {                            // back to the hand-off: Aaron in his Tesla, the groceries on board
      const c = S.cpRelay; env.resetCar(c.x, c.z, c.th); startChase(); S.checkpoint = 'relay'; S.relay = 1; S.cops = c.cops; S.t = c.t; cops.force(S.cops); env.hurtK = UP.emp ? DAVE.aaronHurtEmp : DAVE.aaronHurt; banner(UP.emp ? 'AARON + EMP' : 'AARON');
    }
    else if (S.checkpoint === 'chase' && S.cpNear) { const c = S.cpNear; clearThugs(); env.resetCar(c.x, c.z, c.th); startChase(); S.cops = c.cops; S.t = c.t; cops.force(S.cops); banner('CHECKPOINT'); }
    else if (S.checkpoint === 'chase') { clearThugs(); const c = S.cpStart || { x: DAVE.lot[0], z: DAVE.lot[1], th: DAVE.lot[2] }; env.resetCar(c.x, c.z, c.th); startChase(); }
    else if (S.checkpoint === 'publix') { clearThugs(); env.resetCar(DAVE.lot[0], DAVE.lot[1], DAVE.lot[2]); S.stage = 'curbside'; objective('Pull into Curbside Pickup', 'drive onto the green spot'); }
    else { env.resetCar(); S.stage = 'toPublix'; objective('Drive to Publix'); }
  };
  return { list: [], step, start, restart, refresh() {}, target, routeTo, get active() { return S.stage !== 'off' && S.stage !== 'done' && !S.failed; }, get stage() { return S.stage; }, S, RK, RB, blast, UP, intercept };
}
