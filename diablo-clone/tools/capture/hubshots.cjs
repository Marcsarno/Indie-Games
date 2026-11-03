// hub screenshots at six spots: node hubshots.cjs <outPrefix> <gameDir>
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + process.argv[3] + '/index.html');
  const shots = await p.evaluate(() => {
    newHero('warrior'); hero.hp = 9999; G.mode = 'play'; startLevel(1, 4242); G.actCard = 0; enemies.forEach(e => e.state = 'sleep');
    const out = {};
    for (const [name, fi, fj] of [['camp', 38.5, 35], ['cathedral', 33, 34], ['north', 16, 16], ['east', 47, 19], ['west', 17, 47], ['south', 47.5, 47.5]]) {
      hero.fi = fi; hero.fj = fj; for (let i = 0; i < 400; i++) warmStep(50); for (let k = 0; k < 10; k++) { update(1 / 60); warmStep(30); } G.msg = []; render(); out[name] = cvs.toDataURL();
    }
    return out;
  });
  for (const k in shots) fs.writeFileSync(process.argv[2] + '-' + k + '.png', Buffer.from(shots[k].split(',')[1], 'base64'));
  console.log(errs.length ? 'ERR ' + errs.slice(0, 3).join('\n') : 'ok'); await b.close(); })();
