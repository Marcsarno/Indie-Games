// round 24: the warrior's kit. Ground slam (cone in front only, stuns), chain hook (pulls a pack in,
// reels the hero to a boss), leap (travels, smashes on landing, untouchable in the air), fury
Math.random = (() => { let s = 41; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const log = [], shots = {};
newHero('warrior'); G.mode = 'play'; hero.lvl = 5; recalcHero(); hero.hp = STAT.maxHp = 9999; hero.mana = STAT.maxMana = 999;
function arena() {
  startLevel(3, 777);
  let best = null, bs = -1;
  for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; let lane = true; for (let a = -2; a <= 6; a++) for (const c of [-0.6, 0, 0.6]) if (blocked(i + a + 0.5, j + c + 0.5)) lane = false; if (lane && n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
  enemies.length = 0; hero.fi = best[0]; hero.fj = best[1]; openGround(hero.fi, hero.fj, 7); hero.hp = 9999; hero.mana = 999; for (const k in CD) CD[k] = 0;
}
// round 26: the tests clear a 15x15 patch of open floor around the hero, so their numbers depend on
// the code and not on what one seed's layout happens to put nearby
function openGround(fi, fj, r) {
  const ci = Math.floor(fi), cj = Math.floor(fj);
  for (let j = cj - r; j <= cj + r; j++) for (let i = ci - r; i <= ci + r; i++) if (i > 0 && j > 0 && i < MW - 1 && j < MH - 1) { LV.map[tIdx(i, j)] = FLOOR; LV.solid[tIdx(i, j)] = 0; }
  for (const p of dynProps) if (Math.abs(p.i - ci) <= r && Math.abs(p.j - cj) <= r) p.broken = true;
  computeFlow();
}
const spawn = (id, di, dj) => { const e = makeEnemy(id, hero.fi + di, hero.fj + dj, enemies.length + 50); e.state = 'hunt'; e.hp = e.maxHp = 500; e.def = Object.assign({}, e.def, { dmg: [0, 0] }); enemies.push(e); return e; };
const run = n => { for (let k = 0; k < n; k++) update(1 / 60); };
// slam: two in front, one behind
arena(); const f1 = spawn('fallen', 1.5, 0), f2 = spawn('fallen', 3, 0.4), bk = spawn('fallen', -2.4, 0); hero.dir = dirFrom(1, 0);
for (const e of enemies) e.cool = 9;
run(2); useSkill(0); let stunned = 0; for (let k = 0; k < 40; k++) { update(1 / 60); if (f1.stun > 0 && f2.stun > 0) stunned = 1; }
log.push({ slamFront: [500 - f1.hp, 500 - f2.hp], slamBehind: 500 - bk.hp, stunned: !!stunned, quake: G.quakes.length > 0 || stunned });
render(); shots.slam = cvs.toDataURL();
// hook a pack 5 tiles away
arena(); const pk = [spawn('fallen', 5, 0), spawn('fallen', 5.4, 0.6), spawn('fallen', 5.2, -0.7)]; for (const e of pk) e.cool = 9;
run(2); useSkill(1); run(6); render(); shots.hook = cvs.toDataURL(); run(34);
log.push({ hookPulled: pk.map(e => +Math.hypot(e.fi - hero.fi, e.fj - hero.fj).toFixed(1)), dazed: pk.filter(e => e.stun > 0).length });
// hook a boss: the hero is reeled in
arena(); const bossE = makeEnemy('skelking', hero.fi + 5, hero.fj, 99); bossE.state = 'hunt'; bossE.def = Object.assign({}, bossE.def, { dmg: [0, 0] }); enemies.push(bossE);
run(2); const h0 = [hero.fi, hero.fj]; useSkill(1); run(60);
log.push({ reeled: +Math.hypot(hero.fi - h0[0], hero.fj - h0[1]).toFixed(1), bossMoved: +Math.hypot(bossE.fi - h0[0] - 5, bossE.fj - h0[1]).toFixed(1) });
// leap at an enemy 5 tiles away; damage on landing; untouchable mid-air
arena(); hero.lvl = 5; const tg = spawn('skeleton', 5, 0); tg.cool = 9; const p0 = [hero.fi, hero.fj];
run(2); useSkill(3); run(8); const hpAir = hero.hp; hurtHero(50, null); const untouched = hero.hp === hpAir; render(); shots.leap = cvs.toDataURL(); run(40);
log.push({ leapTravel: +Math.hypot(hero.fi - p0[0], hero.fj - p0[1]).toFixed(1), leapDamage: 500 - tg.hp, untouchableInAir: untouched });
// fury: plain swings refund mana
arena(); const fz = [spawn('fallen', 1, 0), spawn('fallen', 1, 0.5)]; for (const e of fz) e.cool = 9; hero.dir = dirFrom(1, 0.2);
hero.mana = 0; recalcHero(); hero.mana = 0; input.attack = true; run(60); input.attack = false;
log.push({ furyManaAfter1s: +hero.mana.toFixed(1) });
window.__out = { log, shots };
