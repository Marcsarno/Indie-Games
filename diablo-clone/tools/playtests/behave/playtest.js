// round 21b enemy behaviors: archers keep their distance, shields block from the front, boars charge
// (and miss when the hero sidesteps), packs spread around the hero, a leader's death scatters the pack
const log = []; const shots = {};
Math.random = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
newHero(); G.mode = 'play'; hero.hp = STAT.maxHp = 9999;
function arena(lv, seed) {
  startLevel(lv, seed);
  let best = null, bs = -1;
  for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
  enemies.length = 0; hero.fi = best[0]; hero.fj = best[1]; hero.hp = 9999; return best;
}
const spawn = (id, di, dj) => { const e = makeEnemy(id, hero.fi + di, hero.fj + dj, enemies.length + 50); e.state = 'hunt'; enemies.push(e); return e; };
const run = (n, cb) => { for (let k = 0; k < n; k++) { cb && cb(k); update(1 / 60); } };
const dist = e => Math.hypot(e.fi - hero.fi, e.fj - hero.fj);
// 1. archer kiting
arena(3, 777); const ar = spawn('archer', 1.6, 0); ar.cool = 1; run(60); log.push({ archerStart: 1.6, archerAfter1s: +dist(ar).toFixed(2) });
// 2. shield block: an idle skeleton facing the hero, hit from the front, then from behind
arena(3, 777); const sk = spawn('skeleton', 1, 0); sk.maxHp = sk.hp = 100; sk.dir = dirFrom(-1, 0); sk.cool = 9;
let h0 = sk.hp; damageEnemy(sk, 10, hero.fi, hero.fj); const front = h0 - sk.hp;
h0 = sk.hp; damageEnemy(sk, 10, sk.fi + 1, sk.fj); const back = h0 - sk.hp;
h0 = sk.hp; damageEnemy(sk, 10, hero.fi, hero.fj, false, 1); const heavy = h0 - sk.hp, broken = sk.guardT > G.t;
log.push({ shieldFront: front, shieldBack: back, heavyFront: heavy, guardBroken: broken });
// 3. boar charge: hero stands still (gets hit), then sidesteps (missed). Find a clear 6-tile lane
function lane() { for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let ok = true; for (let s = 0; s <= 6; s += 0.25) for (const w of [-1.8, 0, 1.8]) if (blocked(hero.fi + a * s - b * w, hero.fj + b * s + a * w)) ok = false; if (ok) return [a, b]; } return [1, 0]; }
arena(3, 777); let L = lane(), bo = spawn('boar', L[0] * 4, L[1] * 4); const hp0 = hero.hp; let wound = false;
run(100, () => { if (bo.windT > 0) wound = true; }); log.push({ lane: L, boarWindup: wound, boarHitStanding: hp0 - hero.hp > 0 });
arena(3, 777); L = lane(); bo = spawn('boar', L[0] * 4, L[1] * 4); const hp1 = hero.hp; let side = false;
run(100, k => { if (bo.windT > 0 && bo.windT < 0.3 && !side) { side = true; hero.fi -= L[1] * 1.6; hero.fj += L[0] * 1.6; } }); log.push({ boarHitSidestep: hp1 - hero.hp > 0, boarStunnedAfter: bo.stun > 0 });
// 4. pack: 4 fallen come at the hero from one side; spread of their angles around the hero
arena(3, 777); const PL = lane(); const pk = [0, 1, 2, 3, 4].map(k => spawn('fallen', PL[0] * (3.5 + (k % 2) * 0.5) - PL[1] * (k - 2) * 0.5, PL[1] * (3.5 + (k % 2) * 0.5) + PL[0] * (k - 2) * 0.5));
run(150); const ang = pk.filter(e => alive(e)).map(e => Math.atan2(e.fj - hero.fj, e.fi - hero.fi));
log.push({ packSpreadDeg: Math.round((Math.max(...ang) - Math.min(...ang)) * 180 / Math.PI), packDist: pk.map(e => +dist(e).toFixed(1)) });
render(); shots.pack = cvs.toDataURL();
// 5. panic: the shaman dies, the fallen near it scatter
arena(3, 777); const sh = spawn('shaman', 3, 0); const fa = [spawn('fallen', 2, 1), spawn('fallen', 2, -1), spawn('fallen', 2.5, 0.3)];
run(10); damageEnemy(sh, 999, hero.fi, hero.fj); const d0 = fa.map(dist); run(60); log.push({ panicked: fa.filter(e => e.panicT > 0).length, movedAway: fa.filter((e, k) => dist(e) > d0[k]).length });
window.__out = { log, shots };
