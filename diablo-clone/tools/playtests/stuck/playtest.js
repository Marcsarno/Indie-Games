// round 38: leaps, blinks and the ranger's leap must never leave the hero inside a wall. From spots
// right beside walls, fire each one in every direction many times; afterwards the hero's body must fit
// (all four corners on open floor) and at least one step must be possible
Math.random = (() => { let s = 13; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) update(1 / 60); };
const res = {};
for (const [cls, skill] of [['warrior', 3], ['mage', 3], ['ranger', 2]]) {
  let tries = 0, stuck = 0, inWall = 0;
  for (const [lv, seed] of [[3, 777], [4, 31], [8, 1234]]) {
    newHero(cls); hero.lvl = 12; recalcHero(); hero.hp = STAT.maxHp = 99999; hero.mana = STAT.maxMana = 9999; G.mode = 'play'; startLevel(lv, seed); enemies.length = 0;
    const spots = []; for (let j = 1; j < MH - 1; j++) for (let i = 1; i < MW - 1; i++) { const fi = i + 0.5, fj = j + 0.5; if (standable(fi, fj) && (blocked(fi + 1, fj) || blocked(fi, fj + 1) || blocked(fi - 1, fj) || blocked(fi, fj - 1))) spots.push([fi, fj]); }
    for (let n = 0; n < 60; n++) {
      const s = spots[Math.floor(Math.random() * spots.length)]; hero.fi = s[0]; hero.fj = s[1];
      for (const k in CD) CD[k] = 0; hero.atk = -1; hero.cast = -1; hero.leap = null; hero.roll = null;
      const a = Math.random() * 6.283; input.mx = Math.cos(a); input.my = Math.sin(a); hero.dir = Math.floor(Math.random() * 8);
      if (cls === 'warrior') { const e = makeEnemy('fallen', s[0] + Math.cos(a) * 3, s[1] + Math.sin(a) * 3, 99); e.hp = e.maxHp = 9999; e.state = 'hunt'; e.def = Object.assign({}, e.def, { dmg: [0, 0], speed: 0 }); enemies.length = 0; enemies.push(e); }
      const lv0 = LV.seed + ':' + LV.level; G.fadeTo = null; run(2); useSkill(skill); run(70); input.mx = input.my = 0;
      if (LV.seed + ':' + LV.level !== lv0 || G.fadeTo) { G.fadeTo = null; if (LV.seed + ':' + LV.level !== lv0) startLevel(lv, seed); continue; }   // walked onto the stairs: a different level, not a stuck hero
      tries++;
      if (!standable(hero.fi, hero.fj, 0.28)) inWall++;
      const f0 = hero.fi, j0 = hero.fj; let canMove = false;
      for (const [dx, dy] of [[0.05, 0], [-0.05, 0], [0, 0.05], [0, -0.05]]) { if (tryMove(hero, dx, dy)) canMove = true; hero.fi = f0; hero.fj = j0; }
      if (!canMove) stuck++;
    }
  }
  res[cls] = { tries, inWall, stuck };
}
L.push(res);
window.__out = { log: L, shots };
