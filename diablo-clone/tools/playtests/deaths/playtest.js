// round 31: ultimates. Charge rate from kills, locked below level 10, Wrath of the Mountain
// (damage, knockdowns, untouchable in the air, rocks), Arcane Storm (spread over all foes, 4 s)
Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) update(1 / 60); };
function arena(cls, lvl = 12) {
  newHero(cls); hero.lvl = lvl; recalcHero(); hero.hp = STAT.maxHp = 99999; hero.mana = STAT.maxMana = 999; G.mode = 'play'; startLevel(3, 777); enemies.length = 0;
  let best = null, bs = -1;
  for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
  hero.fi = best[0]; hero.fj = best[1]; for (const k in CD) CD[k] = 0;
  const ci = Math.floor(hero.fi), cj = Math.floor(hero.fj); for (let j = cj - 11; j <= cj + 11; j++) for (let i = ci - 11; i <= ci + 11; i++) if (i > 0 && j > 0 && i < MW - 1 && j < MH - 1) { LV.map[tIdx(i, j)] = FLOOR; LV.solid[tIdx(i, j)] = 0; } computeFlow();
  hero.dir = dirFrom(1, 0); input.mx = input.my = 0; STAT.crit = -100; run(2);
}
const mk = (di, dj, kind = 'fallen', hp = 999) => { const e = makeEnemy(kind, hero.fi + di, hero.fj + dj, enemies.length + 70); e.hp = e.maxHp = hp; e.state = 'hunt'; e.cool = 99; e.def = Object.assign({}, e.def, { dmg: [0, 0], speed: 0 }); enemies.push(e); return e; };
function snap(name) { for (let i = 0; i < 200; i++) warmStep(30); render(); shots[name] = cvs.toDataURL(); }
// charge: kill ordinary monsters with ordinary hits until full
// round 37: deaths with weight. Per family: how far the body slides back, whether it hops, what
// debris flies (a skull, a weapon) and that it lands and is pressed into the floor; overkills burst
// with no body; the last of three kills in a fight starts the slow motion
const kill = (id, big) => {
  arena('warrior'); const e = mk(1.4, 0, id); hero.stop = 0;
  const f0 = e.fi, d0 = G.debris.length; G.pierce = true; e.hp = big ? 5 : 3; damageEnemy(e, big ? e.maxHp * 2 + 40 : 5, hero.fi, hero.fj, big, big ? 2 : 0); G.pierce = false;
  const debris = G.debris.map(b => b.kind); let maxZ = 0, bodyVisibleAfter = null;
  for (let k = 0; k < 150; k++) { update(1 / 60); maxZ = Math.max(maxZ, e.leapZ || 0); if (k === 2) bodyVisibleAfter = !e.corpse; }
  return { id, overkill: big, kind: e.deathKind || 'normal', slid: +(e.fi - f0).toFixed(2), hop: +maxZ.toFixed(1), debris, debrisLeft: G.debris.length, corpse: e.corpse, bodyShownAfter2Frames: bodyVisibleAfter };
};
for (const id of ['fallen', 'digger', 'skeleton', 'ghoulhound', 'wolf', 'spider']) for (const big of [false, true]) { if (MONSTERS[id]) L.push(kill(id, big)); }
// slow motion: three kills, the last with nobody left awake nearby
arena('warrior'); { const es = [mk(1.4, 0), mk(1.4, 1), mk(1.4, -1)]; G.slowmo = 0; G.killTimes = []; const sl = []; for (const e of es) { G.pierce = true; damageEnemy(e, 999, hero.fi, hero.fj); G.pierce = false; sl.push(+(G.slowmo || 0).toFixed(2)); update(1 / 60); } L.push({ slowmoAfterEachKill: sl }); }
window.__out = { log: L, shots };
