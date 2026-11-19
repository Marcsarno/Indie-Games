// Every skill of every hero, at level 5 with each of its runes, 3 s in a crowd: errors and damage dealt.
// node survivors/tools/skilltest.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const cls of ['mage', 'paladin', 'warrior', 'ranger']) {
    const p = await b.newPage({ viewport: { width: 390, height: 780 } });
    const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e).slice(0, 300)));
    await p.goto(`file:///home/user/Indie-Games/survivors/index.html?cls=${cls}&nosave=1`); await p.waitForTimeout(1500); await p.evaluate(() => svChooseHero(SV.cls, true)); await p.waitForTimeout(500);
    const ids = await p.evaluate(c => Object.keys(SV_WEAPONS).filter(id => (SV_WEAPONS[id].cls === c || SV_WEAPONS[id].cls === 'all')), cls);
    const out = [];
    for (const id of ids) {
      const mods = await p.evaluate(id => (SKILL_MODS[id] || [{ id: null }]).map(m => m.id), id);
      for (const m of [null, ...mods]) {
        const r = await p.evaluate(async ([id, m]) => {
          G.mode = 'play'; SV.queue = 0; SV.t = 100; SV.w = { [SV_HEROES[SV.cls].start]: { lvl: 1, cd: 9 }, [id]: { lvl: 5, cd: 0 } }; SV.mods = m ? { [id]: m } : {};
          if (SV_WEAPONS[id].basic) SV.w[id].cd = 0;
          enemies = []; SV.capK = 0; SV.eliteT = 1e9; SV.bossDone = { alpha: 1, skelking: 1 }; SV.goblinT = 1e9; hero.fi = MW / 2; hero.fj = MH / 2; groundItems = [];
          const T = []; for (let k = 0; k < 10; k++) { const e = svSpawn('skeleton', hero.fi + 1.2 + Math.cos(k) * 1.2, hero.fj + 1.2 + Math.sin(k) * 1.2, { noChamp: true }); e.hp = e.maxHp = 5000; e.dmg = [0, 0]; e.speedK = 0.01; T.push(e); }
          hero.hp = STAT.maxHp = 99999;
          const hp0 = T.reduce((a, e) => a + e.hp, 0);
          await new Promise(res => setTimeout(res, 3000));
          return Math.round(hp0 - T.reduce((a, e) => a + Math.max(0, e.hp), 0)) + (SV.errs ? ' ERR' : '');
        }, [id, m]);
        out.push(`${id}${m ? '/' + m : ''}=${r}`);
      }
    }
    console.log(cls, out.join(' '));
    if (errs.length) console.log(cls, 'ERRORS', [...new Set(errs)].slice(0, 5).join('\n'));
    await p.close();
  }
  await b.close();
})();
