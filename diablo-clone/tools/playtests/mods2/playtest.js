// round 30: the rest of the skill modifiers. For each skill: plain, then each of its three
// modifiers, on a row of harmless dummies; logs damage per dummy and snaps a frame mid-effect
Math.random = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) update(1 / 60); };
function arena(cls) {
  newHero(cls); hero.lvl = 12; recalcHero(); hero.hp = STAT.maxHp = 99999; hero.mana = STAT.maxMana = 999; G.mode = 'play'; startLevel(3, 777); enemies.length = 0;
  let best = null, bs = -1;
  for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
  hero.fi = best[0]; hero.fj = best[1]; for (const k in CD) CD[k] = 0;
  const ci = Math.floor(hero.fi), cj = Math.floor(hero.fj); for (let j = cj - 11; j <= cj + 11; j++) for (let i = ci - 11; i <= ci + 11; i++) if (i > 0 && j > 0 && i < MW - 1 && j < MH - 1) { LV.map[tIdx(i, j)] = FLOOR; LV.solid[tIdx(i, j)] = 0; } computeFlow();
  hero.dir = dirFrom(1, 0); STAT.crit = -100; input.mx = input.my = 0;   // no crits, so cases compare
}
const mk = (di, dj, kind = 'fallen') => { const e = makeEnemy(kind, hero.fi + di, hero.fj + dj, enemies.length + 70); e.hp = e.maxHp = 999; e.state = 'hunt'; e.cool = 99; e.def = Object.assign({}, e.def, { dmg: [0, 0], speed: 0 }); enemies.push(e); return e; };
const dmg = es => es.map(e => 999 - Math.max(e.hp, -999));
function snap(name) { for (let i = 0; i < 200; i++) warmStep(30); render(); shots[name] = cvs.toDataURL(); }
// one case: set the modifier, place dummies, fire, run, snapping at frame `at`
function trial(cls, skill, mod, place, fire, at, total, extra) {
  arena(cls); hero.mods = { [skill]: mod }; const es = place(); run(2); fire();
  for (let k = 0; k < total; k++) { update(1 / 60); if (k === at) snap(skill + '-' + (mod || 'plain')); if (extra) extra(k, es); }
  const row = { skill, mod: mod || 'plain', damage: dmg(es), frozen: es.filter(e => e.frozen > 0).length, down: es.filter(e => e.downT > 0).length, dist: es.map(e => +Math.hypot(e.fi - hero.fi, e.fj - hero.fj).toFixed(1)) };
  L.push(row); return row;
}
const line = () => [mk(3, 0), mk(5, 0.3), mk(7, -0.3)];   // three in a row ahead
const fan = () => [mk(3, -1.5), mk(3.5, 0), mk(3, 1.5), mk(-2, 0)];   // three ahead spread out, one behind
// mage: missile (attack), cone, meteor, blink
for (const m of [null, 'seek', 'pierce', 'orb']) trial('mage', 'missile', m, m === 'seek' ? fan : line, () => castMissiles(), m === 'orb' ? 50 : 22, 200);
for (const m of [null, 'nova', 'shards', 'deep']) trial('mage', 'cone', m, () => [mk(2, 0), mk(5.5, 0), mk(-2, 0), mk(2, 1.2)], () => useSkill(1), 16, m === 'deep' ? 110 : 60, m === 'deep' ? (k, es) => { if (k === 20) { es[0].hp = 1; castMissiles(); } } : null);
for (const m of [null, 'shower', 'molten', 'comet']) trial('mage', 'meteor', m, () => [mk(4, 0), mk(4.6, 0.8), mk(3.4, -0.9), mk(5.5, 1.8)], () => useSkill(2), m === 'shower' ? 100 : 82, 260);
for (const m of [null, 'burst', 'double', 'frost']) trial('mage', 'blink', m, () => { const es = [mk(1, 0.5), mk(-0.8, 0.6), mk(5, 0.5), mk(4.6, -0.5)]; input.mx = 0.707; input.my = 0.707; return es; }, () => { useSkill(3); }, 4, 90, (k, es) => { if (k === 30 && m === 'double') { const before = hero.fi; useSkill(3); L.push({ doubleSecond: +(hero.fi - before).toFixed(2), cdAfter: +CD.blink.toFixed(2) }); } if (k === 5) input.mx = input.my = 0; });
// warrior: hook, whirl, leap
for (const m of [null, 'line', 'barbed', 'tether']) trial('warrior', 'hook', m, () => [mk(3, 0), mk(5, 0.2), mk(7.5, -0.2)], () => useSkill(1), 14, 130);
for (const m of [null, 'devil', 'long', 'storm']) trial('warrior', 'whirl', m, () => [mk(1, 0), mk(-1.6, 0.4), mk(2.8, 0), mk(0, 3.2)], () => useSkill(2), 30, 120);
for (const m of [null, 'burn', 'quake', 'pounce']) trial('warrior', 'leap', m, () => m === 'pounce' ? [mk(8, 0), mk(8.3, 1.3)] : [mk(4, 0), mk(4.6, 1.1), mk(4.6, -1.1), mk(6.5, 0)], () => useSkill(3), 40, 120);
arena('mage'); hero.mods = { missile: 'orb', cone: 'deep' }; G.mode = 'skills'; render(); shots.screen = cvs.toDataURL();
arena('warrior'); hero.mods = { hook: 'tether', whirl: 'storm' }; G.mode = 'skills'; render(); shots.screenw = cvs.toDataURL();
window.__out = { log: L, shots };
