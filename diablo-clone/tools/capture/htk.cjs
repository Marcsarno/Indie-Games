// hits to kill by depth: hero at level d+1 in the best of 25 drops per slot (by itemScore) vs the
// average dungeon monster at diff d. node htk.cjs
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve('game/index.html'));
  const out = await p.evaluate((heavy) => { setHeavy(heavy); buildBudget.ms = Infinity; const R = rng(77), rows = [];
    const ids = Object.keys(MONSTERS).filter(id => !MONSTERS[id].unique && MONSTERS[id].where !== 'out' && !MONSTERS[id].boss);
    for (const cls of ['warrior', 'mage', 'ranger']) for (const d of [1, 3, 6, 9, 12, 15]) {
      newHero(cls); hero.lvl = Math.min(30, Math.round(d * 1.3 + 1)); const best = {};
      for (let n = 0; n < 25 * 9; n++) { const it = rollItem(R, d); const s = ITEM_BASES[it.base].slot; if (!best[s] || itemScore(it) > itemScore(best[s])) best[s] = it; }
      for (const s in best) if (hero.equip.hasOwnProperty(s) || ['weapon','helm','chest','shield','ring','amulet','boots','gloves','belt'].includes(s)) hero.equip[s] = best[s];
      recalcHero();
      let dm = 0; for (let k = 0; k < 400; k++) dm += heroDmg(1); dm /= 400;
      const pool = ids.filter(id => (MONSTERS[id].minLevel || 1) <= d);
      const hp = pool.reduce((a, id) => a + makeEnemy(id, 1, 1, 0, d).maxHp, 0) / pool.length;
      const per = cls === 'mage' ? missileCast() : cls === 'ranger' ? weaponSwing(hero.look, 0).reduce((a, k) => a + k.ms, 0) / 1000 : (() => { const l = [0, 1, 2].map(c => weaponSwing(hero.look, c)); return l.reduce((a, sw) => a + sw.chain, 0) / 3 / 1000; })();
      rows.push({ cls, d, lvl: hero.lvl, dmg: +dm.toFixed(1), monHp: +hp.toFixed(0), hits: +(hp / dm).toFixed(2), ttk: +(Math.ceil(hp / dm) * per).toFixed(2) });
    }
    return rows; }, process.argv[2] === 'heavy');
  console.table(out); await b.close(); })();
