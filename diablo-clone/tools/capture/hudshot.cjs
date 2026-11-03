const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
  await p.goto('file:///home/user/indie-games/diablo-clone/game/index.html');
  const u = await p.evaluate(() => { newHero('warrior'); hero.lvl = 5; recalcHero(); G.mode = 'play'; startLevel(3, 777); for (let i = 0; i < 300; i++) warmStep(50); update(1 / 60); render(); return cvs.toDataURL(); });
  fs.writeFileSync(process.argv[2], Buffer.from(u.split(',')[1], 'base64')); await b.close(); })();
