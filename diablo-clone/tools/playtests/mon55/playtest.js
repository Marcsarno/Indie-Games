// round 55: the art chat's monsters out in the world: where each new one turns up (spawn counts over
// seeds), and each fights for a few seconds without errors (a wake, an attack, a death)
const L = [], NEW = ['spearman', 'axeman', 'gravebow', 'tombguard', 'knifer', 'slinger', 'oclubber', 'orockthrower', 'oshield', 'oenforcer', 'mastiff'];
newHero('warrior'); hero.lvl = 10; recalcHero(); hero.hp = STAT.maxHp = 1e7; G.mode = 'play'; G.story = { f: { met: true, woodTold: true, aldoFree: true }, n: 0 };
const where = {};
for (const [lv, side] of [[1], [1, 'barrow'], [2], [3], [4], [7], [8], [9], [12], [13]]) for (let s = 0; s < 4; s++) {
  genLevel(lv, s * 911 + 7, side || null);
  for (const sp of LV.spawns) if (NEW.includes(sp.id)) { const k = (side || areaName()) + ' L' + lv; where[sp.id] = where[sp.id] || {}; where[sp.id][k] = (where[sp.id][k] || 0) + 1; }
}
L.push({ where, never: NEW.filter(k => !where[k]) });
const fights = {};
for (const id of NEW) {
  startLevel(3, 77); enemies = []; G.actCard = 0;
  const e = makeEnemy(id, hero.fi + 2.5, hero.fj + 0.5, 0); e.state = 'hunt'; enemies.push(e);
  let err = null, hit = false; const hp0 = hero.hp;
  try { for (let k = 0; k < 240; k++) { update(1 / 60); if (k % 30 === 0) render(); } hit = hero.hp < hp0; damageEnemy(e, 1e6, e.fi - 1, e.fj); for (let k = 0; k < 90; k++) { update(1 / 60); if (k % 30 === 0) render(); } } catch (x) { err = String(x); }
  fights[id] = err || (hit ? 'hit hero, died' : 'died (no hit in 4s)');
}
L.push({ fights });
window.__out = { log: L, shots: {} };
