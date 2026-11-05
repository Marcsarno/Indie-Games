// blind A/B scenes: the hero (+ nearby monsters) under character light caps 5 / 4 / 3
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve('game/index.html'));
  const shots = await p.evaluate(() => { buildBudget.ms = Infinity; const out = {};
    const SC = [['crypt', 'mage', 3, 777], ['caves', 'ranger', 9, 5], ['hell', 'warrior', 13, 21], ['camp', 'mage', 1, 4242]];
    for (const [name, cls, lv, seed] of SC) { newHero(cls); G.mode = 'play'; startLevel(lv, seed); G.actCard = 0; G.bossIntro = 0;
      if (name === 'camp') { hero.fi = HUB.camp[0] + 1.6; hero.fj = HUB.camp[1] + 0.6; enemies = []; }
      else { const open = (i, j) => { for (let a = -3; a <= 4; a++) for (let b2 = -3; b2 <= 3; b2++) if (blocked(i + a, j + b2)) return false; return true; };
        let best = null; for (const r of LV.rooms) { const i = r.cx + 0.5, j = r.cy + 0.5; if (open(i, j)) { best = [i, j]; break; } } if (best) { hero.fi = best[0]; hero.fj = best[1]; }
        // put two monsters near the hero
        const near = enemies.filter(e => !e.boss).slice(0, 2); near.forEach((e, k) => { e.fi = hero.fi + 2.2 + k * 0.6; e.fj = hero.fj - 1.4 + k * 2.6; e.state = 'idle'; e.asleep = false; }); enemies = near; }
      hero.dir = 1; for (let s = 0; s < 40; s++) warmStep(30);
      for (const cap of [5, 4, 3]) { CHAR_CAP = cap; G.t = 10; render(); out[name + '-' + cap] = cvs.toDataURL(); } }
    return out; });
  for (const k in shots) fs.writeFileSync(path.join(process.argv[2], k + '.png'), Buffer.from(shots[k].split(',')[1], 'base64'));
  await b.close(); })();
