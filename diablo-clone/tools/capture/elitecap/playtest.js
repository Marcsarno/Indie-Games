// round 39 capture: each elite power's effect on a dark crypt and on forest grass, 3 frames each
Math.random = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const shots = {}, L = [];
const run = n => { for (let k = 0; k < n; k++) update(1 / 60); };
function scene(level, seed) {
  newHero('warrior'); hero.lvl = 8; recalcHero(); hero.hp = STAT.maxHp = 99999; G.mode = 'play'; startLevel(level, seed); enemies.length = 0; npcs.length = 0;
  let best = null, bs = -1;
  for (let i = 6; i < MW - 6; i += 1) for (let j = 6; j < MH - 6; j += 1) { let n = 0; for (let a = -4; a <= 4; a++) for (let c = -4; c <= 4; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
  hero.fi = best[0]; hero.fj = best[1]; hero.dir = dirFrom(1, 1); input.mx = input.my = 0; G.msg = []; run(2);
}
const elite = (pw, di, dj, id) => { const e = makeEnemy(id, hero.fi + di, hero.fj + dj, enemies.length + 70); makeChampion(e, () => 0.3); givePowers(e, pw, false); e.state = 'hunt'; e.cool = 999; e.def = Object.assign({}, e.def, { speed: 0 }); e.dir = dirFrom(-di, -dj); enemies.push(e); return e; };
function snap(name) { for (let i = 0; i < 300; i++) warmStep(30); render(); shots[name] = cvs.toDataURL(); }
const SETUPS = {
  burning: () => { const e = elite(['burning'], 1.8, -1.2, 'skeleton'); for (let k = 0; k < 6; k++) G.eliteFire.push({ fi: hero.fi + 1.6 - k * 0.45, fj: hero.fj - 0.9 + k * 0.4, t: 0.4 + k * 0.25, arm: k < 2 ? 0.2 : 0, dmg: [1, 1] }); return e; },
  frozen: () => { const e = elite(['frozen'], 2.2, -1.5, 'skeleton'); G.frostOrbs.push({ fi: hero.fi + 1.4, fj: hero.fj + 0.6, t: 0.9, t0: 1.15, r: 1.2, dmg: [1, 1], src: e }, { fi: hero.fi - 0.8, fj: hero.fj + 1.6, t: 0.4, t0: 1.15, r: 1.2, dmg: [1, 1], src: e }); e.pwT.frozen = 99; return e; },
  shielded: () => { const e = elite(['shielded'], 1.5, -0.6, 'skeleton'); e.shieldHp = e.shieldMax = 10; e.shieldT = 99; e.pwT.shielded = 99; return e; },
  shieldcrack: () => { const e = elite(['shielded'], 1.5, -0.6, 'skeleton'); e.shieldMax = 10; e.shieldHp = 3; e.shieldT = 99; e.pwT.shielded = 99; return e; },
  summoner: () => { const e = elite(['summoner'], 2, -1, 'skeleton'); e.pwT.summoner = 99; G.summons.push({ fi: hero.fi + 1.2, fj: hero.fj + 0.6, t: 0.5, t0: 0.85, src: e }, { fi: hero.fi + 0.2, fj: hero.fj + 1.6, t: 0.25, t0: 0.85, src: e }); return e; },
  vampiric: () => { const e = elite(['vampiric'], 1.5, -0.8, 'hound'); e.vampPool = 99; e.pwT = {}; for (let k = 0; k < 6; k++) G.leech.push({ src: e, u: k / 6, sp: 0.01 }); return e; },
  blinking: () => { const e = elite(['blinking'], 1.3, -0.9, 'fallen'); e.pwT.blinking = 99; G.blinkFx.push({ fi: hero.fi + 3, fj: hero.fj - 2, t: 0.2, t0: 0.3 }, { fi: e.fi, fj: e.fj, t: 0.25, t0: 0.35, land: true }); return e; },
  deathburst: () => { const e = elite(['burning'], 1.5, -0.8, 'skeleton'); G.eliteBursts.push({ fi: e.fi, fj: e.fj, t: 0.35, t0: 0.6, r: 1.7, kind: 'fire', dmg: [1, 1] }); return e; },
  labels: () => { elite(['burning'], 1.6, -1.2, 'skeleton'); const b = elite(['frozen'], -1.5, 2.5, 'fallen'); b.pw = ['frozen']; const c = elite(['summoner', 'vampiric'], 3.2, 1.5, 'skeleton'); return null; },
};
for (const [bg, lvl, seed] of [['crypt', 3, 777], ['forest', 2, 4242]]) for (const k in SETUPS) {
  scene(lvl, seed); SETUPS[k]();
  const keep = { fire: G.eliteFire.map(f => ({ ...f })), orbs: G.frostOrbs.map(o => ({ ...o })), sum: G.summons.map(s => ({ ...s })), bl: G.blinkFx.map(b => ({ ...b })), bu: G.eliteBursts.map(b => ({ ...b })) };
  for (let f = 0; f < 3; f++) {
    // advance time for the animation but hold effects alive so each frame shows them
    G.t += 0.12; for (const o of G.frostOrbs) o.t = Math.max(0.05, o.t - 0.12); for (const s of G.summons) s.t = Math.max(0.05, s.t - 0.1); for (const b of G.blinkFx) b.t = Math.max(0.03, b.t - 0.06); for (const b of G.eliteBursts) b.t = Math.max(0.05, b.t - 0.08); for (const l of G.leech) l.u = (l.u + 0.05) % 1;
    for (const e of enemies) e.clock += 0.12;
    snap(`${bg}-${k}-${f}`);
  }
  void keep;
}
window.__out = { log: L, shots };
