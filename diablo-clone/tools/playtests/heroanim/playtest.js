// round 40a: the hero's animation pass. Every skill lands its blow no later than before (slam,
// leap, whirlwind ticks, hook), and each new pose shows when it should: pivot on a reversal, skid
// on a hard stop, footfall dust, drink, a fidget after standing, the hit side, spin, haul, landing
Math.random = (() => { let s = 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [];
const run = n => { for (let k = 0; k < n; k++) update(1 / 60); };
function arena() {
  newHero('warrior'); hero.lvl = 10; recalcHero(); hero.hp = STAT.maxHp = 9999; hero.mana = STAT.maxMana = 999; G.mode = 'play'; startLevel(3, 777); enemies.length = 0;
  let best = null, bs = -1;
  for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
  hero.fi = best[0]; hero.fj = best[1]; for (const k in CD) CD[k] = 0;
  const ci = Math.floor(hero.fi), cj = Math.floor(hero.fj); for (let j = cj - 11; j <= cj + 11; j++) for (let i = ci - 11; i <= ci + 11; i++) if (i > 0 && j > 0 && i < MW - 1 && j < MH - 1) { LV.map[tIdx(i, j)] = FLOOR; LV.solid[tIdx(i, j)] = 0; } computeFlow();
  hero.dir = 1; input.mx = input.my = 0; hero.stop = 0; G.slowmo = 0; run(3);
}
const dummy = (di, dj) => { const e = makeEnemy('fallen', hero.fi + di, hero.fj + dj, enemies.length + 50); e.hp = e.maxHp = 9999; e.state = 'hunt'; e.cool = 999; e.def = Object.assign({}, e.def, { speed: 0, dmg: [0, 0] }); enemies.push(e); return e; };
const until = (cond, max = 300) => { let k = 0; for (; k < max && !cond(); k++) update(1 / 60); return Math.round(k / 60 * 1000); };
const timing = feel => {
  setFeelOld(feel); const r = {};
  arena(); { const e = dummy(1.3, 0); hero.dir = dirFrom(1, 0); const h0 = e.hp; groundSlam(); r.slamHitMs = until(() => e.hp < h0); r.slamDoneMs = until(() => hero.atk < 0) + r.slamHitMs; }
  arena(); { const e = dummy(4.5, 0); const h0 = e.hp; startLeap(); r.leapLandMs = until(() => e.hp < h0); }
  arena(); { const e = dummy(4.5, 0); const h0 = e.hp; chainHook(); r.hookBiteMs = until(() => e.hp < h0); }
  arena(); { const e = dummy(1, 0.2); const h0 = e.hp; hero.whirl = 0.8; hero.whirlTick = 0; r.whirlFirstMs = until(() => e.hp < h0); let n = 0, last = e.hp; for (let k = 0; k < 60; k++) { update(1 / 60); if (e.hp < last) n++; last = e.hp; } r.whirlHitsAfter = n; }
  return r;
};
const now = timing(false);
L.push({ timing: now });   // compare with the same test run on the previous version (see NOTES)
// the poses
const seen = new Set(); const watch = n => { for (let k = 0; k < n; k++) { update(1 / 60); seen.add(hero.clip); } };
arena(); { let dust0 = 0; const ps = pspawn; pspawn = (...a) => { if (a[0] === 5) dust0++; return ps(...a); }; input.mx = 1; input.my = 0; watch(50); pspawn = ps; input.mx = -1; watch(25); input.mx = 0; watch(30); L.push({ run: [...seen], footfallDust: dust0 > 0 }); }
seen.clear(); arena(); { hero.hp = 100; input.mx = 0.7; input.my = 0.7; drinkPotion(); watch(20); input.mx = input.my = 0; watch(20); hero.idleT = 0; hero.fidgetAt = 0.3; watch(60); L.push({ drinkAndIdle: [...seen] }); }
arena(); { const sides = []; for (const [di, dj] of [[1.1, 0], [0, -1.1], [0, 1.1], [-1.1, 0]]) { const e = dummy(di, dj); hero.dir = dirFrom(1, 0); hurtHero(1, e); sides.push(hero.hitF); enemies.length = 0; run(15); } L.push({ hitFrames: sides }); }
seen.clear(); arena(); { dummy(1, 0.3); hero.whirl = 0.8; hero.whirlTick = 0; watch(55); L.push({ whirl: [...seen] }); }
seen.clear(); arena(); { dummy(4.5, 0); chainHook(); const fr = []; for (let k = 0; k < 50; k++) { update(1 / 60); if (hero.clip === 'hook') fr.push(frameOf(hero)); } L.push({ hookFrames: [...new Set(fr)] }); }
arena(); { dummy(4.5, 0); startLeap(); const fr = []; for (let k = 0; k < 70; k++) { update(1 / 60); if (hero.clip === 'attack4') fr.push(frameOf(hero)); } L.push({ leapFrames: [...new Set(fr)] }); }
window.__out = { log: L, shots: {} };
