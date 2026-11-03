// round 31: ultimates. Charge rate from kills, locked below level 10, Wrath of the Mountain
// (damage, knockdowns, untouchable in the air, rocks), Arcane Storm (spread over all foes, 4 s)
Math.random = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) update(1 / 60); };
function arena(cls, lvl = 12) {
  newHero(cls); hero.lvl = lvl; recalcHero(); hero.hp = STAT.maxHp = 99999; hero.mana = STAT.maxMana = 999; G.mode = 'play'; startLevel(3, 777); enemies.length = 0;
  let best = null, bs = -1;
  for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
  hero.fi = best[0]; hero.fj = best[1]; for (const k in CD) CD[k] = 0;
  const ci = Math.floor(hero.fi), cj = Math.floor(hero.fj); for (let j = cj - 11; j <= cj + 11; j++) for (let i = ci - 11; i <= ci + 11; i++) if (i > 0 && j > 0 && i < MW - 1 && j < MH - 1) { LV.map[tIdx(i, j)] = FLOOR; LV.solid[tIdx(i, j)] = 0; } computeFlow();
  hero.dir = dirFrom(1, 0); input.mx = input.my = 0; STAT.crit = -100; hero.stop = 0; run(2);
}
const mk = (di, dj, kind = 'fallen', hp = 999) => { const e = makeEnemy(kind, hero.fi + di, hero.fj + dj, enemies.length + 70); e.hp = e.maxHp = hp; e.state = 'hunt'; e.cool = 99; e.def = Object.assign({}, e.def, { dmg: [0, 0], speed: 0 }); enemies.push(e); return e; };
function snap(name) { for (let i = 0; i < 200; i++) warmStep(30); render(); shots[name] = cvs.toDataURL(); }
// charge: kill ordinary monsters with ordinary hits until full
const dmg = es => es.map(e => 999 - Math.max(e.hp, -999));
// the attack: hold for 2 s against one target 5 tiles away
arena('ranger'); { const t = mk(5, 0); input.attack = true; let shots = 0, last = 0; for (let k = 0; k < 120; k++) { update(1 / 60); const n = projectiles.filter(p => p.owner === 'hero').length; if (n > last) shots += n - last; last = n; if (k === 9) snap('shoot'); } input.attack = false; run(30); L.push({ attack2s: { shots, damage: 999 - t.hp } }); }
// multishot and its modifiers on a spread line
for (const m of [null, 'wide', 'pierce', 'fire']) { arena('ranger'); hero.mods = { multi: m }; const es = [mk(4, -1.6), mk(4, 0), mk(4, 1.6), mk(6.5, 0)]; useSkill(0); if (!m) { run(8); snap('multi'); } run(80); L.push({ multi: m || 'plain', damage: dmg(es), burning: es.filter(e => e.burnT > 0).length }); }
// traps: thrown at the nearest, a foe walks in
for (const m of [null, 'spike', 'net', 'triple']) {
  arena('ranger'); hero.mods = { trap: m }; const es = [mk(3, 0), mk(3.6, 1.2), mk(3.6, -1.2)]; for (const e of es) e.def.speed = 0;
  useSkill(1); run(50); const snapped = G.traps.filter(t => t.snapT > 0).length; if (m === 'net') snap('trap');
  L.push({ trap: m || 'plain', traps: G.traps.length, snapped, damage: dmg(es), rooted: es.filter(e => e.rootT > 0).length });
}
// a rooted foe can't walk: one chasing the hero, snared, stays put
arena('ranger'); { const e = mk(4, 0); e.def.speed = 40; e.rootT = 2; const f0 = e.fi; run(60); L.push({ rootedMoved: +Math.abs(e.fi - f0).toFixed(2) }); }
// the leap: away from a foe in front, untouchable in the air, arrows on landing
for (const m of [null, 'smoke', 'long', 'volley']) {
  arena('ranger'); hero.mods = { roll: m }; const e = mk(1.2, 0), far = mk(5, 0); const fi0 = hero.fi, hp0 = hero.hp; useSkill(2); let air = 0;
  for (let k = 0; k < 60; k++) { update(1 / 60); if (hero.roll) { hurtHero(30, null); air++; } if (k === 6 && !m) snap('roll'); }
  L.push({ leap: m || 'plain', moved: +(fi0 - hero.fi).toFixed(1), hurtInAir: hp0 - hero.hp, framesInAir: air, landingDamage: dmg([e, far]), dazed: e.stun > 0 });
}
// the mark: a boss-like foe is picked over a weak one, takes more damage; Spreading Mark passes on
for (const m of [null, 'death', 'spread', 'blood']) {
  arena('ranger'); hero.mods = { mark: m }; const weak = mk(3, 1), big = mk(4, -1); big.def = Object.assign({}, big.def, { elite: true });
  useSkill(3); const picked = big.markT > 0 ? 'elite' : weak.markT > 0 ? 'weak' : 'none'; const h0 = big.hp; damageEnemy(big, 10, hero.fi, hero.fj); const took = h0 - big.hp;
  if (!m) snap('mark');
  let spread = null; if (m === 'spread') { big.hp = 1; damageEnemy(big, 5, hero.fi, hero.fj); run(2); spread = weak.markT > 0; }
  hero.hp = 100; const hb = hero.hp; if (m === 'blood' && alive(big)) damageEnemy(big, 20, hero.fi, hero.fj);
  L.push({ mark: m || 'plain', picked, tookFor10: took, spread, healed: m === 'blood' ? +(hero.hp - hb).toFixed(1) : null });
}
// Rain of Arrows
arena('ranger'); hero.ult = 100; { const es = []; for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283; es.push(mk(5 + Math.cos(a) * 2, Math.sin(a) * 2)); } es.forEach(e => e.def.speed = 0); useUlt(); let pinned = 0; for (let k = 0; k < 220; k++) { update(1 / 60); pinned = Math.max(pinned, es.filter(e => e.rootT > 0).length); if (k === 80) snap('rain'); } L.push({ rain: dmg(es), pinnedAtOnce: pinned, stuckArrows: G.stuck.length }); }
// gear: drops are ranger gear
{ newHero('ranger'); const R = rng(9), seen = {}; for (let k = 0; k < 300; k++) { const it = rollItem(R, 3); if (!it.base) continue; const b = ITEM_BASES[it.base]; if (b.cls) seen[b.cls] = (seen[b.cls] || 0) + 1; } L.push({ dropClasses: seen }); }
// HUD and title
arena('ranger'); hero.ult = 40; run(5); snap('hud');
G.mode = 'title'; render(); shots.title = cvs.toDataURL();
window.__out = { log: L, shots };
