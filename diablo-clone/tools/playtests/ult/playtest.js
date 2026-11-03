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
arena('warrior'); hero.ult = 0; let kills = 0;
while (hero.ult < 100 && kills < 200) { const e = mk(2, 0, 'fallen', 30); while (alive(e)) damageEnemy(e, 7, hero.fi, hero.fj); kills++; enemies.length = 0; }
L.push({ killsToCharge: kills });
arena('warrior', 9); hero.ult = 0; { const e = mk(2, 0, 'fallen', 30); damageEnemy(e, 40, hero.fi, hero.fj); } L.push({ chargeBelow10: hero.ult }); useUlt(); L.push({ firedBelow10: !!hero.ultOn });
arena('warrior'); hero.ult = 50; useUlt(); L.push({ firedHalf: !!hero.ultOn });
// Wrath of the Mountain
arena('warrior'); hero.ult = 100; snap('hud-full');
const ring = []; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, d = k % 2 ? 2 : 4.2; ring.push(mk(Math.cos(a) * d, Math.sin(a) * d)); }
const far = mk(8, 0), bossy = mk(0, 3, 'fallen'); bossy.def = Object.assign({}, bossy.def, { unique: true });
useUlt(); const hp0 = hero.hp; let maxZ = 0, downs = 0;
for (let k = 0; k < 160; k++) { update(1 / 60); maxZ = Math.max(maxZ, hero.leapZ || 0); if (k === 30) { hurtHero(50, null); } if (ring[0].downT > 0) downs = Math.max(downs, ring.filter(e => e.downT > 0).length); if (k === 32) snap('wrath-air'); if (k === 50) snap('wrath-land'); if (k === 75) snap('wrath-rocks'); }
L.push({ wrath: ring.map(e => 999 - e.hp), far: 999 - far.hp, boss: 999 - bossy.hp, knockedDown: downs, maxZ: Math.round(maxZ), hurtInAir: hp0 - hero.hp, done: !hero.ultOn, chargeAfter: Math.round(hero.ult) });
// Arcane Storm
arena('mage'); hero.ult = 100;
const foes = []; for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; foes.push(mk(Math.cos(a) * 3.5, Math.sin(a) * 3.5)); }
useUlt(); let strikesSeen = 0;
for (let k = 0; k < 280; k++) { update(1 / 60); strikesSeen = Math.max(strikesSeen, G.strikes.length); if (k === 90) snap('storm'); if (k === 60) { castMissiles(); } }
L.push({ storm: foes.map(e => 999 - e.hp), strikesOverlap: strikesSeen, over: !hero.ultOn, missilesDuring: projectiles.length });
arena('mage'); hero.ult = 62; snap('hud-mage');
window.__out = { log: L, shots };
