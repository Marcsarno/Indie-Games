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
// round 34: monster attacks. For each family: when the wind-up starts vs when the blow lands, how
// far the lunge carries it, the damage dealt, and that a hit in the recovery lands harder and stops it
const mkm = (id, di, dj) => { const e = makeEnemy(id, hero.fi + di, hero.fj + dj, enemies.length + 70); e.hp = e.maxHp = 999; e.state = 'hunt'; enemies.push(e); return e; };
for (const id of ['fallen', 'skeleton', 'ghoulhound', 'spider', 'goblin', 'wolf']) {
  if (!MONSTERS[id]) continue;
  arena('warrior'); hero.hp = STAT.maxHp = 99999; const e = mkm(id, 2.4, 0); e.cool = 0;
  let start = -1, hitAt = -1, d0 = 0, d1 = 0, hp0 = hero.hp, tele = 0, sp0 = G.sparks.length;
  for (let k = 0; k < 240 && hitAt < 0; k++) { update(1 / 60); if (start < 0 && e.atk >= 0) { start = k; d0 = Math.hypot(e.fi - hero.fi, e.fj - hero.fj); } if (start >= 0 && hero.hp < hp0 && hitAt < 0) { hitAt = k; d1 = Math.hypot(e.fi - hero.fi, e.fj - hero.fj); } }
  // the opening: wait for the recovery and hit it
  let opened = false; for (let k = 0; k < 60; k++) { update(1 / 60); if (e.open) { const h = e.hp; damageEnemy(e, 10, hero.fi, hero.fj); opened = { took: h - e.hp, stopped: e.atk < 0 }; break; } }
  L.push({ id, windupMs: hitAt >= 0 ? Math.round((hitAt - start) / 60 * 1000) : null, startDist: +d0.toFixed(2), hitDist: +d1.toFixed(2), opened });
}
// an elite follows up with a second strike sometimes
arena('warrior'); hero.hp = STAT.maxHp = 99999; { const e = mkm('skeleton', 1.2, 0); e.def = Object.assign({}, e.def, { elite: true }); e.cool = 0; let chains = 0; for (let k = 0; k < 900; k++) { update(1 / 60); if (e.chained === true) { chains++; e.chained = 'seen'; } } L.push({ eliteFollowUps: chains }); }
window.__out = { log: L, shots };
