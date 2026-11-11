// Before/after shots of the air of each place (round 80): node tools/capture/atmoshots.cjs <outDir>
// Each place is captured with ATMOS off and on, after 7 s of game time with the monsters asleep.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e.stack || e)));
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file://' + path.resolve(__dirname, '../../game/index.html'));
  const places = [['graveyard', 1, [9, 57]], ['hollow', 1, null], ['crypt', 3, null], ['ashford', 6, null], ['emberwood', 7, null], ['caves', 8, null], ['nightwood', 12, null], ['hell', 13, null]];
  for (const [name, level, at] of places) for (const on of [0, 1]) {
    const url = await p.evaluate(([level, at, on]) => {
      ATMOS = !!on; newHero('warrior'); hero.hp = 9999; G.mode = 'play'; startLevel(level, 4242); G.actCard = 0; enemies.forEach(e => e.state = 'sleep');
      if (at) { hero.fi = at[0] + 0.5; hero.fj = at[1] + 0.5; }
      for (let i = 0; i < 300; i++) warmStep(50);
      for (let k = 0; k < 420; k++) { hero.hp = 9999; G.mode = 'play'; G.talk = null; enemies.forEach(e => e.state = 'sleep'); update(1 / 60); }
      G.msg = []; G.talk = null; render(); return cvs.toDataURL();
    }, [level, at, on]);
    fs.writeFileSync(path.join(out, `${name}-${on ? 'on' : 'off'}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log(errs.length ? 'ERR ' + errs.slice(0, 3).join('\n') : 'no page errors'); await b.close();
})();
