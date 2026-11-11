// Shots of every kind of exit, the hero standing a little off it: node tools/capture/exitshots.cjs <outDir> [gameDir]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [out, gd = path.resolve(__dirname, '../../game')] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(gd, 'index.html'));
  const list = [['crypt-down', 3, null, 'stairs'], ['den-up', 1, 'den', 'stairs'], ['barrow-up', 1, 'barrow', 'stairs'], ['barrow-down', 1, 'barrow', 'down'], ['tower-up', 1, 'tower', 'stairs'], ['hub-mine', 1, null, 'stairs'], ['hub-den', 1, null, 'door:den'], ['hub-barrow', 1, null, 'door:barrow'], ['hub-tower', 1, null, 'door:tower'], ['riv-back', 2, null, 'back'], ['riv-on', 2, null, 'stairs'], ['caves-down', 8, null, 'stairs'], ['portal', 3, null, 'portal']];
  for (const [name, level, side, what] of list) {
    const url = await p.evaluate(([level, side, what]) => {
      try {
        newHero('warrior'); hero.hp = 9999; G.mode = 'play'; startLevel(level, 4242, side || undefined); G.actCard = 0; enemies.length = 0;
        let at = null;
        if (what === 'stairs') at = [LV.stairs.i + 0.5, LV.stairs.j + 0.5];
        else if (what === 'down') at = LV.down ? [LV.down.i + 0.5, LV.down.j + 0.5] : null;
        else if (what === 'back') at = LV.backExit;
        else if (what.startsWith('door:')) at = SIDES[what.slice(5)].door();
        else if (what === 'portal') { openPortalNear(hero.fi + 1.4, hero.fj + 0.4, true); at = [hero.fi, hero.fj]; }
        if (!at) return null;
        let best = null; for (let a = 0; a < 16; a++) { const fi = at[0] + Math.cos(a / 16 * 6.283) * 2.4, fj = at[1] + Math.sin(a / 16 * 6.283) * 2.4; if (!blocked(fi, fj) && (!best || fi + fj > best[0] + best[1])) best = [fi, fj]; }
        if (best && what !== 'portal') { hero.fi = best[0]; hero.fj = best[1]; }
        for (let i = 0; i < 300; i++) warmStep(50);
        for (let k = 0; k < 20; k++) { G.mode = 'play'; G.talk = null; G.fadeTo = null; update(1 / 60); }
        G.msg = []; G.talk = null; render(); return cvs.toDataURL();
      } catch (e) { return 'ERR ' + e.stack; }
    }, [level, side, what]);
    if (!url || url.startsWith('ERR')) { console.log(name, url); continue; }
    fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log(errs.length ? 'ERR ' + errs.slice(0, 3).join('\n') : 'no page errors'); await b.close();
})();
