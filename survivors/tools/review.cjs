// A whole run, measured: node survivors/tools/review.cjs <cls> <diff> [extra query] > out.json
// Samples life every game second; at the end prints the level times, the card log, when each weapon maxed and
// how many offers held no weapon card (the build was "done").
const { chromium } = require('playwright');
(async () => {
  const [cls, diff, extra] = [process.argv[2] || 'mage', process.argv[3] || '1', process.argv[4] || ''];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 780 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await p.goto(`file:///home/user/Indie-Games/survivors/index.html?bot=2&cls=${cls}&diff=${diff}&nosave=1&speed=3&${extra}`);
  await p.waitForTimeout(1500);
  await p.evaluate(() => {
    window.__R = { hp: [], lvlAt: {}, maxAt: {}, hits: 0, dmgIn: 0, foes: [], dmgMin: [], killsMin: [] };
    const h0 = hurtHero; hurtHero = function (d, s) { const a = hero.hp; h0(d, s); if (hero.hp < a) { __R.hits++; __R.dmgIn += a - hero.hp; const m = Math.floor(SV.t / 60); __R.dmgMin[m] = (__R.dmgMin[m] || 0) + (a - hero.hp) / STAT.maxHp * 100; } };
    let lastT = -1;
    SV_HOOKS.update.push(() => {
      const t = Math.floor(SV.t); if (t !== lastT) { lastT = t; __R.killsMin[Math.floor(t / 60)] = SV.kills; __R.hp.push(Math.round(100 * hero.hp / STAT.maxHp)); __R.foes.push(svAlive()); }
      if (!__R.lvlAt[SV.lvl]) __R.lvlAt[SV.lvl] = Math.round(SV.t);
      for (const id in SV.w) if (SV.w[id].lvl >= 5 && !__R.maxAt[id]) __R.maxAt[id] = Math.round(SV.t);
    });
  });
  const t0 = Date.now();
  while (Date.now() - t0 < 840000) { const m = await p.evaluate(() => G.mode + ' ' + SV.t); if (m.startsWith('svend') || +m.split(' ')[1] > (+process.env.TMAX || 760)) break; await p.waitForTimeout(2000); }
  const r = await p.evaluate(() => {
    const L = SV.log.filter(x => x.kind === 'level'), noW = L.filter(x => !x.offer.some(id => SV_WEAPONS[id])).length;
    const hp = __R.hp, low = hp.filter(v => v < 50).length, crit = hp.filter(v => v < 25).length;
    return { cls: hero.cls, diff: SV.diff, won: !!(SV.end && SV.end.won), dead: !!hero.dead, t: Math.round(SV.t), lvl: SV.lvl, kills: SV.kills, gold: SV.gold,
      lvlAt: __R.lvlAt, maxAt: __R.maxAt, picks: L.length, offersWithNoWeapon: noW, firstNoWeaponAt: (L.find(x => !x.offer.some(id => SV_WEAPONS[id])) || {}).t,
      heals: L.filter(x => x.pick === 'heal').length, hits: __R.hits, dmgIn: Math.round(__R.dmgIn), secsBelow50: low, secsBelow25: crit, minHp: Math.min(...hp),
      hpByMin: Array.from({ length: Math.ceil(hp.length / 60) }, (_, k) => Math.min(...hp.slice(k * 60, k * 60 + 60))), foesByMin: Array.from({ length: Math.ceil(__R.foes.length / 60) }, (_, k) => Math.round(__R.foes.slice(k * 60, k * 60 + 60).reduce((a, b) => a + b, 0) / 60)),
      w: Object.fromEntries(Object.entries(SV.w).map(([k, v]) => [k, v.lvl])), mods: SV.mods, pas: SV.pas, evo: SV.evo, evoAt: SV.log.filter(x => x.kind === 'evolve').map(x => x.t), ultAt: SV.log.filter(x => x.kind === 'ultimate').map(x => x.t), errs: SV.errs || [], dmgPctByMin: __R.dmgMin.map(v => Math.round(v || 0)), killsByMin: __R.killsMin.map((v, k) => v - (__R.killsMin[k - 1] || 0)), endless: !!SV.endless, picksLogged: SV.log.length, gold2: SV.gold };
  });
  r.errors = errs; console.log(JSON.stringify(r));
  await b.close();
})();
