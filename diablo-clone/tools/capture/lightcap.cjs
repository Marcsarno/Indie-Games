// lighting scenes for A/B: node lightcap.cjs <gameDir> <outPrefix> <query>   (e.g. hue=0 / hue=1)
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + process.argv[2] + '/index.html?' + (process.argv[4] || ''));
  const shots = await p.evaluate(() => {
    Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const out = {};
    const at = (name, lv, seed, pick) => {
      newHero('mage'); hero.lvl = 6; recalcHero(); hero.hp = 9999; G.mode = 'play'; startLevel(lv, seed); G.actCard = 0; enemies.forEach(e => { e.state = 'sleep'; });
      const p0 = pick(); if (p0) { hero.fi = p0[0]; hero.fj = p0[1]; }
      for (let i = 0; i < 500; i++) warmStep(50); for (let k = 0; k < 20; k++) { update(1 / 60); warmStep(20); } G.msg = []; render(); out[name] = cvs.toDataURL();
    };
    const nearDecor = kind => () => { const d = LV.decor.find(d => d.kind === kind); if (!d) return null; for (const [a, b] of [[2, 1], [1, 2], [2, 2], [-2, 1], [1, -2]]) if (!blocked(d.i + 0.5 + a, d.j + 0.5 + b)) return [d.i + 0.5 + a, d.j + 0.5 + b]; return null; };
    at('crypt', 3, 777, nearDecor('brazier'));
    at('torches', 4, 99, nearDecor('torch'));
    at('caves', 8, 5, nearDecor('mushroom'));
    at('hell', 13, 31, nearDecor('torch'));
    at('night', 11, 4242, () => [LV.start.cx + 0.5, LV.start.cy + 0.5]);
    return out;
  });
  for (const k in shots) fs.writeFileSync(`${process.argv[3]}-${k}.png`, Buffer.from(shots[k].split(',')[1], 'base64'));
  console.log(errs.length ? 'ERR ' + errs.slice(0, 2).join('\n') : 'ok'); await b.close(); })();
