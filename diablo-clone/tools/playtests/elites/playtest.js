// round 39: elites with powers. Each power does its thing and its counter works; packs form and
// falter; powers per depth and banned pairs; how fast an elite kills a hero who just stands there
Math.random = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const L = [], shots = {};
const run = n => { for (let k = 0; k < n; k++) update(1 / 60); };
function arena(cls = 'warrior', lvl = 8) {
  newHero(cls); hero.lvl = lvl; recalcHero(); hero.hp = STAT.maxHp = 99999; G.mode = 'play'; startLevel(3, 777); enemies.length = 0;
  let best = null, bs = -1;
  for (let i = 4; i < MW - 4; i++) for (let j = 4; j < MH - 4; j++) { let n = 0; for (let a = -5; a <= 5; a++) for (let c = -5; c <= 5; c++) if (!blocked(i + a + 0.5, j + c + 0.5)) n++; if (n > bs) { bs = n; best = [i + 0.5, j + 0.5]; } }
  hero.fi = best[0]; hero.fj = best[1]; for (const k in CD) CD[k] = 0;
  const ci = Math.floor(hero.fi), cj = Math.floor(hero.fj); for (let j = cj - 11; j <= cj + 11; j++) for (let i = ci - 11; i <= ci + 11; i++) if (i > 0 && j > 0 && i < MW - 1 && j < MH - 1) { LV.map[tIdx(i, j)] = FLOOR; LV.solid[tIdx(i, j)] = 0; } computeFlow();
  hero.dir = dirFrom(1, 0); input.mx = input.my = 0; hero.stop = 0; STAT.crit = -100; G.slowmo = 0; G.pwSeen = {}; run(2);
}
const elite = (pw, di = 3, dj = 0, id = 'skeleton') => { const e = makeEnemy(id, hero.fi + di, hero.fj + dj, enemies.length + 70); makeChampion(e, () => 0); givePowers(e, pw, false); e.state = 'hunt'; enemies.push(e); return e; };
const calm = e => { e.cool = 999; e.def = Object.assign({}, e.def, { speed: 0 }); };
// burning: a trail while it walks; standing in an armed patch hurts, stepping out stops it
arena(); { const e = elite(['burning'], 5, 0); e.cool = 999; run(90); const trail = G.eliteFire.length; calm(e); e.fi = hero.fi + 4;
  G.eliteFire = [{ fi: hero.fi, fj: hero.fj, t: 1.8, arm: 0.35, dmg: [6, 6], weak: false }]; const h0 = hero.hp; run(10); const early = h0 - hero.hp; run(60); const inside = h0 - hero.hp;
  hero.fi += 1.5; const h1 = hero.hp; run(60); L.push({ power: 'burning', trailPatches: trail, hurtBeforeArmed: early, hurtStandingIn1s: inside, hurtAfterStepOut: h1 - hero.hp }); }
// frozen: orbs near the hero; one bursts on him (chill), one broken by a swing first (nothing)
arena(); { const e = elite(['frozen'], 4, 0); calm(e); let made = 0; for (let k = 0; k < 300 && !made; k++) { update(1 / 60); made = G.frostOrbs.length; }
  G.frostOrbs = [{ fi: hero.fi + 0.2, fj: hero.fj, t: 1.15, t0: 1.15, r: 1.2, dmg: [6, 6], src: e }]; const h0 = hero.hp; hero.chillT = 0; run(80); const burstHurt = h0 - hero.hp, chilled = hero.chillT > 0;
  G.frostOrbs = [{ fi: hero.fi + 0.9, fj: hero.fj, t: 1.15, t0: 1.15, r: 1.2, dmg: [6, 6], src: e }]; e.fi = hero.fi + 6; hero.dir = dirFrom(1, 0); hero.chillT = 0; const h1 = hero.hp; run(20); heroHitResolve(); run(80);
  L.push({ power: 'frozen', orbsDropped: made, burstHurt, chilled, afterBreakingIt: { hurt: h1 - hero.hp, chilled: hero.chillT > 0, orbsLeft: G.frostOrbs.length } }); }
// shielded: light blows soak into the shield; a heavy one breaks it and staggers
arena(); { const e = elite(['shielded'], 1.2, 0); calm(e); for (let k = 0; k < 300 && !(e.shieldHp > 0); k++) update(1 / 60); const sh = e.shieldHp, hp0 = e.hp;
  damageEnemy(e, 5, hero.fi, hero.fj, false, 0); const afterLight = { hp: hp0 - e.hp, shieldLeft: e.shieldHp };
  let hits = 0; while (e.shieldHp > 0 && hits < 30) { damageEnemy(e, 5, hero.fi, hero.fj, false, 1); hits++; }
  L.push({ power: 'shielded', shield: sh, of: e.maxHp, afterLight, heavyHitsToBreak: hits, stunned: +(e.stun || 0).toFixed(2), tookDamageOnBreak: hp0 - e.hp > 0 }); }
// vampiric: what it drank comes back while it stays near; stepping back loses it
for (const away of [false, true]) { arena(); const e = elite(['vampiric'], 1.2, 0); calm(e); e.hp = Math.round(e.maxHp * 0.5); const hp0 = e.hp; hurtHero(20, e); if (away) e.fi = hero.fi + 4; run(120); L.push({ power: 'vampiric', steppedBack: away, healed: e.hp - hp0 }); }
// summoner: two minions rise after the circle; when it dies they crumble
arena(); { const e = elite(['summoner'], 3, 0); calm(e); run(4 * 60); const minions = enemies.filter(o => o.summonedBy === e && alive(o)).length;
  G.pierce = true; damageEnemy(e, 9999, hero.fi, hero.fj); G.pierce = false; run(60); L.push({ power: 'summoner', minions, minionLoot: enemies.find(o => o.summonedBy === e)?.noLoot, aliveAfterDeath: enemies.filter(o => o.summonedBy === e && alive(o)).length }); }
// blinking: held at range it lands beside the hero, stands open, and takes more damage then
arena(); { const e = elite(['blinking'], 5, 0, 'fallen'); calm(e); e.pwT.blinking = 0.3; let land = null; for (let k = 0; k < 300 && !land; k++) { update(1 / 60); if (e.blinkOpen > 0) land = Math.hypot(e.fi - hero.fi, e.fj - hero.fj); }
  const hp0 = e.hp; damageEnemy(e, 10, hero.fi, hero.fj); const open = hp0 - e.hp; run(60); const hp1 = e.hp; damageEnemy(e, 10, hero.fi, hero.fj); L.push({ power: 'blinking', landedAt: land && +land.toFixed(2), dmgWhileOpen: open, dmgAfter: hp1 - e.hp }); }
// death bursts: burning and frozen leaders burst after a warning ring
for (const p of ['burning', 'frozen']) { arena(); const e = elite([p], 1, 0); calm(e); G.pierce = true; damageEnemy(e, 9999, hero.fi, hero.fj); G.pierce = false; const ring = G.eliteBursts.length; const h0 = hero.hp; run(20); const before = h0 - hero.hp; run(40); L.push({ deathBurst: p, warningRing: ring, hurtDuringWarning: before, hurtAfter: h0 - hero.hp - before }); }
// packs: on real floors, every elite leads same-kind followers that falter when it dies
{ let elites = 0, withPack = 0, followers = 0, falter = 0; const byDiff = {};
  for (const lvl of [3, 4, 5, 8, 9, 18, 19]) for (let s = 1; s <= 6; s++) {
    newHero('warrior'); G.mode = 'play'; startLevel(lvl, s * 1013);
    for (const e of enemies) if (e.pw && !e.pwWeak && e.champ) { elites++; const f = enemies.filter(o => o.packOf === e); if (f.length) withPack++; followers += f.length; (byDiff[LV.diff] = byDiff[LV.diff] || []).push(e.pw.length);
      if (f.length && falter < 1) { G.pierce = true; damageEnemy(e, 9999, hero.fi, hero.fj); G.pierce = false; falter = f.filter(o => o.panicT > 0).length / f.length; } }
  }
  const avg = {}; for (const d in byDiff) avg[d] = +(byDiff[d].reduce((a, b) => a + b, 0) / byDiff[d].length).toFixed(2);
  L.push({ elites, withPack, followers, followersFaltered: falter, powersByDiff: avg }); }
// banned pairs never roll together; the first floor only uses the easy four
{ let banned = 0, hard1 = 0; LV.diff = 10; LV.loop = 1; for (let k = 0; k < 2000; k++) { const pw = rollPowers({ fam: 'skeleton' }, Math.random); if (POWER_BANNED.some(([a, b]) => pw.includes(a) && pw.includes(b))) banned++; }
  LV.diff = 1; LV.loop = 0; for (let k = 0; k < 2000; k++) { const pw = rollPowers({ fam: 'skeleton' }, Math.random); if (pw.some(p => !POWER_EASY.includes(p))) hard1++; }
  L.push({ bannedPairsIn2000: banned, hardPowersOnFloor1: hard1, heroSummoners: (() => { LV.diff = 5; let n = 0; for (let k = 0; k < 500; k++) if (rollPowers({ fam: 'hero' }, Math.random).includes('summoner')) n++; return n; })() }); }
// fairness: seconds for an elite to kill a hero of the expected level who stands still, against a plain champion
{ const rows = [];
  for (const [lvl, diff, n] of [[3, 1, 1], [6, 3, 1], [10, 6, 2], [16, 10, 3]]) {
    const t = [];
    for (const kind of ['plain', 'elite']) { let sum = 0; for (let s = 0; s < 6; s++) {
      newHero('warrior'); hero.lvl = lvl; recalcHero(); hero.hp = STAT.maxHp; G.mode = 'play'; startLevel(3, 777); enemies.length = 0; LV.diff = diff; LV.loop = diff >= 10 ? 1 : 0;
      hero.fi = LV.start.cx + 0.5; hero.fj = LV.start.cy + 0.5;
      const e = makeEnemy('skeleton', hero.fi + 1.1, hero.fj, 80); makeChampion(e, Math.random); if (kind === 'plain') { e.pw = null; e.pwT = null; } e.state = 'hunt'; enemies.push(e);
      let k = 0; for (; k < 60 * 60 && !hero.dead; k++) update(1 / 60); sum += k / 60; }
      t.push(+(sum / 6).toFixed(1)); }
    rows.push({ heroLvl: lvl, diff, powers: n, plainChampKillsIn: t[0], eliteKillsIn: t[1] });
  }
  L.push({ fairness: rows }); }
// a picture: elites with each power around the hero
arena(); { hero.hp = 99999; const ps = ['burning', 'frozen', 'shielded', 'vampiric', 'summoner', 'blinking']; ps.forEach((p, k) => { const a = k / 6 * 6.283; const e = elite([p], Math.cos(a) * 2.6, Math.sin(a) * 2.6, ['skeleton', 'fallen', 'skeleton', 'hound', 'skeleton', 'fallen'][k]); e.cool = 999; }); run(150); for (let i = 0; i < 200; i++) warmStep(30); render(); shots.all = cvs.toDataURL(); }
window.__out = { log: L, shots };
