// round 29: skill modifiers. Fireball: split, burning ground, great; slam: full circle, fissure,
// aftershock. Plus a shot of the skills screen
Math.random = (() => { let s = 5; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) update(1 / 60); };
function arena(cls) {
  newHero(cls); hero.lvl = 12; recalcHero(); hero.hp = STAT.maxHp = 99999; hero.mana = STAT.maxMana = 999; G.mode = 'play'; startLevel(3, 777); enemies.length = 0;
  let best = null, bs = -1;
  for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
  hero.fi = best[0]; hero.fj = best[1]; for (const k in CD) CD[k] = 0;
  const ci = Math.floor(hero.fi), cj = Math.floor(hero.fj); for (let j = cj - 8; j <= cj + 8; j++) for (let i = ci - 8; i <= ci + 8; i++) if (i > 0 && j > 0 && i < MW - 1 && j < MH - 1) { LV.map[tIdx(i, j)] = FLOOR; LV.solid[tIdx(i, j)] = 0; } computeFlow();
}
const mk = (di, dj) => { const e = makeEnemy('fallen', hero.fi + di, hero.fj + dj, enemies.length + 70); e.hp = e.maxHp = 999; e.state = 'hunt'; e.cool = 99; e.def = Object.assign({}, e.def, { dmg: [0, 0], speed: 0 }); enemies.push(e); return e; };
const dmgd = es => es.map(e => 999 - e.hp);
// fireball
for (const m of [null, 'split', 'great', 'ground']) {
  arena('mage'); hero.mods = { fireball: m }; const t = mk(4, 0), side = mk(4, 1.6); hero.dir = dirFrom(1, 0);
  run(2); useSkill(0); run(m === 'great' ? 34 : 22); for (let i = 0; i < 200; i++) warmStep(30); render(); shots['fb-' + (m || 'plain')] = cvs.toDataURL(); const nProj = projectiles.filter(p => p.kind === 'hfire').length; run(m === 'great' ? 60 : 40); const after = dmgd([t, side]); run(120);
  L.push({ fireball: m || 'plain', projectiles: nProj, damage: after, laterBurn: dmgd([t, side]).map((v, k) => v - after[k]), ground: G.fireGround.length });
}
// slam
for (const m of [null, 'ring', 'fissure', 'after']) {
  arena('warrior'); hero.mods = { slam: m }; const front = mk(1.6, 0), behind = mk(-1.6, 0), far = mk(6.5, 0); hero.dir = dirFrom(1, 0);
  run(2); useSkill(0); let hits = 0, last = 999; for (let k = 0; k < 90; k++) { update(1 / 60); if (front.hp < last) { hits++; last = front.hp; } if (k === (m === 'after' ? 42 : m === 'fissure' ? 30 : 24)) { for (let i = 0; i < 200; i++) warmStep(30); render(); shots['sl-' + (m || 'plain')] = cvs.toDataURL(); } }
  L.push({ slam: m || 'plain', front: 999 - front.hp, behind: 999 - behind.hp, far: 999 - far.hp, frontHits: hits });
}
arena('mage'); hero.mods = { fireball: 'split' }; G.mode = 'skills'; render(); shots.screen = cvs.toDataURL();
window.__out = { log: L, shots };
