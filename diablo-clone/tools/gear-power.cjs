// Hero power by area level: 40 heroes per class in the best of 60 drops (by itemScore). node tools/gear-power.cjs <gameDir>   (round 77: run on two game dirs to compare)
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(process.argv[2]) + '/index.html');
  const out = await p.evaluate(() => { const rows = [];
    for (const cls of ['warrior', 'mage', 'ranger']) for (const d of [2, 4, 6, 8, 10, 12, 15]) {
      let dmg = 0, arm = 0, hp = 0; const N = 40;
      for (let s = 0; s < N; s++) { const R = rng(1000 + s * 7 + d); newHero(cls); hero.lvl = d + 1;
        const best = {}; for (let k = 0; k < 60; k++) { const it = rollItem(R, d); const sl = ITEM_BASES[it.base].slot; if (sl === 'potion' || !canWear(it)) continue; if (!best[sl] || itemScore(it) > itemScore(best[sl])) best[sl] = it; }
        for (const sl in best) hero.equip[sl] = best[sl]; recalcHero(); dmg += (STAT.dmg[0] + STAT.dmg[1]) / 2; arm += STAT.armor; hp += STAT.maxHp; }
      const e = makeEnemy('skeleton', 5, 5, d);
      rows.push([cls, d, +(dmg / N).toFixed(1), +(arm / N).toFixed(1), Math.round(hp / N), e.hp, e.dmg ? e.dmg.join('-') : '']);
    } return rows; });
  for (const r of out) console.log(r.join('\t')); await b.close(); })();
