// round 66: the ranger's new kit must out-damage the basic shot it replaces (the user's rule).
// Each test: dummies with huge life in an open spot; damage dealt over a fixed time with a routine.
Math.random = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [];
function arena(n, spread = 0.6) {
  newHero('ranger'); hero.lvl = 10; recalcHero(); hero.hp = STAT.maxHp = 99999; G.mode = 'play'; startLevel(1, 4242); G.actCard = 0; npcs = [];
  const open = (i, j) => { for (let a = -2; a <= 8; a++) for (let c = -3; c <= 3; c++) if (blocked(i + a, j + c)) return false; return true; };
  let spot = null; for (let i = 4; i < MW - 10 && !spot; i++) for (let j = 4; j < MH - 4 && !spot; j++) if (open(i + 0.5, j + 0.5)) spot = [i + 0.5, j + 0.5];
  hero.fi = spot[0]; hero.fj = spot[1];
  const base = 'skeleton'; enemies = [];
  for (let k = 0; k < n; k++) { const e = makeEnemy(base, hero.fi + 4.5 + (k % 3) * spread, hero.fj + (Math.floor(k / 3) - 0.5) * spread + (k % 2) * 0.3, 900 + k, 3); e.hp = e.maxHp = 1e7; e.state = 'idle'; e.cool = 999; e.speed = 0; enemies.push(e); }
  for (let s = 0; s < 3; s++) { updateFov(hero.fi, hero.fj); render(); }
  hero.dir = dirFrom(1, 0); hero.mana = 999; for (const k in CD) CD[k] = 0; hero.pips = 0;
}
const dealt = () => enemies.reduce((a, e) => a + (1e7 - e.hp), 0);
function run(sec, brain) {
  const dt = 1 / 30;
  for (let t = 0; t < sec; t += dt) {
    for (const e of enemies) { e.cool = 999; e.atk = -1; e.kb = [0, 0]; e.fi = e.home ? e.home[0] : (e.home = [e.fi, e.fj])[0]; e.fj = e.home[1]; }
    hero.mana = 999; if (!heroBusy()) brain();
    G.t += dt; update(dt);
  }
  return Math.round(dealt() / sec);
}
const sk = id => () => { const k = SKILLS.findIndex(s => s.id === id); useSkill(k); };
const basic = () => rangerShoot();
// one target
arena(1); const b1 = run(12, basic);
arena(1); const p1 = run(12, () => { if ((hero.pips || 0) >= 3 && CD.pierce <= 0) sk('pierce')(); else basic(); });
arena(1); const p0 = run(12, () => { if (CD.pierce <= 0) sk('pierce')(); else basic(); });
L.push({ oneTarget: { basicOnly: b1, basicThenPierceAt3: p1, pierceWheneverReady: p0 } });
// a line of five (piercing) and a pack (cluster)
arena(5, 0.7); const b5 = run(12, basic);
arena(5, 0.7); const p5 = run(12, () => { if ((hero.pips || 0) >= 3 && CD.pierce <= 0) sk('pierce')(); else basic(); });
arena(5, 0.7); const c5 = run(12, () => { if ((hero.pips || 0) >= 3 && CD.cluster <= 0) sk('cluster')(); else basic(); });
L.push({ packOfFive: { basicOnly: b5, withPierce: p5, withCluster: c5 } });
// pets: sentry and hawk on top of the basic shot
arena(1); const s1 = run(12, () => { if (CD.sentry <= 0) sk('sentry')(); else basic(); });
arena(1); const h1 = run(12, () => { if (CD.hawk <= 0 && !(hero.hawks && hero.hawks.length)) sk('hawk')(); else basic(); });
L.push({ pets: { basicOnly: b1, withSentry: s1, withHawk: h1 } });
// the combo points: basic hits fill them, the spenders empty them
arena(1); for (let k = 0; k < 5; k++) { basic(); for (let f = 0; f < 20; f++) { G.t += 1 / 30; update(1 / 30); } } const filled = hero.pips; sk('pierce')(); L.push({ pipsAfterFiveShots: filled, afterPierce: hero.pips });
L.push({ kit: SKILLS.map(s => s.id).join(',') });
window.__out = { log: L, shots: {} };
