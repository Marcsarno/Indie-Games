// Deterministic combat capture: stubs requestAnimationFrame, then steps update/render at 60 Hz
// and grabs the native 270x480 canvas. Two swings at the spider; the second one kills it.
const { chromium } = require('playwright');
const fs = require('fs');
const [page, outDir] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; Math.random = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + page);
  const frames = await p.evaluate(() => {
    knight.fi = 9.0; knight.fj = 4.6; knight.face = 1;
    const spider = enemies.find(e => e.type === 'spider');
    const shots = []; let T = 0;
    for (let f = 0; f < 110; f++) {
      if (f === 6) attack();
      if (f === 48) { spider.hp = 1; attack(); }
      update(1 / 60, T); render(T); T += 1 / 60;
      if (f % 2 === 0) shots.push(document.getElementById('c').toDataURL());
    }
    return shots;
  });
  fs.mkdirSync(outDir, { recursive: true });
  frames.forEach((u, i) => fs.writeFileSync(`${outDir}/f${String(i).padStart(3, '0')}.png`, Buffer.from(u.split(',')[1], 'base64')));
  console.log(frames.length, 'frames', 'errors', JSON.stringify(errs));
  await b.close();
})();
