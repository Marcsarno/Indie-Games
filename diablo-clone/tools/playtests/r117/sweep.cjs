// round 117: draw sweep. Every class in every area (and Act II's), every skill cast, update + render each frame; prints errors.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const cls of ['warrior', 'mage', 'ranger', 'paladin', 'barbarian']) {
    const p = await b.newPage(); p.on('pageerror', e => errs.push(cls + ': ' + String(e.stack || e).slice(0, 400)));
    await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await p.goto('file://' + process.argv[2] + '/index.html');
    const r = await p.evaluate((cls) => { const out = []; let frames = 0;
      for (const lv of [1, 2, 3, 4, 5, 6, 7, 8]) {
        try {
          newHero(cls); hero.lvl = 12; recalcHero(); G.mode = 'play'; startLevel(lv, 100 + lv);
          hero.hp = 1e6; STAT.maxHp = 1e6; for (const e of enemies) e.state = 'hunt';
          const near = enemies.filter(e => !e.def.unique).slice(0, 8); near.forEach((e, k) => { if (!blocked(hero.fi + 1.5 + (k % 4) * 0.6, hero.fj + (k >> 2) - 0.5)) { e.fi = hero.fi + 1.5 + (k % 4) * 0.6; e.fj = hero.fj + (k >> 2) - 0.5; } });
          for (let f = 0; f < 420; f++) {
            hero.mp = 1e6; if (hero.rage !== undefined) hero.rage = 100; if (hero.faith !== undefined) hero.faith = 100;
            input.attack = f % 50 < 25; if (f % 45 === 10) { try { useSkill((f / 45 | 0) % 5); } catch (e) { out.push(cls + ' L' + lv + ' skill: ' + e.message); } }
            if (G.mode !== 'play') G.mode = 'play'; G.dlg = null;
            update(1 / 60); warmStep(4); render(); frames++;
          }
        } catch (e) { out.push(cls + ' L' + lv + ': ' + String(e.stack || e).slice(0, 300)); }
      }
      return { out, frames }; }, cls);
    console.log(cls, 'frames', r.frames, r.out.length ? r.out.join('\n') : 'clean'); await p.close();
  }
  console.log(errs.length ? 'PAGE ERRORS\n' + [...new Set(errs)].slice(0, 6).join('\n') : 'no page errors'); await b.close(); })();
