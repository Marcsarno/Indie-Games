// reference shots for the Act II ChatGPT prompt: node tools/capture/act2refs.cjs <outDir>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const game = path.resolve(__dirname, '../../game');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + game + '/index.html');
  const shots = await p.evaluate(() => {
    newHero('warrior'); hero.hp = 9999; G.mode = 'play';
    const out = {};
    const snap = (name, lvl, seed, at) => {
      startLevel(lvl, seed); G.actCard = 0; enemies.forEach(e => e.state = 'sleep');
      if (at) { const s = at(); hero.fi = s[0]; hero.fj = s[1]; }
      for (let i = 0; i < 400; i++) warmStep(50); for (let k = 0; k < 10; k++) { update(1 / 60); warmStep(30); } G.msg = []; G.talk = null; render(); out[name] = cvs.toDataURL();
    };
    snap('1-hollow-camp', 1, 4242, () => CAMP_AT(0, 3));
    snap('2-hollow-woods', 1, 4242, () => { const e = enemies[Math.floor(enemies.length / 2)]; return [e.fi + 2.5, e.fj + 2.5]; });
    snap('3-act2-town-today', 6, 4242, null);
    snap('4-caves-today', 8, 4242, null);
    return out;
  });
  for (const k in shots) fs.writeFileSync(path.join(process.argv[2], k + '.png'), Buffer.from(shots[k].split(',')[1], 'base64'));
  console.log(errs.length ? 'ERR ' + errs.slice(0, 3).join('\n') : 'ok'); await b.close(); })();
